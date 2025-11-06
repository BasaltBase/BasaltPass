package currency

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"strings"
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

// predefinedCurrencyCatalog 提供一份可初始化的货币目录（代码 -> Currency 模板）
func predefinedCurrencyCatalog() map[string]model.Currency {
	return map[string]model.Currency{
		"USD":    {Code: "USD", Name: "US Dollar", NameCN: "美元", Symbol: "$", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 1, Description: "United States Dollar"},
		"CNY":    {Code: "CNY", Name: "Chinese Yuan", NameCN: "人民币", Symbol: "¥", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 2, Description: "Chinese Yuan Renminbi"},
		"EUR":    {Code: "EUR", Name: "Euro", NameCN: "欧元", Symbol: "€", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 3, Description: "European Euro"},
		"GBP":    {Code: "GBP", Name: "British Pound", NameCN: "英镑", Symbol: "£", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 4, Description: "Great Britain Pound"},
		"JPY":    {Code: "JPY", Name: "Japanese Yen", NameCN: "日元", Symbol: "¥", DecimalPlaces: 0, Type: "fiat", IsActive: true, SortOrder: 5, Description: "Japanese Yen"},
		"KRW":    {Code: "KRW", Name: "Korean Won", NameCN: "韩元", Symbol: "₩", DecimalPlaces: 0, Type: "fiat", IsActive: true, SortOrder: 6, Description: "Korean Won"},
		"HKD":    {Code: "HKD", Name: "Hong Kong Dollar", NameCN: "港币", Symbol: "$", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 7, Description: "Hong Kong Dollar"},
		"INR":    {Code: "INR", Name: "Indian Rupee", NameCN: "印度卢比", Symbol: "₹", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 8, Description: "Indian Rupee"},
		"AUD":    {Code: "AUD", Name: "Australian Dollar", NameCN: "澳元", Symbol: "$", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 9, Description: "Australian Dollar"},
		"CAD":    {Code: "CAD", Name: "Canadian Dollar", NameCN: "加元", Symbol: "$", DecimalPlaces: 2, Type: "fiat", IsActive: true, SortOrder: 10, Description: "Canadian Dollar"},
		"BTC":    {Code: "BTC", Name: "Bitcoin", NameCN: "比特币", Symbol: "₿", DecimalPlaces: 8, Type: "crypto", IsActive: true, SortOrder: 50, Description: "Bitcoin cryptocurrency"},
		"ETH":    {Code: "ETH", Name: "Ethereum", NameCN: "以太坊", Symbol: "Ξ", DecimalPlaces: 18, Type: "crypto", IsActive: true, SortOrder: 51, Description: "Ethereum cryptocurrency"},
		"POINTS": {Code: "POINTS", Name: "System Points", NameCN: "系统积分", Symbol: "P", DecimalPlaces: 0, Type: "points", IsActive: true, SortOrder: 90, Description: "System reward points"},
	}
}

// InitCurrenciesByCodes 根据管理员选择的代码列表初始化货币。如果已存在则跳过。
func InitCurrenciesByCodes(codes []string) (created int, skipped int, err error) {
	db := common.DB()
	catalog := predefinedCurrencyCatalog()

	for _, raw := range codes {
		code := raw
		if code == "" {
			continue
		}
		// 统一为大写
		if code != strings.ToUpper(code) {
			code = strings.ToUpper(code)
		}
		tpl, ok := catalog[code]
		if !ok {
			// 对未收录的代码，按最小模板创建（可后续在后台编辑完善）
			tpl = model.Currency{Code: code, Name: code, NameCN: code, Symbol: code, DecimalPlaces: 2, Type: "fiat", IsActive: true}
		}
		var cnt int64
		if err2 := db.Model(&model.Currency{}).Where("code = ?", code).Count(&cnt).Error; err2 != nil {
			return created, skipped, err2
		}
		if cnt > 0 {
			skipped++
			continue
		}
		if err2 := db.Create(&tpl).Error; err2 != nil {
			return created, skipped, err2
		}
		created++
	}
	return created, skipped, nil
}
