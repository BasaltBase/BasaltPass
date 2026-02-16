package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTenantMiddlewareTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	dsn := fmt.Sprintf("file:%s?mode=memory&cache=shared", strings.ReplaceAll(t.Name(), "/", "_"))
	db, err := gorm.Open(sqlite.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(&model.Tenant{}, &model.TenantUser{}); err != nil {
		t.Fatalf("failed to migrate test schema: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func createTenantForTest(t *testing.T, db *gorm.DB, code string, status model.TenantStatus) model.Tenant {
	t.Helper()

	tenant := model.Tenant{
		Name:   "Tenant " + code,
		Code:   code,
		Status: status,
		Plan:   model.TenantPlanFree,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("failed to create tenant: %v", err)
	}
	return tenant
}

func createTenantUserForTest(t *testing.T, db *gorm.DB, userID, tenantID uint, role model.TenantRole, createdAt time.Time) {
	t.Helper()

	tenantUser := model.TenantUser{
		UserID:    userID,
		TenantID:  tenantID,
		Role:      role,
		CreatedAt: createdAt,
		UpdatedAt: createdAt,
	}
	if err := db.Create(&tenantUser).Error; err != nil {
		t.Fatalf("failed to create tenant admin: %v", err)
	}
}

func testAppWithTenantMiddleware(locals map[string]interface{}) *fiber.App {
	app := fiber.New()

	app.Use(func(c *fiber.Ctx) error {
		for k, v := range locals {
			c.Locals(k, v)
		}
		return c.Next()
	})

	app.Use(TenantMiddleware())
	app.Get("/", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"tenantID":   c.Locals("tenantID"),
			"tenantRole": c.Locals("tenantRole"),
		})
	})

	return app
}

func testAppWithGuard(locals map[string]interface{}, guard fiber.Handler) *fiber.App {
	app := fiber.New()

	app.Use(func(c *fiber.Ctx) error {
		for k, v := range locals {
			c.Locals(k, v)
		}
		return c.Next()
	})

	app.Use(guard)
	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendStatus(fiber.StatusOK)
	})

	return app
}

func doGet(t *testing.T, app *fiber.App) (*http.Response, map[string]interface{}) {
	t.Helper()

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}

	rawBody, err := io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("failed to read response body: %v", err)
	}
	_ = resp.Body.Close()

	if len(rawBody) == 0 {
		return resp, nil
	}

	trimmed := bytes.TrimSpace(rawBody)
	if len(trimmed) == 0 || (trimmed[0] != '{' && trimmed[0] != '[') {
		return resp, nil
	}

	payload := map[string]interface{}{}
	if err := json.Unmarshal(trimmed, &payload); err != nil {
		t.Fatalf("failed to parse response body %q: %v", string(rawBody), err)
	}

	return resp, payload
}

func asUint(t *testing.T, v interface{}) uint {
	t.Helper()

	f, ok := v.(float64)
	if !ok {
		t.Fatalf("expected numeric JSON value, got %T", v)
	}
	return uint(f)
}

func TestTenantMiddleware_MissingUserContext(t *testing.T) {
	setupTenantMiddlewareTestDB(t)
	app := testAppWithTenantMiddleware(map[string]interface{}{})

	resp, body := doGet(t, app)
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", resp.StatusCode)
	}
	if body["error"] != "Missing user context" {
		t.Fatalf("unexpected error message: %#v", body["error"])
	}
}

func TestTenantMiddleware_RejectsSpoofedTenantID(t *testing.T) {
	db := setupTenantMiddlewareTestDB(t)

	userID := uint(10)
	tenant1 := createTenantForTest(t, db, "spoof-a", model.TenantStatusActive)
	tenant2 := createTenantForTest(t, db, "spoof-b", model.TenantStatusActive)
	createTenantUserForTest(t, db, userID, tenant1.ID, model.TenantRoleAdmin, time.Now().UTC())

	app := testAppWithTenantMiddleware(map[string]interface{}{
		"userID":   userID,
		"tenantID": tenant2.ID,
	})

	resp, body := doGet(t, app)
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", resp.StatusCode)
	}
	if body["error"] != "Missing tenant association" {
		t.Fatalf("unexpected error message: %#v", body["error"])
	}
}

func TestTenantMiddleware_UsesAssociatedTenantAndRole(t *testing.T) {
	db := setupTenantMiddlewareTestDB(t)

	userID := uint(20)
	firstTenant := createTenantForTest(t, db, "default-tenant", model.TenantStatusActive)
	secondTenant := createTenantForTest(t, db, "secondary-tenant", model.TenantStatusActive)

	base := time.Now().UTC()
	createTenantUserForTest(t, db, userID, firstTenant.ID, model.TenantRoleMember, base.Add(-2*time.Hour))
	createTenantUserForTest(t, db, userID, secondTenant.ID, model.TenantRoleOwner, base.Add(-1*time.Hour))

	app := testAppWithTenantMiddleware(map[string]interface{}{
		"userID": userID,
	})

	resp, body := doGet(t, app)
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected status 200, got %d", resp.StatusCode)
	}

	if got := asUint(t, body["tenantID"]); got != firstTenant.ID {
		t.Fatalf("expected tenantID %d, got %d", firstTenant.ID, got)
	}
	if got := body["tenantRole"]; got != string(model.TenantRoleMember) {
		t.Fatalf("expected tenantRole %q, got %#v", model.TenantRoleMember, got)
	}
}

func TestTenantMiddleware_RejectsInactiveTenant(t *testing.T) {
	db := setupTenantMiddlewareTestDB(t)

	userID := uint(30)
	suspendedTenant := createTenantForTest(t, db, "suspended-tenant", model.TenantStatusSuspended)
	createTenantUserForTest(t, db, userID, suspendedTenant.ID, model.TenantRoleAdmin, time.Now().UTC())

	app := testAppWithTenantMiddleware(map[string]interface{}{
		"userID": userID,
	})

	resp, body := doGet(t, app)
	if resp.StatusCode != fiber.StatusForbidden {
		t.Fatalf("expected status 403, got %d", resp.StatusCode)
	}
	if body["error"] != "Tenant is not active" {
		t.Fatalf("unexpected error message: %#v", body["error"])
	}
}

func TestTenantMiddleware_RejectsInvalidTenantAssociation(t *testing.T) {
	db := setupTenantMiddlewareTestDB(t)

	userID := uint(40)
	createTenantUserForTest(t, db, userID, 9999, model.TenantRoleAdmin, time.Now().UTC())

	app := testAppWithTenantMiddleware(map[string]interface{}{
		"userID": userID,
	})

	resp, body := doGet(t, app)
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", resp.StatusCode)
	}
	if body["error"] != "Invalid tenant association" {
		t.Fatalf("unexpected error message: %#v", body["error"])
	}
}

func TestTenantOwnerMiddleware_AllowsOwnerOnly(t *testing.T) {
	db := setupTenantMiddlewareTestDB(t)

	tenantID := uint(100)
	ownerID := uint(1)
	adminID := uint(2)
	createTenantUserForTest(t, db, ownerID, tenantID, model.TenantRoleOwner, time.Now().UTC())
	createTenantUserForTest(t, db, adminID, tenantID, model.TenantRoleAdmin, time.Now().UTC())

	t.Run("owner can pass", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID":   ownerID,
			"tenantID": tenantID,
		}, TenantOwnerMiddleware())

		resp, _ := doGet(t, app)
		if resp.StatusCode != fiber.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("non-owner is rejected", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID":   adminID,
			"tenantID": tenantID,
		}, TenantOwnerMiddleware())

		resp, body := doGet(t, app)
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("expected status 403, got %d", resp.StatusCode)
		}
		if body["error"] != "Tenant owner access required" {
			t.Fatalf("unexpected error message: %#v", body["error"])
		}
	})

	t.Run("missing context is rejected", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID": ownerID,
		}, TenantOwnerMiddleware())

		resp, body := doGet(t, app)
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", resp.StatusCode)
		}
		if body["error"] != "Missing user or tenant context" {
			t.Fatalf("unexpected error message: %#v", body["error"])
		}
	})
}

func TestTenantUserMiddleware_AllowsOwnerAndAdminOnly(t *testing.T) {
	db := setupTenantMiddlewareTestDB(t)

	tenantID := uint(200)
	ownerID := uint(11)
	adminID := uint(12)
	memberID := uint(13)
	otherID := uint(14)

	createTenantUserForTest(t, db, ownerID, tenantID, model.TenantRoleOwner, time.Now().UTC())
	createTenantUserForTest(t, db, adminID, tenantID, model.TenantRoleAdmin, time.Now().UTC())
	createTenantUserForTest(t, db, memberID, tenantID, model.TenantRoleMember, time.Now().UTC())

	t.Run("owner can pass", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID":   ownerID,
			"tenantID": tenantID,
		}, TenantUserMiddleware())

		resp, _ := doGet(t, app)
		if resp.StatusCode != fiber.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("admin can pass", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID":   adminID,
			"tenantID": tenantID,
		}, TenantUserMiddleware())

		resp, _ := doGet(t, app)
		if resp.StatusCode != fiber.StatusOK {
			t.Fatalf("expected status 200, got %d", resp.StatusCode)
		}
	})

	t.Run("member is rejected", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID":   memberID,
			"tenantID": tenantID,
		}, TenantUserMiddleware())

		resp, body := doGet(t, app)
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("expected status 403, got %d", resp.StatusCode)
		}
		if body["error"] != "Tenant tenant access required" {
			t.Fatalf("unexpected error message: %#v", body["error"])
		}
	})

	t.Run("missing membership is rejected", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID":   otherID,
			"tenantID": tenantID,
		}, TenantUserMiddleware())

		resp, body := doGet(t, app)
		if resp.StatusCode != fiber.StatusForbidden {
			t.Fatalf("expected status 403, got %d", resp.StatusCode)
		}
		if body["error"] != "Access denied" {
			t.Fatalf("unexpected error message: %#v", body["error"])
		}
	})

	t.Run("missing context is rejected", func(t *testing.T) {
		app := testAppWithGuard(map[string]interface{}{
			"userID": ownerID,
		}, TenantUserMiddleware())

		resp, body := doGet(t, app)
		if resp.StatusCode != fiber.StatusUnauthorized {
			t.Fatalf("expected status 401, got %d", resp.StatusCode)
		}
		if body["error"] != "Missing user or tenant context" {
			t.Fatalf("unexpected error message: %#v", body["error"])
		}
	})
}
