package tenant

import (
	"net/http/httptest"
	"strings"
	"testing"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestTenantService(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open database: %v", err)
	}

	if err := db.AutoMigrate(&model.Tenant{}, &model.TenantAdmin{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	originalService := tenantService
	tenantService = &TenantService{db: db}
	t.Cleanup(func() {
		tenantService = originalService
	})

	return db
}

func TestInviteUserHandler_MemberForbidden(t *testing.T) {
	db := setupTestTenantService(t)

	tenant := &model.Tenant{Name: "Test Tenant", Code: "tenant_member"}
	if err := db.Create(tenant).Error; err != nil {
		t.Fatalf("failed to create tenant: %v", err)
	}

	memberID := uint(100)
	if err := db.Create(&model.TenantAdmin{TenantID: tenant.ID, UserID: memberID, Role: model.TenantRoleMember}).Error; err != nil {
		t.Fatalf("failed to create member: %v", err)
	}

	app := fiber.New()
	app.Post("/invite", func(c *fiber.Ctx) error {
		c.Locals("tenantID", tenant.ID)
		c.Locals("userID", memberID)
		return InviteUserHandler(c)
	})

	reqBody := `{"user_id":101,"role":"member"}`
	req := httptest.NewRequest("POST", "/invite", strings.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected status %d, got %d", fiber.StatusForbidden, resp.StatusCode)
	}
}

func TestInviteUserHandler_AdminSuccess(t *testing.T) {
	db := setupTestTenantService(t)

	tenant := &model.Tenant{Name: "Test Tenant", Code: "tenant_admin"}
	if err := db.Create(tenant).Error; err != nil {
		t.Fatalf("failed to create tenant: %v", err)
	}

	adminID := uint(200)
	if err := db.Create(&model.TenantAdmin{TenantID: tenant.ID, UserID: adminID, Role: model.TenantRoleAdmin}).Error; err != nil {
		t.Fatalf("failed to create admin: %v", err)
	}

	app := fiber.New()
	app.Post("/invite", func(c *fiber.Ctx) error {
		c.Locals("tenantID", tenant.ID)
		c.Locals("userID", adminID)
		return InviteUserHandler(c)
	})

	reqBody := `{"user_id":201,"role":"member"}`
	req := httptest.NewRequest("POST", "/invite", strings.NewReader(reqBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("failed to execute request: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status %d, got %d", fiber.StatusOK, resp.StatusCode)
	}

	var invited model.TenantAdmin
	if err := db.Where("tenant_id = ? AND user_id = ?", tenant.ID, 201).First(&invited).Error; err != nil {
		t.Fatalf("failed to find invited user: %v", err)
	}

	if invited.Role != model.TenantRoleMember {
		t.Fatalf("expected invited role %s, got %s", model.TenantRoleMember, invited.Role)
	}
}
