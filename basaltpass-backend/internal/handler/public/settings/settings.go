package settings

import (
	settingssvc "basaltpass-backend/internal/service/settings"

	"github.com/gofiber/fiber/v2"
)

// PublicConfig 公开给前端的配置项
type PublicConfig struct {
	MarketEnabled bool `json:"market_enabled"`
}

// GetPublicConfigHandler 获取公开配置
func GetPublicConfigHandler(c *fiber.Ctx) error {
	marketEnabled := true // 默认值
	if item, ok := settingssvc.GetItem("features.market_enabled"); ok {
		if val, ok := item.Value.(bool); ok {
			marketEnabled = val
		}
	}

	config := PublicConfig{
		MarketEnabled: marketEnabled,
	}

	return c.JSON(config)
}
