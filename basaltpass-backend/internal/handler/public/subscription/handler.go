package subscription

import (
	"strconv"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// 全局处理器实例
var (
	subscriptionService *Service
	subscriptionHandler *Handler
)

// InitHandler 初始化订阅处理器
func InitHandler(db *gorm.DB) {
	subscriptionService = NewService(db)
	subscriptionHandler = NewHandler(subscriptionService)
}

// ========== 产品管理相关处理器 ==========

// CreateProductHandler 创建产品
func CreateProductHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreateProduct(c)
}

func (h *Handler) CreateProduct(c *fiber.Ctx) error {
	var req CreateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	product, err := h.service.CreateProduct(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    product,
		"message": "产品创建成功",
	})
}

// GetProductHandler 获取产品详情
func GetProductHandler(c *fiber.Ctx) error {
	return subscriptionHandler.GetProduct(c)
}

func (h *Handler) GetProduct(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "产品ID无效"})
	}

	product, err := h.service.GetProduct(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": product})
}

// ListProductsHandler 获取产品列表
func ListProductsHandler(c *fiber.Ctx) error {
	return subscriptionHandler.ListProducts(c)
}

func (h *Handler) ListProducts(c *fiber.Ctx) error {
	var req ListProductsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	products, total, err := h.service.ListProducts(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       products,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// UpdateProductHandler 更新产品（管理员）
func UpdateProductHandler(c *fiber.Ctx) error {
	productID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	var req UpdateProductRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	product, err := subscriptionService.UpdateProduct(uint(productID), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": product})
}

// DeleteProductHandler 删除产品（管理员）
func DeleteProductHandler(c *fiber.Ctx) error {
	productID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	err = subscriptionService.DeleteProduct(uint(productID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Product deleted successfully"})
}

// ========== 套餐管理相关处理器 ==========

// CreatePlanHandler 创建套餐
func CreatePlanHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreatePlan(c)
}

func (h *Handler) CreatePlan(c *fiber.Ctx) error {
	var req CreatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	plan, err := h.service.CreatePlan(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    plan,
		"message": "套餐创建成功",
	})
}

// GetPlanHandler 获取套餐详情
func GetPlanHandler(c *fiber.Ctx) error {
	return subscriptionHandler.GetPlan(c)
}

func (h *Handler) GetPlan(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "套餐ID无效"})
	}

	plan, err := h.service.GetPlan(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": plan})
}

// ListPlansHandler 获取套餐列表
func ListPlansHandler(c *fiber.Ctx) error {
	return subscriptionHandler.ListPlans(c)
}

func (h *Handler) ListPlans(c *fiber.Ctx) error {
	var req ListPlansRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	plans, total, err := h.service.ListPlans(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       plans,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// CreatePlanFeatureHandler 创建套餐功能
func CreatePlanFeatureHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreatePlanFeature(c)
}

func (h *Handler) CreatePlanFeature(c *fiber.Ctx) error {
	var req CreatePlanFeatureRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	feature, err := h.service.CreatePlanFeature(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    feature,
		"message": "套餐功能创建成功",
	})
}

// ========== 定价管理相关处理器 ==========

// CreatePriceHandler 创建定价
func CreatePriceHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreatePrice(c)
}

func (h *Handler) CreatePrice(c *fiber.Ctx) error {
	var req CreatePriceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	price, err := h.service.CreatePrice(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    price,
		"message": "定价创建成功",
	})
}

func ListPricesHandler(c *fiber.Ctx) error {
	return subscriptionHandler.ListPrices(c)
}

// GetPriceHandler 获取定价详情
func GetPriceHandler(c *fiber.Ctx) error {
	return subscriptionHandler.GetPrice(c)
}

func (h *Handler) ListPrices(c *fiber.Ctx) error {
	var req ListPricesRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	prices, total, err := h.service.ListPrices(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       prices,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

func (h *Handler) GetPrice(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "定价ID无效"})
	}

	price, err := h.service.GetPrice(uint(id))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": price})
}

// ========== 优惠券管理相关处理器 ==========

// CreateCouponHandler 创建优惠券
func CreateCouponHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreateCoupon(c)
}

func (h *Handler) CreateCoupon(c *fiber.Ctx) error {
	var req CreateCouponRequest

	// 解析请求体 当请求体为空时，返回错误
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	// 处理discount_type值转换：percentage -> percent
	if req.DiscountType == "percentage" {
		req.DiscountType = model.DiscountTypePercent
	}

	// 设置Duration默认值
	if req.Duration == "" {
		req.Duration = model.CouponDurationOnce // 默认为一次性优惠券
	}

	coupon, err := h.service.CreateCoupon(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    coupon,
		"message": "优惠券创建成功",
	})
}

// ValidateCouponHandler 验证优惠券
func ValidateCouponHandler(c *fiber.Ctx) error {
	return subscriptionHandler.ValidateCoupon(c)
}

func (h *Handler) ValidateCoupon(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "优惠券代码不能为空"})
	}

	coupon, err := h.service.GetCouponByCode(code)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    coupon,
		"message": "优惠券有效",
	})
}

// ========== 订阅管理相关处理器 ==========

// CreateSubscriptionHandler 创建订阅
func CreateSubscriptionHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreateSubscription(c)
}

func (h *Handler) CreateSubscription(c *fiber.Ctx) error {
	var req CreateSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	// 如果没有指定user_id，使用当前登录用户ID
	if req.UserID == 0 {
		userID := c.Locals("userID").(uint)
		req.UserID = userID
	}

	subscription, err := h.service.CreateSubscription(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    subscription,
		"message": "订阅创建成功",
	})
}

// GetSubscriptionHandler 获取订阅详情
func GetSubscriptionHandler(c *fiber.Ctx) error {
	return subscriptionHandler.GetSubscription(c)
}

func (h *Handler) GetSubscription(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	// 普通用户只能查看自己的订阅
	userID := c.Locals("userID").(uint)

	subscription, err := h.service.GetSubscription(uint(id), &userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": subscription})
}

// ListSubscriptionsHandler 获取订阅列表
func ListSubscriptionsHandler(c *fiber.Ctx) error {
	return subscriptionHandler.ListSubscriptions(c)
}

func (h *Handler) ListSubscriptions(c *fiber.Ctx) error {
	var req SubscriptionListRequest

	// 解析查询参数
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			cid := uint(id)
			req.UserID = &cid
		}
	}

	if statusStr := c.Query("status"); statusStr != "" {
		status := model.SubscriptionStatus(statusStr)
		req.Status = &status
	}

	if priceIDStr := c.Query("price_id"); priceIDStr != "" {
		if id, err := strconv.ParseUint(priceIDStr, 10, 32); err == nil {
			pid := uint(id)
			req.PriceID = &pid
		}
	}

	req.Page, _ = strconv.Atoi(c.Query("page", "1"))
	req.PageSize, _ = strconv.Atoi(c.Query("page_size", "20"))

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	// 普通用户只能查看自己的订阅
	userID := c.Locals("userID").(uint)
	if req.UserID == nil {
		req.UserID = &userID
	} else if *req.UserID != userID {
		// 检查是否为管理员
		userRole := c.Locals("userRole")
		if userRole == nil || userRole != "admin" {
			req.UserID = &userID
		}
	}

	subscriptions, total, err := h.service.ListSubscriptions(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       subscriptions,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// CancelSubscriptionHandler 取消订阅
func CancelSubscriptionHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CancelSubscription(c)
}

func (h *Handler) CancelSubscription(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	var req CancelSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	// 普通用户只能取消自己的订阅
	userID := c.Locals("userID").(uint)

	if err := h.service.CancelSubscription(uint(id), &userID, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "订阅取消成功"})
}

// ========== 使用记录相关处理器 ==========

// CreateUsageRecordHandler 创建使用记录
func CreateUsageRecordHandler(c *fiber.Ctx) error {
	return subscriptionHandler.CreateUsageRecord(c)
}

func (h *Handler) CreateUsageRecord(c *fiber.Ctx) error {
	var req CreateUsageRecordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	usageRecord, err := h.service.CreateUsageRecord(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"data":    usageRecord,
		"message": "使用记录创建成功",
	})
}

// ========== 管理员专用处理器 ==========

// AdminGetSubscriptionHandler 管理员获取订阅详情
func AdminGetSubscriptionHandler(c *fiber.Ctx) error {
	return subscriptionHandler.AdminGetSubscription(c)
}

func (h *Handler) AdminGetSubscription(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	subscription, err := h.service.GetSubscription(uint(id), nil) // 管理员可以查看任何订阅
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": subscription})
}

// AdminListSubscriptionsHandler 管理员获取订阅列表
func AdminListSubscriptionsHandler(c *fiber.Ctx) error {
	return subscriptionHandler.AdminListSubscriptions(c)
}

func (h *Handler) AdminListSubscriptions(c *fiber.Ctx) error {
	var req SubscriptionListRequest

	// 解析查询参数
	if userIDStr := c.Query("user_id"); userIDStr != "" {
		if id, err := strconv.ParseUint(userIDStr, 10, 32); err == nil {
			cid := uint(id)
			req.UserID = &cid
		}
	}

	if statusStr := c.Query("status"); statusStr != "" {
		status := model.SubscriptionStatus(statusStr)
		req.Status = &status
	}

	if priceIDStr := c.Query("price_id"); priceIDStr != "" {
		if id, err := strconv.ParseUint(priceIDStr, 10, 32); err == nil {
			pid := uint(id)
			req.PriceID = &pid
		}
	}

	// 新增：按租户筛选
	if tenantIDStr := c.Query("tenant_id"); tenantIDStr != "" {
		if id, err := strconv.ParseUint(tenantIDStr, 10, 64); err == nil {
			tid := uint64(id)
			req.TenantID = &tid
		}
	}

	req.Page, _ = strconv.Atoi(c.Query("page", "1"))
	req.PageSize, _ = strconv.Atoi(c.Query("page_size", "20"))

	// 设置默认分页参数
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	subscriptions, total, err := h.service.ListSubscriptions(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       subscriptions,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// AdminCancelSubscriptionHandler 管理员取消订阅
func AdminCancelSubscriptionHandler(c *fiber.Ctx) error {
	return subscriptionHandler.AdminCancelSubscription(c)
}

func (h *Handler) AdminCancelSubscription(c *fiber.Ctx) error {
	id, err := strconv.ParseUint(c.Params("id"), 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "订阅ID无效"})
	}

	var req CancelSubscriptionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求参数错误"})
	}

	if err := h.service.CancelSubscription(uint(id), nil, &req); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "订阅取消成功"})
}

// AdminListPlansHandler 管理员获取所有套餐列表
func AdminListPlansHandler(c *fiber.Ctx) error {
	var req ListPlansRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 默认分页
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	plans, total, err := subscriptionService.ListPlans(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       plans,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// AdminGetPlanHandler 管理员获取套餐详情
func AdminGetPlanHandler(c *fiber.Ctx) error {
	planID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid plan ID"})
	}

	plan, err := subscriptionService.GetPlan(uint(planID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": plan})
}

// UpdatePlanHandler 更新套餐（管理员）
func UpdatePlanHandler(c *fiber.Ctx) error {
	planID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid plan ID"})
	}

	var req UpdatePlanRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	plan, err := subscriptionService.UpdatePlan(uint(planID), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": plan})
}

// DeletePlanHandler 删除套餐（管理员）
func DeletePlanHandler(c *fiber.Ctx) error {
	planID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid plan ID"})
	}

	err = subscriptionService.DeletePlan(uint(planID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Plan deleted successfully"})
}

// AdminListPricesHandler 管理员获取所有定价列表
func AdminListPricesHandler(c *fiber.Ctx) error {
	var req ListPricesRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 默认分页
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	prices, total, err := subscriptionService.ListPrices(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       prices,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// AdminGetPriceHandler 管理员获取定价详情
func AdminGetPriceHandler(c *fiber.Ctx) error {
	priceID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price ID"})
	}

	price, err := subscriptionService.GetPrice(uint(priceID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": price})
}

// ========== 额外的管理员处理器以匹配路由绑定 ==========

// AdminListProductsHandler 管理员获取所有产品列表
func AdminListProductsHandler(c *fiber.Ctx) error {
	var req ListProductsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 默认分页
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	products, total, err := subscriptionService.ListProducts(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       products,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// AdminGetProductHandler 管理员获取产品详情
func AdminGetProductHandler(c *fiber.Ctx) error {
	productID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid product ID"})
	}

	product, err := subscriptionService.GetProduct(uint(productID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": product})
}

// UpdatePriceHandler 更新定价（管理员）
func UpdatePriceHandler(c *fiber.Ctx) error {
	priceID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price ID"})
	}

	var req UpdatePriceRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	price, err := subscriptionService.UpdatePrice(uint(priceID), &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": price})
}

// DeletePriceHandler 删除定价（管理员）
func DeletePriceHandler(c *fiber.Ctx) error {
	priceID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid price ID"})
	}

	if err := subscriptionService.DeletePrice(uint(priceID)); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Price deleted successfully"})
}

// AdminListCouponsHandler 管理员获取所有优惠券列表
func AdminListCouponsHandler(c *fiber.Ctx) error {
	var req ListCouponsRequest
	if err := c.QueryParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid query parameters"})
	}

	// 默认分页
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	coupons, total, err := subscriptionService.ListCoupons(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	totalPages := int((total + int64(req.PageSize) - 1) / int64(req.PageSize))

	return c.JSON(fiber.Map{
		"data": PaginatedResponse{
			Data:       coupons,
			Total:      total,
			Page:       req.Page,
			PageSize:   req.PageSize,
			TotalPages: totalPages,
		},
	})
}

// AdminGetCouponHandler 管理员获取优惠券详情
func AdminGetCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid coupon code"})
	}

	coupon, err := subscriptionService.GetCoupon(code)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": coupon})
}

// UpdateCouponHandler 更新优惠券（管理员）
func UpdateCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid coupon code"})
	}

	var req UpdateCouponRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	coupon, err := subscriptionService.UpdateCoupon(code, &req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": coupon})
}

// DeleteCouponHandler 删除优惠券（管理员）
func DeleteCouponHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid coupon code"})
	}

	if err := subscriptionService.DeleteCoupon(code); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Coupon deleted successfully"})
}
