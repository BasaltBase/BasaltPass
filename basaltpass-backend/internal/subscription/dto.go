package subscription

import (
	"time"

	"basaltpass-backend/internal/model"
)

//  DTO: Data Transfer Object
//  DTO 是用于在不同层之间传递数据的对象。
//  在 Go 中，DTO 通常是结构体，用于在不同层之间传递数据。

// ========== 产品相关 DTO ==========

// CreateProductRequest 创建产品请求
type CreateProductRequest struct {
	Code        string                 `json:"code" validate:"required,max=64"`
	Name        string                 `json:"name" validate:"required,max=255"`
	Description string                 `json:"description,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	EffectiveAt *time.Time             `json:"effective_at,omitempty"`
}

// UpdateProductRequest 更新产品请求
type UpdateProductRequest struct {
	Name         *string                `json:"name,omitempty" validate:"omitempty,max=255"`
	Description  *string                `json:"description,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	DeprecatedAt *time.Time             `json:"deprecated_at,omitempty"`
}

// ProductResponse 产品响应
type ProductResponse struct {
	ID           uint                   `json:"id"`
	Code         string                 `json:"code"`
	Name         string                 `json:"name"`
	Description  string                 `json:"description"`
	Metadata     map[string]interface{} `json:"metadata"`
	EffectiveAt  *time.Time             `json:"effective_at"`
	DeprecatedAt *time.Time             `json:"deprecated_at"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// ========== 套餐相关 DTO ==========

// CreatePlanRequest 创建套餐请求
type CreatePlanRequest struct {
	ProductID   uint                   `json:"product_id" validate:"required"`
	Code        string                 `json:"code" validate:"required,max=64"`
	DisplayName string                 `json:"display_name" validate:"required,max=255"`
	PlanVersion int                    `json:"plan_version,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
	EffectiveAt *time.Time             `json:"effective_at,omitempty"`
}

// UpdatePlanRequest 更新套餐请求
type UpdatePlanRequest struct {
	DisplayName *string                 `json:"display_name,omitempty"`
	Description *string                 `json:"description,omitempty"`
	IsActive    *bool                   `json:"is_active,omitempty"`
	Metadata    *map[string]interface{} `json:"metadata,omitempty"`
}

// PlanResponse 套餐响应
type PlanResponse struct {
	ID           uint                   `json:"id"`
	ProductID    uint                   `json:"product_id"`
	Code         string                 `json:"code"`
	DisplayName  string                 `json:"display_name"`
	PlanVersion  int                    `json:"plan_version"`
	Metadata     map[string]interface{} `json:"metadata"`
	EffectiveAt  *time.Time             `json:"effective_at"`
	DeprecatedAt *time.Time             `json:"deprecated_at"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
	Features     []PlanFeatureResponse  `json:"features,omitempty"`
	Prices       []PriceResponse        `json:"prices,omitempty"`
}

// ========== 套餐功能相关 DTO ==========

// CreatePlanFeatureRequest 创建套餐功能请求
type CreatePlanFeatureRequest struct {
	PlanID       uint                   `json:"plan_id" validate:"required"`
	FeatureKey   string                 `json:"feature_key" validate:"required,max=128"`
	ValueNumeric *float64               `json:"value_numeric,omitempty"`
	ValueText    *string                `json:"value_text,omitempty"`
	Unit         *string                `json:"unit,omitempty"`
	IsUnlimited  bool                   `json:"is_unlimited"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// UpdatePlanFeatureRequest 更新套餐功能请求
type UpdatePlanFeatureRequest struct {
	ValueNumeric *float64               `json:"value_numeric,omitempty"`
	ValueText    *string                `json:"value_text,omitempty"`
	Unit         *string                `json:"unit,omitempty"`
	IsUnlimited  *bool                  `json:"is_unlimited,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

// PlanFeatureResponse 套餐功能响应
type PlanFeatureResponse struct {
	ID           uint                   `json:"id"`
	PlanID       uint                   `json:"plan_id"`
	FeatureKey   string                 `json:"feature_key"`
	ValueNumeric *float64               `json:"value_numeric"`
	ValueText    *string                `json:"value_text"`
	Unit         *string                `json:"unit"`
	IsUnlimited  bool                   `json:"is_unlimited"`
	Metadata     map[string]interface{} `json:"metadata"`
	CreatedAt    time.Time              `json:"created_at"`
	UpdatedAt    time.Time              `json:"updated_at"`
}

// ========== 定价相关 DTO ==========

// CreatePriceRequest 创建定价请求
type CreatePriceRequest struct {
	PlanID          uint                   `json:"plan_id" validate:"required"`
	Currency        string                 `json:"currency" validate:"required,len=3"`
	AmountCents     int64                  `json:"amount_cents" validate:"required,min=0"`
	BillingPeriod   model.BillingPeriod    `json:"billing_period" validate:"required"`
	BillingInterval int                    `json:"billing_interval,omitempty"`
	TrialDays       *int                   `json:"trial_days,omitempty"`
	UsageType       model.UsageType        `json:"usage_type" validate:"required"`
	BillingScheme   map[string]interface{} `json:"billing_scheme,omitempty"`
	EffectiveAt     *time.Time             `json:"effective_at,omitempty"`
	Metadata        map[string]interface{} `json:"metadata,omitempty"`
}

// UpdatePriceRequest 更新定价请求
type UpdatePriceRequest struct {
	AmountCents *int64                  `json:"amount_cents,omitempty"`
	Currency    *string                 `json:"currency,omitempty"`
	TrialDays   *int                    `json:"trial_days,omitempty"`
	IsActive    *bool                   `json:"is_active,omitempty"`
	Metadata    *map[string]interface{} `json:"metadata,omitempty"`
}

// PriceResponse 定价响应
type PriceResponse struct {
	ID              uint                   `json:"id"`
	PlanID          uint                   `json:"plan_id"`
	Currency        string                 `json:"currency"`
	AmountCents     int64                  `json:"amount_cents"`
	BillingPeriod   model.BillingPeriod    `json:"billing_period"`
	BillingInterval int                    `json:"billing_interval"`
	TrialDays       *int                   `json:"trial_days"`
	UsageType       model.UsageType        `json:"usage_type"`
	BillingScheme   map[string]interface{} `json:"billing_scheme"`
	EffectiveAt     *time.Time             `json:"effective_at"`
	DeprecatedAt    *time.Time             `json:"deprecated_at"`
	Metadata        map[string]interface{} `json:"metadata"`
	CreatedAt       time.Time              `json:"created_at"`
	UpdatedAt       time.Time              `json:"updated_at"`
}

// ========== 优惠券相关 DTO ==========

// CreateCouponRequest 创建优惠券请求
type CreateCouponRequest struct {
	Code             string                 `json:"code" validate:"required,max=64"`
	Name             string                 `json:"name,omitempty"`
	DiscountType     model.DiscountType     `json:"discount_type" validate:"required"`
	DiscountValue    int64                  `json:"discount_value" validate:"required,min=0"`
	Duration         model.CouponDuration   `json:"duration,omitempty"` // 改为可选，有默认值
	DurationInCycles *int                   `json:"duration_in_cycles,omitempty"`
	MaxRedemptions   *int                   `json:"max_redemptions,omitempty"`
	ExpiresAt        *time.Time             `json:"expires_at,omitempty"`
	IsActive         *bool                  `json:"is_active,omitempty"` // 添加is_active字段
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// CouponResponse 优惠券响应
type CouponResponse struct {
	ID               uint                   `json:"id"`
	Code             string                 `json:"code"`
	Name             string                 `json:"name"`
	DiscountType     model.DiscountType     `json:"discount_type"`
	DiscountValue    int64                  `json:"discount_value"`
	Duration         model.CouponDuration   `json:"duration"`
	DurationInCycles *int                   `json:"duration_in_cycles"`
	MaxRedemptions   *int                   `json:"max_redemptions"`
	RedeemedCount    int                    `json:"redeemed_count"`
	ExpiresAt        *time.Time             `json:"expires_at"`
	IsActive         bool                   `json:"is_active"`
	Metadata         map[string]interface{} `json:"metadata"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`
}

// ========== 订阅相关 DTO ==========

// CreateSubscriptionRequest 创建订阅请求
type CreateSubscriptionRequest struct {
	UserID     uint                            `json:"user_id" validate:"required"`
	PriceID    uint                            `json:"price_id" validate:"required"`
	CouponCode *string                         `json:"coupon_code,omitempty"`
	StartAt    *time.Time                      `json:"start_at,omitempty"`
	TrialEnd   *time.Time                      `json:"trial_end,omitempty"`
	Metadata   map[string]interface{}          `json:"metadata,omitempty"`
	Items      []CreateSubscriptionItemRequest `json:"items,omitempty"`
}

// CreateSubscriptionItemRequest 创建订阅项目请求
type CreateSubscriptionItemRequest struct {
	PriceID          uint                   `json:"price_id" validate:"required"`
	Quantity         float64                `json:"quantity,omitempty"`
	Metering         model.Metering         `json:"metering,omitempty"`
	UsageAggregation model.UsageAggregation `json:"usage_aggregation,omitempty"`
	Metadata         map[string]interface{} `json:"metadata,omitempty"`
}

// UpdateSubscriptionRequest 更新订阅请求
type UpdateSubscriptionRequest struct {
	NextPriceID *uint                  `json:"next_price_id,omitempty"`
	CouponCode  *string                `json:"coupon_code,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

// CancelSubscriptionRequest 取消订阅请求
type CancelSubscriptionRequest struct {
	CancelAt *time.Time `json:"cancel_at,omitempty"` // 为空表示立即取消
	Reason   *string    `json:"reason,omitempty"`
}

// SubscriptionResponse 订阅响应
type SubscriptionResponse struct {
	ID                    uint                     `json:"id"`
	UserID                uint                     `json:"user_id"`
	Status                model.SubscriptionStatus `json:"status"`
	CurrentPriceID        uint                     `json:"current_price_id"`
	NextPriceID           *uint                    `json:"next_price_id"`
	CouponID              *uint                    `json:"coupon_id"`
	StartAt               time.Time                `json:"start_at"`
	CurrentPeriodStart    time.Time                `json:"current_period_start"`
	CurrentPeriodEnd      time.Time                `json:"current_period_end"`
	CancelAt              *time.Time               `json:"cancel_at"`
	CanceledAt            *time.Time               `json:"canceled_at"`
	GatewaySubscriptionID *string                  `json:"gateway_subscription_id"`
	Metadata              map[string]interface{}   `json:"metadata"`
	CreatedAt             time.Time                `json:"created_at"`
	UpdatedAt             time.Time                `json:"updated_at"`

	// 关联数据
	CurrentPrice *PriceResponse             `json:"current_price,omitempty"`
	NextPrice    *PriceResponse             `json:"next_price,omitempty"`
	Coupon       *CouponResponse            `json:"coupon,omitempty"`
	Items        []SubscriptionItemResponse `json:"items,omitempty"`
}

// SubscriptionItemResponse 订阅项目响应
type SubscriptionItemResponse struct {
	ID               uint                   `json:"id"`
	SubscriptionID   uint                   `json:"subscription_id"`
	PriceID          uint                   `json:"price_id"`
	Quantity         float64                `json:"quantity"`
	Metering         model.Metering         `json:"metering"`
	UsageAggregation model.UsageAggregation `json:"usage_aggregation"`
	Metadata         map[string]interface{} `json:"metadata"`
	CreatedAt        time.Time              `json:"created_at"`
	UpdatedAt        time.Time              `json:"updated_at"`

	// 关联数据
	Price *PriceResponse `json:"price,omitempty"`
}

// ========== 使用记录相关 DTO ==========

// CreateUsageRecordRequest 创建使用记录请求
type CreateUsageRecordRequest struct {
	SubscriptionItemID uint      `json:"subscription_item_id" validate:"required"`
	Quantity           float64   `json:"quantity" validate:"required,min=0"`
	Timestamp          time.Time `json:"timestamp,omitempty"`
	Source             *string   `json:"source,omitempty"`
	IdempotencyKey     *string   `json:"idempotency_key,omitempty"`
}

// UsageRecordResponse 使用记录响应
type UsageRecordResponse struct {
	ID                 uint      `json:"id"`
	SubscriptionItemID uint      `json:"subscription_item_id"`
	Ts                 time.Time `json:"timestamp"`
	Quantity           float64   `json:"quantity"`
	Source             *string   `json:"source"`
	IdempotencyKey     *string   `json:"idempotency_key"`
	CreatedAt          time.Time `json:"created_at"`
}

// ========== 账单相关 DTO ==========

// CreateInvoiceRequest 创建账单请求
type CreateInvoiceRequest struct {
	UserID         uint                       `json:"user_id" validate:"required"`
	SubscriptionID *uint                      `json:"subscription_id,omitempty"`
	Currency       string                     `json:"currency" validate:"required,len=3"`
	DueAt          *time.Time                 `json:"due_at,omitempty"`
	Metadata       map[string]interface{}     `json:"metadata,omitempty"`
	Items          []CreateInvoiceItemRequest `json:"items,omitempty"`
}

// CreateInvoiceItemRequest 创建账单项目请求
type CreateInvoiceItemRequest struct {
	PriceID     *uint   `json:"price_id,omitempty"`
	Description *string `json:"description,omitempty"`
	Quantity    float64 `json:"quantity,omitempty"`
	AmountCents int64   `json:"amount_cents" validate:"required"`
}

// InvoiceResponse 账单响应
type InvoiceResponse struct {
	ID             uint                   `json:"id"`
	UserID         uint                   `json:"user_id"`
	SubscriptionID *uint                  `json:"subscription_id"`
	Status         model.InvoiceStatus    `json:"status"`
	Currency       string                 `json:"currency"`
	TotalCents     int64                  `json:"total_cents"`
	DueAt          *time.Time             `json:"due_at"`
	PostedAt       *time.Time             `json:"posted_at"`
	PaidAt         *time.Time             `json:"paid_at"`
	Metadata       map[string]interface{} `json:"metadata"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`

	// 关联数据
	Items    []InvoiceItemResponse `json:"items,omitempty"`
	Payments []PaymentResponse     `json:"payments,omitempty"`
}

// InvoiceItemResponse 账单项目响应
type InvoiceItemResponse struct {
	ID          uint                   `json:"id"`
	InvoiceID   uint                   `json:"invoice_id"`
	PriceID     *uint                  `json:"price_id"`
	Description *string                `json:"description"`
	Quantity    float64                `json:"quantity"`
	AmountCents int64                  `json:"amount_cents"`
	Metadata    map[string]interface{} `json:"metadata"`
	CreatedAt   time.Time              `json:"created_at"`
	UpdatedAt   time.Time              `json:"updated_at"`
}

// ========== 支付相关 DTO ==========

// CreatePaymentRequest 创建支付请求
type CreatePaymentRequest struct {
	InvoiceID      uint                   `json:"invoice_id" validate:"required"`
	AmountCents    int64                  `json:"amount_cents" validate:"required,min=1"`
	Currency       string                 `json:"currency" validate:"required,len=3"`
	Gateway        *string                `json:"gateway,omitempty"`
	IdempotencyKey *string                `json:"idempotency_key,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
}

// PaymentResponse 支付响应
type PaymentResponse struct {
	ID                     uint                   `json:"id"`
	InvoiceID              uint                   `json:"invoice_id"`
	AmountCents            int64                  `json:"amount_cents"`
	Currency               string                 `json:"currency"`
	Status                 model.PaymentStatus    `json:"status"`
	Gateway                *string                `json:"gateway"`
	GatewayPaymentIntentID *string                `json:"gateway_payment_intent_id"`
	IdempotencyKey         *string                `json:"idempotency_key"`
	Metadata               map[string]interface{} `json:"metadata"`
	CreatedAt              time.Time              `json:"created_at"`
	UpdatedAt              time.Time              `json:"updated_at"`
}

// ========== 查询相关 DTO ==========

// PaginationRequest 分页请求
type PaginationRequest struct {
	Page     int `query:"page,omitempty"`
	PageSize int `query:"page_size,omitempty"`
}

// ListProductsRequest 产品列表请求
type ListProductsRequest struct {
	PaginationRequest
	Code     *string `query:"code"`
	IsActive *bool   `query:"is_active"`
	TenantID *uint64 `query:"tenant_id"`
}

// ListPlansRequest 套餐列表请求
type ListPlansRequest struct {
	PaginationRequest
	ProductID *uint   `query:"product_id"`
	Code      *string `query:"code"`
	IsActive  *bool   `query:"is_active"`
	TenantID  *uint64 `query:"tenant_id"`
}

// SubscriptionListRequest 订阅列表查询请求
type SubscriptionListRequest struct {
	UserID   *uint                     `json:"user_id,omitempty"`
	Status   *model.SubscriptionStatus `json:"status,omitempty"`
	PriceID  *uint                     `json:"price_id,omitempty"`
	Page     int                       `json:"page,omitempty"`
	PageSize int                       `json:"page_size,omitempty"`
	TenantID *uint64                   `json:"tenant_id,omitempty"`
}

// InvoiceListRequest 账单列表查询请求
type InvoiceListRequest struct {
	UserID         *uint                `json:"user_id,omitempty"`
	SubscriptionID *uint                `json:"subscription_id,omitempty"`
	Status         *model.InvoiceStatus `json:"status,omitempty"`
	Currency       *string              `json:"currency,omitempty"`
	Page           int                  `json:"page,omitempty"`
	PageSize       int                  `json:"page_size,omitempty"`
}

// UsageRecordListRequest 使用记录列表查询请求
type UsageRecordListRequest struct {
	SubscriptionItemID *uint      `json:"subscription_item_id,omitempty"`
	StartTime          *time.Time `json:"start_time,omitempty"`
	EndTime            *time.Time `json:"end_time,omitempty"`
	Page               int        `json:"page,omitempty"`
	PageSize           int        `json:"page_size,omitempty"`
}

// PaginatedResponse 分页响应
type PaginatedResponse struct {
	Data       interface{} `json:"data"`
	Total      int64       `json:"total"`
	Page       int         `json:"page"`
	PageSize   int         `json:"page_size"`
	TotalPages int         `json:"total_pages"`
}

// ListPricesRequest 定价列表请求
type ListPricesRequest struct {
	PaginationRequest
	PlanID    *uint   `query:"plan_id"`
	Currency  *string `query:"currency"`
	UsageType *string `query:"usage_type"`
	IsActive  *bool   `query:"is_active"`
	TenantID  *uint64 `query:"tenant_id"`
}

// ListCouponsRequest 优惠券列表请求
type ListCouponsRequest struct {
	PaginationRequest
	Code         *string `query:"code"`
	DiscountType *string `query:"discount_type"`
	IsActive     *bool   `query:"is_active"`
}

// UpdateCouponRequest 更新优惠券请求
type UpdateCouponRequest struct {
	Name           *string                 `json:"name,omitempty"` // 添加name字段
	DiscountValue  *int64                  `json:"discount_value,omitempty"`
	MaxRedemptions *int                    `json:"max_redemptions,omitempty"`
	ExpiresAt      *time.Time              `json:"expires_at,omitempty"`
	IsActive       *bool                   `json:"is_active,omitempty"`
	Metadata       *map[string]interface{} `json:"metadata,omitempty"`
}
