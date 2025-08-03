package subscription

import (
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/payment"

	"gorm.io/gorm"
)

// CheckoutRequest 订阅结账请求
type CheckoutRequest struct {
	UserID     uint    `json:"user_id" validate:"required"`
	PriceID    uint    `json:"price_id" validate:"required"`
	Quantity   float64 `json:"quantity,omitempty"`
	CouponCode *string `json:"coupon_code,omitempty"`
	SuccessURL string  `json:"success_url" validate:"required"`
	CancelURL  string  `json:"cancel_url" validate:"required"`
}

// CheckoutResponse 订阅结账响应
type CheckoutResponse struct {
	Subscription   *model.Subscription         `json:"subscription"`
	Invoice        *model.Invoice              `json:"invoice"`
	Payment        *model.Payment              `json:"payment"`
	PaymentSession *model.PaymentSession       `json:"payment_session"`
	StripeResponse *payment.MockStripeResponse `json:"stripe_response"`
}

// CheckoutService 订阅结账服务
type CheckoutService struct {
	db *gorm.DB
}

// NewCheckoutService 创建结账服务
func NewCheckoutService(db *gorm.DB) *CheckoutService {
	return &CheckoutService{db: db}
}

// CreateCheckout 创建订阅结账
func (s *CheckoutService) CreateCheckout(req *CheckoutRequest) (*CheckoutResponse, error) {
	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 步骤1: 验证客户（用户）
	var user model.User
	if err := tx.First(&user, req.UserID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("客户不存在")
		}
		return nil, fmt.Errorf("查询客户失败: %w", err)
	}

	// 步骤2: 验证价格
	var price model.Price
	if err := tx.Preload("Plan.Product").First(&price, req.PriceID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("价格不存在")
		}
		return nil, fmt.Errorf("查询价格失败: %w", err)
	}

	// 步骤3: 验证和获取优惠券（如果提供）
	var coupon *model.Coupon
	var couponID *uint
	discountAmount := int64(0)

	if req.CouponCode != nil && *req.CouponCode != "" {
		var c model.Coupon
		if err := tx.Where("code = ? AND is_active = true", *req.CouponCode).First(&c).Error; err != nil {
			tx.Rollback()
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, fmt.Errorf("优惠券不存在或已失效")
			}
			return nil, fmt.Errorf("查询优惠券失败: %w", err)
		}

		// 验证优惠券有效性
		now := time.Now()
		if c.ExpiresAt != nil && c.ExpiresAt.Before(now) {
			tx.Rollback()
			return nil, fmt.Errorf("优惠券已过期")
		}

		if c.MaxRedemptions != nil && c.RedeemedCount >= *c.MaxRedemptions {
			tx.Rollback()
			return nil, fmt.Errorf("优惠券使用次数已达上限")
		}

		coupon = &c
		couponID = &c.ID

		// 计算折扣金额
		if c.DiscountType == model.DiscountTypePercent {
			discountAmount = (price.AmountCents * c.DiscountValue) / 10000 // DiscountValue是百分比*100
		} else {
			discountAmount = c.DiscountValue
		}
	}

	// 步骤4: 设置数量
	quantity := req.Quantity
	if quantity <= 0 {
		quantity = 1
	}

	// 步骤5: 计算总金额
	baseAmount := int64(float64(price.AmountCents) * quantity)
	totalAmount := baseAmount - discountAmount
	if totalAmount < 0 {
		totalAmount = 0
	}

	// 步骤6: 创建订阅（状态为pending）
	now := time.Now()
	currentPeriodStart := now
	currentPeriodEnd := s.calculateNextBillingDate(now, price.BillingPeriod, price.BillingInterval)

	// 处理试用期
	status := model.SubscriptionStatusPending
	if price.TrialDays != nil && *price.TrialDays > 0 {
		currentPeriodEnd = now.AddDate(0, 0, *price.TrialDays)
		if totalAmount == 0 { // 如果是免费试用
			status = model.SubscriptionStatusTrialing
		}
	}

	subscription := &model.Subscription{
		UserID:             req.UserID,
		Status:             status,
		CurrentPriceID:     req.PriceID,
		CouponID:           couponID,
		StartAt:            now,
		CurrentPeriodStart: currentPeriodStart,
		CurrentPeriodEnd:   currentPeriodEnd,
		Metadata:           model.JSONB{"checkout_quantity": quantity},
	}

	if err := tx.Create(subscription).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建订阅失败: %w", err)
	}

	// 步骤7: 创建账单（状态为draft）
	invoice := &model.Invoice{
		UserID:         req.UserID,
		SubscriptionID: &subscription.ID,
		Status:         model.InvoiceStatusDraft,
		Currency:       price.Currency,
		TotalCents:     totalAmount,
		Metadata:       model.JSONB{"checkout_created": true},
	}

	if err := tx.Create(invoice).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建账单失败: %w", err)
	}

	// 步骤8: 创建账单项目
	// 基础费用项目
	baseInvoiceItem := &model.InvoiceItem{
		InvoiceID:   invoice.ID,
		PriceID:     &price.ID,
		Description: &price.Plan.DisplayName,
		Quantity:    quantity,
		AmountCents: baseAmount,
		Metadata:    model.JSONB{"type": "subscription"},
	}

	if err := tx.Create(baseInvoiceItem).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建账单项目失败: %w", err)
	}

	// 优惠券折扣项目（如果有）
	if coupon != nil && discountAmount > 0 {
		discountDescription := fmt.Sprintf("优惠券折扣: %s", coupon.Name)
		discountInvoiceItem := &model.InvoiceItem{
			InvoiceID:   invoice.ID,
			Description: &discountDescription,
			Quantity:    1,
			AmountCents: -discountAmount, // 负数表示折扣
			Metadata:    model.JSONB{"type": "discount", "coupon_code": coupon.Code},
		}

		if err := tx.Create(discountInvoiceItem).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("创建折扣项目失败: %w", err)
		}

		// 更新优惠券使用次数
		if err := tx.Model(coupon).UpdateColumn("redeemed_count", gorm.Expr("redeemed_count + ?", 1)).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("更新优惠券使用次数失败: %w", err)
		}
	}

	// 步骤9: 创建支付记录（状态为pending）
	paymentRecord := &model.Payment{
		InvoiceID:   invoice.ID,
		AmountCents: totalAmount,
		Currency:    price.Currency,
		Status:      model.PaymentStatusPending,
		Gateway:     stringPtr("stripe"),
		Metadata:    model.JSONB{"subscription_checkout": true},
	}

	if err := tx.Create(paymentRecord).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建支付记录失败: %w", err)
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("提交事务失败: %w", err)
	}

	// 步骤10: 如果金额为0（免费或完全折扣），直接激活订阅
	if totalAmount == 0 {
		return s.activateSubscription(subscription.ID, invoice.ID, paymentRecord.ID)
	}

	// 步骤11: 创建支付意图
	paymentIntentReq := payment.CreatePaymentIntentRequest{
		Amount:             totalAmount,
		Currency:           price.Currency,
		Description:        fmt.Sprintf("订阅费用 - %s", price.Plan.DisplayName),
		PaymentMethodTypes: []string{"card"},
		ConfirmationMethod: "automatic",
		CaptureMethod:      "automatic",
		Metadata: map[string]interface{}{
			"subscription_id": subscription.ID,
			"invoice_id":      invoice.ID,
			"payment_id":      paymentRecord.ID,
			"source":          "subscription_checkout",
		},
	}

	paymentIntent, _, err := payment.CreatePaymentIntent(req.UserID, paymentIntentReq)
	if err != nil {
		return nil, fmt.Errorf("创建支付意图失败: %w", err)
	}

	// 更新支付记录的gateway_payment_intent_id
	if err := s.db.Model(paymentRecord).Update("gateway_payment_intent_id", paymentIntent.StripePaymentIntentID).Error; err != nil {
		return nil, fmt.Errorf("更新支付记录失败: %w", err)
	}

	// 步骤12: 创建支付会话
	sessionReq := payment.CreatePaymentSessionRequest{
		PaymentIntentID: paymentIntent.ID,
		SuccessURL:      req.SuccessURL,
		CancelURL:       req.CancelURL,
		UserEmail:       user.Email,
	}

	paymentSession, sessionStripeResponse, err := payment.CreatePaymentSession(req.UserID, sessionReq)
	if err != nil {
		return nil, fmt.Errorf("创建支付会话失败: %w", err)
	}

	// 返回完整响应
	return &CheckoutResponse{
		Subscription:   subscription,
		Invoice:        invoice,
		Payment:        paymentRecord,
		PaymentSession: paymentSession,
		StripeResponse: sessionStripeResponse,
	}, nil
}

// activateSubscription 激活订阅（用于免费订阅）
func (s *CheckoutService) activateSubscription(subscriptionID, invoiceID, paymentID uint) (*CheckoutResponse, error) {
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 更新订阅状态
	now := time.Now()
	if err := tx.Model(&model.Subscription{}).Where("id = ?", subscriptionID).Updates(map[string]interface{}{
		"status":     model.SubscriptionStatusActive,
		"updated_at": now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 更新账单状态
	if err := tx.Model(&model.Invoice{}).Where("id = ?", invoiceID).Updates(map[string]interface{}{
		"status":     model.InvoiceStatusPaid,
		"paid_at":    &now,
		"updated_at": now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 更新支付状态
	if err := tx.Model(&model.Payment{}).Where("id = ?", paymentID).Updates(map[string]interface{}{
		"status":     model.PaymentStatusSucceeded,
		"updated_at": now,
	}).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 创建订阅事件
	event := &model.SubscriptionEvent{
		SubscriptionID: subscriptionID,
		EventType:      "subscription.activated",
		Data:           model.JSONB{"activated_at": now, "reason": "free_subscription"},
	}
	if err := tx.Create(event).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	// 获取完整数据返回
	var subscription model.Subscription
	var invoice model.Invoice
	var paymentRecord model.Payment

	s.db.First(&subscription, subscriptionID)
	s.db.First(&invoice, invoiceID)
	s.db.First(&paymentRecord, paymentID)

	return &CheckoutResponse{
		Subscription:   &subscription,
		Invoice:        &invoice,
		Payment:        &paymentRecord,
		PaymentSession: nil,
		StripeResponse: &payment.MockStripeResponse{
			RequestURL:    "FREE_SUBSCRIPTION",
			RequestMethod: "AUTO_ACTIVATE",
			RequestBody:   map[string]interface{}{"free_subscription": true},
			Response:      map[string]interface{}{"status": "activated", "reason": "free_subscription"},
			Timestamp:     time.Now(),
		},
	}, nil
}

// calculateNextBillingDate 计算下一个计费日期
func (s *CheckoutService) calculateNextBillingDate(startDate time.Time, period model.BillingPeriod, interval int) time.Time {
	switch period {
	case model.BillingPeriodDay:
		return startDate.AddDate(0, 0, interval)
	case model.BillingPeriodWeek:
		return startDate.AddDate(0, 0, interval*7)
	case model.BillingPeriodMonth:
		return startDate.AddDate(0, interval, 0)
	case model.BillingPeriodYear:
		return startDate.AddDate(interval, 0, 0)
	default:
		return startDate.AddDate(0, 1, 0) // 默认一个月
	}
}

// stringPtr 返回字符串指针
func stringPtr(s string) *string {
	return &s
}
