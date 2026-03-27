package middleware

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func ManualAPIKeyAuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		plain := strings.TrimSpace(c.Get("X-API-Key"))
		if plain == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "missing api key",
			})
		}

		prefix := model.ManualAPIKeyPrefix(plain)
		if prefix == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid api key format",
			})
		}

		var candidates []model.ManualAPIKey
		if err := common.DB().
			Where("key_prefix = ? AND is_active = ?", prefix, true).
			Find(&candidates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "manual api key lookup failed",
			})
		}
		if len(candidates) == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid api key",
			})
		}

		now := time.Now()
		var matched *model.ManualAPIKey
		for i := range candidates {
			key := &candidates[i]
			if key.ExpiresAt != nil && key.ExpiresAt.Before(now) {
				continue
			}
			if key.VerifyPlainKey(plain) {
				matched = key
				break
			}
		}
		if matched == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "invalid api key",
			})
		}

		_ = common.DB().Model(&model.ManualAPIKey{}).
			Where("id = ?", matched.ID).
			Update("last_used_at", now).Error

		c.Locals("manualAPIKeyID", matched.ID)
		c.Locals("manualAPIKeyScope", string(matched.Scope))
		if matched.TenantID != nil {
			c.Locals("manualAPIKeyTenantID", *matched.TenantID)
		}
		c.Locals("manualAPIKeyCreatorUserID", matched.CreatedByUserID)

		return c.Next()
	}
}
