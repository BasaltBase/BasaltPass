package user

import (
	"basaltpass-backend/internal/service/wallet"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// 用户钱包相关 Handler (路径前缀: /wallet)

// GetWalletBalanceHandler GET /wallet/balance?currency=USD
func GetWalletBalanceHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	currency := c.Query("currency", "USD")
	w, err := wallet.GetBalanceByCode(uid, currency)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"balance": w.Balance, "currency_id": w.CurrencyID})
}

// RechargeWalletHandler POST /wallet/recharge {currency, amount}
func RechargeWalletHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var body struct {
		Currency string `json:"currency"`
		Amount   int64  `json:"amount"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := wallet.RechargeByCode(uid, body.Currency, body.Amount); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// WithdrawWalletHandler POST /wallet/withdraw {currency, amount}
func WithdrawWalletHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var body struct {
		Currency string `json:"currency"`
		Amount   int64  `json:"amount"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := wallet.WithdrawByCode(uid, body.Currency, body.Amount); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// WalletHistoryHandler GET /wallet/history?currency=USD&limit=20
func WalletHistoryHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	currency := c.Query("currency", "USD")
	limitStr := c.Query("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	txs, err := wallet.HistoryByCode(uid, currency, limit)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(txs)
}
