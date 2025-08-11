package admin

import (
    "basaltpass-backend/internal/common"
    "basaltpass-backend/internal/model"
    "github.com/gofiber/fiber/v2"
)

// ListWalletTxHandler GET /admin/wallets
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

// ApproveTxHandler POST /admin/tx/:id/approve {status}
func ApproveTxHandler(c *fiber.Ctx) error {
    id := c.Params("id")
    var body struct{ Status string `json:"status"` }
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