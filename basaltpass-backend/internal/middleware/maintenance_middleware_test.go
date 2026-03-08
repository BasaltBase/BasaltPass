package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/settings"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupMaintenanceTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db failed: %v", err)
	}
	if err := db.AutoMigrate(&model.User{}, &model.TenantUser{}); err != nil {
		t.Fatalf("migrate failed: %v", err)
	}
	common.SetDBForTest(db)
	return db
}

func setMaintenanceForTest(t *testing.T, enabled bool, message string) {
	t.Helper()
	if err := settings.Upsert("maintenance.enabled", enabled, "maintenance", "test"); err != nil {
		t.Fatalf("set maintenance.enabled failed: %v", err)
	}
	if message != "" {
		if err := settings.Upsert("maintenance.message", message, "maintenance", "test"); err != nil {
			t.Fatalf("set maintenance.message failed: %v", err)
		}
	}
}

func maintenanceApp(path string) *fiber.App {
	app := fiber.New()
	app.Use(MaintenanceMiddleware())
	app.Get(path, func(c *fiber.Ctx) error { return c.SendStatus(fiber.StatusOK) })
	return app
}

func TestMaintenanceMiddleware_DisabledAllowsAccess(t *testing.T) {
	setupMaintenanceTestDB(t)
	setMaintenanceForTest(t, false, "")

	app := maintenanceApp("/api/v1/private")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/private", nil)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestMaintenanceMiddleware_AllowsPublicPath(t *testing.T) {
	setupMaintenanceTestDB(t)
	setMaintenanceForTest(t, true, "maintenance")

	app := maintenanceApp("/api/v1/health")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/health", nil)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestMaintenanceMiddleware_BlocksProtectedPath(t *testing.T) {
	setupMaintenanceTestDB(t)
	setMaintenanceForTest(t, true, "维护测试中")

	app := maintenanceApp("/api/v1/private")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/private", nil)
	resp, body := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", resp.StatusCode)
	}
	if body["code"] != "maintenance_mode_enabled" {
		t.Fatalf("expected code maintenance_mode_enabled, got %#v", body["code"])
	}
	if body["error"] != "维护测试中" {
		t.Fatalf("expected message maintenance text, got %#v", body["error"])
	}
}

func TestMaintenanceMiddleware_AllowsSuperAdminBypass(t *testing.T) {
	db := setupMaintenanceTestDB(t)
	setMaintenanceForTest(t, true, "maintenance")

	isAdmin := true
	user := model.User{Email: "sa@example.com", IsSystemAdmin: &isAdmin}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	token := createJWTForTest(t, jwt.MapClaims{
		"sub": float64(user.ID),
		"exp": time.Now().Add(-time.Hour).Unix(), // expired token is still accepted in maintenance check path
	})

	app := maintenanceApp("/api/v1/private")
	req := httptest.NewRequest(http.MethodGet, "/api/v1/private", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, _ := doRequestAndDecode(t, app, req)

	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}
