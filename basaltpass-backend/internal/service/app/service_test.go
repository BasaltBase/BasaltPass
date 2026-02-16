package app

import (
	"fmt"
	"strings"
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupAppServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.Tenant{},
		&model.TenantUser{},
		&model.App{},
		&model.OAuthClient{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func TestCreateAppCreatesTenantUserWithUserRole(t *testing.T) {
	db := setupAppServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Acme",
		Code:   "acme-create-app",
		Status: model.TenantStatusActive,
		Plan:   model.TenantPlanFree,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	user := model.User{
		Email:        "creator@example.com",
		PasswordHash: "x",
		TenantID:     tenant.ID,
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	svc := NewAppService()
	appResp, err := svc.CreateApp(tenant.ID, user.ID, &CreateAppRequest{
		Name:         "test app",
		RedirectURIs: []string{"https://example.com/callback"},
	})
	if err != nil {
		t.Fatalf("CreateApp failed: %v", err)
	}

	if appResp == nil || appResp.ID == 0 {
		t.Fatalf("expected created app response with id")
	}

	var tenantUser model.TenantUser
	if err := db.Where("user_id = ? AND tenant_id = ?", user.ID, tenant.ID).First(&tenantUser).Error; err != nil {
		t.Fatalf("expected tenant_user record, query failed: %v", err)
	}
	if tenantUser.Role != model.TenantRoleUser {
		t.Fatalf("expected tenant_user role %q, got %q", model.TenantRoleUser, tenantUser.Role)
	}

	var client model.OAuthClient
	if err := db.Where("app_id = ?", appResp.ID).First(&client).Error; err != nil {
		t.Fatalf("expected oauth client for app, query failed: %v", err)
	}
	if client.CreatedBy != user.ID {
		t.Fatalf("expected oauth client created_by=%d, got %d", user.ID, client.CreatedBy)
	}
}

func TestCreateAppKeepsExistingTenantUserRole(t *testing.T) {
	db := setupAppServiceTestDB(t)

	tenant := model.Tenant{
		Name:   "Beta",
		Code:   "beta-create-app",
		Status: model.TenantStatusActive,
		Plan:   model.TenantPlanPro,
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

	if err := db.Create(&model.TenantUser{
		UserID:   user.ID,
		TenantID: tenant.ID,
		Role:     model.TenantRoleOwner,
	}).Error; err != nil {
		t.Fatalf("create existing tenant_user failed: %v", err)
	}

	svc := NewAppService()
	_, err := svc.CreateApp(tenant.ID, user.ID, &CreateAppRequest{
		Name:         "existing-role-app",
		RedirectURIs: []string{"https://example.com/callback"},
	})
	if err != nil {
		t.Fatalf("CreateApp failed: %v", err)
	}

	var tenantUsers []model.TenantUser
	if err := db.Where("user_id = ? AND tenant_id = ?", user.ID, tenant.ID).Find(&tenantUsers).Error; err != nil {
		t.Fatalf("query tenant_users failed: %v", err)
	}
	if len(tenantUsers) != 1 {
		t.Fatalf("expected 1 tenant_user row, got %d", len(tenantUsers))
	}
	if tenantUsers[0].Role != model.TenantRoleOwner {
		t.Fatalf("expected existing role to stay %q, got %q", model.TenantRoleOwner, tenantUsers[0].Role)
	}
}
