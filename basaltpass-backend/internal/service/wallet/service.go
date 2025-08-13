package wallet

import (
	"basaltpass-backend/internal/service/currency"
	"errors"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// GetBalance returns wallet balance for user+currency (creates row if absent)
func GetBalance(userID uint, currencyID uint) (model.Wallet, error) {
	// 验证货币是否存在
	_, err := currency.GetCurrencyByID(currencyID)
	if err != nil {
		return model.Wallet{}, errors.New("invalid currency ID")
	}

	db := common.DB()
	var w model.Wallet
	if err := db.Where("user_id = ? AND currency_id = ?", userID, currencyID).First(&w).Error; err != nil {
		w = model.Wallet{UserID: &userID, CurrencyID: &currencyID}
		db.Create(&w)
	}
	return w, nil
}

// GetBalanceByCode returns wallet balance for user+currency code (convenience function)
func GetBalanceByCode(userID uint, currencyCode string) (model.Wallet, error) {
	// 根据代码获取货币ID
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return model.Wallet{}, errors.New("invalid currency code")
	}
	return GetBalance(userID, curr.ID)
}

// Recharge adds amount to balance and creates transaction (mock auto success)
func Recharge(userID uint, currencyID uint, amount int64) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	// 验证货币是否存在
	_, err := currency.GetCurrencyByID(currencyID)
	if err != nil {
		return errors.New("invalid currency ID")
	}

	db := common.DB()
	return db.Transaction(func(tx *gorm.DB) error {
		var w model.Wallet
		tx.Where("user_id = ? AND currency_id = ?", userID, currencyID).FirstOrCreate(&w, model.Wallet{UserID: &userID, CurrencyID: &currencyID})
		w.Balance += amount
		if err := tx.Save(&w).Error; err != nil {
			return err
		}
		t := model.WalletTx{WalletID: w.ID, Type: "recharge", Amount: amount, Status: "success", Reference: "mock"}
		return tx.Create(&t).Error
	})
}

// RechargeByCode adds amount to balance using currency code (convenience function)
func RechargeByCode(userID uint, currencyCode string, amount int64) error {
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return errors.New("invalid currency code")
	}
	return Recharge(userID, curr.ID, amount)
}

// Withdraw deducts amount (mock immediate success)
func Withdraw(userID uint, currencyID uint, amount int64) error {
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	// 验证货币是否存在
	_, err := currency.GetCurrencyByID(currencyID)
	if err != nil {
		return errors.New("invalid currency ID")
	}

	db := common.DB()
	return db.Transaction(func(tx *gorm.DB) error {
		var w model.Wallet
		if err := tx.Where("user_id = ? AND currency_id = ?", userID, currencyID).First(&w).Error; err != nil {
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

// WithdrawByCode deducts amount using currency code (convenience function)
func WithdrawByCode(userID uint, currencyCode string, amount int64) error {
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return errors.New("invalid currency code")
	}
	return Withdraw(userID, curr.ID, amount)
}

// History returns last n transactions
func History(userID uint, currencyID uint, limit int) ([]model.WalletTx, error) {
	var w model.Wallet
	db := common.DB()
	if err := db.Where("user_id = ? AND currency_id = ?", userID, currencyID).First(&w).Error; err != nil {
		return nil, err
	}
	var txs []model.WalletTx
	db.Where("wallet_id = ?", w.ID).Order("created_at desc").Limit(limit).Find(&txs)
	return txs, nil
}

// HistoryByCode returns last n transactions using currency code (convenience function)
func HistoryByCode(userID uint, currencyCode string, limit int) ([]model.WalletTx, error) {
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return nil, errors.New("invalid currency code")
	}
	return History(userID, curr.ID, limit)
}
