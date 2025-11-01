package auth

import (
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func TestGenerateTokenPair(t *testing.T) {
	p, err := GenerateTokenPair(1)
	if err != nil || p.AccessToken == "" || p.RefreshToken == "" {
		t.Fatalf("token pair invalid %v", err)
	}
}

func TestLoginV2WithoutSecondFactor(t *testing.T) {
	setupAuthTestDB(t)

	svc := Service{}
	_, err := svc.Register(RegisterRequest{Email: "user@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register user: %v", err)
	}

	result, err := svc.LoginV2(LoginRequest{EmailOrPhone: "user@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
	if result.Need2FA {
		t.Fatalf("expected login without 2fa, got %+v", result)
	}
	if result.AccessToken == "" || result.RefreshToken == "" {
		t.Fatalf("expected tokens to be returned, got %+v", result)
	}
}

func TestRegisterAssignsDefaultTenantAndRoles(t *testing.T) {
	setupAuthTestDB(t)

	svc := Service{}

	first, err := svc.Register(RegisterRequest{Email: "first@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register first user: %v", err)
	}

	var tenant model.Tenant
	if err := common.DB().Where("code = ?", "default").First(&tenant).Error; err != nil {
		t.Fatalf("default tenant not created: %v", err)
	}

	var firstMembership model.TenantAdmin
	if err := common.DB().Where("user_id = ? AND tenant_id = ?", first.ID, tenant.ID).First(&firstMembership).Error; err != nil {
		t.Fatalf("first user membership missing: %v", err)
	}
	if firstMembership.Role != model.TenantRoleOwner {
		t.Fatalf("expected first user to be owner, got %s", firstMembership.Role)
	}

	var adminRole model.Role
	if err := common.DB().Where("code = ? AND tenant_id = ?", "admin", tenant.ID).First(&adminRole).Error; err != nil {
		t.Fatalf("admin role missing: %v", err)
	}
	if err := common.DB().Where("user_id = ? AND role_id = ?", first.ID, adminRole.ID).First(&model.UserRole{}).Error; err != nil {
		t.Fatalf("first user admin role missing: %v", err)
	}

	second, err := svc.Register(RegisterRequest{Email: "second@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("register second user: %v", err)
	}

	var secondMembership model.TenantAdmin
	if err := common.DB().Where("user_id = ? AND tenant_id = ?", second.ID, tenant.ID).First(&secondMembership).Error; err != nil {
		t.Fatalf("second user membership missing: %v", err)
	}
	if secondMembership.Role != model.TenantRoleMember {
		t.Fatalf("expected second user to be member, got %s", secondMembership.Role)
	}

	var userRole model.Role
	if err := common.DB().Where("code = ? AND tenant_id = ?", "user", tenant.ID).First(&userRole).Error; err != nil {
		t.Fatalf("user role missing: %v", err)
	}
	if err := common.DB().Where("user_id = ? AND role_id = ?", second.ID, userRole.ID).First(&model.UserRole{}).Error; err != nil {
		t.Fatalf("second user user role missing: %v", err)
	}
}

func setupAuthTestDB(t *testing.T) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open in-memory db: %v", err)
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.Passkey{},
		&model.Tenant{},
		&model.TenantAdmin{},
		&model.Role{},
		&model.UserRole{},
		&model.AuditLog{},
	); err != nil {
		t.Fatalf("auto migrate: %v", err)
	}

	common.SetDBForTest(db)
}
