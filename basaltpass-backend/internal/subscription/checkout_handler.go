package subscription

import (
	"basaltpass-backend/internal/common"

	"github.com/gofiber/fiber/v2"
)

var checkoutService *CheckoutService

// InitCheckoutHandler 初始化checkout处理器
func InitCheckoutHandler() {
	if checkoutService == nil {
		checkoutService = NewCheckoutService(common.DB())
	}
}

// CheckoutHandler POST /subscriptions/checkout - 订阅结账
func CheckoutHandler(c *fiber.Ctx) error {
	InitCheckoutHandler()
	
	userID := c.Locals("userID").(uint)

	var req CheckoutRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 验证customerID是否是当前用户
	if req.CustomerID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "只能为自己创建订阅",
		})
	}

	// 验证必填字段
	if req.PriceID == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "价格ID不能为空",
		})
	}

	if req.SuccessURL == "" || req.CancelURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "成功和取消URL不能为空",
		})
	}

	response, err := checkoutService.CreateCheckout(&req)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "订阅结账创建成功",
		"data":    response,
	})
}

// QuickCheckoutHandler POST /subscriptions/quick-checkout - 快速订阅结账（简化参数）
func QuickCheckoutHandler(c *fiber.Ctx) error {
	InitCheckoutHandler()
	
	userID := c.Locals("userID").(uint)

	var req struct {
		PriceID    uint    `json:"price_id" validate:"required"`
		Quantity   float64 `json:"quantity,omitempty"`
		CouponCode *string `json:"coupon_code,omitempty"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 构建完整的checkout请求
	checkoutReq := CheckoutRequest{
		CustomerID:  userID,
		PriceID:     req.PriceID,
		Quantity:    req.Quantity,
		CouponCode:  req.CouponCode,
		SuccessURL:  "http://localhost:3000/subscriptions?payment=success",
		CancelURL:   "http://localhost:3000/subscriptions?payment=canceled",
	}

	response, err := checkoutService.CreateCheckout(&checkoutReq)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "订阅结账创建成功",
		"data":    response,
	})
} 