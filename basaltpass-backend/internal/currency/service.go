package currency

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
)

// GetAllCurrencies returns all active currencies
func GetAllCurrencies() ([]model.Currency, error) {
	var currencies []model.Currency
	db := common.DB()
	err := db.Where("is_active = ?", true).Order("sort_order, code").Find(&currencies).Error
	return currencies, err
}

// GetCurrencyByCode returns a currency by its code
func GetCurrencyByCode(code string) (model.Currency, error) {
	var currency model.Currency
	db := common.DB()
	err := db.Where("code = ? AND is_active = ?", code, true).First(&currency).Error
	return currency, err
}

// GetCurrencyByID returns a currency by its ID
func GetCurrencyByID(id uint) (model.Currency, error) {
	var currency model.Currency
	db := common.DB()
	err := db.Where("id = ? AND is_active = ?", id, true).First(&currency).Error
	return currency, err
}

// CreateCurrency creates a new currency
func CreateCurrency(currency *model.Currency) error {
	db := common.DB()
	return db.Create(currency).Error
}

// UpdateCurrency updates an existing currency
func UpdateCurrency(currency *model.Currency) error {
	db := common.DB()
	return db.Save(currency).Error
}

// DeleteCurrency soft deletes a currency (sets is_active to false)
func DeleteCurrency(id uint) error {
	db := common.DB()
	return db.Model(&model.Currency{}).Where("id = ?", id).Update("is_active", false).Error
}

// InitDefaultCurrencies initializes the system with default currencies
func InitDefaultCurrencies() error {
	db := common.DB()

	// Check if currencies already exist
	var count int64
	db.Model(&model.Currency{}).Count(&count)
	if count > 0 {
		return nil // Already initialized
	}

	defaultCurrencies := []model.Currency{
		{
			Code:          "USD",
			Name:          "US Dollar",
			NameCN:        "美元",
			Symbol:        "$",
			DecimalPlaces: 2,
			Type:          "fiat",
			IsActive:      true,
			SortOrder:     1,
			Description:   "United States Dollar",
		},
		{
			Code:          "CNY",
			Name:          "Chinese Yuan",
			NameCN:        "人民币",
			Symbol:        "¥",
			DecimalPlaces: 2,
			Type:          "fiat",
			IsActive:      true,
			SortOrder:     2,
			Description:   "Chinese Yuan Renminbi",
		},
		{
			Code:          "EUR",
			Name:          "Euro",
			NameCN:        "欧元",
			Symbol:        "€",
			DecimalPlaces: 2,
			Type:          "fiat",
			IsActive:      true,
			SortOrder:     3,
			Description:   "European Euro",
		},
		{
			Code:          "BTC",
			Name:          "Bitcoin",
			NameCN:        "比特币",
			Symbol:        "₿",
			DecimalPlaces: 8,
			Type:          "crypto",
			IsActive:      true,
			SortOrder:     10,
			Description:   "Bitcoin cryptocurrency",
		},
		{
			Code:          "ETH",
			Name:          "Ethereum",
			NameCN:        "以太坊",
			Symbol:        "Ξ",
			DecimalPlaces: 18,
			Type:          "crypto",
			IsActive:      true,
			SortOrder:     11,
			Description:   "Ethereum cryptocurrency",
		},
		{
			Code:          "POINTS",
			Name:          "System Points",
			NameCN:        "系统积分",
			Symbol:        "P",
			DecimalPlaces: 0,
			Type:          "points",
			IsActive:      true,
			SortOrder:     20,
			Description:   "System reward points",
		},
	}

	for _, currency := range defaultCurrencies {
		if err := db.Create(&currency).Error; err != nil {
			return err
		}
	}

	return nil
}
