package passkey

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"basaltpass-backend/internal/common"

	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupPasskeySessionTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	require.NoError(t, err)
	common.SetDBForTest(db)
	return db
}

func TestSessionStoreMapRejectsExpiredChallenge(t *testing.T) {
	store := newSessionStoreMap(5*time.Minute, 8)
	now := time.Now()
	store.now = func() time.Time { return now }
	require.NoError(t, store.Set(context.Background(), "expired", &webauthn.SessionData{Challenge: "expired"}))

	now = now.Add(5*time.Minute + time.Millisecond)
	_, err := store.Get(context.Background(), "expired")
	require.ErrorIs(t, err, errSessionNotFound)
	require.Equal(t, 0, store.size())
}

func TestSessionStoreMapConsumeMakesChallengeSingleUse(t *testing.T) {
	store := newSessionStoreMap(5*time.Minute, 8)
	require.NoError(t, store.Set(context.Background(), "once", &webauthn.SessionData{Challenge: "once"}))

	env, err := store.Consume(context.Background(), "once")
	require.NoError(t, err)
	require.Equal(t, "once", env.SessionData.Challenge)

	_, err = store.Consume(context.Background(), "once")
	require.ErrorIs(t, err, errSessionNotFound)
}

func TestSessionStoreMapConcurrentCreationIsBounded(t *testing.T) {
	const capacity = 32
	store := newSessionStoreMap(5*time.Minute, capacity)
	base := time.Now()
	var tick int64
	var tickMu sync.Mutex
	store.now = func() time.Time {
		tickMu.Lock()
		defer tickMu.Unlock()
		tick++
		return base.Add(time.Duration(tick) * time.Microsecond)
	}

	var wg sync.WaitGroup
	for i := 0; i < 256; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			_ = store.Set(context.Background(), fmt.Sprintf("key-%03d", i), &webauthn.SessionData{Challenge: fmt.Sprintf("c-%03d", i)})
		}(i)
	}
	wg.Wait()

	require.LessOrEqual(t, store.size(), capacity)
	keys := sessionStoreKeysByCreatedAt(store)
	require.Len(t, keys, capacity)
	for i := 0; i < capacity; i++ {
		require.Equal(t, fmt.Sprintf("key-%03d", 256-capacity+i), keys[i])
	}
}

func TestDBSessionStoreConsumeMakesChallengeSingleUse(t *testing.T) {
	db := setupPasskeySessionTestDB(t)
	store := newDBSessionStore(db, 5*time.Minute, 8)
	require.NoError(t, store.Set(context.Background(), "db-once", &webauthn.SessionData{Challenge: "db-once"}))

	env, err := store.Consume(context.Background(), "db-once")
	require.NoError(t, err)
	require.Equal(t, "db-once", env.SessionData.Challenge)

	_, err = store.Get(context.Background(), "db-once")
	require.ErrorIs(t, err, errSessionNotFound)
}
