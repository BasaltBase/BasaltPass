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

	if err := db.AutoMigrate(
		&model.User{},
		&model.Tenant{},
		&model.TenantUser{},
		&model.TenantQuota{},
		&model.TenantRbacPermission{},
		&model.TenantRbacRole{},
		&model.TenantRbacRolePermission{},
		&model.TenantUserRbacRole{},
	); err != nil {
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
	if role != string(model.TenantRoleUser) {
		t.Fatalf("expected user_role %q, got %q", model.TenantRoleUser, role)
	}
}

func TestGetUserTenantsPrefersTenantUserRoleWhenPresent(t *testing.T) {
	db := setupTenantServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Org",
		Code:   "org",
		Status: model.TenantStatusActive,
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
	role, ok := roleValue.(string)
	if !ok {
		t.Fatalf("expected user_role to be string, got %T", roleValue)
	}
	if role != string(model.TenantRoleOwner) {
		t.Fatalf("expected user_role %q, got %q", model.TenantRoleOwner, role)
	}
}

func TestCreateTenantBootstrapsTenantRBAC(t *testing.T) {
	db := setupTenantServiceTestDB(t)

	owner := model.User{
		Email:        "creator@example.com",
		PasswordHash: "x",
	}
	if err := db.Create(&owner).Error; err != nil {
		t.Fatalf("create owner failed: %v", err)
	}

	svc := NewTenantService()
	if _, err := svc.CreateTenant(owner.ID, &CreateTenantRequest{Name: "RBAC Tenant"}); err != nil {
		t.Fatalf("CreateTenant failed: %v", err)
	}

	var tenant model.Tenant
	if err := db.Where("name = ?", "RBAC Tenant").First(&tenant).Error; err != nil {
		t.Fatalf("load tenant failed: %v", err)
	}

	var updatedOwner model.User
	if err := db.First(&updatedOwner, owner.ID).Error; err != nil {
		t.Fatalf("reload owner failed: %v", err)
	}
	if updatedOwner.TenantID != tenant.ID {
		t.Fatalf("expected owner tenant_id to be %d, got %d", tenant.ID, updatedOwner.TenantID)
	}

	var permissionCount int64
	if err := db.Model(&model.TenantRbacPermission{}).Where("tenant_id = ?", tenant.ID).Count(&permissionCount).Error; err != nil {
		t.Fatalf("count permissions failed: %v", err)
	}
	if permissionCount == 0 {
		t.Fatalf("expected bootstrapped tenant permissions")
	}

	var ownerRole model.TenantRbacRole
	if err := db.Where("tenant_id = ? AND code = ?", tenant.ID, "owner").First(&ownerRole).Error; err != nil {
		t.Fatalf("load owner role failed: %v", err)
	}

	var ownerAssignment model.TenantUserRbacRole
	if err := db.Where("tenant_id = ? AND user_id = ? AND role_id = ?", tenant.ID, owner.ID, ownerRole.ID).First(&ownerAssignment).Error; err != nil {
		t.Fatalf("expected owner rbac role assignment: %v", err)
	}

	var ownerPermissionLinks int64
	if err := db.Model(&model.TenantRbacRolePermission{}).Where("role_id = ?", ownerRole.ID).Count(&ownerPermissionLinks).Error; err != nil {
		t.Fatalf("count owner role permissions failed: %v", err)
	}
	if ownerPermissionLinks != permissionCount {
		t.Fatalf("expected owner role to have all permissions, got %d of %d", ownerPermissionLinks, permissionCount)
	}
}
