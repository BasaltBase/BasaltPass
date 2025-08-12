package wallet

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/handler/public/currency"
	"basaltpass-backend/internal/model"
	"errors"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// AdminWalletService provides admin-level wallet management functions
type AdminWalletService struct{}

// getMultiplier returns the multiplier for converting decimal to smallest unit
func getMultiplier(decimalPlaces int) int64 {
	multiplier := int64(1)
	for i := 0; i < decimalPlaces; i++ {
		multiplier *= 10
	}
	return multiplier
}

// convertToSmallestUnit converts decimal amount to smallest unit
func convertToSmallestUnit(amount float64, decimalPlaces int) int64 {
	return int64(amount * float64(getMultiplier(decimalPlaces)))
}

// convertFromSmallestUnit converts smallest unit to decimal amount
func convertFromSmallestUnit(amount int64, decimalPlaces int) float64 {
	return float64(amount) / float64(getMultiplier(decimalPlaces))
}

// NewAdminWalletService creates a new admin wallet service
func NewAdminWalletService() *AdminWalletService {
	return &AdminWalletService{}
}

// GetUserWallets returns all wallets for a specific user
func (s *AdminWalletService) GetUserWallets(userID uint) ([]model.Wallet, error) {
	var wallets []model.Wallet
	db := common.DB()

	err := db.Preload("Currency").Where("user_id = ?", userID).Order("created_at DESC").Find(&wallets).Error
	return wallets, err
}

// GetTeamWallets returns all wallets for a specific team
func (s *AdminWalletService) GetTeamWallets(teamID uint) ([]model.Wallet, error) {
	var wallets []model.Wallet
	db := common.DB()

	err := db.Preload("Currency").Where("team_id = ?", teamID).Order("created_at DESC").Find(&wallets).Error
	return wallets, err
}

// GetAllWallets returns all wallets with pagination and filtering
func (s *AdminWalletService) GetAllWallets(page, pageSize int, userID *uint, teamID *uint, currencyCode string) ([]model.Wallet, int64, error) {
	var wallets []model.Wallet
	var total int64

	db := common.DB().Model(&model.Wallet{})

	// Apply filters
	if userID != nil {
		db = db.Where("user_id = ?", *userID)
	}
	if teamID != nil {
		db = db.Where("team_id = ?", *teamID)
	}
	if currencyCode != "" {
		// Join with currency table to filter by code
		db = db.Joins("JOIN currencies ON wallets.currency_id = currencies.id").
			Where("currencies.code = ?", currencyCode)
	}

	// Get total count
	if err := db.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * pageSize
	err := db.Preload("Currency").
		Preload("User").
		Preload("Team").
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&wallets).Error

	return wallets, total, err
}

// CreateWalletForUser creates a new wallet for a user
func (s *AdminWalletService) CreateWalletForUser(userID uint, currencyCode string, initialBalance float64) (*model.Wallet, error) {
	// Validate currency
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return nil, fmt.Errorf("invalid currency code: %s", currencyCode)
	}

	// Convert balance to smallest unit (e.g., cents for USD, satoshi for BTC)
	balanceInSmallestUnit := int64(initialBalance * float64(getMultiplier(curr.DecimalPlaces)))

	// Check if wallet already exists
	var existingWallet model.Wallet
	db := common.DB()
	err = db.Where("user_id = ? AND currency_id = ?", userID, curr.ID).First(&existingWallet).Error
	if err == nil {
		return nil, errors.New("wallet already exists for this user and currency")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create wallet
	newWallet := model.Wallet{
		UserID:     &userID,
		CurrencyID: &curr.ID,
		Balance:    balanceInSmallestUnit,
		Freeze:     0,
	}

	if err := db.Create(&newWallet).Error; err != nil {
		return nil, err
	}

	// Preload currency information
	if err := db.Preload("Currency").First(&newWallet, newWallet.ID).Error; err != nil {
		return nil, err
	}

	// Create transaction record if initial balance > 0
	if balanceInSmallestUnit > 0 {
		tx := model.WalletTx{
			WalletID:  newWallet.ID,
			Type:      "admin_deposit",
			Amount:    balanceInSmallestUnit,
			Status:    "success",
			Reference: "Admin created wallet with initial balance",
		}
		db.Create(&tx)
	}

	return &newWallet, nil
}

// CreateWalletForTeam creates a new wallet for a team
func (s *AdminWalletService) CreateWalletForTeam(teamID uint, currencyCode string, initialBalance float64) (*model.Wallet, error) {
	// Validate currency
	curr, err := currency.GetCurrencyByCode(currencyCode)
	if err != nil {
		return nil, fmt.Errorf("invalid currency code: %s", currencyCode)
	}

	// Convert balance to smallest unit
	balanceInSmallestUnit := convertToSmallestUnit(initialBalance, curr.DecimalPlaces)

	// Check if wallet already exists
	var existingWallet model.Wallet
	db := common.DB()
	err = db.Where("team_id = ? AND currency_id = ?", teamID, curr.ID).First(&existingWallet).Error
	if err == nil {
		return nil, errors.New("wallet already exists for this team and currency")
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create wallet
	newWallet := model.Wallet{
		TeamID:     &teamID,
		CurrencyID: &curr.ID,
		Balance:    balanceInSmallestUnit,
		Freeze:     0,
	}

	if err := db.Create(&newWallet).Error; err != nil {
		return nil, err
	}

	// Preload currency information
	if err := db.Preload("Currency").First(&newWallet, newWallet.ID).Error; err != nil {
		return nil, err
	}

	// Create transaction record if initial balance > 0
	if balanceInSmallestUnit > 0 {
		tx := model.WalletTx{
			WalletID:  newWallet.ID,
			Type:      "admin_deposit",
			Amount:    balanceInSmallestUnit,
			Status:    "success",
			Reference: "Admin created wallet with initial balance",
		}
		db.Create(&tx)
	}

	return &newWallet, nil
}

// AdjustBalance adjusts wallet balance (admin operation)
func (s *AdminWalletService) AdjustBalance(walletID uint, amount float64, reason string, operatorID uint) error {
	db := common.DB()

	// Get wallet
	var walletModel model.Wallet
	if err := db.Preload("Currency").First(&walletModel, walletID).Error; err != nil {
		return err
	}

	// Convert amount to smallest unit
	amountInSmallestUnit := convertToSmallestUnit(amount, walletModel.Currency.DecimalPlaces)

	// Check if balance would become negative
	newBalance := walletModel.Balance + amountInSmallestUnit
	if newBalance < 0 {
		return errors.New("insufficient balance")
	}

	// Start transaction
	return db.Transaction(func(tx *gorm.DB) error {
		// Update wallet balance
		if err := tx.Model(&walletModel).Update("balance", newBalance).Error; err != nil {
			return err
		}

		// Create transaction record
		txType := "admin_deposit"
		if amountInSmallestUnit < 0 {
			txType = "admin_withdraw"
		}

		walletTx := model.WalletTx{
			WalletID:  walletID,
			Type:      txType,
			Amount:    amountInSmallestUnit,
			Status:    "success",
			Reference: reason,
		}

		if err := tx.Create(&walletTx).Error; err != nil {
			return err
		}

		// Create audit log
		auditLog := model.AuditLog{
			UserID: operatorID,
			Action: "admin_wallet_adjustment",
			Data:   fmt.Sprintf("Adjusted wallet %d balance by %f. Reason: %s", walletID, amount, reason),
		}

		return tx.Create(&auditLog).Error
	})
}

// FreezeWallet freezes a wallet
func (s *AdminWalletService) FreezeWallet(walletID uint, operatorID uint) error {
	db := common.DB()

	if err := db.Model(&model.Wallet{}).Where("id = ?", walletID).Update("freeze", 1).Error; err != nil {
		return err
	}

	// Create audit log
	auditLog := model.AuditLog{
		UserID: operatorID,
		Action: "admin_wallet_freeze",
		Data:   fmt.Sprintf("Froze wallet %d", walletID),
	}

	return db.Create(&auditLog).Error
}

// UnfreezeWallet unfreezes a wallet
func (s *AdminWalletService) UnfreezeWallet(walletID uint, operatorID uint) error {
	db := common.DB()

	if err := db.Model(&model.Wallet{}).Where("id = ?", walletID).Update("freeze", 0).Error; err != nil {
		return err
	}

	// Create audit log
	auditLog := model.AuditLog{
		UserID: operatorID,
		Action: "admin_wallet_unfreeze",
		Data:   fmt.Sprintf("Unfroze wallet %d", walletID),
	}

	return db.Create(&auditLog).Error
}

// GetWalletTransactions returns transaction history for a wallet
func (s *AdminWalletService) GetWalletTransactions(walletID uint, page, pageSize int) ([]model.WalletTx, int64, error) {
	var transactions []model.WalletTx
	var total int64

	db := common.DB()

	// Get total count
	if err := db.Model(&model.WalletTx{}).Where("wallet_id = ?", walletID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	offset := (page - 1) * pageSize
	err := db.Where("wallet_id = ?", walletID).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&transactions).Error

	return transactions, total, err
}

// GetWalletStats returns wallet statistics
func (s *AdminWalletService) GetWalletStats() (map[string]interface{}, error) {
	db := common.DB()

	stats := make(map[string]interface{})

	// Total wallets
	var totalWallets int64
	db.Model(&model.Wallet{}).Count(&totalWallets)
	stats["total_wallets"] = totalWallets

	// Active wallets (freeze = 0)
	var activeWallets int64
	db.Model(&model.Wallet{}).Where("freeze = ?", 0).Count(&activeWallets)
	stats["active_wallets"] = activeWallets

	// Frozen wallets (freeze > 0)
	var frozenWallets int64
	db.Model(&model.Wallet{}).Where("freeze > ?", 0).Count(&frozenWallets)
	stats["frozen_wallets"] = frozenWallets

	// Total balance by currency (converted to decimal)
	type CurrencyBalance struct {
		CurrencyCode string  `json:"currency_code"`
		TotalBalance float64 `json:"total_balance"`
	}

	var currencyBalances []CurrencyBalance

	// Get raw data first
	type RawBalance struct {
		CurrencyCode  string `json:"currency_code"`
		TotalBalance  int64  `json:"total_balance"`
		DecimalPlaces int    `json:"decimal_places"`
	}

	var rawBalances []RawBalance
	db.Table("wallets").
		Select("currencies.code as currency_code, SUM(wallets.balance) as total_balance, currencies.decimal_places").
		Joins("JOIN currencies ON wallets.currency_id = currencies.id").
		Where("wallets.freeze = ?", 0).
		Group("currencies.code, currencies.decimal_places").
		Scan(&rawBalances)

	// Convert to decimal amounts
	for _, raw := range rawBalances {
		currencyBalances = append(currencyBalances, CurrencyBalance{
			CurrencyCode: raw.CurrencyCode,
			TotalBalance: convertFromSmallestUnit(raw.TotalBalance, raw.DecimalPlaces),
		})
	}

	stats["currency_balances"] = currencyBalances

	// Recent transactions count
	var recentTxCount int64
	db.Model(&model.WalletTx{}).Where("created_at > ?", time.Now().Add(-24*time.Hour)).Count(&recentTxCount)
	stats["recent_transactions_24h"] = recentTxCount

	return stats, nil
}

// DeleteWallet deletes a wallet (admin operation)
func (s *AdminWalletService) DeleteWallet(walletID uint, operatorID uint) error {
	db := common.DB()

	// Get wallet to check balance
	var walletModel model.Wallet
	if err := db.First(&walletModel, walletID).Error; err != nil {
		return err
	}

	// Check if wallet has balance
	if walletModel.Balance > 0 {
		return errors.New("cannot delete wallet with positive balance")
	}

	return db.Transaction(func(tx *gorm.DB) error {
		// Delete wallet transactions
		if err := tx.Where("wallet_id = ?", walletID).Delete(&model.WalletTx{}).Error; err != nil {
			return err
		}

		// Delete wallet
		if err := tx.Delete(&walletModel).Error; err != nil {
			return err
		}

		// Create audit log
		auditLog := model.AuditLog{
			UserID: operatorID,
			Action: "admin_wallet_delete",
			Data:   fmt.Sprintf("Deleted wallet %d", walletID),
		}

		return tx.Create(&auditLog).Error
	})
}
