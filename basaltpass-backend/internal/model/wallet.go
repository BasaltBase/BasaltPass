package model

import "gorm.io/gorm"

// Wallet represents a multi-currency account for a user or team.
type Wallet struct {
	gorm.Model
	UserID     *uint `gorm:"index"`          // 用户钱包
	TeamID     *uint `gorm:"index"`          // 团队钱包
	CurrencyID *uint `gorm:"index;not null"` // 关联到currency表的ID字段
	Balance    int64 // in smallest unit (e.g. cents, satoshi)
	Freeze     int64 // frozen amount

	// 关联
	User     *User     `gorm:"foreignKey:UserID"`
	Team     *Team     `gorm:"foreignKey:TeamID"`
	Currency *Currency `gorm:"foreignKey:CurrencyID"`
	Txns     []WalletTx
}

// WalletTx represents a transaction on a wallet.
type WalletTx struct {
	gorm.Model
	WalletID  uint   `gorm:"index"`
	Type      string `gorm:"size:32"` // recharge, withdraw, transfer
	Amount    int64  // positive or negative depending on Type
	Status    string `gorm:"size:32"`  // pending, success, fail
	Reference string `gorm:"size:128"` // optional external ref
	Wallet    Wallet `gorm:"foreignKey:WalletID"`
}
