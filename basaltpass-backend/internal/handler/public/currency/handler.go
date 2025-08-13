package currency

import (
	currency2 "basaltpass-backend/internal/service/currency"
	"github.com/gofiber/fiber/v2"
)

// GetCurrenciesHandler GET /currencies - 获取所有启用的货币
func GetCurrenciesHandler(c *fiber.Ctx) error {
	currencies, err := currency2.GetAllCurrencies()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to fetch currencies",
		})
	}
	return c.JSON(currencies)
}

// GetCurrencyHandler GET /currencies/:code - 根据代码获取货币信息
func GetCurrencyHandler(c *fiber.Ctx) error {
	code := c.Params("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Currency code is required",
		})
	}

	currency, err := currency2.GetCurrencyByCode(code)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Currency not found",
		})
	}
	return c.JSON(currency)
}
