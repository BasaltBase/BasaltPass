package notification

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// 通知列表
// ListHandler GET /notifications
func ListHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	notifs, total, err := List(uid, page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notifs, "total": total, "page": page, "page_size": pageSize})
}

// 未读通知数量
// UnreadCountHandler GET /notifications/unread-count
func UnreadCountHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	count, err := UnreadCount(uid)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"count": count})
}

// 标记为已读
// MarkAsReadHandler PUT /notifications/:id/read
func MarkAsReadHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	idParam := c.Params("id")
	nid, _ := strconv.Atoi(idParam)
	if err := MarkAsRead(uid, uint(nid)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// 标记所有为已读
// MarkAllAsReadHandler PUT /notifications/mark-all-read
func MarkAllAsReadHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	if err := MarkAllAsRead(uid); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// 删除通知
// DeleteHandler DELETE /notifications/:id
func DeleteHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	if err := Delete(uid, uint(nid)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// 管理员创建通知 请求体
// AdminCreateRequest 请求体
type AdminCreateRequest struct {
	AppName     string `json:"app_name"` // 如 "安全中心"
	Title       string `json:"title"`
	Content     string `json:"content"`
	Type        string `json:"type"`         // info/success/warning/error
	ReceiverIDs []uint `json:"receiver_ids"` // 为空表示广播
}

// 管理员创建通知
// AdminCreateHandler POST /admin/notifications
func AdminCreateHandler(c *fiber.Ctx) error {
	var req AdminCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	adminID := c.Locals("userID").(uint)
	if err := Send(req.AppName, req.Title, req.Content, req.Type, &adminID, "管理员", req.ReceiverIDs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

// 管理员获取通知列表
// AdminListHandler GET /admin/notifications
func AdminListHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	notifs, total, err := AdminList(page, pageSize)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notifs, "total": total, "page": page, "page_size": pageSize})
}

// 管理员删除通知
// AdminDeleteHandler DELETE /admin/notifications/:id
func AdminDeleteHandler(c *fiber.Ctx) error {
	nid, _ := strconv.Atoi(c.Params("id"))
	if err := AdminDelete(uint(nid)); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
