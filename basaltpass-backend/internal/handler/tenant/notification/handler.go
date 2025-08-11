package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	notif "basaltpass-backend/internal/service/notification"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type TenantCreateRequest struct {
	AppName     string `json:"app_name"`
	Title       string `json:"title"`
	Content     string `json:"content"`
	Type        string `json:"type"`
	ReceiverIDs []uint `json:"receiver_ids"`
}

// TenantCreateHandler POST /tenant/notifications
func TenantCreateHandler(c *fiber.Ctx) error {
	var req TenantCreateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	tenantID := c.Locals("tenantID").(uint)
	senderID := c.Locals("userID").(uint)
	// 验证 receiver 属于租户，若为空则全租户广播
	db := common.DB()
	var rids []uint
	if len(req.ReceiverIDs) == 0 {
		if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &rids).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	} else {
		if err := db.Table("tenant_admins").Where("tenant_id = ? AND user_id IN ?", tenantID, req.ReceiverIDs).Pluck("user_id", &rids).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}
	if len(rids) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无有效接收者"})
	}
	if err := notif.Send(req.AppName, req.Title, req.Content, req.Type, &senderID, "租户管理员", rids); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "通知发送成功"})
}

// TenantListHandler GET /tenant/notifications
func TenantListHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	page, _ := strconv.Atoi(c.Query("page", "1"))
	pageSize, _ := strconv.Atoi(c.Query("page_size", "20"))
	db := common.DB()
	var userIDs []uint
	if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &userIDs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(userIDs) == 0 {
		return c.JSON(fiber.Map{"data": []model.Notification{}, "total": 0, "page": page, "page_size": pageSize})
	}
	var notifs []model.Notification
	var total int64
	db.Model(&model.Notification{}).Where("receiver_id IN ?", userIDs).Count(&total)
	if err := db.Where("receiver_id IN ?", userIDs).Order("created_at desc").Offset((page - 1) * pageSize).Limit(pageSize).Preload("App").Find(&notifs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notifs, "total": total, "page": page, "page_size": pageSize})
}

// 其余租户通知管理接口（删除、详情、更新、统计）
func TenantDeleteHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	db := common.DB()
	var userIDs []uint
	if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &userIDs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(userIDs) == 0 {
		return c.SendStatus(fiber.StatusNoContent)
	}
	if err := db.Where("id = ? AND receiver_id IN ?", uint(nid), userIDs).Delete(&model.Notification{}).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func TenantGetNotificationHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	db := common.DB()
	var userIDs []uint
	if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &userIDs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var notif model.Notification
	if err := db.Where("id = ? AND receiver_id IN ?", uint(nid), userIDs).Preload("App").First(&notif).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": notif})
}

func TenantUpdateNotificationHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	nid, _ := strconv.Atoi(c.Params("id"))
	var req struct{ Title, Content, Type string }
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	db := common.DB()
	var userIDs []uint
	if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &userIDs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	res := db.Model(&model.Notification{}).Where("id = ? AND receiver_id IN ?", uint(nid), userIDs).Updates(map[string]any{"title": req.Title, "content": req.Content, "type": req.Type})
	if res.Error != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": res.Error.Error()})
	}
	if res.RowsAffected == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无权限或不存在"})
	}
	return c.JSON(fiber.Map{"message": "更新成功"})
}

func TenantGetNotificationStatsHandler(c *fiber.Ctx) error {
	tenantID := c.Locals("tenantID").(uint)
	db := common.DB()
	var userIDs []uint
	if err := db.Table("tenant_admins").Where("tenant_id = ?", tenantID).Pluck("user_id", &userIDs).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if len(userIDs) == 0 {
		return c.JSON(fiber.Map{"data": fiber.Map{"total_sent": 0, "total_read": 0, "total_unread": 0, "read_rate": 0}})
	}
	var total, read int64
	db.Model(&model.Notification{}).Where("receiver_id IN ?", userIDs).Count(&total)
	db.Model(&model.Notification{}).Where("receiver_id IN ? AND is_read = ?", userIDs, true).Count(&read)
	unread := total - read
	var typeStats []struct {
		Type  string
		Count int64
	}
	db.Model(&model.Notification{}).Select("type, COUNT(*) as count").Where("receiver_id IN ?", userIDs).Group("type").Find(&typeStats)
	m := map[string]int64{}
	for _, s := range typeStats {
		m[s.Type] = s.Count
	}
	return c.JSON(fiber.Map{"data": fiber.Map{"total_sent": total, "total_read": read, "total_unread": unread, "read_rate": (float64(read) / float64(total)) * 100, "type_stats": m}})
}
