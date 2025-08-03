package notification

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// TenantCreateRequest 租户创建通知请求体
type TenantCreateRequest struct {
	AppName     string `json:"app_name"` // 应用名称
	Title       string `json:"title"`
	Content     string `json:"content"`
	Type        string `json:"type"`         // info/success/warning/error
	ReceiverIDs []uint `json:"receiver_ids"` // 接收用户ID列表，为空表示给租户下所有用户广播
}

// TenantCreateHandler 租户创建通知
// POST /admin/notifications
func TenantCreateHandler(c *fiber.Ctx) error {
	var req TenantCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	tenantID := c.Locals("tenantID").(uint)
	senderID := c.Locals("userID").(uint)

	if err := TenantSend(tenantID, req.AppName, req.Title, req.Content, req.Type, &senderID, "租户管理员", req.ReceiverIDs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "通知发送成功"})
}

// TenantListHandler 租户获取已发送的通知列表
// GET /admin/notifications
func TenantListHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))

	notifs, total, err := TenantList(tenantID, page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":      notifs,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// TenantDeleteHandler 租户删除通知
// DELETE /admin/notifications/:id
func TenantDeleteHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	notifID, _ := strconv.Atoi(c.Params("id"))

	if err := TenantDelete(tenantID, uint(notifID)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.SendStatus(fiber.StatusNoContent)
}

// TenantGetUsersHandler 获取租户下的用户列表（用于搜索通知接收者）
// GET /admin/notifications/users
func TenantGetUsersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	search := c.Query("search", "")

	users, err := TenantGetUsers(tenantID, search)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": users})
}

// TenantGetNotificationHandler 租户获取通知详情
// GET /tenant/notifications/:id
func TenantGetNotificationHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	notifID, _ := strconv.Atoi(c.Params("id"))

	notif, err := TenantGetNotification(tenantID, uint(notifID))
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": notif})
}

// TenantUpdateNotificationHandler 租户更新通知
// PUT /tenant/notifications/:id
func TenantUpdateNotificationHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	notifID, _ := strconv.Atoi(c.Params("id"))

	var req struct {
		Title   string `json:"title"`
		Content string `json:"content"`
		Type    string `json:"type"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := TenantUpdateNotification(tenantID, uint(notifID), req.Title, req.Content, req.Type); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "通知更新成功"})
}

// TenantGetNotificationStatsHandler 租户获取通知统计信息
// GET /tenant/notifications/stats
func TenantGetNotificationStatsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)

	stats, err := TenantGetNotificationStats(tenantID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": stats})
}

// TenantSearchUsersHandler 租户根据邮箱、昵称等搜索用户
// GET /tenant/notifications/users/search
func TenantSearchUsersHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	search := c.Query("search", "")

	if search == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "搜索关键词不能为空",
		})
	}

	users, err := TenantGetUsers(tenantID, search)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"data":    users,
		"message": "用户搜索成功",
	})
}
