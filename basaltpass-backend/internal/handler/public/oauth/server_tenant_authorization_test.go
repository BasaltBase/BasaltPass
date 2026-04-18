package oauth

import (
	"testing"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

func setupOAuthTenantTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.Tenant{}, &model.TenantUser{}, &model.App{}, &model.OAuthClient{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func TestEvaluateUserTenantAuthorizationJoinThenAllow(t *testing.T) {
	db := setupOAuthTenantTestDB(t)

	tenant := model.Tenant{Name: "Tenant-A", Code: "tenant-a", Status: model.TenantStatusActive}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	globalUser := model.User{TenantID: 0, Email: "global-join@example.com", PasswordHash: "x"}
	if err := db.Create(&globalUser).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	app := model.App{TenantID: tenant.ID, Name: "Join App", Status: model.AppStatusActive}
	if err := db.Create(&app).Error; err != nil {
		t.Fatalf("create app failed: %v", err)
	}

	client := model.OAuthClient{
		AppID:        app.ID,
		ClientID:     "client-join",
		ClientSecret: "secret",
		RedirectURIs: "https://example.com/callback",
		IsActive:     true,
		CreatedBy:    globalUser.ID,
	}
	if err := db.Create(&client).Error; err != nil {
		t.Fatalf("create client failed: %v", err)
	}

	svc := NewOAuthServerService()

	decision, err := svc.EvaluateUserTenantAuthorization(globalUser.ID, &client)
	if err != nil {
		t.Fatalf("evaluate authorization failed: %v", err)
	}
	if decision.Allowed {
		t.Fatalf("expected not allowed before join")
	}
	if !decision.JoinRequired {
		t.Fatalf("expected join_required=true for global user")
	}
	if decision.TenantID != tenant.ID {
		t.Fatalf("expected tenant id %d, got %d", tenant.ID, decision.TenantID)
	}

	if err := svc.EnsureUserTenantIdentity(globalUser.ID, tenant.ID, model.TenantRoleMember); err != nil {
		t.Fatalf("ensure tenant identity failed: %v", err)
	}

	decision, err = svc.EvaluateUserTenantAuthorization(globalUser.ID, &client)
	if err != nil {
		t.Fatalf("re-evaluate authorization failed: %v", err)
	}
	if !decision.Allowed {
		t.Fatalf("expected allowed after join")
	}
	if decision.JoinRequired {
		t.Fatalf("expected join_required=false after membership creation")
	}
}

func TestParseUserIDFromJWTForSelectedAccessToken(t *testing.T) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": float64(42),
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	})
	signed, err := token.SignedString(common.MustJWTSecret())
	if err != nil {
		t.Fatalf("sign token failed: %v", err)
	}

	uid, ok := parseUserIDFromJWT(signed)
	if !ok {
		t.Fatalf("expected parse success for valid selected_access_token")
	}
	if uid != 42 {
		t.Fatalf("expected user id 42, got %d", uid)
	}

	if _, ok := parseUserIDFromJWT("not-a-token"); ok {
		t.Fatalf("expected parse failure for invalid token")
	}
}
