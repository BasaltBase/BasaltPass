package notification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"errors"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type notificationSettingsResponse struct {
	EmailEnabled    bool `json:"email_enabled"`
	SMSEnabled      bool `json:"sms_enabled"`
	PushEnabled     bool `json:"push_enabled"`
	SecurityEnabled bool `json:"security_enabled"`
}

type updateNotificationSettingsRequest struct {
	EmailEnabled    *bool `json:"email_enabled"`
	SMSEnabled      *bool `json:"sms_enabled"`
	PushEnabled     *bool `json:"push_enabled"`
	SecurityEnabled *bool `json:"security_enabled"`
}

func defaultNotificationSettings(userID uint) model.UserNotificationSettings {
	return model.UserNotificationSettings{
		UserID:          userID,
		EmailEnabled:    true,
		SMSEnabled:      false,
		PushEnabled:     true,
		SecurityEnabled: true,
	}
}

func toNotificationSettingsResponse(settings model.UserNotificationSettings) notificationSettingsResponse {
	return notificationSettingsResponse{
		EmailEnabled:    settings.EmailEnabled,
		SMSEnabled:      settings.SMSEnabled,
		PushEnabled:     settings.PushEnabled,
		SecurityEnabled: settings.SecurityEnabled,
	}
}

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

// GetSettingsHandler GET /notifications/settings
func GetSettingsHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	settings := defaultNotificationSettings(uid)
	err := common.DB().
		Where("user_id = ?", uid).
		First(&settings).Error
	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"data": toNotificationSettingsResponse(settings)})
}

// UpdateSettingsHandler PUT /notifications/settings
func UpdateSettingsHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var req updateNotificationSettingsRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	settings := defaultNotificationSettings(uid)
	db := common.DB()
	if err := db.Where("user_id = ?", uid).First(&settings).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if createErr := db.Create(&settings).Error; createErr != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": createErr.Error()})
			}
		} else {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	updates := map[string]interface{}{}
	if req.EmailEnabled != nil {
		updates["email_enabled"] = *req.EmailEnabled
		settings.EmailEnabled = *req.EmailEnabled
	}
	if req.SMSEnabled != nil {
		updates["sms_enabled"] = *req.SMSEnabled
		settings.SMSEnabled = *req.SMSEnabled
	}
	if req.PushEnabled != nil {
		updates["push_enabled"] = *req.PushEnabled
		settings.PushEnabled = *req.PushEnabled
	}
	if req.SecurityEnabled != nil {
		updates["security_enabled"] = *req.SecurityEnabled
		settings.SecurityEnabled = *req.SecurityEnabled
	}

	if len(updates) > 0 {
		if err := db.Model(&model.UserNotificationSettings{}).
			Where("user_id = ?", uid).
			Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
	}

	return c.JSON(fiber.Map{"data": toNotificationSettingsResponse(settings)})
}
