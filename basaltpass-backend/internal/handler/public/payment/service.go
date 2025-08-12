package payment

import (
	"basaltpass-backend/internal/handler/public/wallet"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"gorm.io/gorm"
)

// CreatePaymentIntentRequest 创建支付意图请求
type CreatePaymentIntentRequest struct {
	Amount             int64                  `json:"amount" validate:"required,min=1"`
	Currency           string                 `json:"currency" validate:"required"`
	Description        string                 `json:"description"`
	PaymentMethodTypes []string               `json:"payment_method_types"`
	ConfirmationMethod string                 `json:"confirmation_method"`
	CaptureMethod      string                 `json:"capture_method"`
	SetupFutureUsage   string                 `json:"setup_future_usage"`
	Metadata           map[string]interface{} `json:"metadata"`
}

// CreatePaymentSessionRequest 创建支付会话请求
type CreatePaymentSessionRequest struct {
	PaymentIntentID uint   `json:"payment_intent_id" validate:"required"`
	SuccessURL      string `json:"success_url" validate:"required,url"`
	CancelURL       string `json:"cancel_url" validate:"required,url"`
	UserEmail       string `json:"user_email"`
}

// MockStripeResponse Stripe模拟响应
type MockStripeResponse struct {
	RequestURL     string            `json:"request_url"`
	RequestMethod  string            `json:"request_method"`
	RequestHeaders map[string]string `json:"request_headers"`
	RequestBody    interface{}       `json:"request_body"`
	Response       interface{}       `json:"response"`
	Timestamp      time.Time         `json:"timestamp"`
}

// generateStripeID 生成模拟的Stripe ID
func generateStripeID(prefix string) string {
	bytes := make([]byte, 12)
	rand.Read(bytes)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(bytes))
}

// CreatePaymentIntent 创建支付意图
func CreatePaymentIntent(userID uint, req CreatePaymentIntentRequest) (*model.PaymentIntent, *MockStripeResponse, error) {
	db := common.DB()

	// 验证币种
	if req.Currency == "" {
		req.Currency = "USD"
	}

	// 设置默认值
	if req.ConfirmationMethod == "" {
		req.ConfirmationMethod = "automatic"
	}
	if req.CaptureMethod == "" {
		req.CaptureMethod = "automatic"
	}
	if len(req.PaymentMethodTypes) == 0 {
		req.PaymentMethodTypes = []string{"card"}
	}

	// 序列化元数据
	metadataJSON, _ := json.Marshal(req.Metadata)

	// 生成Stripe风格的ID和客户端密钥
	stripePaymentIntentID := generateStripeID("pi")
	clientSecret := fmt.Sprintf("%s_secret_%s", stripePaymentIntentID, generateStripeID(""))

	// 创建支付意图
	paymentIntent := model.PaymentIntent{
		StripePaymentIntentID: stripePaymentIntentID,
		UserID:                userID,
		Amount:                req.Amount,
		Currency:              req.Currency,
		Status:                model.PaymentIntentStatusRequiresPaymentMethod,
		Description:           req.Description,
		Metadata:              string(metadataJSON),
		PaymentMethodTypes:    fmt.Sprintf("[%s]", req.PaymentMethodTypes[0]),
		ClientSecret:          clientSecret,
		ConfirmationMethod:    req.ConfirmationMethod,
		CaptureMethod:         req.CaptureMethod,
		SetupFutureUsage:      req.SetupFutureUsage,
	}

	if err := db.Create(&paymentIntent).Error; err != nil {
		return nil, nil, err
	}

	// 模拟Stripe API响应
	mockResponse := &MockStripeResponse{
		RequestURL:    "https://api.stripe.com/v1/payment_intents",
		RequestMethod: "POST",
		RequestHeaders: map[string]string{
			"Authorization": "Bearer sk_test_...",
			"Content-Type":  "application/x-www-form-urlencoded",
		},
		RequestBody: req,
		Response: map[string]interface{}{
			"id":                   paymentIntent.StripePaymentIntentID,
			"object":               "payment_intent",
			"amount":               paymentIntent.Amount,
			"currency":             paymentIntent.Currency,
			"status":               paymentIntent.Status,
			"description":          paymentIntent.Description,
			"client_secret":        paymentIntent.ClientSecret,
			"confirmation_method":  paymentIntent.ConfirmationMethod,
			"capture_method":       paymentIntent.CaptureMethod,
			"payment_method_types": req.PaymentMethodTypes,
			"setup_future_usage":   paymentIntent.SetupFutureUsage,
			"metadata":             req.Metadata,
			"created":              paymentIntent.CreatedAt.Unix(),
		},
		Timestamp: time.Now(),
	}

	return &paymentIntent, mockResponse, nil
}

// CreatePaymentSession 创建支付会话
func CreatePaymentSession(userID uint, req CreatePaymentSessionRequest) (*model.PaymentSession, *MockStripeResponse, error) {
	db := common.DB()

	// 验证支付意图是否存在且属于该用户
	var paymentIntent model.PaymentIntent
	// 检查支付意图是否存在且属于该用户
	if err := db.Where("id = ? AND user_id = ?", req.PaymentIntentID, userID).First(&paymentIntent).Error; err != nil {
		return nil, nil, errors.New("[CreatePaymentSession] payment intent not found. userID: " + fmt.Sprintf("%d", userID) + " paymentIntentID: " + fmt.Sprintf("%d", req.PaymentIntentID))
	}

	// 生成Stripe风格的会话ID
	stripeSessionID := generateStripeID("cs")
	paymentURL := fmt.Sprintf("/payment/checkout/%s", stripeSessionID)

	// 创建支付会话
	session := model.PaymentSession{
		StripeSessionID: stripeSessionID,
		PaymentIntentID: req.PaymentIntentID,
		UserID:          userID,
		Status:          model.PaymentSessionStatusOpen,
		Currency:        paymentIntent.Currency,
		Amount:          paymentIntent.Amount,
		SuccessURL:      req.SuccessURL,
		CancelURL:       req.CancelURL,
		PaymentURL:      paymentURL,
		UserEmail:       req.UserEmail,
		ExpiresAt:       &[]time.Time{time.Now().Add(24 * time.Hour)}[0], // 24小时后过期
	}

	if err := db.Create(&session).Error; err != nil {
		return nil, nil, err
	}

	// 模拟Stripe Checkout Session API响应
	mockResponse := &MockStripeResponse{
		RequestURL:    "https://api.stripe.com/v1/checkout/sessions",
		RequestMethod: "POST",
		RequestHeaders: map[string]string{
			"Authorization": "Bearer sk_test_...",
			"Content-Type":  "application/x-www-form-urlencoded",
		},
		RequestBody: req,
		Response: map[string]interface{}{
			"id":             session.StripeSessionID,
			"object":         "checkout.session",
			"payment_intent": paymentIntent.StripePaymentIntentID,
			"amount_total":   session.Amount,
			"currency":       session.Currency,
			"status":         session.Status,
			"success_url":    session.SuccessURL,
			"cancel_url":     session.CancelURL,
			"url":            fmt.Sprintf("https://checkout.stripe.com/c/pay/%s", session.StripeSessionID),
			"user_email":     session.UserEmail,
			"expires_at":     session.ExpiresAt.Unix(),
			"created":        session.CreatedAt.Unix(),
		},
		Timestamp: time.Now(),
	}

	return &session, mockResponse, nil
}

// SimulatePayment 模拟支付处理
func SimulatePayment(sessionID string, success bool) (*MockStripeResponse, error) {
	// 首先检查是否是订阅相关的支付
	if subscription, err := checkIfSubscriptionPayment(sessionID); err == nil && subscription != nil {
		// 处理订阅支付webhook
		if err := processSubscriptionPaymentWebhook(sessionID, success); err != nil {
			return nil, fmt.Errorf("处理订阅支付webhook失败: %w", err)
		}
	}

	// 检查是否是订单相关的支付
	if order, err := checkIfOrderPayment(sessionID); err == nil && order != nil {
		// 处理订单支付webhook
		if err := processOrderPaymentWebhook(sessionID, success); err != nil {
			return nil, fmt.Errorf("处理订单支付webhook失败: %w", err)
		}
	}

	// 原有的支付处理逻辑
	db := common.DB()

	// 查找支付会话
	var session model.PaymentSession
	if err := db.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&session).Error; err != nil {
		return nil, errors.New("session not found")
	}

	// 更新会话状态
	now := time.Now()
	if success {
		session.Status = model.PaymentSessionStatusComplete
		session.CompletedAt = &now

		// 更新支付意图状态
		session.PaymentIntent.Status = model.PaymentIntentStatusSucceeded
		session.PaymentIntent.ProcessedAt = &now
	} else {
		session.Status = model.PaymentSessionStatusExpired
		session.PaymentIntent.Status = model.PaymentIntentStatusCanceled
		session.PaymentIntent.LastPaymentError = "Payment was canceled or failed during simulation"
	}

	// 保存更新
	if err := db.Save(&session).Error; err != nil {
		return nil, err
	}
	if err := db.Save(&session.PaymentIntent).Error; err != nil {
		return nil, err
	}

	// 如果支付成功，更新用户钱包
	if success {
		if err := wallet.RechargeByCode(session.UserID, session.Currency, session.Amount); err != nil {
			return nil, fmt.Errorf("failed to update wallet: %w", err)
		}
	}

	// 模拟webhook事件
	var eventType string
	if success {
		eventType = "payment_intent.succeeded"
	} else {
		eventType = "payment_intent.payment_failed"
	}

	webhookEvent := model.PaymentWebhookEvent{
		StripeEventID:    generateStripeID("evt"),
		EventType:        eventType,
		ProcessingStatus: "processed",
		PaymentIntentID:  &session.PaymentIntent.ID,
		ProcessedAt:      &now,
	}

	eventData := map[string]interface{}{
		"id":      webhookEvent.StripeEventID,
		"object":  "event",
		"type":    eventType,
		"created": now.Unix(),
		"data": map[string]interface{}{
			"object": map[string]interface{}{
				"id":       session.PaymentIntent.StripePaymentIntentID,
				"object":   "payment_intent",
				"amount":   session.Amount,
				"currency": session.Currency,
				"status":   session.PaymentIntent.Status,
			},
		},
	}

	eventDataJSON, _ := json.Marshal(eventData)
	webhookEvent.EventData = string(eventDataJSON)

	db.Create(&webhookEvent)

	// 模拟webhook响应
	mockResponse := &MockStripeResponse{
		RequestURL:    fmt.Sprintf("https://api.stripe.com/v1/events/%s", webhookEvent.StripeEventID),
		RequestMethod: "POST",
		RequestHeaders: map[string]string{
			"Stripe-Signature": "t=1234567890,v1=mock_signature",
			"Content-Type":     "application/json",
		},
		RequestBody: eventData,
		Response: map[string]interface{}{
			"received": true,
			"status":   "success",
		},
		Timestamp: time.Now(),
	}

	return mockResponse, nil
}

// checkIfSubscriptionPayment 检查是否为订阅支付
func checkIfSubscriptionPayment(sessionID string) (*bool, error) {
	db := common.DB()

	var paymentSession model.PaymentSession
	if err := db.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&paymentSession).Error; err != nil {
		return nil, err
	}

	// 解析payment intent的metadata查看是否包含subscription_id
	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(paymentSession.PaymentIntent.Metadata), &metadata); err != nil {
		return nil, err
	}

	if _, hasSubscription := metadata["subscription_id"]; hasSubscription {
		result := true
		return &result, nil
	}

	result := false
	return &result, nil
}

// processSubscriptionPaymentWebhook 处理订阅支付webhook
func processSubscriptionPaymentWebhook(sessionID string, success bool) error {
	// 导入subscription包会造成循环依赖，所以这里使用反射或接口
	// 为了简单起见，我们直接在这里实现简单的webhook处理
	db := common.DB()

	return db.Transaction(func(tx *gorm.DB) error {
		// 查找支付会话和相关数据
		var paymentSession model.PaymentSession
		if err := tx.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&paymentSession).Error; err != nil {
			return err
		}

		// 解析metadata获取subscription_id
		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(paymentSession.PaymentIntent.Metadata), &metadata); err != nil {
			return err
		}

		subscriptionIDFloat, ok := metadata["subscription_id"].(float64)
		if !ok {
			return nil // 不是订阅支付，忽略
		}

		subscriptionID := uint(subscriptionIDFloat)
		now := time.Now()

		//var order model.Order
		//if orderIDFloat, ok := metadata["order_id"].(float64); ok {
		//	orderID := uint(orderIDFloat)
		//	if err := tx.Preload("Price").Where("id = ?", orderID).First(&order).Error; err != nil {
		//		return err
		//	}
		//}

		if success {
			// 支付成功：激活订阅
			if err := tx.Model(&model.Subscription{}).Where("id = ?", subscriptionID).Updates(map[string]interface{}{
				"status": model.SubscriptionStatusActive,
				//		"tenant_id":  order.Price.TenantID,
				"updated_at": now,
			}).Error; err != nil {
				return err
			}

			// 更新invoice状态为已支付
			if invoiceIDFloat, ok := metadata["invoice_id"].(float64); ok {
				invoiceID := uint(invoiceIDFloat)
				if err := tx.Model(&model.Invoice{}).Where("id = ?", invoiceID).Updates(map[string]interface{}{
					"status":     model.InvoiceStatusPaid,
					"paid_at":    &now,
					"updated_at": now,
				}).Error; err != nil {
					return err
				}
			}

			// 创建订阅激活事件
			event := &model.SubscriptionEvent{
				SubscriptionID: subscriptionID,
				EventType:      "subscription.activated",
				Data: model.JSONB{
					"activated_at": now,
					"session_id":   sessionID,
					"source":       "payment_simulation",
				},
			}
			if err := tx.Create(event).Error; err != nil {
				return err
			}

		} else {
			// 支付失败：设置订阅为overdue
			if err := tx.Model(&model.Subscription{}).Where("id = ?", subscriptionID).Updates(map[string]interface{}{
				"status":     model.SubscriptionStatusOverdue,
				"updated_at": now,
			}).Error; err != nil {
				return err
			}

			// 创建支付失败事件
			event := &model.SubscriptionEvent{
				SubscriptionID: subscriptionID,
				EventType:      "subscription.payment_failed",
				Data: model.JSONB{
					"failed_at":  now,
					"session_id": sessionID,
					"source":     "payment_simulation",
				},
			}
			if err := tx.Create(event).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// checkIfOrderPayment 检查是否为订单支付
func checkIfOrderPayment(sessionID string) (*bool, error) {
	db := common.DB()

	var paymentSession model.PaymentSession
	if err := db.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&paymentSession).Error; err != nil {
		return nil, err
	}

	// 解析payment intent的metadata查看是否包含order_id
	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(paymentSession.PaymentIntent.Metadata), &metadata); err != nil {
		return nil, err
	}

	if _, hasOrder := metadata["order_id"]; hasOrder {
		result := true
		return &result, nil
	}

	result := false
	return &result, nil
}

// processOrderPaymentWebhook 处理订单支付webhook
func processOrderPaymentWebhook(sessionID string, success bool) error {
	db := common.DB()

	return db.Transaction(func(tx *gorm.DB) error {
		// 查找支付会话和相关数据
		var paymentSession model.PaymentSession
		if err := tx.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&paymentSession).Error; err != nil {
			return err
		}

		// 解析metadata获取order_id
		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(paymentSession.PaymentIntent.Metadata), &metadata); err != nil {
			return err
		}

		orderIDFloat, ok := metadata["order_id"].(float64)
		if !ok {
			return nil // 不是订单支付，忽略
		}

		orderID := uint(orderIDFloat)
		now := time.Now()

		if success {
			// 支付成功：更新订单状态并创建订阅
			if err := tx.Model(&model.Order{}).Where("id = ?", orderID).Updates(map[string]interface{}{
				"status":             model.OrderStatusPaid,
				"paid_at":            &now,
				"payment_session_id": &paymentSession.ID,
				"updated_at":         now,
			}).Error; err != nil {
				return err
			}

			// 获取订单详情以创建订阅
			var order model.Order
			if err := tx.Preload("Price.Plan").First(&order, orderID).Error; err != nil {
				return err
			}

			// 为订单创建订阅
			subscription := &model.Subscription{
				UserID:             order.UserID,
				Status:             model.SubscriptionStatusActive,
				CurrentPriceID:     order.PriceID,
				CouponID:           order.CouponID,
				TenantID:           order.Price.TenantID,
				StartAt:            now,
				CurrentPeriodStart: now,
				CurrentPeriodEnd:   calculatePeriodEnd(now, &order.Price),
				Metadata:           model.JSONB{"source": "order_payment", "order_id": orderID},
			}

			if err := tx.Create(subscription).Error; err != nil {
				return err
			}

			// 更新订单关联的订阅ID
			if err := tx.Model(&order).Update("subscription_id", subscription.ID).Error; err != nil {
				return err
			}

		} else {
			// 支付失败：更新订单状态
			if err := tx.Model(&model.Order{}).Where("id = ?", orderID).Updates(map[string]interface{}{
				"status":     model.OrderStatusCancelled,
				"updated_at": now,
			}).Error; err != nil {
				return err
			}
		}

		return nil
	})
}

// calculatePeriodEnd 计算订阅期间结束时间
func calculatePeriodEnd(start time.Time, price *model.Price) time.Time {
	switch price.BillingPeriod {
	case "day":
		return start.AddDate(0, 0, price.BillingInterval)
	case "week":
		return start.AddDate(0, 0, 7*price.BillingInterval)
	case "month":
		return start.AddDate(0, price.BillingInterval, 0)
	case "year":
		return start.AddDate(price.BillingInterval, 0, 0)
	default:
		return start.AddDate(0, 1, 0) // 默认一个月
	}
}

// GetPaymentIntent 获取支付意图
func GetPaymentIntent(userID uint, paymentIntentID uint) (*model.PaymentIntent, error) {
	db := common.DB()
	var paymentIntent model.PaymentIntent

	if err := db.Where("id = ? AND user_id = ?", paymentIntentID, userID).First(&paymentIntent).Error; err != nil {
		return nil, err
	}

	return &paymentIntent, nil
}

// GetPaymentSession 获取支付会话
func GetPaymentSession(userID uint, sessionID string) (*model.PaymentSession, error) {
	db := common.DB()
	var session model.PaymentSession

	if err := db.Preload("PaymentIntent").Where("stripe_session_id = ? AND user_id = ?", sessionID, userID).First(&session).Error; err != nil {
		return nil, err
	}

	return &session, nil
}

// GetPaymentSessionByStripeID 通过Stripe Session ID获取支付会话（无需用户验证，用于支付页面）
func GetPaymentSessionByStripeID(sessionID string) (*model.PaymentSession, error) {
	db := common.DB()
	var session model.PaymentSession

	if err := db.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&session).Error; err != nil {
		return nil, err
	}

	return &session, nil
}

// ListPaymentIntents 获取用户的支付意图列表
func ListPaymentIntents(userID uint, limit int) ([]model.PaymentIntent, error) {
	db := common.DB()
	var paymentIntents []model.PaymentIntent

	query := db.Where("user_id = ?", userID).Order("created_at desc")
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&paymentIntents).Error; err != nil {
		return nil, err
	}

	return paymentIntents, nil
}
