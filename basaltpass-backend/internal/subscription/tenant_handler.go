package subscription

import (
	"basaltpass-backend/internal/middleware"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// TenantHandler 租户订阅处理器
type TenantHandler struct {
	db *gorm.DB
}

// NewTenantHandler 创建租户订阅处理器
func NewTenantHandler(db *gorm.DB) *TenantHandler {
	return &TenantHandler{db: db}
}

// getTenantService 获取租户服务实例
func (h *TenantHandler) getTenantService(c *fiber.Ctx) *TenantService {
	// 从中间件获取租户ID
	tenantID := middleware.GetTenantIDFromContext(c)
	tenantID64 := uint64(tenantID)
	return NewTenantService(h.db, &tenantID64)
}

// ========== 产品管理 ==========

// CreateTenantProductHandler 创建产品
func (h *TenantHandler) CreateTenantProductHandler(c *fiber.Ctx) error {
	var req CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	product, err := service.CreateProduct(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    product,
		"message": "产品创建成功",
	})
}

// GetTenantProductHandler 获取产品详情
func (h *TenantHandler) GetTenantProductHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "产品ID无效"})
	}

	service := h.getTenantService(c)
	product, err := service.GetProduct(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": product})
}

// ListTenantProductsHandler 获取产品列表
func (h *TenantHandler) ListTenantProductsHandler(c *fiber.Ctx) error {
	var req ListProductsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	products, total, err := service.ListProducts(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": products,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// UpdateTenantProductHandler 更新产品
func (h *TenantHandler) UpdateTenantProductHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "产品ID无效"})
	}

	var req UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	product, err := service.UpdateProduct(uint(id), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    product,
		"message": "产品更新成功",
	})
}

// DeleteTenantProductHandler 删除产品
func (h *TenantHandler) DeleteTenantProductHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "产品ID无效"})
	}

	service := h.getTenantService(c)
	if err := service.DeleteProduct(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "产品删除成功"})
}

// ========== 套餐管理 ==========

// CreateTenantPlanHandler 创建套餐
func (h *TenantHandler) CreateTenantPlanHandler(c *fiber.Ctx) error {
	var req CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	plan, err := service.CreatePlan(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    plan,
		"message": "套餐创建成功",
	})
}

// GetTenantPlanHandler 获取套餐详情
func (h *TenantHandler) GetTenantPlanHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "套餐ID无效"})
	}

	service := h.getTenantService(c)
	plan, err := service.GetPlan(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": plan})
}

// ListTenantPlansHandler 获取套餐列表
func (h *TenantHandler) ListTenantPlansHandler(c *fiber.Ctx) error {
	var req ListPlansRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	plans, total, err := service.ListPlans(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": plans,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// UpdateTenantPlanHandler 更新套餐
func (h *TenantHandler) UpdateTenantPlanHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "套餐ID无效"})
	}

	var req UpdatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	plan, err := service.UpdatePlan(uint(id), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    plan,
		"message": "套餐更新成功",
	})
}

// DeleteTenantPlanHandler 删除套餐
func (h *TenantHandler) DeleteTenantPlanHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "套餐ID无效"})
	}

	service := h.getTenantService(c)
	if err := service.DeletePlan(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "套餐删除成功"})
}

// ========== 定价管理 ==========

// CreateTenantPriceHandler 创建定价
func (h *TenantHandler) CreateTenantPriceHandler(c *fiber.Ctx) error {
	var req CreatePriceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	price, err := service.CreatePrice(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    price,
		"message": "定价创建成功",
	})
}

// GetTenantPriceHandler 获取定价详情
func (h *TenantHandler) GetTenantPriceHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "定价ID无效"})
	}

	service := h.getTenantService(c)
	price, err := service.GetPrice(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": price})
}

// ListTenantPricesHandler 获取定价列表
func (h *TenantHandler) ListTenantPricesHandler(c *fiber.Ctx) error {
	var req ListPricesRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	prices, total, err := service.ListPrices(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": prices,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// UpdateTenantPriceHandler 更新定价
func (h *TenantHandler) UpdateTenantPriceHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "定价ID无效"})
	}

	var req UpdatePriceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	price, err := service.UpdatePrice(uint(id), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    price,
		"message": "定价更新成功",
	})
}

// DeleteTenantPriceHandler 删除定价
func (h *TenantHandler) DeleteTenantPriceHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "定价ID无效"})
	}

	service := h.getTenantService(c)
	if err := service.DeletePrice(uint(id)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "定价删除成功"})
}

// ========== 订阅管理 ==========

// CreateTenantSubscriptionHandler 创建订阅
func (h *TenantHandler) CreateTenantSubscriptionHandler(c *fiber.Ctx) error {
	var req CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	subscription, err := service.CreateSubscription(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    subscription,
		"message": "订阅创建成功",
	})
}

// GetTenantSubscriptionHandler 获取订阅详情
func (h *TenantHandler) GetTenantSubscriptionHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	service := h.getTenantService(c)

	// 获取当前用户ID（如果需要限制只能查看自己的订阅）
	currentUserID := middleware.GetUserIDFromContext(c)
	var userID *uint
	if currentUserID != nil {
		userID = currentUserID
	}

	subscription, err := service.GetSubscription(uint(id), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": subscription})
}

// ListTenantSubscriptionsHandler 获取订阅列表
func (h *TenantHandler) ListTenantSubscriptionsHandler(c *fiber.Ctx) error {
	var req SubscriptionListRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	subscriptions, total, err := service.ListSubscriptions(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": subscriptions,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// CancelTenantSubscriptionHandler 取消订阅
func (h *TenantHandler) CancelTenantSubscriptionHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	var req CancelSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)

	// 获取当前用户ID（如果需要限制只能取消自己的订阅）
	currentUserID := middleware.GetUserIDFromContext(c)
	var userID *uint
	if currentUserID != nil {
		userID = currentUserID
	}

	if err := service.CancelSubscription(uint(id), userID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "订阅取消成功"})
}

// ========== 优惠券管理 ==========

// ========== 优惠券管理 ==========

// CreateTenantCouponHandler 创建优惠券
func (h *TenantHandler) CreateTenantCouponHandler(c *fiber.Ctx) error {
	var req CreateCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	coupon, err := service.CreateCoupon(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    coupon,
		"message": "优惠券创建成功",
	})
}

// ListTenantCouponsHandler 获取优惠券列表
func (h *TenantHandler) ListTenantCouponsHandler(c *fiber.Ctx) error {
	var req ListCouponsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	coupons, total, err := service.ListCoupons(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": coupons,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetTenantCouponHandler 获取优惠券详情
func (h *TenantHandler) GetTenantCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "优惠券代码无效"})
	}

	service := h.getTenantService(c)
	coupon, err := service.GetCoupon(code)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": coupon})
}

// UpdateTenantCouponHandler 更新优惠券
func (h *TenantHandler) UpdateTenantCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "优惠券代码无效"})
	}

	var req UpdateCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	coupon, err := service.UpdateCoupon(code, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    coupon,
		"message": "优惠券更新成功",
	})
}

// DeleteTenantCouponHandler 删除优惠券
func (h *TenantHandler) DeleteTenantCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "优惠券代码无效"})
	}

	service := h.getTenantService(c)
	if err := service.DeleteCoupon(code); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "优惠券删除成功"})
}

// ValidateTenantCouponHandler 验证优惠券
func (h *TenantHandler) ValidateTenantCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "优惠券代码无效"})
	}

	service := h.getTenantService(c)
	coupon, err := service.ValidateCoupon(code)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"valid": false,
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"valid": true,
		"data":  coupon,
	})
}

// ========== 账单管理 ==========

// CreateTenantInvoiceHandler 创建账单
func (h *TenantHandler) CreateTenantInvoiceHandler(c *fiber.Ctx) error {
	var req CreateInvoiceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	service := h.getTenantService(c)
	invoice, err := service.CreateInvoice(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    invoice,
		"message": "账单创建成功",
	})
}

// ListTenantInvoicesHandler 获取账单列表
func (h *TenantHandler) ListTenantInvoicesHandler(c *fiber.Ctx) error {
	var req InvoiceListRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "查询参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	invoices, total, err := service.ListInvoices(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": invoices,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// ========== 租户用户订阅查看（不需要admin权限，需要tenant权限）==========

// ListTenantUserSubscriptionsHandler 租户用户获取订阅列表
func (h *TenantHandler) ListTenantUserSubscriptionsHandler(c *fiber.Ctx) error {
	var req SubscriptionListRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数无效"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	service := h.getTenantService(c)
	subscriptions, total, err := service.ListSubscriptions(&req) // 获取租户下的订阅列表
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": subscriptions,
		"pagination": map[string]interface{}{
			"page":        req.Page,
			"page_size":   req.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetTenantUserSubscriptionHandler 租户用户获取订阅详情
func (h *TenantHandler) GetTenantUserSubscriptionHandler(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32) // 检查ID是否有效 十进制 uint32类型
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	service := h.getTenantService(c)
	subscription, err := service.GetSubscription(uint(id), nil)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": subscription})
}

// ========== 统计信息 ==========

// GetTenantSubscriptionStatsHandler 获取租户订阅统计
func (h *TenantHandler) GetTenantSubscriptionStatsHandler(c *fiber.Ctx) error {
	service := h.getTenantService(c)
	stats, err := service.GetTenantSubscriptionStats()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": stats})
}

// ========== 全局处理器实例 ==========

var tenantSubscriptionHandler *TenantHandler

// InitTenantHandler 初始化租户订阅处理器
func InitTenantHandler(db *gorm.DB) {
	tenantSubscriptionHandler = NewTenantHandler(db)
}

// 租户产品管理处理器
func CreateTenantProductHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CreateTenantProductHandler(c)
}

func GetTenantProductHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantProductHandler(c)
}

func ListTenantProductsHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantProductsHandler(c)
}

func UpdateTenantProductHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.UpdateTenantProductHandler(c)
}

func DeleteTenantProductHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.DeleteTenantProductHandler(c)
}

// 租户套餐管理处理器
func CreateTenantPlanHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CreateTenantPlanHandler(c)
}

func GetTenantPlanHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantPlanHandler(c)
}

func ListTenantPlansHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantPlansHandler(c)
}

func UpdateTenantPlanHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.UpdateTenantPlanHandler(c)
}

func DeleteTenantPlanHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.DeleteTenantPlanHandler(c)
}

// 租户定价管理处理器
func CreateTenantPriceHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CreateTenantPriceHandler(c)
}

func GetTenantPriceHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantPriceHandler(c)
}

func ListTenantPricesHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantPricesHandler(c)
}

func UpdateTenantPriceHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.UpdateTenantPriceHandler(c)
}

func DeleteTenantPriceHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.DeleteTenantPriceHandler(c)
}

// 租户订阅管理处理器
func CreateTenantSubscriptionHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CreateTenantSubscriptionHandler(c)
}

func GetTenantSubscriptionHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantSubscriptionHandler(c)
}

func ListTenantSubscriptionsHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantSubscriptionsHandler(c)
}

func CancelTenantSubscriptionHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CancelTenantSubscriptionHandler(c)
}

// 租户优惠券管理处理器
func CreateTenantCouponHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CreateTenantCouponHandler(c)
}

func ListTenantCouponsHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantCouponsHandler(c)
}

func GetTenantCouponHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantCouponHandler(c)
}

func UpdateTenantCouponHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.UpdateTenantCouponHandler(c)
}

func DeleteTenantCouponHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.DeleteTenantCouponHandler(c)
}

func ValidateTenantCouponHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ValidateTenantCouponHandler(c)
}

// 租户账单管理处理器
func CreateTenantInvoiceHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.CreateTenantInvoiceHandler(c)
}

func ListTenantInvoicesHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantInvoicesHandler(c)
}

// 租户统计处理器
func GetTenantSubscriptionStatsHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantSubscriptionStatsHandler(c)
}

// 租户用户订阅查看处理器（不需要管理员权限，需要租户）
func ListTenantUserSubscriptionsHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.ListTenantUserSubscriptionsHandler(c)
}

func GetTenantUserSubscriptionHandler(c *fiber.Ctx) error {
	return tenantSubscriptionHandler.GetTenantUserSubscriptionHandler(c)
}
