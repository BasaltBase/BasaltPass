package model

import "gorm.io/gorm"

// Currency represents a supported currency in the system
type Currency struct {
	gorm.Model
	Code          string `gorm:"size:16;uniqueIndex;not null" json:"code"` // 货币代码，如 USD, CNY, BTC
	Name          string `gorm:"size:64;not null" json:"name"`             // 货币名称，如 US Dollar, Chinese Yuan, Bitcoin
	NameCN        string `gorm:"size:64" json:"name_cn"`                   // 中文名称，如 美元, 人民币, 比特币
	Symbol        string `gorm:"size:8" json:"symbol"`                     // 货币符号，如 $, ¥, ₿
	DecimalPlaces int    `gorm:"default:2" json:"decimal_places"`          // 小数位数，如 2 (美元), 8 (比特币)
	Type          string `gorm:"size:16;default:'fiat'" json:"type"`       // 货币类型：fiat(法币), crypto(加密货币), points(积分)
	IsActive      bool   `gorm:"default:true" json:"is_active"`            // 是否启用
	SortOrder     int    `gorm:"default:0" json:"sort_order"`              // 排序顺序
	Description   string `gorm:"size:255" json:"description"`              // 描述
	IconURL       string `gorm:"size:255" json:"icon_url"`                 // 图标URL

	// 关联
	Wallets []Wallet `gorm:"foreignKey:CurrencyID"`
}

// TableName returns the table name for Currency model
func (Currency) TableName() string {
	return "currencies"
}
