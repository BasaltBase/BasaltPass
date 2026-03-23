package passkey

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"sync"
	"time"

	"basaltpass-backend/internal/common"
	settingssvc "basaltpass-backend/internal/service/settings"

	"github.com/go-webauthn/webauthn/webauthn"
	"gorm.io/gorm"
)

const (
	defaultPasskeySessionTTL      = 5 * time.Minute
	defaultPasskeySessionCapacity = 1024
)

var errSessionNotFound = errors.New("session not found")

type sessionEnvelope struct {
	SessionData *webauthn.SessionData `json:"session_data"`
	CreatedAt   time.Time             `json:"created_at"`
	ExpiresAt   time.Time             `json:"expires_at"`
}

type challengeSessionStore interface {
	Set(ctx context.Context, key string, v *webauthn.SessionData) error
	Get(ctx context.Context, key string) (*sessionEnvelope, error)
	Consume(ctx context.Context, key string) (*sessionEnvelope, error)
	Delete(ctx context.Context, key string) error
}

type sessionStoreMap struct {
	mu       sync.Mutex
	m        map[string]*sessionEnvelope
	ttl      time.Duration
	capacity int
	now      func() time.Time
}

func newSessionStoreMap(ttl time.Duration, capacity int) *sessionStoreMap {
	return &sessionStoreMap{m: make(map[string]*sessionEnvelope), ttl: ttl, capacity: capacity, now: time.Now}
}

func (s *sessionStoreMap) Set(_ context.Context, key string, v *webauthn.SessionData) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.now == nil {
		s.now = time.Now
	}
	now := s.now()
	s.evictExpiredLocked(now)
	if _, exists := s.m[key]; !exists && s.capacity > 0 && len(s.m) >= s.capacity {
		s.evictOldestLocked()
	}
	s.m[key] = &sessionEnvelope{SessionData: v, CreatedAt: now, ExpiresAt: now.Add(s.ttl)}
	return nil
}

func (s *sessionStoreMap) Get(_ context.Context, key string) (*sessionEnvelope, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.now == nil {
		s.now = time.Now
	}
	env, ok := s.m[key]
	if !ok {
		return nil, errSessionNotFound
	}
	if !env.ExpiresAt.After(s.now()) {
		delete(s.m, key)
		return nil, errSessionNotFound
	}
	return env, nil
}

func (s *sessionStoreMap) Consume(_ context.Context, key string) (*sessionEnvelope, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.now == nil {
		s.now = time.Now
	}
	env, ok := s.m[key]
	if !ok {
		return nil, errSessionNotFound
	}
	delete(s.m, key)
	if !env.ExpiresAt.After(s.now()) {
		return nil, errSessionNotFound
	}
	return env, nil
}

func (s *sessionStoreMap) Delete(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.m, key)
	return nil
}

func (s *sessionStoreMap) evictExpiredLocked(now time.Time) {
	for key, env := range s.m {
		if !env.ExpiresAt.After(now) {
			delete(s.m, key)
		}
	}
}

func (s *sessionStoreMap) evictOldestLocked() {
	if len(s.m) == 0 {
		return
	}
	var oldestKey string
	var oldest time.Time
	first := true
	for key, env := range s.m {
		if first || env.CreatedAt.Before(oldest) {
			oldestKey = key
			oldest = env.CreatedAt
			first = false
		}
	}
	delete(s.m, oldestKey)
}

func (s *sessionStoreMap) size() int {
	s.mu.Lock()
	defer s.mu.Unlock()
	now := time.Now()
	if s.now != nil {
		now = s.now()
	}
	s.evictExpiredLocked(now)
	return len(s.m)
}

type dbSessionRecord struct {
	Key       string    `gorm:"primaryKey;size:255"`
	Payload   []byte    `gorm:"type:blob;not null"`
	CreatedAt time.Time `gorm:"index;not null"`
	ExpiresAt time.Time `gorm:"index;not null"`
}

func (dbSessionRecord) TableName() string { return "passkey_sessions" }

type dbSessionStore struct {
	db       *gorm.DB
	ttl      time.Duration
	capacity int
	now      func() time.Time
	once     sync.Once
}

func newDBSessionStore(db *gorm.DB, ttl time.Duration, capacity int) *dbSessionStore {
	return &dbSessionStore{db: db, ttl: ttl, capacity: capacity, now: time.Now}
}

func (s *dbSessionStore) ensureSchema() error {
	var err error
	s.once.Do(func() { err = s.db.AutoMigrate(&dbSessionRecord{}) })
	return err
}

func (s *dbSessionStore) Set(_ context.Context, key string, v *webauthn.SessionData) error {
	if err := s.ensureSchema(); err != nil {
		return fmt.Errorf("migrate passkey sessions: %w", err)
	}
	now := s.now()
	env := &sessionEnvelope{SessionData: v, CreatedAt: now, ExpiresAt: now.Add(s.ttl)}
	payload, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("marshal session: %w", err)
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("expires_at <= ?", now).Delete(&dbSessionRecord{}).Error; err != nil {
			return err
		}
		var count int64
		if err := tx.Model(&dbSessionRecord{}).Count(&count).Error; err != nil {
			return err
		}
		var existing int64
		if err := tx.Model(&dbSessionRecord{}).Where("key = ?", key).Count(&existing).Error; err != nil {
			return err
		}
		if existing == 0 && s.capacity > 0 && count >= int64(s.capacity) {
			var oldest dbSessionRecord
			if err := tx.Order("created_at asc").First(&oldest).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
				return err
			}
			if oldest.Key != "" {
				if err := tx.Delete(&oldest).Error; err != nil {
					return err
				}
			}
		}
		return tx.Save(&dbSessionRecord{Key: key, Payload: payload, CreatedAt: env.CreatedAt, ExpiresAt: env.ExpiresAt}).Error
	})
}

func (s *dbSessionStore) Get(_ context.Context, key string) (*sessionEnvelope, error) {
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("migrate passkey sessions: %w", err)
	}
	var record dbSessionRecord
	if err := s.db.First(&record, "key = ?", key).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errSessionNotFound
		}
		return nil, err
	}
	if !record.ExpiresAt.After(s.now()) {
		_ = s.db.Delete(&record).Error
		return nil, errSessionNotFound
	}
	var env sessionEnvelope
	if err := json.Unmarshal(record.Payload, &env); err != nil {
		return nil, fmt.Errorf("unmarshal session: %w", err)
	}
	return &env, nil
}

func (s *dbSessionStore) Consume(_ context.Context, key string) (*sessionEnvelope, error) {
	if err := s.ensureSchema(); err != nil {
		return nil, fmt.Errorf("migrate passkey sessions: %w", err)
	}
	var env *sessionEnvelope
	err := s.db.Transaction(func(tx *gorm.DB) error {
		var record dbSessionRecord
		if err := tx.First(&record, "key = ?", key).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return errSessionNotFound
			}
			return err
		}
		if err := tx.Delete(&record).Error; err != nil {
			return err
		}
		if !record.ExpiresAt.After(s.now()) {
			return errSessionNotFound
		}
		decoded := &sessionEnvelope{}
		if err := json.Unmarshal(record.Payload, decoded); err != nil {
			return fmt.Errorf("unmarshal session: %w", err)
		}
		env = decoded
		return nil
	})
	if err != nil {
		return nil, err
	}
	return env, nil
}

func (s *dbSessionStore) Delete(_ context.Context, key string) error {
	if err := s.ensureSchema(); err != nil {
		return fmt.Errorf("migrate passkey sessions: %w", err)
	}
	return s.db.Delete(&dbSessionRecord{}, "key = ?", key).Error
}

type lazySessionStore struct {
	once  sync.Once
	store challengeSessionStore
	err   error
}

func (s *lazySessionStore) init() error {
	s.once.Do(func() {
		s.store = newConfiguredSessionStore()
	})
	return s.err
}

func (s *lazySessionStore) Set(ctx context.Context, key string, v *webauthn.SessionData) error {
	if err := s.init(); err != nil {
		return err
	}
	return s.store.Set(ctx, key, v)
}

func (s *lazySessionStore) Get(ctx context.Context, key string) (*sessionEnvelope, error) {
	if err := s.init(); err != nil {
		return nil, err
	}
	return s.store.Get(ctx, key)
}

func (s *lazySessionStore) Consume(ctx context.Context, key string) (*sessionEnvelope, error) {
	if err := s.init(); err != nil {
		return nil, err
	}
	return s.store.Consume(ctx, key)
}

func (s *lazySessionStore) Delete(ctx context.Context, key string) error {
	if err := s.init(); err != nil {
		return err
	}
	return s.store.Delete(ctx, key)
}

var challengeSessions challengeSessionStore = &lazySessionStore{}

func newConfiguredSessionStore() challengeSessionStore {
	ttl := time.Duration(settingssvc.GetInt("auth.passkey.session_ttl_seconds", int(defaultPasskeySessionTTL/time.Second))) * time.Second
	if ttl <= 0 {
		ttl = defaultPasskeySessionTTL
	}
	capacity := settingssvc.GetInt("auth.passkey.session_capacity", defaultPasskeySessionCapacity)
	if capacity <= 0 {
		capacity = defaultPasskeySessionCapacity
	}
	return newDBSessionStore(common.DB(), ttl, capacity)
}

func sessionStoreCapacity(store challengeSessionStore) int {
	switch t := store.(type) {
	case *sessionStoreMap:
		return t.capacity
	case *dbSessionStore:
		return t.capacity
	default:
		return 0
	}
}

func sessionStoreKeysByCreatedAt(store *sessionStoreMap) []string {
	store.mu.Lock()
	defer store.mu.Unlock()
	keys := make([]string, 0, len(store.m))
	for k := range store.m {
		keys = append(keys, k)
	}
	sort.Slice(keys, func(i, j int) bool { return store.m[keys[i]].CreatedAt.Before(store.m[keys[j]].CreatedAt) })
	return keys
}
