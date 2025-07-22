package payment

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/wallet"
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
	CustomerEmail   string `json:"customer_email"`
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
	if err := db.Where("id = ? AND user_id = ?", req.PaymentIntentID, userID).First(&paymentIntent).Error; err != nil {
		return nil, nil, errors.New("payment intent not found")
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
		CustomerEmail:   req.CustomerEmail,
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
			"customer_email": session.CustomerEmail,
			"expires_at":     session.ExpiresAt.Unix(),
			"created":        session.CreatedAt.Unix(),
		},
		Timestamp: time.Now(),
	}

	return &session, mockResponse, nil
}

// SimulatePayment 模拟支付处理
func SimulatePayment(sessionID string, success bool) (*MockStripeResponse, error) {
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
		if err := wallet.Recharge(session.UserID, session.Currency, session.Amount); err != nil {
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
