package admin

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/wallet"

	"github.com/gofiber/fiber/v2"
)

// 管理员钱包相关 Handler (路径前缀: /admin/wallet)

// ListWalletTxHandler GET /admin/wallet/txs?status=
func ListWalletTxHandler(c *fiber.Ctx) error {
	status := c.Query("status")
	var txs []model.WalletTx
	db := common.DB().Preload("Wallet")
	if status != "" {
		db = db.Where("status = ?", status)
	}
	db.Order("created_at desc").Find(&txs)
	return c.JSON(txs)
}

// ApproveWalletTxHandler POST /admin/wallet/tx/:id/approve {status}
func ApproveWalletTxHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if body.Status != "success" && body.Status != "fail" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid status"})
	}
	if err := common.DB().Model(&model.WalletTx{}).Where("id = ?", id).Update("status", body.Status).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// GetUserWalletBalanceHandler GET /admin/wallet/:user_id/balance?currency=USD
func GetUserWalletBalanceHandler(c *fiber.Ctx) error {
	uidParam := c.Params("user_id")
	userID := parseUint(uidParam)
	currency := c.Query("currency", "USD")
	w, err := wallet.GetBalanceByCode(userID, currency)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"user_id": userID, "balance": w.Balance, "currency_id": w.CurrencyID})
}

// parseUint 简易转换
func parseUint(s string) uint {
	var n uint
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c < '0' || c > '9' {
			break
		}
		n = n*10 + uint(c-'0')
	}
	return n
}
