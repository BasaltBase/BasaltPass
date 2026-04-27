package user

import (
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupUserServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.Tenant{}, &model.TenantUser{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func TestGetProfileUsesUserTenantIDForRegularUser(t *testing.T) {
	db := setupUserServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Acme",
		Code:   "acme",
		Status: model.TenantStatusActive,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	u := model.User{
		Email:        "member@example.com",
		PasswordHash: "x",
		TenantID:     tenant.ID,
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	svc := Service{}
	profile, err := svc.GetProfile(u.ID, 0)
	if err != nil {
		t.Fatalf("GetProfile failed: %v", err)
	}
	if profile.TenantID == nil {
		t.Fatalf("expected tenant_id in profile")
	}
	if *profile.TenantID != tenant.ID {
		t.Fatalf("expected tenant_id %d, got %d", tenant.ID, *profile.TenantID)
	}
	if !profile.HasTenant {
		t.Fatalf("expected has_tenant=true for regular tenant user")
	}
}

func TestGetProfileDoesNotDeriveTenantContextFromTenantUsersForPlatformAdmin(t *testing.T) {
	db := setupUserServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Org",
		Code:   "org",
		Status: model.TenantStatusActive,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	u := model.User{
		Email:        "owner@example.com",
		PasswordHash: "x",
		TenantID:     0,
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	ta := model.TenantUser{
		UserID:   u.ID,
		TenantID: tenant.ID,
		Role:     model.TenantRoleOwner,
	}
	if err := db.Create(&ta).Error; err != nil {
		t.Fatalf("create tenant_user failed: %v", err)
	}

	svc := Service{}
	profile, err := svc.GetProfile(u.ID, 0)
	if err != nil {
		t.Fatalf("GetProfile failed: %v", err)
	}
	if profile.HasTenant {
		t.Fatalf("expected has_tenant=false for platform admin account")
	}
	if profile.TenantID != nil {
		t.Fatalf("expected tenant_id to stay nil for platform admin account, got %v", *profile.TenantID)
	}
	if profile.TenantRole != "" {
		t.Fatalf("expected tenant_role to be empty for platform admin account, got %q", profile.TenantRole)
	}
}
