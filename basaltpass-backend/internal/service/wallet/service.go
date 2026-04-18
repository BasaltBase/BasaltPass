package wallet

import (
	"basaltpass-backend/internal/service/currency"
	"errors"
	"strings"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

const (
	CreditCurrencyCode  = "CREDIT"
	fallbackCreditCode1 = "POINTS"
	fallbackCreditCode2 = "USD"
)

var (
	ErrNoTenantIdentity       = errors.New("user has no tenant identity")
	ErrUserNotInTenantContext = errors.New("user does not belong to requested tenant")
)

func resolveCreditCurrency(tx *gorm.DB) (model.Currency, error) {
	var curr model.Currency
	if err := tx.Where("code = ? AND is_active = ?", CreditCurrencyCode, true).First(&curr).Error; err == nil {
		return curr, nil
	}
	if err := tx.Where("code = ? AND is_active = ?", fallbackCreditCode1, true).First(&curr).Error; err == nil {
		return curr, nil
	}
	if err := tx.Where("code = ? AND is_active = ?", fallbackCreditCode2, true).First(&curr).Error; err == nil {
		return curr, nil
	}
	return model.Currency{}, errors.New("no active currency available for credit wallet")
}

func resolveUserTenantID(tx *gorm.DB, userID uint) (uint, error) {
	return resolveEffectiveTenantID(tx, userID, 0)
}

func resolveEffectiveTenantID(tx *gorm.DB, userID uint, requestedTenantID uint) (uint, error) {
	if userID == 0 {
		return 0, errors.New("invalid user id")
	}

	var user model.User
	if err := tx.Select("tenant_id").First(&user, userID).Error; err != nil {
		return 0, err
	}

	if requestedTenantID == 0 {
		if user.TenantID > 0 {
			return user.TenantID, nil
		}

		var membership model.TenantUser
		if err := tx.Select("tenant_id").Where("user_id = ?", userID).Order("created_at ASC").First(&membership).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return 0, ErrNoTenantIdentity
			}
			return 0, err
		}
		return membership.TenantID, nil
	}

	if user.TenantID == requestedTenantID {
		return requestedTenantID, nil
	}

	var membershipCount int64
	if err := tx.Model(&model.TenantUser{}).
		Where("user_id = ? AND tenant_id = ?", userID, requestedTenantID).
		Count(&membershipCount).Error; err != nil {
		return 0, err
	}
	if membershipCount == 0 {
		return 0, ErrUserNotInTenantContext
	}

	return requestedTenantID, nil
}

// EnsureUserCreditWalletTx ensures one credit wallet exists for user under current transaction.
func EnsureUserCreditWalletTx(tx *gorm.DB, userID uint) error {
	if userID == 0 {
		return errors.New("invalid user id")
	}

	curr, err := resolveCreditCurrency(tx)
	if err != nil {
		return err
	}

	tenantID, err := resolveUserTenantID(tx, userID)
	if err != nil {
		return err
	}

	var w model.Wallet
	return tx.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, curr.ID, tenantID).
		FirstOrCreate(&w, model.Wallet{TenantID: tenantID, UserID: &userID, CurrencyID: &curr.ID}).Error
}

// EnsureCreditWalletsForAllUsers ensures every user has one credit wallet.
func EnsureCreditWalletsForAllUsers() (int64, error) {
	db := common.DB()
	var users []model.User
	if err := db.Select("id", "tenant_id").Find(&users).Error; err != nil {
		return 0, err
	}

	created := int64(0)
	err := db.Transaction(func(tx *gorm.DB) error {
		curr, err := resolveCreditCurrency(tx)
		if err != nil {
			return err
		}

		for _, user := range users {
			var existing model.Wallet
			errFind := tx.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", user.ID, curr.ID, user.TenantID).First(&existing).Error
			if errFind == nil {
				continue
			}
			if !errors.Is(errFind, gorm.ErrRecordNotFound) {
				return errFind
			}

			w := model.Wallet{TenantID: user.TenantID, UserID: &user.ID, CurrencyID: &curr.ID}
			if errCreate := tx.Create(&w).Error; errCreate != nil {
				return errCreate
			}
			created++
		}

		return nil
	})
	if err != nil {
		return 0, err
	}

	return created, nil
}

// GetBalance returns wallet balance for user+currency (creates row if absent)
func GetBalance(userID uint, currencyID uint) (model.Wallet, error) {
	return GetBalanceWithTenant(userID, currencyID, 0)
}

// GetBalanceWithTenant returns wallet balance in specified tenant context.
func GetBalanceWithTenant(userID uint, currencyID uint, tenantID uint) (model.Wallet, error) {
	// 验证货币是否存在
	_, err := currency.GetCurrencyByID(currencyID)
	if err != nil {
		return model.Wallet{}, errors.New("invalid currency ID")
	}

	db := common.DB()
	effectiveTenantID, err := resolveEffectiveTenantID(db, userID, tenantID)
	if err != nil {
		return model.Wallet{}, err
	}

	var w model.Wallet
	if err := db.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, currencyID, effectiveTenantID).First(&w).Error; err != nil {
		w = model.Wallet{TenantID: effectiveTenantID, UserID: &userID, CurrencyID: &currencyID}
		if err := db.Create(&w).Error; err != nil {
			return model.Wallet{}, err
		}
	}
	return w, nil
}

// GetBalanceByCode returns wallet balance for user+currency code (convenience function)
func GetBalanceByCode(userID uint, currencyCode string) (model.Wallet, error) {
	return GetBalanceByCodeWithTenant(userID, 0, currencyCode)
}

// GetBalanceByCodeWithTenant returns wallet balance by code in tenant context.
func GetBalanceByCodeWithTenant(userID uint, tenantID uint, currencyCode string) (model.Wallet, error) {
	// 根据代码获取货币ID
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return model.Wallet{}, errors.New("invalid currency code")
	}
	return GetBalanceWithTenant(userID, curr.ID, tenantID)
}

// Recharge adds amount to balance and creates transaction (mock auto success)
func Recharge(userID uint, currencyID uint, amount int64) error {
	return RechargeWithTenant(userID, 0, currencyID, amount)
}

// RechargeWithTenant adds amount under specified tenant context.
func RechargeWithTenant(userID uint, tenantID uint, currencyID uint, amount int64) error {
	if !RechargeWithdrawEnabled() {
		return ErrWalletRechargeWithdrawDisabled
	}
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	// 验证货币是否存在
	_, err := currency.GetCurrencyByID(currencyID)
	if err != nil {
		return errors.New("invalid currency ID")
	}

	db := common.DB()
	effectiveTenantID, err := resolveEffectiveTenantID(db, userID, tenantID)
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		var w model.Wallet
		if err := tx.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, currencyID, effectiveTenantID).
			FirstOrCreate(&w, model.Wallet{TenantID: effectiveTenantID, UserID: &userID, CurrencyID: &currencyID}).Error; err != nil {
			return err
		}
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
	return RechargeByCodeWithTenant(userID, 0, currencyCode, amount)
}

func RechargeByCodeWithTenant(userID uint, tenantID uint, currencyCode string, amount int64) error {
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return errors.New("invalid currency code")
	}
	return RechargeWithTenant(userID, tenantID, curr.ID, amount)
}

// Withdraw deducts amount (mock immediate success)
func Withdraw(userID uint, currencyID uint, amount int64) error {
	return WithdrawWithTenant(userID, 0, currencyID, amount)
}

func WithdrawWithTenant(userID uint, tenantID uint, currencyID uint, amount int64) error {
	if !RechargeWithdrawEnabled() {
		return ErrWalletRechargeWithdrawDisabled
	}
	if amount <= 0 {
		return errors.New("amount must be positive")
	}

	// 验证货币是否存在
	_, err := currency.GetCurrencyByID(currencyID)
	if err != nil {
		return errors.New("invalid currency ID")
	}

	db := common.DB()
	effectiveTenantID, err := resolveEffectiveTenantID(db, userID, tenantID)
	if err != nil {
		return err
	}

	return db.Transaction(func(tx *gorm.DB) error {
		var w model.Wallet
		if err := tx.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, currencyID, effectiveTenantID).First(&w).Error; err != nil {
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
	return WithdrawByCodeWithTenant(userID, 0, currencyCode, amount)
}

func WithdrawByCodeWithTenant(userID uint, tenantID uint, currencyCode string, amount int64) error {
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return errors.New("invalid currency code")
	}
	return WithdrawWithTenant(userID, tenantID, curr.ID, amount)
}

// AdjustByCode changes wallet balance by delta in smallest unit and records a transaction.
func AdjustByCode(userID uint, currencyCode string, delta int64, txType string, reference string) (model.Wallet, error) {
	return AdjustByCodeWithTenant(userID, 0, currencyCode, delta, txType, reference)
}

func AdjustByCodeWithTenant(userID uint, tenantID uint, currencyCode string, delta int64, txType string, reference string) (model.Wallet, error) {
	if delta == 0 {
		return model.Wallet{}, errors.New("amount must not be zero")
	}

	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return model.Wallet{}, errors.New("invalid currency code")
	}

	db := common.DB()
	effectiveTenantID, err := resolveEffectiveTenantID(db, userID, tenantID)
	if err != nil {
		return model.Wallet{}, err
	}

	var updated model.Wallet
	err = db.Transaction(func(tx *gorm.DB) error {
		var w model.Wallet
		if err := tx.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, curr.ID, effectiveTenantID).
			FirstOrCreate(&w, model.Wallet{TenantID: effectiveTenantID, UserID: &userID, CurrencyID: &curr.ID}).Error; err != nil {
			return err
		}

		newBalance := w.Balance + delta
		if newBalance < 0 {
			return errors.New("insufficient funds")
		}

		w.Balance = newBalance
		if err := tx.Save(&w).Error; err != nil {
			return err
		}

		txType = strings.TrimSpace(txType)
		if txType == "" {
			if delta > 0 {
				txType = "adjust_increase"
			} else {
				txType = "adjust_decrease"
			}
		}

		walletTx := model.WalletTx{
			WalletID:  w.ID,
			Type:      txType,
			Amount:    delta,
			Status:    "success",
			Reference: strings.TrimSpace(reference),
		}
		if err := tx.Create(&walletTx).Error; err != nil {
			return err
		}

		updated = w
		return nil
	})
	if err != nil {
		return model.Wallet{}, err
	}
	return updated, nil
}

// History returns last n transactions
func History(userID uint, currencyID uint, limit int) ([]model.WalletTx, error) {
	return HistoryWithTenant(userID, 0, currencyID, limit)
}

func HistoryWithTenant(userID uint, tenantID uint, currencyID uint, limit int) ([]model.WalletTx, error) {
	var w model.Wallet
	db := common.DB()
	effectiveTenantID, err := resolveEffectiveTenantID(db, userID, tenantID)
	if err != nil {
		return nil, err
	}

	if err := db.Where("user_id = ? AND currency_id = ? AND tenant_id = ?", userID, currencyID, effectiveTenantID).First(&w).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return []model.WalletTx{}, nil
		}
		return nil, err
	}
	var txs []model.WalletTx
	db.Where("wallet_id = ?", w.ID).Order("created_at desc").Limit(limit).Find(&txs)
	return txs, nil
}

// HistoryByCode returns last n transactions using currency code (convenience function)
func HistoryByCode(userID uint, currencyCode string, limit int) ([]model.WalletTx, error) {
	return HistoryByCodeWithTenant(userID, 0, currencyCode, limit)
}

func HistoryByCodeWithTenant(userID uint, tenantID uint, currencyCode string, limit int) ([]model.WalletTx, error) {
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return nil, errors.New("invalid currency code")
	}
	return HistoryWithTenant(userID, tenantID, curr.ID, limit)
}

// HistoryAllByUser returns last n transactions across all wallets owned by the user.
func HistoryAllByUser(userID uint, limit int) ([]model.WalletTx, error) {
	return HistoryAllByUserWithTenant(userID, 0, limit)
}

func HistoryAllByUserWithTenant(userID uint, tenantID uint, limit int) ([]model.WalletTx, error) {
	if limit <= 0 {
		limit = 20
	}

	db := common.DB()
	effectiveTenantID, err := resolveEffectiveTenantID(db, userID, tenantID)
	if err != nil {
		return nil, err
	}

	var walletIDs []uint
	if err := db.Model(&model.Wallet{}).
		Where("user_id = ? AND tenant_id = ?", userID, effectiveTenantID).
		Pluck("id", &walletIDs).Error; err != nil {
		return nil, err
	}

	if len(walletIDs) == 0 {
		return []model.WalletTx{}, nil
	}

	var txs []model.WalletTx
	if err := db.Where("wallet_id IN ?", walletIDs).
		Order("created_at desc").
		Limit(limit).
		Find(&txs).Error; err != nil {
		return nil, err
	}

	return txs, nil
}
