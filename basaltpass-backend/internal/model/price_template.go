package model

import (
	"time"

	"gorm.io/gorm"
)

// PriceTemplate 定价模板（便于快速创建 Price）
type PriceTemplate struct {
	gorm.Model
	TenantID        uint64        `gorm:"not null;index"`
	Name            string        `gorm:"size:128;not null"`
	Currency        string        `gorm:"size:3;not null"`
	AmountCents     int64         `gorm:"not null"`
	BillingPeriod   BillingPeriod `gorm:"size:20;not null"`
	BillingInterval int           `gorm:"not null;default:1"`
	TrialDays       *int
	UsageType       UsageType `gorm:"size:20;not null"`
	BillingScheme   JSONB     `gorm:"type:json"`
	EffectiveAt     *time.Time
	DeprecatedAt    *time.Time
	IsActive        bool  `gorm:"not null;default:true"`
	Metadata        JSONB `gorm:"type:json"`
}
