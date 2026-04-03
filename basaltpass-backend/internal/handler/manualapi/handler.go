package manualapi

import (
	"basaltpass-backend/internal/common"
	oauthhandler "basaltpass-backend/internal/handler/public/oauth"
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
var clientService = oauthhandler.NewClientService()

type CreateManualAPIKeyRequest struct {
	Name      string     `json:"name"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
}

type ManualAPIKeyListItem struct {
	ID              uint                     `json:"id"`
	Name            string                   `json:"name"`
	Scope           model.ManualAPIKeyScope  `json:"scope"`
	TenantID        *uint                    `json:"tenant_id,omitempty"`
	KeyPrefix       string                   `json:"key_prefix"`
	IsActive        bool                     `json:"is_active"`
	CreatedByUserID uint                     `json:"created_by_user_id"`
	LastUsedAt      *time.Time               `json:"last_used_at,omitempty"`
	ExpiresAt       *time.Time               `json:"expires_at,omitempty"`
	CreatedAt       time.Time                `json:"created_at"`
	UpdatedAt       time.Time                `json:"updated_at"`
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

type ManualUpdateAppRequest struct {
	Name              string            `json:"name"`
	Description       string            `json:"description"`
	IconURL           string            `json:"icon_url"`
	LogoURL           *string           `json:"logo_url"`
	HomepageURL       *string           `json:"homepage_url"`
	PrivacyPolicyURL  *string           `json:"privacy_policy_url"`
	TermsOfServiceURL *string           `json:"terms_of_service_url"`
	IsVerified        *bool             `json:"is_verified"`
	Status            *model.AppStatus  `json:"status"`
}

type ManualToggleAppStatusRequest struct {
	TenantID *uint  `json:"tenant_id,omitempty"`
	Status   string `json:"status"`
}

type ManualOAuthClientRequest struct {
	TenantID       *uint    `json:"tenant_id,omitempty"`
	AppID          uint     `json:"app_id"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	RedirectURIs   []string `json:"redirect_uris"`
	Scopes         []string `json:"scopes"`
	AllowedOrigins []string `json:"allowed_origins"`
}

type ManualUpdateOAuthClientRequest struct {
	TenantID       *uint    `json:"tenant_id,omitempty"`
	Name           string   `json:"name"`
	Description    string   `json:"description"`
	RedirectURIs   []string `json:"redirect_uris"`
	Scopes         []string `json:"scopes"`
	AllowedOrigins []string `json:"allowed_origins"`
	IsActive       *bool    `json:"is_active"`
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

func TenantListManualAPIKeysHandler(c *fiber.Ctx) error {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing tenant context"})
	}

	var keys []model.ManualAPIKey
	if err := common.DB().
		Where("scope = ? AND tenant_id = ?", model.ManualAPIKeyScopeTenant, tenantID).
		Order("created_at DESC").
		Find(&keys).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list api keys"})
	}

	items := make([]ManualAPIKeyListItem, 0, len(keys))
	for _, key := range keys {
		items = append(items, ManualAPIKeyListItem{
			ID:              key.ID,
			Name:            key.Name,
			Scope:           key.Scope,
			TenantID:        key.TenantID,
			KeyPrefix:       key.KeyPrefix,
			IsActive:        key.IsActive,
			CreatedByUserID: key.CreatedByUserID,
			LastUsedAt:      key.LastUsedAt,
			ExpiresAt:       key.ExpiresAt,
			CreatedAt:       key.CreatedAt,
			UpdatedAt:       key.UpdatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"data": items,
	})
}

func TenantDeleteManualAPIKeyHandler(c *fiber.Ctx) error {
	tenantID, ok := c.Locals("tenantID").(uint)
	if !ok || tenantID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing tenant context"})
	}

	keyID, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil || keyID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid key id"})
	}

	result := common.DB().
		Where("id = ? AND scope = ? AND tenant_id = ?", uint(keyID), model.ManualAPIKeyScopeTenant, tenantID).
		Delete(&model.ManualAPIKey{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete api key"})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "api key not found"})
	}

	return c.JSON(fiber.Map{"message": "manual api key deleted"})
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

func ManualListAppsHandler(c *fiber.Ctx) error {
	requestedTenantID := parseOptionalTenantID(c.Query("tenant_id"))
	tenantID, err := resolveTenantIDFromManualKey(c, requestedTenantID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	search := strings.TrimSpace(c.Query("search"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	apps, total, listErr := service.ListApps(tenantID, page, limit, search)
	if listErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": listErr.Error()})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"apps":   apps,
			"total":  total,
			"page":   page,
			"limit":  limit,
			"search": search,
		},
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

func ManualGetAppHandler(c *fiber.Ctx) error {
	appID, tenantID, errResp := resolveScopedAppID(c)
	if errResp != nil {
		return errResp
	}

	appInfo, err := service.GetApp(tenantID, appID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": appInfo})
}

func ManualUpdateAppHandler(c *fiber.Ctx) error {
	appID, tenantID, errResp := resolveScopedAppID(c)
	if errResp != nil {
		return errResp
	}

	var req ManualUpdateAppRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	updateReq := appsvc.UpdateAppRequest{
		Name:              strings.TrimSpace(req.Name),
		Description:       req.Description,
		IconURL:           strings.TrimSpace(req.IconURL),
		LogoURL:           req.LogoURL,
		HomepageURL:       req.HomepageURL,
		PrivacyPolicyURL:  req.PrivacyPolicyURL,
		TermsOfServiceURL: req.TermsOfServiceURL,
		IsVerified:        req.IsVerified,
		Status:            req.Status,
	}

	updated, err := service.UpdateApp(tenantID, appID, &updateReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    updated,
		"message": "app updated",
	})
}

func ManualDeleteAppHandler(c *fiber.Ctx) error {
	appID, tenantID, errResp := resolveScopedAppID(c)
	if errResp != nil {
		return errResp
	}

	if err := service.DeleteApp(tenantID, appID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "app deleted"})
}

func ManualGetAppStatsHandler(c *fiber.Ctx) error {
	appID, tenantID, errResp := resolveScopedAppID(c)
	if errResp != nil {
		return errResp
	}

	period := strings.TrimSpace(c.Query("period"))
	if period == "" {
		period = "7d"
	}

	stats, err := service.GetAppStats(tenantID, appID, period)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": stats})
}

func ManualToggleAppStatusHandler(c *fiber.Ctx) error {
	appID, tenantID, errResp := resolveScopedAppID(c)
	if errResp != nil {
		return errResp
	}

	var req ManualToggleAppStatusRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	req.Status = strings.TrimSpace(req.Status)
	if req.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "status is required"})
	}

	appInfo, err := service.ToggleAppStatus(tenantID, appID, req.Status)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    appInfo,
		"message": "app status updated",
	})
}

func ManualReplaceAppPermissionsHandler(c *fiber.Ctx) error {
	var req ManualReplaceAppPermissionsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if len(req.Permissions) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "permissions cannot be empty"})
	}

	_, tenantID, app, errResp := resolveScopedApp(c, req.TenantID)
	if errResp != nil {
		return errResp
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

func ManualListOAuthClientsHandler(c *fiber.Ctx) error {
	requestedTenantID := parseOptionalTenantID(c.Query("tenant_id"))
	tenantID, err := resolveTenantIDFromManualKey(c, requestedTenantID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "10"))
	search := strings.TrimSpace(c.Query("search"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	appsWithClients, total, listErr := service.GetTenantAppsWithOAuthClients(tenantID, page, pageSize, search)
	if listErr != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": listErr.Error()})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"apps":      appsWithClients,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"search":    search,
		},
	})
}

func ManualCreateOAuthClientHandler(c *fiber.Ctx) error {
	var req ManualOAuthClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	tenantID, err := resolveTenantIDFromManualKey(c, req.TenantID)
	if err != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}
	if req.AppID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "app_id is required"})
	}
	if !appBelongsToTenant(req.AppID, tenantID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "app not found"})
	}

	creatorID, _ := c.Locals("manualAPIKeyCreatorUserID").(uint)
	if creatorID == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid api key creator"})
	}

	createReq := oauthhandler.CreateClientRequest{
		Name:           strings.TrimSpace(req.Name),
		Description:    req.Description,
		RedirectURIs:   req.RedirectURIs,
		Scopes:         req.Scopes,
		AllowedOrigins: req.AllowedOrigins,
	}

	client, createErr := clientService.CreateClientForApp(req.AppID, creatorID, &createReq)
	if createErr != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": createErr.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    client,
		"message": "oauth client created",
	})
}

func ManualGetOAuthClientHandler(c *fiber.Ctx) error {
	client, _, errResp := resolveScopedClient(c, nil)
	if errResp != nil {
		return errResp
	}

	return c.JSON(fiber.Map{"data": client})
}

func ManualUpdateOAuthClientHandler(c *fiber.Ctx) error {
	var req ManualUpdateOAuthClientRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	_, clientID, errResp := resolveScopedClient(c, req.TenantID)
	if errResp != nil {
		return errResp
	}

	updateReq := oauthhandler.UpdateClientRequest{
		Name:           strings.TrimSpace(req.Name),
		Description:    req.Description,
		RedirectURIs:   req.RedirectURIs,
		Scopes:         req.Scopes,
		AllowedOrigins: req.AllowedOrigins,
		IsActive:       req.IsActive,
	}

	client, err := clientService.UpdateClient(clientID, &updateReq)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    client,
		"message": "oauth client updated",
	})
}

func ManualDeleteOAuthClientHandler(c *fiber.Ctx) error {
	_, clientID, errResp := resolveScopedClient(c, nil)
	if errResp != nil {
		return errResp
	}

	if err := clientService.DeleteClient(clientID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "oauth client deleted"})
}

func ManualGetOAuthClientStatsHandler(c *fiber.Ctx) error {
	_, clientID, errResp := resolveScopedClient(c, nil)
	if errResp != nil {
		return errResp
	}

	stats, err := clientService.GetClientStats(clientID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": stats})
}

func ManualRegenerateOAuthClientSecretHandler(c *fiber.Ctx) error {
	_, clientID, errResp := resolveScopedClient(c, nil)
	if errResp != nil {
		return errResp
	}

	secret, err := clientService.RegenerateSecret(clientID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"client_secret": secret,
		},
		"message": "oauth client secret regenerated",
	})
}

func ManualRevokeOAuthClientTokensHandler(c *fiber.Ctx) error {
	_, clientID, errResp := resolveScopedClient(c, nil)
	if errResp != nil {
		return errResp
	}

	if err := clientService.RevokeClientTokens(clientID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "oauth client tokens revoked"})
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

func parseOptionalTenantID(raw string) *uint {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	id, err := strconv.ParseUint(raw, 10, 32)
	if err != nil || id == 0 {
		return nil
	}
	value := uint(id)
	return &value
}

func resolveScopedAppID(c *fiber.Ctx) (uint, uint, error) {
	appID, tenantID, _, err := resolveScopedApp(c, parseOptionalTenantID(c.Query("tenant_id")))
	return appID, tenantID, err
}

func resolveScopedApp(c *fiber.Ctx, requestedTenantID *uint) (uint, uint, *model.App, error) {
	appIDValue, err := strconv.ParseUint(c.Params("app_id"), 10, 32)
	if err != nil {
		return 0, 0, nil, c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid app_id"})
	}

	tenantID, tenantErr := resolveTenantIDFromManualKey(c, requestedTenantID)
	if tenantErr != nil {
		return 0, 0, nil, c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": tenantErr.Error()})
	}

	var app model.App
	if dbErr := common.DB().Where("id = ? AND tenant_id = ?", uint(appIDValue), tenantID).First(&app).Error; dbErr != nil {
		if errors.Is(dbErr, gorm.ErrRecordNotFound) {
			return 0, 0, nil, c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "app not found"})
		}
		return 0, 0, nil, c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to query app"})
	}

	return uint(appIDValue), tenantID, &app, nil
}

func appBelongsToTenant(appID, tenantID uint) bool {
	var count int64
	common.DB().Model(&model.App{}).Where("id = ? AND tenant_id = ?", appID, tenantID).Count(&count)
	return count > 0
}

func resolveScopedClient(c *fiber.Ctx, requestedTenantID *uint) (*oauthhandler.ClientResponse, string, error) {
	clientID := strings.TrimSpace(c.Params("client_id"))
	if clientID == "" {
		return nil, "", c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid client_id"})
	}

	tenantID, err := resolveTenantIDFromManualKey(c, requestedTenantID)
	if err != nil {
		return nil, "", c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
	}

	if !clientService.ClientBelongsToTenant(clientID, tenantID) {
		return nil, "", c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "oauth client not found"})
	}

	client, getErr := clientService.GetClient(clientID)
	if getErr != nil {
		return nil, "", c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": getErr.Error()})
	}

	return client, clientID, nil
}
