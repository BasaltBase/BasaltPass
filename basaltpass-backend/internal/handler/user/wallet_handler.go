package user

import (
	"basaltpass-backend/internal/service/wallet"
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

// 用户钱包相关 Handler (路径前缀: /wallet)

// GetWalletBalanceHandler GET /wallet/balance?currency=USD
func GetWalletBalanceHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	activeTenantID, _ := c.Locals("tenantID").(uint)
	currency := c.Query("currency", "USD")
	w, err := wallet.GetBalanceByCodeWithTenant(uid, activeTenantID, currency)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"balance": w.Balance, "currency_id": w.CurrencyID, "tenant_id": w.TenantID})
}

// RechargeWalletHandler POST /wallet/recharge {currency, amount}
func RechargeWalletHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	activeTenantID, _ := c.Locals("tenantID").(uint)
	var body struct {
		Currency string `json:"currency"`
		Amount   int64  `json:"amount"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := wallet.RechargeByCodeWithTenant(uid, activeTenantID, body.Currency, body.Amount); err != nil {
		if errors.Is(err, wallet.ErrWalletRechargeWithdrawDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// WithdrawWalletHandler POST /wallet/withdraw {currency, amount}
func WithdrawWalletHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	activeTenantID, _ := c.Locals("tenantID").(uint)
	var body struct {
		Currency string `json:"currency"`
		Amount   int64  `json:"amount"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := wallet.WithdrawByCodeWithTenant(uid, activeTenantID, body.Currency, body.Amount); err != nil {
		if errors.Is(err, wallet.ErrWalletRechargeWithdrawDisabled) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// WalletHistoryHandler GET /wallet/history?currency=USD&limit=20
func WalletHistoryHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	activeTenantID, _ := c.Locals("tenantID").(uint)
	currency := c.Query("currency", "")
	limitStr := c.Query("limit", "20")
	limit, _ := strconv.Atoi(limitStr)
	var txs interface{}
	var err error
	if currency == "" || currency == "all" {
		txs, err = wallet.HistoryAllByUserWithTenant(uid, activeTenantID, limit)
	} else {
		txs, err = wallet.HistoryByCodeWithTenant(uid, activeTenantID, currency, limit)
	}
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(txs)
}
