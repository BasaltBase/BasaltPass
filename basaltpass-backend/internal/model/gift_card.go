package model

import (
	"time"

	"gorm.io/gorm"
)

const (
	GiftCardStatusActive   = "active"
	GiftCardStatusRedeemed = "redeemed"
	GiftCardStatusInvalid  = "invalid"
	GiftCardStatusExpired  = "expired"
)

type GiftCardBatch struct {
	gorm.Model
	TenantID   uint       `gorm:"not null;index"`
	CurrencyID uint       `gorm:"not null;index"`
	Amount     int64      `gorm:"not null"`
	Quantity   uint       `gorm:"not null"`
	CreatedBy  uint       `gorm:"not null;index"`
	ExpiresAt  *time.Time `gorm:"index"`
	Note       string     `gorm:"size:255"`

	Currency Currency   `gorm:"foreignKey:CurrencyID"`
	Cards    []GiftCard `gorm:"foreignKey:BatchID"`
}

func (GiftCardBatch) TableName() string {
	return "market_gift_card_batches"
}

type GiftCard struct {
	gorm.Model
	BatchID       uint       `gorm:"not null;index"`
	TenantID      uint       `gorm:"not null;index"`
	Code          string     `gorm:"size:64;not null;uniqueIndex"`
	CurrencyID    uint       `gorm:"not null;index"`
	Amount        int64      `gorm:"not null"`
	Status        string     `gorm:"size:16;not null;index"`
	ExpiresAt     *time.Time `gorm:"index"`
	RedeemedBy    *uint      `gorm:"index"`
	RedeemedAt    *time.Time
	InvalidatedBy *uint `gorm:"index"`
	InvalidatedAt *time.Time
	Reference     string `gorm:"size:255"`

	Batch    GiftCardBatch `gorm:"foreignKey:BatchID"`
	Currency Currency      `gorm:"foreignKey:CurrencyID"`
}

func (GiftCard) TableName() string {
	return "market_gift_cards"
}
