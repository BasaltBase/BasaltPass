package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupAdminMiddlewareTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db failed: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}); err != nil {
		t.Fatalf("migrate user failed: %v", err)
	}
	common.SetDBForTest(db)
	return db
}

func adminGuardApp(locals map[string]interface{}) *fiber.App {
	app := fiber.New()
	app.Use(func(c *fiber.Ctx) error {
		for k, v := range locals {
			c.Locals(k, v)
		}
		return c.Next()
	})
	app.Use(SuperAdminMiddleware())
	app.Get("/", func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	return app
}

func TestSuperAdminMiddleware_RejectsNonAdminScope(t *testing.T) {
	setupAdminMiddlewareTestDB(t)
	app := adminGuardApp(map[string]interface{}{"scope": "tenant", "userID": uint(1)})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
	if body["code"] != "admin_scope_required" {
		t.Fatalf("expected admin_scope_required, got %#v", body["code"])
	}
}

func TestSuperAdminMiddleware_RejectsMissingUserContext(t *testing.T) {
	setupAdminMiddlewareTestDB(t)
	app := adminGuardApp(map[string]interface{}{"scope": "admin"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
	if body["code"] != "auth_unauthorized" {
		t.Fatalf("expected auth_unauthorized, got %#v", body["code"])
	}
}

func TestSuperAdminMiddleware_RejectsUnknownUser(t *testing.T) {
	setupAdminMiddlewareTestDB(t)
	app := adminGuardApp(map[string]interface{}{"scope": "admin", "userID": uint(9999)})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401, got %d", resp.StatusCode)
	}
	if body["code"] != "admin_user_not_found" {
		t.Fatalf("expected admin_user_not_found, got %#v", body["code"])
	}
}

func TestSuperAdminMiddleware_RejectsNonSuperAdmin(t *testing.T) {
	db := setupAdminMiddlewareTestDB(t)
	isAdmin := false
	user := model.User{Email: "user@example.com", IsSystemAdmin: &isAdmin}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	app := adminGuardApp(map[string]interface{}{"scope": "admin", "userID": user.ID})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected 403, got %d", resp.StatusCode)
	}
	if body["code"] != "admin_superadmin_required" {
		t.Fatalf("expected admin_superadmin_required, got %#v", body["code"])
	}
}

func TestSuperAdminMiddleware_AllowsSuperAdmin(t *testing.T) {
	db := setupAdminMiddlewareTestDB(t)
	isAdmin := true
	user := model.User{Email: "admin@example.com", IsSystemAdmin: &isAdmin}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	app := adminGuardApp(map[string]interface{}{"scope": "admin", "userID": user.ID})
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
