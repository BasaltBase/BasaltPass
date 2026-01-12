package model

import (
	"database/sql/driver"
	"encoding/json"
	"errors"
	"time"

	"gorm.io/gorm"
)

// JSONB 自定义类型，用于存储 metadata
type JSONB map[string]interface{}

func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		*j = nil
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return errors.New("type assertion to []byte failed")
	}
	return json.Unmarshal(bytes, j)
}

func (j JSONB) Value() (driver.Value, error) {
	if j == nil {
		return nil, nil
	}
	return json.Marshal(j)
}

// ========== 产品 & 套餐 ==========

// Product 产品模型
type Product struct {
	gorm.Model
	TenantID     *uint64 `gorm:"index"`
	Code         string  `gorm:"uniqueIndex;size:64;not null"`
	Name         string  `gorm:"size:255;not null"`
	Description  string  `gorm:"type:text"`
	IsActive     bool    `gorm:"not null;default:true"`
	CategoryID   *uint   `gorm:"index"`
	Metadata     JSONB   `gorm:"type:json"`
	EffectiveAt  *time.Time
	DeprecatedAt *time.Time

	// 关联
	Category *ProductCategory `gorm:"foreignKey:CategoryID"`
	Tags     []ProductTag     `gorm:"many2many:product_tag_links"`
	Plans    []Plan           `gorm:"foreignKey:ProductID"`
}

// Plan 套餐模型
type Plan struct {
	gorm.Model
	TenantID     *uint64 `gorm:"index"`
	ProductID    uint    `gorm:"not null;index"`
	Code         string  `gorm:"size:64;not null"`
	DisplayName  string  `gorm:"size:255;not null"`
	PlanVersion  int     `gorm:"not null;default:1"`
	Metadata     JSONB   `gorm:"type:json"`
	EffectiveAt  *time.Time
	DeprecatedAt *time.Time

	// 关联
	Product  Product       `gorm:"foreignKey:ProductID"`
	Features []PlanFeature `gorm:"foreignKey:PlanID"`
	Prices   []Price       `gorm:"foreignKey:PlanID"`
}

// PlanFeature 套餐功能特性
type PlanFeature struct {
	gorm.Model
	PlanID       uint   `gorm:"not null;index"`
	FeatureKey   string `gorm:"size:128;not null"`
	ValueNumeric *float64
	ValueText    *string `gorm:"size:255"`
	Unit         *string `gorm:"size:32"`
	IsUnlimited  bool    `gorm:"not null;default:false"`
	Metadata     JSONB   `gorm:"type:json"`

	// 关联
	Plan Plan `gorm:"foreignKey:PlanID"`
}

// ========== 定价 ==========

// UsageType 使用类型枚举
type UsageType string

const (
	UsageTypeLicense UsageType = "license"
	UsageTypeMetered UsageType = "metered"
	UsageTypeTiered  UsageType = "tiered"
)

// BillingPeriod 计费周期枚举
type BillingPeriod string

const (
	BillingPeriodDay    BillingPeriod = "day"
	BillingPeriodWeek   BillingPeriod = "week"
	BillingPeriodMonth  BillingPeriod = "month"
	BillingPeriodYear   BillingPeriod = "year"
	BillingPeriodCustom BillingPeriod = "custom"
)

// Price 定价模型
type Price struct {
	gorm.Model
	TenantID        *uint64       `gorm:"index"`
	PlanID          uint          `gorm:"not null;index"`
	Currency        string        `gorm:"size:3;not null"` // ISO 4217 currency code
	AmountCents     int64         `gorm:"not null"`        // 以分为单位
	BillingPeriod   BillingPeriod `gorm:"size:20;not null"`
	BillingInterval int           `gorm:"not null;default:1"`
	TrialDays       *int
	UsageType       UsageType `gorm:"size:20;not null"`
	BillingScheme   JSONB     `gorm:"type:json"` // 分级/包年策略等
	EffectiveAt     *time.Time
	DeprecatedAt    *time.Time
	Metadata        JSONB `gorm:"type:json"`

	// 关联
	Plan                   Plan               `gorm:"foreignKey:PlanID"`
	Subscriptions          []Subscription     `gorm:"foreignKey:CurrentPriceID"`
	NextPriceSubscriptions []Subscription     `gorm:"foreignKey:NextPriceID"`
	SubscriptionItems      []SubscriptionItem `gorm:"foreignKey:PriceID"`
	InvoiceItems           []InvoiceItem      `gorm:"foreignKey:PriceID"`
}

// DiscountType 折扣类型枚举
type DiscountType string

const (
	DiscountTypePercent DiscountType = "percent"
	DiscountTypeFixed   DiscountType = "fixed"
)

// CouponDuration 优惠券持续时间枚举
type CouponDuration string

const (
	CouponDurationOnce      CouponDuration = "once"
	CouponDurationRepeating CouponDuration = "repeating"
	CouponDurationForever   CouponDuration = "forever"
)

// Coupon 优惠券模型
type Coupon struct {
	gorm.Model
	TenantID         *uint64        `gorm:"index"`
	Code             string         `gorm:"size:64;not null"`
	Name             string         `gorm:"size:255"`
	DiscountType     DiscountType   `gorm:"size:20;not null"`
	DiscountValue    int64          `gorm:"not null"`
	Duration         CouponDuration `gorm:"size:20;not null;default:'once'"`
	DurationInCycles *int
	MaxRedemptions   *int
	RedeemedCount    int `gorm:"not null;default:0"`
	ExpiresAt        *time.Time
	IsActive         bool  `gorm:"not null;default:true"`
	Metadata         JSONB `gorm:"type:json"`

	// 关联
	Subscriptions []Subscription `gorm:"foreignKey:CouponID"`
}

// ========== 订阅 ==========

// SubscriptionStatus 订阅状态枚举
type SubscriptionStatus string

const (
	SubscriptionStatusPending  SubscriptionStatus = "pending"
	SubscriptionStatusTrialing SubscriptionStatus = "trialing"
	SubscriptionStatusActive   SubscriptionStatus = "active"
	SubscriptionStatusPaused   SubscriptionStatus = "paused"
	SubscriptionStatusCanceled SubscriptionStatus = "canceled"
	SubscriptionStatusOverdue  SubscriptionStatus = "overdue"
)

// Subscription 订阅模型
type Subscription struct {
	gorm.Model
	TenantID              *uint64            `gorm:"index"`
	UserID                uint               `gorm:"not null;index"` // 对应 User.ID
	Status                SubscriptionStatus `gorm:"size:20;not null;index"`
	CurrentPriceID        uint               `gorm:"not null"`
	NextPriceID           *uint              // 期末换档
	CouponID              *uint
	StartAt               time.Time `gorm:"not null"`
	CurrentPeriodStart    time.Time `gorm:"not null"`
	CurrentPeriodEnd      time.Time `gorm:"not null"`
	CancelAt              *time.Time
	CanceledAt            *time.Time
	GatewaySubscriptionID *string `gorm:"size:128"`
	Metadata              JSONB   `gorm:"type:json"`

	// 关联
	User         User                `gorm:"foreignKey:UserID"`
	CurrentPrice Price               `gorm:"foreignKey:CurrentPriceID"`
	NextPrice    *Price              `gorm:"foreignKey:NextPriceID"`
	Coupon       *Coupon             `gorm:"foreignKey:CouponID"`
	Items        []SubscriptionItem  `gorm:"foreignKey:SubscriptionID"`
	Events       []SubscriptionEvent `gorm:"foreignKey:SubscriptionID"`
	Invoices     []Invoice           `gorm:"foreignKey:SubscriptionID"`
}

// Metering 计量类型枚举
type Metering string

const (
	MeteringPerUnit Metering = "per_unit"
	MeteringVolume  Metering = "volume"
)

// UsageAggregation 使用量聚合类型枚举
type UsageAggregation string

const (
	UsageAggregationSum              UsageAggregation = "sum"
	UsageAggregationMax              UsageAggregation = "max"
	UsageAggregationLastDuringPeriod UsageAggregation = "last_during_period"
)

// SubscriptionItem 订阅项目
type SubscriptionItem struct {
	gorm.Model
	SubscriptionID   uint             `gorm:"not null;index"`
	PriceID          uint             `gorm:"not null"`
	Quantity         float64          `gorm:"not null;default:1"`
	Metering         Metering         `gorm:"size:20;not null"`
	UsageAggregation UsageAggregation `gorm:"size:30;not null;default:'sum'"`
	Metadata         JSONB            `gorm:"type:json"`

	// 关联
	Subscription Subscription  `gorm:"foreignKey:SubscriptionID"`
	Price        Price         `gorm:"foreignKey:PriceID"`
	UsageRecords []UsageRecord `gorm:"foreignKey:SubscriptionItemID"`
}

// UsageRecord 使用记录（需要分区）
type UsageRecord struct {
	gorm.Model
	SubscriptionItemID uint      `gorm:"not null;index"`
	Ts                 time.Time `gorm:"not null;index"`
	Quantity           float64   `gorm:"not null"`
	Source             *string   `gorm:"size:64"` // webhook / batch / manual
	IdempotencyKey     *string   `gorm:"uniqueIndex;size:128"`

	// 关联
	SubscriptionItem SubscriptionItem `gorm:"foreignKey:SubscriptionItemID"`
}

// SubscriptionEvent 订阅事件（需要分区）
type SubscriptionEvent struct {
	gorm.Model
	SubscriptionID uint   `gorm:"not null;index"`
	EventType      string `gorm:"size:64;not null"`
	Data           JSONB  `gorm:"type:json"`

	// 关联
	Subscription Subscription `gorm:"foreignKey:SubscriptionID"`
}

// ========== 账单&支付 ==========

// InvoiceStatus 账单状态枚举
type InvoiceStatus string

const (
	InvoiceStatusDraft         InvoiceStatus = "draft"
	InvoiceStatusPosted        InvoiceStatus = "posted"
	InvoiceStatusPaid          InvoiceStatus = "paid"
	InvoiceStatusVoid          InvoiceStatus = "void"
	InvoiceStatusUncollectible InvoiceStatus = "uncollectible"
)

// Invoice 账单模型
type Invoice struct {
	gorm.Model
	TenantID       *uint64       `gorm:"index"`
	UserID         uint          `gorm:"not null;index"`
	SubscriptionID *uint         `gorm:"index"`
	Status         InvoiceStatus `gorm:"size:20;not null"`
	Currency       string        `gorm:"size:3;not null"`
	TotalCents     int64         `gorm:"not null;default:0"`
	DueAt          *time.Time
	PostedAt       *time.Time
	PaidAt         *time.Time
	Metadata       JSONB `gorm:"type:json"`

	// 关联
	User         User          `gorm:"foreignKey:UserID"`
	Subscription *Subscription `gorm:"foreignKey:SubscriptionID"`
	Items        []InvoiceItem `gorm:"foreignKey:InvoiceID"`
	Payments     []Payment     `gorm:"foreignKey:InvoiceID"`
}

// InvoiceItem 账单项目
type InvoiceItem struct {
	gorm.Model
	InvoiceID   uint    `gorm:"not null;index"`
	PriceID     *uint   `gorm:"index"`
	Description *string `gorm:"size:255"`
	Quantity    float64 `gorm:"not null;default:1"`
	AmountCents int64   `gorm:"not null"`
	Metadata    JSONB   `gorm:"type:json"`

	// 关联
	Invoice Invoice `gorm:"foreignKey:InvoiceID"`
	Price   *Price  `gorm:"foreignKey:PriceID"`
}

// PaymentStatus 支付状态枚举
type PaymentStatus string

const (
	PaymentStatusPending           PaymentStatus = "pending"
	PaymentStatusSucceeded         PaymentStatus = "succeeded"
	PaymentStatusFailed            PaymentStatus = "failed"
	PaymentStatusRefunded          PaymentStatus = "refunded"
	PaymentStatusPartiallyRefunded PaymentStatus = "partially_refunded"
)

// Payment 支付模型
type Payment struct {
	gorm.Model
	TenantID               *uint64       `gorm:"index"`
	InvoiceID              uint          `gorm:"not null;index"`
	AmountCents            int64         `gorm:"not null"`
	Currency               string        `gorm:"size:3;not null"`
	Status                 PaymentStatus `gorm:"size:30;not null"`
	Gateway                *string       `gorm:"size:64"` // stripe/alipay/...
	GatewayPaymentIntentID *string       `gorm:"size:128"`
	IdempotencyKey         *string       `gorm:"uniqueIndex;size:128"`
	Metadata               JSONB         `gorm:"type:json"`

	// 关联
	Invoice Invoice `gorm:"foreignKey:InvoiceID"`
}

// 添加复合索引
func init() {
	// 这些索引将在数据库迁移时创建
}
