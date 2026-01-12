package model

import (
	"time"

	"gorm.io/gorm"
)

// CouponRedemption 优惠券使用记录（用于审计与限额控制）
type CouponRedemption struct {
	gorm.Model
	TenantID       uint64 `gorm:"not null;index"`
	CouponID       uint   `gorm:"not null;index;uniqueIndex:idx_coupon_redemptions_coupon_order"`
	UserID         uint   `gorm:"not null;index"`
	OrderID        *uint  `gorm:"index;uniqueIndex:idx_coupon_redemptions_coupon_order"`
	SubscriptionID *uint  `gorm:"index"`
	RedeemedAt     time.Time
	DiscountAmount int64 `gorm:"not null;default:0"` // 分
	Metadata       JSONB `gorm:"type:json"`
}
