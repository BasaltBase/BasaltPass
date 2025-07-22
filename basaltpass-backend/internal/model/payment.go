package model

import (
	"time"

	"gorm.io/gorm"
)

// PaymentIntentStatus 支付意图状态
type PaymentIntentStatus string

const (
	PaymentIntentStatusRequiresPaymentMethod PaymentIntentStatus = "requires_payment_method"
	PaymentIntentStatusRequiresConfirmation  PaymentIntentStatus = "requires_confirmation"
	PaymentIntentStatusRequiresAction        PaymentIntentStatus = "requires_action"
	PaymentIntentStatusProcessing            PaymentIntentStatus = "processing"
	PaymentIntentStatusSucceeded             PaymentIntentStatus = "succeeded"
	PaymentIntentStatusCanceled              PaymentIntentStatus = "canceled"
)

// PaymentIntent 支付意图 - 类似Stripe的PaymentIntent
type PaymentIntent struct {
	gorm.Model
	ID                    uint                `gorm:"primaryKey"`
	StripePaymentIntentID string              `gorm:"uniqueIndex;size:128"` // Stripe的PI ID
	UserID                uint                `gorm:"not null;index"`
	Amount                int64               `gorm:"not null"`        // 金额（分为单位）
	Currency              string              `gorm:"size:3;not null"` // 币种
	Status                PaymentIntentStatus `gorm:"size:32;not null"`
	Description           string              `gorm:"size:500"`
	Metadata              string              `gorm:"type:json"`                   // 自定义元数据
	PaymentMethodTypes    string              `gorm:"size:255"`                    // 支持的支付方式
	ClientSecret          string              `gorm:"size:255"`                    // 客户端密钥
	ConfirmationMethod    string              `gorm:"size:32;default:'automatic'"` // automatic/manual
	CaptureMethod         string              `gorm:"size:32;default:'automatic'"` // automatic/manual
	SetupFutureUsage      string              `gorm:"size:32"`                     // off_session/on_session
	LastPaymentError      string              `gorm:"type:text"`                   // 最后一次支付错误信息
	NextAction            string              `gorm:"type:json"`                   // 下一步操作信息
	ProcessedAt           *time.Time          // 处理时间

	// 关联
	User            User             `gorm:"foreignKey:UserID"`
	PaymentSessions []PaymentSession `gorm:"foreignKey:PaymentIntentID"`
}

// PaymentSessionStatus 支付会话状态
type PaymentSessionStatus string

const (
	PaymentSessionStatusOpen     PaymentSessionStatus = "open"
	PaymentSessionStatusComplete PaymentSessionStatus = "complete"
	PaymentSessionStatusExpired  PaymentSessionStatus = "expired"
)

// PaymentSession 支付会话 - 类似Stripe的Checkout Session
type PaymentSession struct {
	gorm.Model
	StripeSessionID string               `gorm:"uniqueIndex;size:128"` // Stripe的Session ID
	PaymentIntentID uint                 `gorm:"not null;index"`
	UserID          uint                 `gorm:"not null;index"`
	Status          PaymentSessionStatus `gorm:"size:32;not null"`
	Currency        string               `gorm:"size:3;not null"`
	Amount          int64                `gorm:"not null"`
	SuccessURL      string               `gorm:"size:500"`
	CancelURL       string               `gorm:"size:500"`
	PaymentURL      string               `gorm:"size:500"` // 支付页面URL
	CustomerEmail   string               `gorm:"size:128"`
	ExpiresAt       *time.Time
	CompletedAt     *time.Time
	Metadata        string `gorm:"type:json"`

	// 关联
	User          User          `gorm:"foreignKey:UserID"`
	PaymentIntent PaymentIntent `gorm:"foreignKey:PaymentIntentID"`
}

// PaymentWebhookEvent 支付webhook事件
type PaymentWebhookEvent struct {
	gorm.Model
	StripeEventID    string `gorm:"uniqueIndex;size:128"`
	EventType        string `gorm:"size:64;not null"`          // payment_intent.succeeded等
	ProcessingStatus string `gorm:"size:32;default:'pending'"` // pending/processed/failed
	EventData        string `gorm:"type:json"`                 // webhook原始数据
	ProcessedAt      *time.Time
	ErrorMessage     string `gorm:"type:text"`

	// 可关联到具体的支付意图
	PaymentIntentID *uint
	PaymentIntent   *PaymentIntent `gorm:"foreignKey:PaymentIntentID"`
}
