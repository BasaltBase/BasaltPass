package user

import (
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/driver/sqlite"
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
		Plan:   model.TenantPlanPro,
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
	profile, err := svc.GetProfile(u.ID)
	if err != nil {
		t.Fatalf("GetProfile failed: %v", err)
	}
	if profile.TenantID == nil {
		t.Fatalf("expected tenant_id in profile")
	}
	if *profile.TenantID != tenant.ID {
		t.Fatalf("expected tenant_id %d, got %d", tenant.ID, *profile.TenantID)
	}
	if profile.HasTenant {
		t.Fatalf("expected has_tenant=false for regular user without tenant_users row")
	}
}

func TestGetProfileFallsBackToTenantUserTenantID(t *testing.T) {
	db := setupUserServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Org",
		Code:   "org",
		Status: model.TenantStatusActive,
		Plan:   model.TenantPlanEnterprise,
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
	profile, err := svc.GetProfile(u.ID)
	if err != nil {
		t.Fatalf("GetProfile failed: %v", err)
	}
	if !profile.HasTenant {
		t.Fatalf("expected has_tenant=true")
	}
	if profile.TenantID == nil {
		t.Fatalf("expected tenant_id in profile")
	}
	if *profile.TenantID != tenant.ID {
		t.Fatalf("expected tenant_id %d, got %d", tenant.ID, *profile.TenantID)
	}
	if profile.TenantRole != string(model.TenantRoleOwner) {
		t.Fatalf("expected tenant_role %q, got %q", model.TenantRoleOwner, profile.TenantRole)
	}
}
