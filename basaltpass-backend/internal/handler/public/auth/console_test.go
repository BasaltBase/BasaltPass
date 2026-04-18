package auth

import (
	"testing"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupConsoleAuthTestDB(t *testing.T) *gorm.DB {
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

func TestUserHasTenantAdminAccess_GlobalUserUsesTenantUserRole(t *testing.T) {
	db := setupConsoleAuthTestDB(t)

	tenant := model.Tenant{Name: "Acme", Code: "acme", Status: model.TenantStatusActive}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("create tenant failed: %v", err)
	}

	globalUser := model.User{Email: "global@example.com", PasswordHash: "x", TenantID: 0}
	if err := db.Create(&globalUser).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	if err := db.Create(&model.TenantUser{
		UserID:   globalUser.ID,
		TenantID: tenant.ID,
		Role:     model.TenantRoleAdmin,
	}).Error; err != nil {
		t.Fatalf("create tenant_user failed: %v", err)
	}

	ok, err := userHasTenantAdminAccess(globalUser.ID, tenant.ID)
	if err != nil {
		t.Fatalf("userHasTenantAdminAccess failed: %v", err)
	}
	if !ok {
		t.Fatalf("expected admin access via tenant_user for global user")
	}
}

func TestUserDefaultTenantIDForAdminConsole_UsesEarliestAdminMembership(t *testing.T) {
	db := setupConsoleAuthTestDB(t)

	tenantA := model.Tenant{Name: "Tenant A", Code: "tenant-a", Status: model.TenantStatusActive}
	tenantB := model.Tenant{Name: "Tenant B", Code: "tenant-b", Status: model.TenantStatusActive}
	if err := db.Create(&tenantA).Error; err != nil {
		t.Fatalf("create tenant A failed: %v", err)
	}
	if err := db.Create(&tenantB).Error; err != nil {
		t.Fatalf("create tenant B failed: %v", err)
	}

	globalUser := model.User{Email: "multi@example.com", PasswordHash: "x", TenantID: 0}
	if err := db.Create(&globalUser).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	base := time.Now().UTC().Add(-2 * time.Hour)
	memberships := []model.TenantUser{
		{UserID: globalUser.ID, TenantID: tenantA.ID, Role: model.TenantRoleOwner, CreatedAt: base},
		{UserID: globalUser.ID, TenantID: tenantB.ID, Role: model.TenantRoleAdmin, CreatedAt: base.Add(time.Hour)},
	}
	for _, membership := range memberships {
		if err := db.Create(&membership).Error; err != nil {
			t.Fatalf("create tenant_user failed: %v", err)
		}
	}

	tenantID, err := userDefaultTenantIDForAdminConsole(globalUser.ID)
	if err != nil {
		t.Fatalf("userDefaultTenantIDForAdminConsole failed: %v", err)
	}
	if tenantID != tenantA.ID {
		t.Fatalf("expected earliest admin membership tenant id %d, got %d", tenantA.ID, tenantID)
	}
}
