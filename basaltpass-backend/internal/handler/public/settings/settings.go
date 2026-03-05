package settings

import (
	settingssvc "basaltpass-backend/internal/service/settings"

	"github.com/gofiber/fiber/v2"
)

// PublicConfig 公开给前端的配置项（无需鉴权即可读取）
type PublicConfig struct {
	MarketEnabled bool `json:"market_enabled"`

	// 2FA 方式开关：前端可据此决定是否渲染对应的验证 UI
	TwoFA struct {
		TOTPEnabled    bool `json:"totp_enabled"`
		PasskeyEnabled bool `json:"passkey_enabled"`
		SMSEnabled     bool `json:"sms_enabled"`
	} `json:"two_fa"`
}

// GetPublicConfigHandler 获取公开配置
func GetPublicConfigHandler(c *fiber.Ctx) error {
	config := PublicConfig{}

	config.MarketEnabled = settingssvc.GetBool("features.market_enabled", true)
	config.TwoFA.TOTPEnabled = settingssvc.GetBool("auth.2fa.totp_enabled", true)
	config.TwoFA.PasskeyEnabled = settingssvc.GetBool("auth.2fa.passkey_enabled", true)
	config.TwoFA.SMSEnabled = settingssvc.GetBool("auth.2fa.sms_enabled", false)

	return c.JSON(config)
}
