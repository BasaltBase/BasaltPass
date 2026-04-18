package order

import (
	order2 "basaltpass-backend/internal/service/order"
	"strconv"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

var orderService *order2.OrderService

// InitOrderHandler 初始化订单处理器
func InitOrderHandler() {

	// 确保只初始化一次
	if orderService == nil {
		orderService = order2.NewOrderService(common.DB())
	}
}

func resolveOrderTenantID(c *fiber.Ctx) (uint64, error) {
	if tenantLocal, ok := c.Locals("tenantID").(uint); ok && tenantLocal > 0 {
		return uint64(tenantLocal), nil
	}

	userID, ok := c.Locals("userID").(uint)
	if !ok || userID == 0 {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "未登录")
	}

	var user model.User
	if err := common.DB().Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		return 0, fiber.NewError(fiber.StatusForbidden, "无法识别当前租户")
	}

	if user.TenantID > 0 {
		return uint64(user.TenantID), nil
	}

	var tenantUser model.TenantUser
	if err := common.DB().Select("tenant_id").Where("user_id = ?", userID).Order("created_at ASC").First(&tenantUser).Error; err != nil {
		return 0, fiber.NewError(fiber.StatusForbidden, "当前用户没有关联租户")
	}

	if tenantUser.TenantID == 0 {
		return 0, fiber.NewError(fiber.StatusForbidden, "当前用户没有关联租户")
	}

	return uint64(tenantUser.TenantID), nil
}

// CreateOrderHandler POST /orders - 创建订单
func CreateOrderHandler(c *fiber.Ctx) error {
	InitOrderHandler()

	userID := c.Locals("userID").(uint)
	tenantID, tenantErr := resolveOrderTenantID(c)
	if tenantErr != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": tenantErr.Error()})
	}

	var req order2.CreateOrderRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数错误",
		})
	}

	// 验证userID
	if req.UserID != userID {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "只能为自己创建订单",
		})
	}

	order, err := orderService.CreateOrder(&req, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "订单创建成功",
		"data":    order,
	})
}

// GetOrderHandler GET /orders/:id - 获取订单详情
func GetOrderHandler(c *fiber.Ctx) error {
	InitOrderHandler()

	userID := c.Locals("userID").(uint)
	tenantID, tenantErr := resolveOrderTenantID(c)
	if tenantErr != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": tenantErr.Error()})
	}

	orderIDStr := c.Params("id")
	orderID, err := strconv.ParseUint(orderIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "订单ID无效",
		})
	}

	activate := c.Query("activate") == "1" || c.Query("activate") == "true"

	order, err := orderService.GetOrder(userID, uint(orderID), activate, tenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    order,
	})
}

// GetOrderByNumberHandler GET /orders/number/:number - 根据订单号获取订单
func GetOrderByNumberHandler(c *fiber.Ctx) error {
	InitOrderHandler()

	userID := c.Locals("userID").(uint)
	tenantID, tenantErr := resolveOrderTenantID(c)
	if tenantErr != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": tenantErr.Error()})
	}
	orderNumber := c.Params("number")

	order, err := orderService.GetOrderByNumber(userID, orderNumber, tenantID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    order,
	})
}

// ListOrdersHandler GET /orders - 获取用户订单列表
func ListOrdersHandler(c *fiber.Ctx) error {
	InitOrderHandler()

	userID := c.Locals("userID").(uint)
	tenantID, tenantErr := resolveOrderTenantID(c)
	if tenantErr != nil {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": tenantErr.Error()})
	}

	limitStr := c.Query("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit > 100 {
		limit = 100
	}

	orders, err := orderService.ListUserOrders(userID, limit, tenantID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    orders,
		"count":   len(orders),
	})
}
