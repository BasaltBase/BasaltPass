package admin

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"github.com/gofiber/fiber/v2"
)

// ListAuditHandler GET /tenant/logs
func ListAuditHandler(c *fiber.Ctx) error {
	action := c.Query("action")
	var logs []model.AuditLog
	db := common.DB().Preload("User")
	if action != "" {
		db = db.Where("action = ?", action)
	}
	db.Order("created_at desc").Limit(200).Find(&logs)
	return c.JSON(logs)
}
