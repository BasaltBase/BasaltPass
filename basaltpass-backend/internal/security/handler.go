package security

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp/totp"
)

// SetupHandler generates TOTP secret and returns it.
func SetupHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	secret, err := totp.Generate(totp.GenerateOpts{Issuer: "BasaltPass", AccountName: "user"})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	common.DB().Model(&model.User{}).Where("id = ?", uid).Updates(map[string]interface{}{"totp_secret": secret.Secret()})
	return c.JSON(fiber.Map{"secret": secret.Secret(), "qr": secret.URL()})
}

// VerifyHandler verifies submitted TOTP code and enables 2FA.
func VerifyHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	ok := totp.Validate(body.Code, user.TOTPSecret)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid code"})
	}
	common.DB().Model(&user).Update("two_fa_enabled", true)
	return c.SendStatus(fiber.StatusNoContent)
}
