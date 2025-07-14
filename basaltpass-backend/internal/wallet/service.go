package wallet

import (
    "errors"

    "basaltpass-backend/internal/common"
    "basaltpass-backend/internal/model"

    "gorm.io/gorm"
)

// GetBalance returns wallet balance for user+currency (creates row if absent)
func GetBalance(userID uint, currency string) (model.Wallet, error) {
    db := common.DB()
    var w model.Wallet
    if err := db.Where("user_id = ? AND currency = ?", userID, currency).First(&w).Error; err != nil {
        w = model.Wallet{UserID: userID, Currency: currency}
        db.Create(&w)
    }
    return w, nil
}

// Recharge adds amount to balance and creates transaction (mock auto success)
func Recharge(userID uint, currency string, amount int64) error {
    if amount <= 0 {
        return errors.New("amount must be positive")
    }
    db := common.DB()
    return db.Transaction(func(tx *gorm.DB) error {
        var w model.Wallet
        tx.Where("user_id = ? AND currency = ?", userID, currency).FirstOrCreate(&w, model.Wallet{UserID: userID, Currency: currency})
        w.Balance += amount
        if err := tx.Save(&w).Error; err != nil {
            return err
        }
        t := model.WalletTx{WalletID: w.ID, Type: "recharge", Amount: amount, Status: "success", Reference: "mock"}
        return tx.Create(&t).Error
    })
}

// Withdraw deducts amount (mock immediate success)
func Withdraw(userID uint, currency string, amount int64) error {
    if amount <= 0 {
        return errors.New("amount must be positive")
    }
    db := common.DB()
    return db.Transaction(func(tx *gorm.DB) error {
        var w model.Wallet
        if err := tx.Where("user_id = ? AND currency = ?", userID, currency).First(&w).Error; err != nil {
            return err
        }
        if w.Balance < amount {
            return errors.New("insufficient funds")
        }
        w.Balance -= amount
        if err := tx.Save(&w).Error; err != nil {
            return err
        }
        t := model.WalletTx{WalletID: w.ID, Type: "withdraw", Amount: -amount, Status: "success", Reference: "mock"}
        return tx.Create(&t).Error
    })
}

// History returns last n transactions
func History(userID uint, currency string, limit int) ([]model.WalletTx, error) {
    var w model.Wallet
    db := common.DB()
    if err := db.Where("user_id = ? AND currency = ?", userID, currency).First(&w).Error; err != nil {
        return nil, err
    }
    var txs []model.WalletTx
    db.Where("wallet_id = ?", w.ID).Order("created_at desc").Limit(limit).Find(&txs)
    return txs, nil
} 