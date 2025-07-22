package order

import (
	"strconv"

	"basaltpass-backend/internal/common"

	"github.com/gofiber/fiber/v2"
)

var orderService *OrderService

// InitOrderHandler 初始化订单处理器
func InitOrderHandler() {
	if orderService == nil {
		orderService = NewOrderService(common.DB())
	}
}

// CreateOrderHandler POST /orders - 创建订单
func CreateOrderHandler(c *fiber.Ctx) error {
	InitOrderHandler()
	
	userID := c.Locals("userID").(uint)

	var req CreateOrderRequest
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

	order, err := orderService.CreateOrder(&req)
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
	
	orderIDStr := c.Params("id")
	orderID, err := strconv.ParseUint(orderIDStr, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "订单ID无效",
		})
	}

	order, err := orderService.GetOrder(userID, uint(orderID))
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
	orderNumber := c.Params("number")

	order, err := orderService.GetOrderByNumber(userID, orderNumber)
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
	
	limitStr := c.Query("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	if limit > 100 {
		limit = 100
	}

	orders, err := orderService.ListUserOrders(userID, limit)
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