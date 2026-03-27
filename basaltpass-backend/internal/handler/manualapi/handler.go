package manualapi

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	appsvc "basaltpass-backend/internal/service/app"
	"errors"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

var service = appsvc.NewAppService()

type CreateManualAPIKeyRequest struct {
	Name      string     `json:"name"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type AdminCreateManualAPIKeyRequest struct {
	Name      string                  `json:"name"`
	Scope     model.ManualAPIKeyScope `json:"scope"`
	TenantID  *uint                   `json:"tenant_id,omitempty"`
	ExpiresAt *time.Time              `json:"expires_at,omitempty"`
}

type ManualCreateAppRequest struct {
	TenantID          *uint    `json:"tenant_id,omitempty"`
	Name              string   `json:"name"`
	Description       string   `json:"description"`
	IconURL           string   `json:"icon_url"`
	LogoURL           string   `json:"logo_url"`
	HomepageURL       string   `json:"homepage_url"`
	PrivacyPolicyURL  string   `json:"privacy_policy_url"`
	TermsOfServiceURL string   `json:"terms_of_service_url"`
	IsVerified        bool     `json:"is_verified"`
	RedirectURIs      []string `json:"redirect_uris"`
	Scopes            []string `json:"scopes"`
	AllowedOrigins    []string `json:"allowed_origins"`
}

type ManualPermissionItem struct {
	Code        string `json:"code"`
	Name        string `json:"name"`
	Description string `json:"description"`
	Category    string `json:"category"`
}

type ManualReplaceAppPermissionsRequest struct {
	TenantID    *uint                  `json:"tenant_id,omitempty"`
	Permissions []ManualPermissionItem `json:"permissions"`
}

func TenantCreateManualAPIKeyHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing user context"})
	}
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing tenant context"})
	}

	var req CreateManualAPIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	plain, err := model.GenerateManualAPIKeyPlaintext()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate api key"})
	}

	key := model.ManualAPIKey{
		Name:            req.Name,
		Scope:           model.ManualAPIKeyScopeTenant,
		TenantID:        &tenantID,
		IsActive:        true,
		CreatedByUserID: userID,
		ExpiresAt:       req.ExpiresAt,
	}
	if err := key.SetPlainKey(plain); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash api key"})
	}
	if err := common.DB().Create(&key).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create api key"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": fiber.Map{
			"id":         key.ID,
			"name":       key.Name,
			"scope":      key.Scope,
			"tenant_id":  key.TenantID,
			"key":        plain,
			"key_prefix": key.KeyPrefix,
			"expires_at": key.ExpiresAt,
			"created_at": key.CreatedAt,
		},
		"message": "manual api key created",
	})
}

func AdminCreateManualAPIKeyHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("userID").(uint)
	if !ok || userID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing user context"})
	}

	var req AdminCreateManualAPIKeyRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	req.Name = strings.TrimSpace(req.Name)
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}
	if req.Scope == "" {
		req.Scope = model.ManualAPIKeyScopeAdmin
	}
	if req.Scope != model.ManualAPIKeyScopeAdmin && req.Scope != model.ManualAPIKeyScopeTenant {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "scope must be admin or tenant"})
	}
	if req.Scope == model.ManualAPIKeyScopeTenant && (req.TenantID == nil || *req.TenantID == 0) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "tenant_id is required for tenant scope"})
	}

	plain, err := model.GenerateManualAPIKeyPlaintext()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate api key"})
	}

	key := model.ManualAPIKey{
		Name:            req.Name,
		Scope:           req.Scope,
		TenantID:        req.TenantID,
		IsActive:        true,
		CreatedByUserID: userID,
		ExpiresAt:       req.ExpiresAt,
	}
	if err := key.SetPlainKey(plain); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash api key"})
	}
	if err := common.DB().Create(&key).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create api key"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data": fiber.Map{
			"id":         key.ID,
			"name":       key.Name,
			"scope":      key.Scope,
			"tenant_id":  key.TenantID,
			"key":        plain,
			"key_prefix": key.KeyPrefix,
			"expires_at": key.ExpiresAt,
			"created_at": key.CreatedAt,
		},
		"message": "manual api key created",
	})
}

func ManualCreateAppHandler(c *fiber.Ctx) error {
	var req ManualCreateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	tenantID, err := resolveTenantIDFromManualKey(c, req.TenantID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	creatorID, _ := c.Locals("manualAPIKeyCreatorUserID").(uint)
	if creatorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid api key creator"})
	}

	createReq := appsvc.CreateAppRequest{
		Name:              req.Name,
		Description:       req.Description,
		IconURL:           req.IconURL,
		LogoURL:           req.LogoURL,
		HomepageURL:       req.HomepageURL,
		PrivacyPolicyURL:  req.PrivacyPolicyURL,
		TermsOfServiceURL: req.TermsOfServiceURL,
		IsVerified:        req.IsVerified,
		RedirectURIs:      req.RedirectURIs,
		Scopes:            req.Scopes,
		AllowedOrigins:    req.AllowedOrigins,
	}

	created, createErr := service.CreateApp(tenantID, creatorID, &createReq)
	if createErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": createErr.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    created,
		"message": "app created",
	})
}

func ManualReplaceAppPermissionsHandler(c *fiber.Ctx) error {
	appID, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid app_id"})
	}

	var req ManualReplaceAppPermissionsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if len(req.Permissions) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "permissions cannot be empty"})
	}

	tenantID, tenantErr := resolveTenantIDFromManualKey(c, req.TenantID)
	if tenantErr != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": tenantErr.Error()})
	}

	var app model.App
	if dbErr := common.DB().Where("id = ? AND tenant_id = ?", uint(appID), tenantID).First(&app).Error; dbErr != nil {
		if errors.Is(dbErr, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "app not found"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to query app"})
	}

	tx := common.DB().Begin()
	if tx.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to start transaction"})
	}
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	var existing []model.AppPermission
	if dbErr := tx.Where("app_id = ? AND tenant_id = ?", app.ID, tenantID).Find(&existing).Error; dbErr != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to query existing permissions"})
	}

	existingByCode := make(map[string]model.AppPermission, len(existing))
	for _, p := range existing {
		existingByCode[p.Code] = p
	}

	now := time.Now()
	incomingCodes := make(map[string]struct{}, len(req.Permissions))
	createdCount := 0
	updatedCount := 0

	for _, item := range req.Permissions {
		code := strings.TrimSpace(item.Code)
		name := strings.TrimSpace(item.Name)
		category := strings.TrimSpace(item.Category)
		if code == "" || name == "" || category == "" {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "permission code/name/category are required"})
		}
		if _, exists := incomingCodes[code]; exists {
			tx.Rollback()
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "duplicate permission code in request: " + code})
		}
		incomingCodes[code] = struct{}{}

		old, found := existingByCode[code]
		if !found {
			newPermission := model.AppPermission{
				Code:        code,
				Name:        name,
				Description: strings.TrimSpace(item.Description),
				Category:    category,
				AppID:       app.ID,
				TenantID:    tenantID,
				CreatedAt:   now,
				UpdatedAt:   now,
			}
			if dbErr := tx.Create(&newPermission).Error; dbErr != nil {
				tx.Rollback()
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create permission"})
			}
			createdCount++
			continue
		}

		updates := map[string]interface{}{
			"name":        name,
			"description": strings.TrimSpace(item.Description),
			"category":    category,
			"updated_at":  now,
		}
		if dbErr := tx.Model(&model.AppPermission{}).Where("id = ?", old.ID).Updates(updates).Error; dbErr != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update permission"})
		}
		updatedCount++
	}

	toDeleteIDs := make([]uint, 0)
	for _, p := range existing {
		if _, keep := incomingCodes[p.Code]; !keep {
			toDeleteIDs = append(toDeleteIDs, p.ID)
		}
	}

	if len(toDeleteIDs) > 0 {
		if dbErr := tx.Exec("DELETE FROM app_role_permissions WHERE app_permission_id IN ?", toDeleteIDs).Error; dbErr != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to cleanup role permissions"})
		}
		if dbErr := tx.Where("permission_id IN ?", toDeleteIDs).Delete(&model.AppUserPermission{}).Error; dbErr != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to cleanup user permissions"})
		}
		if dbErr := tx.Where("id IN ?", toDeleteIDs).Delete(&model.AppPermission{}).Error; dbErr != nil {
			tx.Rollback()
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete permissions"})
		}
	}

	if dbErr := tx.Commit().Error; dbErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to commit permission update"})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"app_id":        app.ID,
			"tenant_id":     tenantID,
			"created":       createdCount,
			"updated":       updatedCount,
			"deleted":       len(toDeleteIDs),
			"total_applied": len(req.Permissions),
		},
		"message": "app permissions replaced",
	})
}

func resolveTenantIDFromManualKey(c *fiber.Ctx, requested *uint) (uint, error) {
	scope, _ := c.Locals("manualAPIKeyScope").(string)
	keyTenantID, hasTenant := c.Locals("manualAPIKeyTenantID").(uint)

	if scope == string(model.ManualAPIKeyScopeTenant) {
		if !hasTenant || keyTenantID == 0 {
			return 0, errors.New("tenant-scoped key missing tenant context")
		}
		if requested != nil && *requested != 0 && *requested != keyTenantID {
			return 0, errors.New("tenant-scoped key cannot access another tenant")
		}
		return keyTenantID, nil
	}

	if scope == string(model.ManualAPIKeyScopeAdmin) {
		if hasTenant && keyTenantID != 0 {
			if requested != nil && *requested != 0 && *requested != keyTenantID {
				return 0, errors.New("api key is bound to a different tenant")
			}
			return keyTenantID, nil
		}
		if requested == nil || *requested == 0 {
			return 0, errors.New("tenant_id is required for admin-scoped key")
		}
		return *requested, nil
	}

	return 0, errors.New("invalid api key scope")
}
