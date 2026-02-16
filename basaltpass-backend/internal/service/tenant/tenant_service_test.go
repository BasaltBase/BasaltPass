package tenant

import (
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTenantServiceTestDB(t *testing.T) *gorm.DB {
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

func TestGetUserTenantsIncludesPrimaryTenantForRegularUser(t *testing.T) {
	db := setupTenantServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Acme",
		Code:   "acme",
		Status: model.TenantStatusActive,
		Plan:   model.TenantPlanPro,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	user := model.User{
		Email:        "member@example.com",
		PasswordHash: "x",
		TenantID:     tenant.ID,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	svc := NewTenantService()
	tenants, err := svc.GetUserTenants(user.ID)
	if err != nil {
		t.Fatalf("GetUserTenants failed: %v", err)
	}
	if len(tenants) != 1 {
		t.Fatalf("expected 1 tenant, got %d", len(tenants))
	}
	if tenants[0].ID != tenant.ID {
		t.Fatalf("expected tenant id %d, got %d", tenant.ID, tenants[0].ID)
	}
	if tenants[0].Name != tenant.Name {
		t.Fatalf("expected tenant name %q, got %q", tenant.Name, tenants[0].Name)
	}

	roleValue, ok := tenants[0].Metadata["user_role"]
	if !ok {
		t.Fatalf("expected user_role in metadata")
	}
	role, ok := roleValue.(string)
	if !ok {
		t.Fatalf("expected user_role to be string, got %T", roleValue)
	}
	if role != string(model.TenantRoleMember) {
		t.Fatalf("expected user_role %q, got %q", model.TenantRoleMember, role)
	}
}

func TestGetUserTenantsPrefersTenantUserRoleWhenPresent(t *testing.T) {
	db := setupTenantServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Org",
		Code:   "org",
		Status: model.TenantStatusActive,
		Plan:   model.TenantPlanEnterprise,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	user := model.User{
		Email:        "owner@example.com",
		PasswordHash: "x",
		TenantID:     tenant.ID,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	ta := model.TenantUser{
		UserID:   user.ID,
		TenantID: tenant.ID,
		Role:     model.TenantRoleOwner,
	}
	if err := db.Create(&ta).Error; err != nil {
		t.Fatalf("create tenant_user failed: %v", err)
	}

	svc := NewTenantService()
	tenants, err := svc.GetUserTenants(user.ID)
	if err != nil {
		t.Fatalf("GetUserTenants failed: %v", err)
	}
	if len(tenants) != 1 {
		t.Fatalf("expected 1 tenant, got %d", len(tenants))
	}

	roleValue, ok := tenants[0].Metadata["user_role"]
	if !ok {
		t.Fatalf("expected user_role in metadata")
	}
	role, ok := roleValue.(model.TenantRole)
	if !ok {
		t.Fatalf("expected user_role to be model.TenantRole, got %T", roleValue)
	}
	if role != model.TenantRoleOwner {
		t.Fatalf("expected user_role %q, got %q", model.TenantRoleOwner, role)
	}
}
