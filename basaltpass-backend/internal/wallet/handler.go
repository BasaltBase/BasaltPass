package wallet

import (
    "strconv"

    "github.com/gofiber/fiber/v2"
)

// BalanceHandler GET /wallet/balance?currency=USD
func BalanceHandler(c *fiber.Ctx) error {
    uid := c.Locals("userID").(uint)
    currency := c.Query("currency", "USD")
    w, err := GetBalance(uid, currency)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(fiber.Map{"balance": w.Balance, "currency": w.Currency})
}

// RechargeHandler POST /wallet/recharge {currency, amount}
func RechargeHandler(c *fiber.Ctx) error {
    uid := c.Locals("userID").(uint)
    var body struct{
        Currency string `json:"currency"`
        Amount   int64  `json:"amount"`
    }
    if err := c.BodyParser(&body); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    if err := Recharge(uid, body.Currency, body.Amount); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    return c.SendStatus(fiber.StatusNoContent)
}

// WithdrawHandler POST /wallet/withdraw {currency, amount}
func WithdrawHandler(c *fiber.Ctx) error {
    uid := c.Locals("userID").(uint)
    var body struct{
        Currency string `json:"currency"`
        Amount   int64  `json:"amount"`
    }
    if err := c.BodyParser(&body); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    if err := Withdraw(uid, body.Currency, body.Amount); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    return c.SendStatus(fiber.StatusNoContent)
}

// HistoryHandler GET /wallet/history?currency=USD&limit=20
func HistoryHandler(c *fiber.Ctx) error {
    uid := c.Locals("userID").(uint)
    currency := c.Query("currency", "USD")
    limitStr := c.Query("limit", "20")
    limit, _ := strconv.Atoi(limitStr)
    txs, err := History(uid, currency, limit)
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
    }
    return c.JSON(txs)
} 