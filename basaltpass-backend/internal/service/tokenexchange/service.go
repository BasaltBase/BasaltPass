package tokenexchange

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"errors"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// Errors returned by the token exchange service.
var (
	ErrInvalidSubjectToken = errors.New("invalid_token")
	ErrTokenExpired        = errors.New("token_expired")
	ErrTokenOwnership      = errors.New("subject_token_client_mismatch")
	ErrTargetAppNotFound   = errors.New("target_app_not_found")
	ErrNoTrustRelation     = errors.New("no_trust_relationship")
	ErrUserNotAuthorized   = errors.New("user_not_authorized_for_target_app")
	ErrInsufficientScope   = errors.New("insufficient_scope")
)

// ExchangeRequest holds the parsed Token Exchange request parameters.
type ExchangeRequest struct {
	SubjectToken     string // the access token being exchanged
	SubjectTokenType string // urn:ietf:params:oauth:token-type:access_token
	Resource         string // target app_id or app_key
	Scope            string // requested scopes (space-separated)
}

// ExchangeResult is returned on a successful token exchange.
type ExchangeResult struct {
	AccessToken     string `json:"access_token"`
	IssuedTokenType string `json:"issued_token_type"`
	TokenType       string `json:"token_type"`
	ExpiresIn       int    `json:"expires_in"`
	Scope           string `json:"scope"`
}

// Service implements the OAuth 2.0 Token Exchange (RFC 8693) logic.
type Service struct {
	db    *gorm.DB
	cache *trustCache
}

// NewService creates a new Token Exchange service.
func NewService() *Service {
	return &Service{
		db:    common.DB(),
		cache: newTrustCache(60 * time.Second),
	}
}

// Exchange performs the full token exchange flow:
//  1. Validate client credentials (already done by caller)
//  2. Validate the subject_token
//  3. Resolve target app from resource parameter
//  4. Check CrossAppTrust
//  5. Verify user has authorized target app
//  6. Narrow scope
//  7. Issue a new short-lived access token
//  8. Write audit log
func (s *Service) Exchange(clientID string, clientAppID uint, clientTenantID uint, req ExchangeRequest, ip string) (*ExchangeResult, error) {
	// Step 1: Validate subject_token
	var subjectToken model.OAuthAccessToken
	if err := s.db.Where("token = ?", req.SubjectToken).First(&subjectToken).Error; err != nil {
		s.logExchange(clientTenantID, 0, clientID, clientAppID, 0, 0, req.Scope, "", 0, "denied", "invalid subject token", ip)
		return nil, ErrInvalidSubjectToken
	}
	if subjectToken.IsExpired() {
		s.logExchange(clientTenantID, subjectToken.UserID, clientID, clientAppID, 0, 0, req.Scope, "", 0, "denied", "subject token expired", ip)
		return nil, ErrTokenExpired
	}

	// Step 2: Verify subject_token belongs to the requesting client
	if subjectToken.ClientID != clientID {
		s.logExchange(clientTenantID, subjectToken.UserID, clientID, clientAppID, 0, 0, req.Scope, "", 0, "denied", "subject token belongs to different client", ip)
		return nil, ErrTokenOwnership
	}

	userID := subjectToken.UserID
	tenantID := subjectToken.TenantID

	// Step 3: Resolve target app
	targetApp, err := s.resolveTargetApp(req.Resource, tenantID)
	if err != nil {
		s.logExchange(tenantID, userID, clientID, clientAppID, 0, 0, req.Scope, "", 0, "denied", "target app not found: "+req.Resource, ip)
		return nil, ErrTargetAppNotFound
	}

	// Step 4: Check CrossAppTrust
	trust, err := s.findTrust(clientAppID, targetApp.ID, tenantID)
	if err != nil {
		s.logExchange(tenantID, userID, clientID, clientAppID, targetApp.ID, 0, req.Scope, "", 0, "denied", "no trust relationship", ip)
		return nil, ErrNoTrustRelation
	}

	// Step 5: Verify user has authorized the target app
	var appUserCount int64
	if err := s.db.Model(&model.AppUser{}).
		Where("app_id = ? AND user_id = ? AND status = ?", targetApp.ID, userID, model.AppUserStatusActive).
		Count(&appUserCount).Error; err != nil || appUserCount == 0 {
		s.logExchange(tenantID, userID, clientID, clientAppID, targetApp.ID, trust.ID, req.Scope, "", 0, "denied", "user not authorized for target app", ip)
		return nil, ErrUserNotAuthorized
	}

	// Step 6: Narrow scope
	grantedScopes := s.narrowScopes(req.Scope, trust.AllowedScopes)
	if len(grantedScopes) == 0 {
		s.logExchange(tenantID, userID, clientID, clientAppID, targetApp.ID, trust.ID, req.Scope, "", 0, "denied", "no overlapping scopes", ip)
		return nil, ErrInsufficientScope
	}
	grantedScopeStr := strings.Join(grantedScopes, " ")

	// Step 7: Determine TTL
	ttl := trust.MaxTokenTTL
	if ttl <= 0 {
		ttl = 300
	}
	if ttl > 600 {
		ttl = 600 // hard cap at 10 minutes
	}

	// Step 8: Resolve the target app's OAuth client_id for the token record
	targetClientID := s.resolveTargetClientID(targetApp.ID)

	// Step 9: Generate the cross-app token
	tokenStr, err := model.GenerateCrossAppToken()
	if err != nil {
		return nil, err
	}

	accessToken := &model.OAuthAccessToken{
		Token:         tokenStr,
		ClientID:      targetClientID, // the token is "for" the target app
		UserID:        userID,
		TenantID:      tenantID,
		AppID:         targetApp.ID,
		Scopes:        grantedScopeStr,
		ExpiresAt:     time.Now().Add(time.Duration(ttl) * time.Second),
		ActorClientID: clientID,
		ActorAppID:    clientAppID,
		IsExchanged:   true,
	}
	if err := s.db.Create(accessToken).Error; err != nil {
		return nil, err
	}

	// Step 10: Audit log
	s.logExchange(tenantID, userID, clientID, clientAppID, targetApp.ID, trust.ID, req.Scope, grantedScopeStr, ttl, "granted", "", ip)

	return &ExchangeResult{
		AccessToken:     tokenStr,
		IssuedTokenType: "urn:ietf:params:oauth:token-type:access_token",
		TokenType:       "Bearer",
		ExpiresIn:       ttl,
		Scope:           grantedScopeStr,
	}, nil
}

// resolveTargetApp finds an app by its app_id column value or by matching
// against the importer convention (.basalt app_key stored in metadata or as
// the string ID of the app record).
func (s *Service) resolveTargetApp(resource string, tenantID uint) (*model.App, error) {
	resource = strings.TrimSpace(resource)
	if resource == "" {
		return nil, ErrTargetAppNotFound
	}

	var app model.App

	// Try exact name match within the tenant (the .basalt convention uses
	// display_name which maps to the App.Name field).
	if err := s.db.Where("tenant_id = ? AND LOWER(name) = LOWER(?)", tenantID, resource).First(&app).Error; err == nil {
		return &app, nil
	}

	// Fallback: numeric ID
	if err := s.db.Where("id = ? AND tenant_id = ?", resource, tenantID).First(&app).Error; err == nil {
		return &app, nil
	}

	return nil, ErrTargetAppNotFound
}

// findTrust looks up an active CrossAppTrust for the given source→target
// within the tenant, using the in-memory cache first.
func (s *Service) findTrust(sourceAppID, targetAppID, tenantID uint) (*model.CrossAppTrust, error) {
	// Try cache first
	if t := s.cache.get(sourceAppID, targetAppID, tenantID); t != nil {
		return t, nil
	}

	var trust model.CrossAppTrust
	if err := s.db.Where(
		"source_app_id = ? AND target_app_id = ? AND tenant_id = ? AND is_active = ?",
		sourceAppID, targetAppID, tenantID, true,
	).First(&trust).Error; err != nil {
		return nil, ErrNoTrustRelation
	}

	s.cache.set(&trust)
	return &trust, nil
}

// narrowScopes returns the intersection of requested scopes and allowed scopes.
func (s *Service) narrowScopes(requestedStr, allowedStr string) []string {
	requested := splitScopes(requestedStr)
	allowed := splitScopes(allowedStr)

	allowedSet := make(map[string]struct{}, len(allowed))
	for _, sc := range allowed {
		allowedSet[sc] = struct{}{}
	}

	// If the trust allows "*", grant everything requested
	if _, ok := allowedSet["*"]; ok {
		return requested
	}

	var result []string
	for _, sc := range requested {
		if _, ok := allowedSet[sc]; ok {
			result = append(result, sc)
		}
	}
	return result
}

func splitScopes(s string) []string {
	// Support both space and comma separated scope lists
	s = strings.ReplaceAll(s, ",", " ")
	parts := strings.Fields(s)
	out := make([]string, 0, len(parts))
	seen := make(map[string]struct{}, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	return out
}

// resolveTargetClientID finds the primary OAuth client_id for the target app.
func (s *Service) resolveTargetClientID(appID uint) string {
	var client model.OAuthClient
	if err := s.db.Select("client_id").
		Where("app_id = ? AND is_active = ?", appID, true).
		Order("id ASC").
		First(&client).Error; err != nil {
		return ""
	}
	return client.ClientID
}

// logExchange writes a TokenExchangeLog record.
func (s *Service) logExchange(tenantID, userID uint, sourceClientID string, sourceAppID, targetAppID, trustID uint, requestedScopes, grantedScopes string, ttl int, status, denyReason, ip string) {
	entry := model.TokenExchangeLog{
		TenantID:        tenantID,
		UserID:          userID,
		SourceClientID:  sourceClientID,
		SourceAppID:     sourceAppID,
		TargetAppID:     targetAppID,
		TrustID:         trustID,
		RequestedScopes: requestedScopes,
		GrantedScopes:   grantedScopes,
		TokenTTL:        ttl,
		Status:          status,
		DenyReason:      denyReason,
		IP:              ip,
	}
	// Best-effort; don't fail the exchange if logging fails.
	_ = s.db.Create(&entry).Error
}

// InvalidateCache clears the trust cache. Call when a trust is created/updated/deleted.
func (s *Service) InvalidateCache() {
	s.cache.flush()
}

// ──────────────────────────────────────
// trustCache — simple in-memory TTL cache
// ──────────────────────────────────────

type trustCacheKey struct {
	sourceAppID uint
	targetAppID uint
	tenantID    uint
}

type trustCacheEntry struct {
	trust     *model.CrossAppTrust
	expiresAt time.Time
}

type trustCache struct {
	mu      sync.RWMutex
	items   map[trustCacheKey]*trustCacheEntry
	ttl     time.Duration
}

func newTrustCache(ttl time.Duration) *trustCache {
	return &trustCache{
		items: make(map[trustCacheKey]*trustCacheEntry),
		ttl:   ttl,
	}
}

func (c *trustCache) get(sourceAppID, targetAppID, tenantID uint) *model.CrossAppTrust {
	c.mu.RLock()
	defer c.mu.RUnlock()

	key := trustCacheKey{sourceAppID, targetAppID, tenantID}
	entry, ok := c.items[key]
	if !ok || time.Now().After(entry.expiresAt) {
		return nil
	}
	return entry.trust
}

func (c *trustCache) set(trust *model.CrossAppTrust) {
	c.mu.Lock()
	defer c.mu.Unlock()

	key := trustCacheKey{trust.SourceAppID, trust.TargetAppID, trust.TenantID}
	c.items[key] = &trustCacheEntry{
		trust:     trust,
		expiresAt: time.Now().Add(c.ttl),
	}
}

func (c *trustCache) flush() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.items = make(map[trustCacheKey]*trustCacheEntry)
}
