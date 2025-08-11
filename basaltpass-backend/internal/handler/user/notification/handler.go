package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ListHandler GET /notifications
func ListHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	var notifs []model.Notification
	var total int64
	db := common.DB()
	db.Model(&model.Notification{}).
		Where("receiver_id = ? OR receiver_id = 0", uid).
		Count(&total)
	if err := db.Where("receiver_id = ? OR receiver_id = 0", uid).
		Order("created_at desc").
		Offset((page - 1) * pageSize).Limit(pageSize).
		Preload("App").
		Find(&notifs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notifs, "total": total, "page": page, "page_size": pageSize})
}

// UnreadCountHandler GET /notifications/unread-count
func UnreadCountHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var count int64
	if err := common.DB().Model(&model.Notification{}).
		Where("(receiver_id = ? OR receiver_id = 0) AND is_read = ?", uid, false).
		Count(&count).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"count": count})
}

// MarkAsReadHandler PUT /notifications/:id/read
func MarkAsReadHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	if err := common.DB().Model(&model.Notification{}).
		Where("id = ? AND (receiver_id = ? OR receiver_id = 0)", uint(nid), uid).
		Updates(map[string]interface{}{"is_read": true, "read_at": time.Now()}).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// MarkAllAsReadHandler PUT /notifications/mark-all-read
func MarkAllAsReadHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	if err := common.DB().Model(&model.Notification{}).
		Where("(receiver_id = ? OR receiver_id = 0) AND is_read = ?", uid, false).
		Updates(map[string]interface{}{"is_read": true, "read_at": time.Now()}).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DeleteHandler DELETE /notifications/:id
func DeleteHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	if err := common.DB().Where("id = ? AND (receiver_id = ? OR receiver_id = 0)", uint(nid), uid).Delete(&model.Notification{}).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
