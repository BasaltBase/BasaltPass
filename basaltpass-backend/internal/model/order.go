package model

import (
	"time"

	"gorm.io/gorm"
)

// OrderStatus 订单状态枚举
type OrderStatus string

const (
	OrderStatusPending   OrderStatus = "pending"   // 待支付
	OrderStatusPaid      OrderStatus = "paid"      // 已支付
	OrderStatusExpired   OrderStatus = "expired"   // 已过期
	OrderStatusCancelled OrderStatus = "cancelled" // 已取消
)

// Order 订单模型
type Order struct {
	gorm.Model
	OrderNumber      string      `gorm:"uniqueIndex;size:32;not null"` // 订单号
	UserID           uint        `gorm:"not null;index"`               // 用户ID
	PriceID          uint        `gorm:"not null;index"`               // 价格ID
	CouponID         *uint       `gorm:"index"`                        // 优惠券ID（可选）
	Status           OrderStatus `gorm:"size:20;not null;index"`       // 订单状态
	Quantity         float64     `gorm:"not null;default:1"`           // 数量
	BaseAmount       int64       `gorm:"not null"`                     // 基础金额（分）
	DiscountAmount   int64       `gorm:"not null;default:0"`           // 折扣金额（分）
	TotalAmount      int64       `gorm:"not null"`                     // 总金额（分）
	Currency         string      `gorm:"size:3;not null"`              // 币种
	Description      string      `gorm:"size:500"`                     // 订单描述
	ExpiresAt        time.Time   `gorm:"not null;index"`               // 过期时间
	PaidAt           *time.Time  // 支付时间
	SubscriptionID   *uint       `gorm:"index"`     // 关联的订阅ID
	PaymentSessionID *uint       `gorm:"index"`     // 关联的支付会话ID
	Metadata         JSONB       `gorm:"type:json"` // 元数据

	// 关联
	User           User            `gorm:"foreignKey:UserID"`
	Price          Price           `gorm:"foreignKey:PriceID"`
	Coupon         *Coupon         `gorm:"foreignKey:CouponID"`
	Subscription   *Subscription   `gorm:"foreignKey:SubscriptionID"`
	PaymentSession *PaymentSession `gorm:"foreignKey:PaymentSessionID"`
}

// TableName 指定表名
func (Order) TableName() string {
	return "market_orders"
}
