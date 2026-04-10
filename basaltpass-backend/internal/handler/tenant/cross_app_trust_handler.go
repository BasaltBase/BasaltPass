package tenant

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	txsvc "basaltpass-backend/internal/service/tokenexchange"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ──────────────────────────────────────────────
// Cross-App Trust CRUD handlers
// ──────────────────────────────────────────────

var tokenExchangeService = txsvc.NewService()

type createCrossAppTrustRequest struct {
	SourceAppID   uint   `json:"source_app_id"`
	TargetAppID   uint   `json:"target_app_id"`
	AllowedScopes string `json:"allowed_scopes"`
	MaxTokenTTL   int    `json:"max_token_ttl"`
	Description   string `json:"description"`
}

type updateCrossAppTrustRequest struct {
	AllowedScopes *string `json:"allowed_scopes,omitempty"`
	MaxTokenTTL   *int    `json:"max_token_ttl,omitempty"`
	Description   *string `json:"description,omitempty"`
	IsActive      *bool   `json:"is_active,omitempty"`
}

func trustResponse(t model.CrossAppTrust) fiber.Map {
	m := fiber.Map{
		"id":             t.ID,
		"tenant_id":      t.TenantID,
		"source_app_id":  t.SourceAppID,
		"target_app_id":  t.TargetAppID,
		"allowed_scopes": t.AllowedScopes,
		"max_token_ttl":  t.MaxTokenTTL,
		"description":    t.Description,
		"is_active":      t.IsActive,
		"created_by":     t.CreatedBy,
		"created_at":     t.CreatedAt,
		"updated_at":     t.UpdatedAt,
	}
	if t.SourceApp.ID != 0 {
		m["source_app"] = fiber.Map{"id": t.SourceApp.ID, "name": t.SourceApp.Name, "icon_url": t.SourceApp.IconURL}
	}
	if t.TargetApp.ID != 0 {
		m["target_app"] = fiber.Map{"id": t.TargetApp.ID, "name": t.TargetApp.Name, "icon_url": t.TargetApp.IconURL}
	}
	return m
}

// GET /api/v1/tenant/cross-app-trusts
func ListCrossAppTrustsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	db := common.DB().Model(&model.CrossAppTrust{}).Where("tenant_id = ?", tenantID)

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var trusts []model.CrossAppTrust
	if err := db.Preload("SourceApp").Preload("TargetApp").
		Order("id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&trusts).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	items := make([]fiber.Map, 0, len(trusts))
	for _, t := range trusts {
		items = append(items, trustResponse(t))
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"trusts":    items,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}

// POST /api/v1/tenant/cross-app-trusts
func CreateCrossAppTrustHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	userID := c.Locals("userID").(uint)

	var req createCrossAppTrustRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON body"})
	}

	if req.SourceAppID == 0 || req.TargetAppID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "source_app_id and target_app_id are required"})
	}
	if req.SourceAppID == req.TargetAppID {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "source and target app must be different"})
	}
	if strings.TrimSpace(req.AllowedScopes) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "allowed_scopes is required"})
	}
	if req.MaxTokenTTL <= 0 {
		req.MaxTokenTTL = 300
	}
	if req.MaxTokenTTL > 600 {
		req.MaxTokenTTL = 600
	}

	// Verify both apps belong to this tenant
	for _, appID := range []uint{req.SourceAppID, req.TargetAppID} {
		var count int64
		if err := common.DB().Model(&model.App{}).Where("id = ? AND tenant_id = ?", appID, tenantID).Count(&count).Error; err != nil || count == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "app " + strconv.FormatUint(uint64(appID), 10) + " not found in this tenant"})
		}
	}

	// Prevent duplicate trust
	var existing int64
	common.DB().Model(&model.CrossAppTrust{}).
		Where("source_app_id = ? AND target_app_id = ? AND tenant_id = ?", req.SourceAppID, req.TargetAppID, tenantID).
		Count(&existing)
	if existing > 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "trust relationship already exists between these apps"})
	}

	trust := model.CrossAppTrust{
		TenantID:      tenantID,
		SourceAppID:   req.SourceAppID,
		TargetAppID:   req.TargetAppID,
		AllowedScopes: strings.TrimSpace(req.AllowedScopes),
		MaxTokenTTL:   req.MaxTokenTTL,
		Description:   strings.TrimSpace(req.Description),
		IsActive:      true,
		CreatedBy:     userID,
	}

	if err := common.DB().Create(&trust).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	tokenExchangeService.InvalidateCache()

	// Reload with relations
	common.DB().Preload("SourceApp").Preload("TargetApp").First(&trust, trust.ID)

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": trustResponse(trust)})
}

// PATCH /api/v1/tenant/cross-app-trusts/:id
func UpdateCrossAppTrustHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid trust id"})
	}

	var trust model.CrossAppTrust
	if err := common.DB().Where("id = ? AND tenant_id = ?", uint(id), tenantID).First(&trust).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "trust not found"})
	}

	var req updateCrossAppTrustRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid JSON body"})
	}

	updates := map[string]interface{}{}
	if req.AllowedScopes != nil {
		updates["allowed_scopes"] = strings.TrimSpace(*req.AllowedScopes)
	}
	if req.MaxTokenTTL != nil {
		ttl := *req.MaxTokenTTL
		if ttl <= 0 {
			ttl = 300
		}
		if ttl > 600 {
			ttl = 600
		}
		updates["max_token_ttl"] = ttl
	}
	if req.Description != nil {
		updates["description"] = strings.TrimSpace(*req.Description)
	}
	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if len(updates) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "no fields to update"})
	}

	updates["updated_at"] = time.Now()
	if err := common.DB().Model(&trust).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	tokenExchangeService.InvalidateCache()

	common.DB().Preload("SourceApp").Preload("TargetApp").First(&trust, trust.ID)
	return c.JSON(fiber.Map{"data": trustResponse(trust)})
}

// DELETE /api/v1/tenant/cross-app-trusts/:id
func DeleteCrossAppTrustHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	id, err := strconv.ParseUint(c.Params("id"), 10, 64)
	if err != nil || id == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid trust id"})
	}

	result := common.DB().Where("id = ? AND tenant_id = ?", uint(id), tenantID).Delete(&model.CrossAppTrust{})
	if result.Error != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": result.Error.Error()})
	}
	if result.RowsAffected == 0 {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "trust not found"})
	}

	tokenExchangeService.InvalidateCache()

	return c.JSON(fiber.Map{"message": "trust deleted"})
}

// GET /api/v1/tenant/cross-app-trusts/logs
func ListTokenExchangeLogsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	db := common.DB().Model(&model.TokenExchangeLog{}).Where("tenant_id = ?", tenantID)

	// Optional filters
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		db = db.Where("status = ?", status)
	}
	if sourceAppID := strings.TrimSpace(c.Query("source_app_id")); sourceAppID != "" {
		db = db.Where("source_app_id = ?", sourceAppID)
	}
	if targetAppID := strings.TrimSpace(c.Query("target_app_id")); targetAppID != "" {
		db = db.Where("target_app_id = ?", targetAppID)
	}

	var total int64
	if err := db.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	var logs []model.TokenExchangeLog
	if err := db.Preload("User").Preload("SourceApp").Preload("TargetApp").
		Order("id DESC").
		Offset((page - 1) * pageSize).
		Limit(pageSize).
		Find(&logs).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	items := make([]fiber.Map, 0, len(logs))
	for _, l := range logs {
		item := fiber.Map{
			"id":               l.ID,
			"user_id":          l.UserID,
			"source_client_id": l.SourceClientID,
			"source_app_id":    l.SourceAppID,
			"target_app_id":    l.TargetAppID,
			"requested_scopes": l.RequestedScopes,
			"granted_scopes":   l.GrantedScopes,
			"token_ttl":        l.TokenTTL,
			"status":           l.Status,
			"deny_reason":      l.DenyReason,
			"ip":               l.IP,
			"created_at":       l.CreatedAt,
		}
		if l.User.ID != 0 {
			item["user"] = fiber.Map{"id": l.User.ID, "email": l.User.Email, "nickname": l.User.Nickname}
		}
		if l.SourceApp.ID != 0 {
			item["source_app"] = fiber.Map{"id": l.SourceApp.ID, "name": l.SourceApp.Name}
		}
		if l.TargetApp.ID != 0 {
			item["target_app"] = fiber.Map{"id": l.TargetApp.ID, "name": l.TargetApp.Name}
		}
		items = append(items, item)
	}

	return c.JSON(fiber.Map{
		"data": fiber.Map{
			"logs":      items,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		},
	})
}
