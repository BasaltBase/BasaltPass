package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	notif "basaltpass-backend/internal/service/notification"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type AdminCreateRequest struct {
	AppName     string `json:"app_name"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	Type        string `json:"type"`
	ReceiverIDs []uint `json:"receiver_ids"`
}

// AdminCreateHandler POST /tenant/notifications
func AdminCreateHandler(c *fiber.Ctx) error {
	var req AdminCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	adminID := c.Locals("userID").(uint)
	if err := notif.Send(req.AppName, req.Title, req.Content, req.Type, &adminID, "管理员", req.ReceiverIDs); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusCreated)
}

// AdminListHandler GET /tenant/notifications
func AdminListHandler(c *fiber.Ctx) error {
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	var notifs []model.Notification
	var total int64
	db := common.DB()
	db.Model(&model.Notification{}).Count(&total)
	if err := db.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Preload("App").Find(&notifs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notifs, "total": total, "page": page, "page_size": pageSize})
}

// AdminDeleteHandler DELETE /tenant/notifications/:id
func AdminDeleteHandler(c *fiber.Ctx) error {
	nid, _ := strconv.Atoi(c.Params("id"))
	if err := common.DB().Delete(&model.Notification{}, uint(nid)).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}
