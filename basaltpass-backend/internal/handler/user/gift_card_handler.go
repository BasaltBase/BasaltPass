package user

import (
	"basaltpass-backend/internal/service/giftcard"

	"github.com/gofiber/fiber/v2"
)

var userGiftCardService = giftcard.NewService()

type redeemGiftCardRequest struct {
	Code string `json:"code"`
}

func RedeemGiftCardHandler(c *fiber.Ctx) error {
	uid, ok := c.Locals("userID").(uint)
	if !ok || uid == 0 {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "user context required"})
	}
	var req redeemGiftCardRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	item, err := userGiftCardService.Redeem(uid, req.Code)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"data": item})
}
