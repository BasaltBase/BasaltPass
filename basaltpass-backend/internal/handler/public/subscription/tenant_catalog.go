package subscription

import (
	"strconv"

	"basaltpass-backend/internal/middleware"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ========== 产品分类 / 标签 / 定价模板（租户维度） ==========

type CreateCategoryRequest struct {
	Name         string                 `json:"name" validate:"required,max=64"`
	Slug         string                 `json:"slug" validate:"required,max=64"`
	Description  string                 `json:"description,omitempty"`
	IsActive     *bool                  `json:"is_active,omitempty"`
	DisplayOrder *int                   `json:"display_order,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

type UpdateCategoryRequest struct {
	Name         *string                `json:"name,omitempty" validate:"omitempty,max=64"`
	Slug         *string                `json:"slug,omitempty" validate:"omitempty,max=64"`
	Description  *string                `json:"description,omitempty"`
	IsActive     *bool                  `json:"is_active,omitempty"`
	DisplayOrder *int                   `json:"display_order,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

type CreateTagRequest struct {
	Name     string                 `json:"name" validate:"required,max=64"`
	Slug     string                 `json:"slug" validate:"required,max=64"`
	Color    string                 `json:"color,omitempty" validate:"omitempty,max=16"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type UpdateTagRequest struct {
	Name     *string                `json:"name,omitempty" validate:"omitempty,max=64"`
	Slug     *string                `json:"slug,omitempty" validate:"omitempty,max=64"`
	Color    *string                `json:"color,omitempty" validate:"omitempty,max=16"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type CreatePriceTemplateRequest struct {
	Name            string                 `json:"name" validate:"required,max=128"`
	Currency        string                 `json:"currency" validate:"required,len=3"`
	AmountCents     int64                  `json:"amount_cents" validate:"required"`
	BillingPeriod   model.BillingPeriod    `json:"billing_period" validate:"required"`
	BillingInterval int                    `json:"billing_interval,omitempty"`
	TrialDays       *int                   `json:"trial_days,omitempty"`
	UsageType       model.UsageType        `json:"usage_type" validate:"required"`
	BillingScheme   map[string]interface{} `json:"billing_scheme,omitempty"`
	IsActive        *bool                  `json:"is_active,omitempty"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

type UpdatePriceTemplateRequest struct {
	Name            *string                `json:"name,omitempty" validate:"omitempty,max=128"`
	Currency        *string                `json:"currency,omitempty" validate:"omitempty,len=3"`
	AmountCents     *int64                 `json:"amount_cents,omitempty"`
	BillingPeriod   *model.BillingPeriod   `json:"billing_period,omitempty"`
	BillingInterval *int                   `json:"billing_interval,omitempty"`
	TrialDays       *int                   `json:"trial_days,omitempty"`
	UsageType       *model.UsageType       `json:"usage_type,omitempty"`
	BillingScheme   map[string]interface{} `json:"billing_scheme,omitempty"`
	IsActive        *bool                  `json:"is_active,omitempty"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// TenantCatalogHandler 目录相关 handler
// （复用 TenantHandler 的 getTenantService 逻辑，但保持文件独立）
type TenantCatalogHandler struct{ db *gorm.DB }

func NewTenantCatalogHandler(db *gorm.DB) *TenantCatalogHandler { return &TenantCatalogHandler{db: db} }

func (h *TenantCatalogHandler) tenantID64(c *fiber.Ctx) uint64 {
	tenantID := middleware.GetTenantIDFromContext(c)
	return uint64(tenantID)
}

// ========== 全局处理器实例（对齐 tenant_handler.go 的模式） ==========

var tenantCatalogHandler *TenantCatalogHandler

func InitTenantCatalogHandler(db *gorm.DB) {
	tenantCatalogHandler = NewTenantCatalogHandler(db)
}

// Categories
func ListTenantCategoriesHandler(c *fiber.Ctx) error { return tenantCatalogHandler.ListCategories(c) }
func CreateTenantCategoryHandler(c *fiber.Ctx) error { return tenantCatalogHandler.CreateCategory(c) }
func UpdateTenantCategoryHandler(c *fiber.Ctx) error { return tenantCatalogHandler.UpdateCategory(c) }
func DeleteTenantCategoryHandler(c *fiber.Ctx) error { return tenantCatalogHandler.DeleteCategory(c) }

// Tags
func ListTenantTagsHandler(c *fiber.Ctx) error  { return tenantCatalogHandler.ListTags(c) }
func CreateTenantTagHandler(c *fiber.Ctx) error { return tenantCatalogHandler.CreateTag(c) }
func UpdateTenantTagHandler(c *fiber.Ctx) error { return tenantCatalogHandler.UpdateTag(c) }
func DeleteTenantTagHandler(c *fiber.Ctx) error { return tenantCatalogHandler.DeleteTag(c) }

// Price Templates
func ListTenantPriceTemplatesHandler(c *fiber.Ctx) error {
	return tenantCatalogHandler.ListPriceTemplates(c)
}
func CreateTenantPriceTemplateHandler(c *fiber.Ctx) error {
	return tenantCatalogHandler.CreatePriceTemplate(c)
}
func UpdateTenantPriceTemplateHandler(c *fiber.Ctx) error {
	return tenantCatalogHandler.UpdatePriceTemplate(c)
}
func DeleteTenantPriceTemplateHandler(c *fiber.Ctx) error {
	return tenantCatalogHandler.DeletePriceTemplate(c)
}

// ===== Categories =====

func (h *TenantCatalogHandler) ListCategories(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	var cats []model.ProductCategory
	if err := h.db.Where("tenant_id = ?", tenantID).Order("display_order asc, id desc").Find(&cats).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": cats})
}

func (h *TenantCatalogHandler) CreateCategory(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	var req CreateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	displayOrder := 0
	if req.DisplayOrder != nil {
		displayOrder = *req.DisplayOrder
	}
	cat := &model.ProductCategory{
		TenantID:     tenantID,
		Name:         req.Name,
		Slug:         req.Slug,
		Description:  req.Description,
		IsActive:     isActive,
		DisplayOrder: displayOrder,
		Metadata:     model.JSONB(req.Metadata),
	}
	if err := h.db.Create(cat).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": cat})
}

func (h *TenantCatalogHandler) UpdateCategory(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID无效"})
	}
	var req UpdateCategoryRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	var cat model.ProductCategory
	if err := h.db.Where("id = ? AND tenant_id = ?", uint(id), tenantID).First(&cat).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "分类不存在"})
	}
	if req.Name != nil {
		cat.Name = *req.Name
	}
	if req.Slug != nil {
		cat.Slug = *req.Slug
	}
	if req.Description != nil {
		cat.Description = *req.Description
	}
	if req.IsActive != nil {
		cat.IsActive = *req.IsActive
	}
	if req.DisplayOrder != nil {
		cat.DisplayOrder = *req.DisplayOrder
	}
	if req.Metadata != nil {
		cat.Metadata = model.JSONB(req.Metadata)
	}
	if err := h.db.Save(&cat).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": cat})
}

func (h *TenantCatalogHandler) DeleteCategory(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID无效"})
	}
	if err := h.db.Where("id = ? AND tenant_id = ?", uint(id), tenantID).Delete(&model.ProductCategory{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

// ===== Tags =====

func (h *TenantCatalogHandler) ListTags(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	var tags []model.ProductTag
	if err := h.db.Where("tenant_id = ?", tenantID).Order("id desc").Find(&tags).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": tags})
}

func (h *TenantCatalogHandler) CreateTag(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	var req CreateTagRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	tag := &model.ProductTag{
		TenantID: tenantID,
		Name:     req.Name,
		Slug:     req.Slug,
		Color:    req.Color,
		Metadata: model.JSONB(req.Metadata),
	}
	if err := h.db.Create(tag).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": tag})
}

func (h *TenantCatalogHandler) UpdateTag(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID无效"})
	}
	var req UpdateTagRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	var tag model.ProductTag
	if err := h.db.Where("id = ? AND tenant_id = ?", uint(id), tenantID).First(&tag).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "标签不存在"})
	}
	if req.Name != nil {
		tag.Name = *req.Name
	}
	if req.Slug != nil {
		tag.Slug = *req.Slug
	}
	if req.Color != nil {
		tag.Color = *req.Color
	}
	if req.Metadata != nil {
		tag.Metadata = model.JSONB(req.Metadata)
	}
	if err := h.db.Save(&tag).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": tag})
}

func (h *TenantCatalogHandler) DeleteTag(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID无效"})
	}
	if err := h.db.Where("id = ? AND tenant_id = ?", uint(id), tenantID).Delete(&model.ProductTag{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}

// ===== Price Templates =====

func (h *TenantCatalogHandler) ListPriceTemplates(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	var items []model.PriceTemplate
	if err := h.db.Where("tenant_id = ?", tenantID).Order("id desc").Find(&items).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": items})
}

func (h *TenantCatalogHandler) CreatePriceTemplate(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	var req CreatePriceTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}
	interval := req.BillingInterval
	if interval <= 0 {
		interval = 1
	}
	item := &model.PriceTemplate{
		TenantID:        tenantID,
		Name:            req.Name,
		Currency:        req.Currency,
		AmountCents:     req.AmountCents,
		BillingPeriod:   req.BillingPeriod,
		BillingInterval: interval,
		TrialDays:       req.TrialDays,
		UsageType:       req.UsageType,
		BillingScheme:   model.JSONB(req.BillingScheme),
		IsActive:        isActive,
		Metadata:        model.JSONB(req.Metadata),
	}
	if err := h.db.Create(item).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"data": item})
}

func (h *TenantCatalogHandler) UpdatePriceTemplate(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID无效"})
	}
	var req UpdatePriceTemplateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}
	var item model.PriceTemplate
	if err := h.db.Where("id = ? AND tenant_id = ?", uint(id), tenantID).First(&item).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "模板不存在"})
	}
	if req.Name != nil {
		item.Name = *req.Name
	}
	if req.Currency != nil {
		item.Currency = *req.Currency
	}
	if req.AmountCents != nil {
		item.AmountCents = *req.AmountCents
	}
	if req.BillingPeriod != nil {
		item.BillingPeriod = *req.BillingPeriod
	}
	if req.BillingInterval != nil {
		item.BillingInterval = *req.BillingInterval
	}
	if req.TrialDays != nil {
		item.TrialDays = req.TrialDays
	}
	if req.UsageType != nil {
		item.UsageType = *req.UsageType
	}
	if req.BillingScheme != nil {
		item.BillingScheme = model.JSONB(req.BillingScheme)
	}
	if req.IsActive != nil {
		item.IsActive = *req.IsActive
	}
	if req.Metadata != nil {
		item.Metadata = model.JSONB(req.Metadata)
	}
	if err := h.db.Save(&item).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": item})
}

func (h *TenantCatalogHandler) DeletePriceTemplate(c *fiber.Ctx) error {
	tenantID := h.tenantID64(c)
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ID无效"})
	}
	if err := h.db.Where("id = ? AND tenant_id = ?", uint(id), tenantID).Delete(&model.PriceTemplate{}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"success": true})
}
