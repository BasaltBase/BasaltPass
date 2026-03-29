package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	notif "basaltpass-backend/internal/service/notification"
	"strconv"
	"strings"

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
	search := strings.TrimSpace(c.Query("search", ""))
	db := common.DB()
	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}

	var notifs []model.Notification
	var total int64
	query := db.Model(&model.Notification{})
	if search != "" {
		like := "%" + search + "%"
		query = query.Where("title LIKE ? OR content LIKE ?", like, like)
	}
	if err := query.Count(&total).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := query.Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Preload("App").Find(&notifs).Error; err != nil {
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
