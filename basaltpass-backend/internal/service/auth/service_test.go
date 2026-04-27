package auth

import (
	"errors"
	"os"
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func TestGenerateTokenPair(t *testing.T) {
	// 设置测试环境变量
	os.Setenv("JWT_SECRET", "test-secret-for-unit-tests")

	// 使用不需要数据库的函数进行测试
	p, err := GenerateTokenPairWithTenantAndScope(1, 1, ConsoleScopeUser)
	if err != nil || p.AccessToken == "" || p.RefreshToken == "" {
		t.Fatalf("token pair invalid %v", err)
	}
}

func setupAuthLoginTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	os.Setenv("JWT_SECRET", "test-secret-for-unit-tests")

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.Passkey{}, &model.TenantUser{}, &model.UserTenantTOTP{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func mustPasswordHash(t *testing.T, raw string) string {
	t.Helper()
	h, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
	if err != nil {
		t.Fatalf("generate password hash failed: %v", err)
	}
	return string(h)
}

func TestLoginV2GlobalPortalRejectsTenantOnlyAccount(t *testing.T) {
	db := setupAuthLoginTestDB(t)

	user := model.User{
		TenantID:      100,
		Email:         "tenant-only@example.com",
		PasswordHash:  mustPasswordHash(t, "pass-123"),
		Nickname:      "tenant-user",
		EmailVerified: true,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create tenant user failed: %v", err)
	}

	_, err := Service{}.LoginV2(LoginRequest{
		EmailOrPhone: user.Email,
		Password:     "pass-123",
		TenantID:     0,
		Scope:        ConsoleScopeUser,
	})

	if !errors.Is(err, ErrTenantAccountOnly) {
		t.Fatalf("expected ErrTenantAccountOnly, got %v", err)
	}
}

func TestLoginV2GlobalPortalAllowsGlobalAccount(t *testing.T) {
	db := setupAuthLoginTestDB(t)

	user := model.User{
		TenantID:      0,
		Email:         "global@example.com",
		PasswordHash:  mustPasswordHash(t, "pass-456"),
		Nickname:      "global-user",
		EmailVerified: true,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create global user failed: %v", err)
	}

	res, err := Service{}.LoginV2(LoginRequest{
		EmailOrPhone: user.Email,
		Password:     "pass-456",
		TenantID:     0,
		Scope:        ConsoleScopeUser,
	})
	if err != nil {
		t.Fatalf("global login should succeed, got error: %v", err)
	}
	if res.UserID != user.ID {
		t.Fatalf("expected user id %d, got %d", user.ID, res.UserID)
	}
}

func TestLoginV2GlobalPortalAllowsRegularUserInAdminScope(t *testing.T) {
	db := setupAuthLoginTestDB(t)

	user := model.User{
		TenantID:      0,
		Email:         "regular-admin-scope@example.com",
		PasswordHash:  mustPasswordHash(t, "pass-789"),
		Nickname:      "regular-user",
		EmailVerified: true,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	res, err := Service{}.LoginV2(LoginRequest{
		EmailOrPhone: user.Email,
		Password:     "pass-789",
		TenantID:     0,
		Scope:        ConsoleScopeAdmin,
	})
	if err != nil {
		t.Fatalf("admin-scope login for regular global user should succeed, got error: %v", err)
	}
	if res.UserID != user.ID {
		t.Fatalf("expected user id %d, got %d", user.ID, res.UserID)
	}

	accessToken, parseErr := ParseToken(res.AccessToken)
	if parseErr != nil || accessToken == nil || !accessToken.Valid {
		t.Fatalf("access token invalid: %v", parseErr)
	}
	claims, ok := accessToken.Claims.(jwt.MapClaims)
	if !ok {
		t.Fatalf("unexpected claims type: %T", accessToken.Claims)
	}
	if scope, _ := claims["scp"].(string); scope != ConsoleScopeAdmin {
		t.Fatalf("expected scope %q, got %q", ConsoleScopeAdmin, scope)
	}
	if tenantID, _ := claims["tid"].(float64); uint(tenantID) != 0 {
		t.Fatalf("expected tenant id 0, got %v", claims["tid"])
	}
}
