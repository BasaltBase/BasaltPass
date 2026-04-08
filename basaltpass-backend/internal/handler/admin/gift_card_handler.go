package admin

import (
	"basaltpass-backend/internal/service/giftcard"

	"github.com/gofiber/fiber/v2"
)

var adminGiftCardService = giftcard.NewService()

func GetGiftCardValidityHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	item, err := adminGiftCardService.GetByCode(code)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": item})
}
