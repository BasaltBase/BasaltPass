package tenant

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func setupTenantUserUUIDHandlerTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open sqlite: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.TenantUser{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func newTenantUserUUIDTestApp(tenantID uint) *fiber.App {
	app := fiber.New()
	app.Get("/tenant/users/by-uuid/:user_uuid", func(c *fiber.Ctx) error {
		c.Locals("tenantID", tenantID)
		return GetTenantUserByUUIDHandler(c)
	})
	return app
}

func TestGetTenantUserByUUIDHandler_Success(t *testing.T) {
	db := setupTenantUserUUIDHandlerTestDB(t)
	tenantID := uint(2001)

	u := model.User{
		TenantID:      tenantID,
		Email:         "tenant-uuid-user@example.com",
		PasswordHash:  "x",
		Nickname:      "tenant-user",
		EmailVerified: true,
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	app := newTenantUserUUIDTestApp(tenantID)
	req := httptest.NewRequest(http.MethodGet, "/tenant/users/by-uuid/"+u.UserUUID, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}

	var payload struct {
		User TenantUserResponse `json:"user"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&payload); err != nil {
		t.Fatalf("decode response failed: %v", err)
	}
	if payload.User.ID != u.ID {
		t.Fatalf("expected id %d, got %d", u.ID, payload.User.ID)
	}
	if payload.User.UserUUID != u.UserUUID {
		t.Fatalf("expected user_uuid %q, got %q", u.UserUUID, payload.User.UserUUID)
	}
}

func TestGetTenantUserByUUIDHandler_InvalidUUID(t *testing.T) {
	setupTenantUserUUIDHandlerTestDB(t)
	app := newTenantUserUUIDTestApp(1)

	req := httptest.NewRequest(http.MethodGet, "/tenant/users/by-uuid/not-a-uuid", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusBadRequest {
		t.Fatalf("expected 400, got %d", resp.StatusCode)
	}
}

func TestGetTenantUserByUUIDHandler_WrongTenant(t *testing.T) {
	db := setupTenantUserUUIDHandlerTestDB(t)
	ownerTenantID := uint(3001)
	otherTenantID := uint(3002)

	u := model.User{
		TenantID:     ownerTenantID,
		Email:        "other-tenant-user@example.com",
		PasswordHash: "x",
	}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	app := newTenantUserUUIDTestApp(otherTenantID)
	req := httptest.NewRequest(http.MethodGet, "/tenant/users/by-uuid/"+u.UserUUID, nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != fiber.StatusNotFound {
		t.Fatalf("expected 404, got %d", resp.StatusCode)
	}
}
