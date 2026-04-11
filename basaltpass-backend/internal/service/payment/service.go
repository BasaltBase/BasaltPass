package payment

import (
	"basaltpass-backend/internal/service/wallet"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
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

var ErrTenantStripeNotConfigured = errors.New("tenant stripe configuration is missing or disabled")

type tenantStripeConfig struct {
	TenantID       uint
	Enabled        bool
	PublishableKey string
	SecretKey      string
	WebhookSecret  string
}

func isWalletRechargeMetadata(meta map[string]interface{}) bool {
	if meta == nil {
		return false
	}
	v, ok := meta["source"]
	if !ok {
		return false
	}
	s, ok := v.(string)
	return ok && s == "wallet_recharge"
}

// generateStripeID 生成模拟的Stripe ID
func generateStripeID(prefix string) string {
	bytes := make([]byte, 12)
	rand.Read(bytes)
	return fmt.Sprintf("%s_%s", prefix, hex.EncodeToString(bytes))
}

func resolveTenantStripeConfigByUser(db *gorm.DB, userID uint) (*tenantStripeConfig, error) {
	var user model.User
	if err := db.Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		return nil, err
	}

	if user.TenantID == 0 {
		return &tenantStripeConfig{SecretKey: "sk_test_legacy_placeholder", TenantID: 0}, nil
	}

	var tenant model.Tenant
	if err := db.Select("id", "metadata").First(&tenant, user.TenantID).Error; err != nil {
		return nil, err
	}

	metadata := map[string]interface{}(tenant.Metadata)
	if metadata == nil {
		return nil, ErrTenantStripeNotConfigured
	}

	rawStripe, ok := metadata["stripe"]
	if !ok {
		return nil, ErrTenantStripeNotConfigured
	}
	stripeMap, ok := rawStripe.(map[string]interface{})
	if !ok {
		return nil, ErrTenantStripeNotConfigured
	}

	config := &tenantStripeConfig{
		TenantID:       tenant.ID,
		Enabled:        parseBool(stripeMap["enabled"]),
		PublishableKey: parseString(stripeMap["publishable_key"]),
		SecretKey:      parseString(stripeMap["secret_key"]),
		WebhookSecret:  parseString(stripeMap["webhook_secret"]),
	}

	if !config.Enabled || config.SecretKey == "" {
		return nil, ErrTenantStripeNotConfigured
	}

	return config, nil
}

func parseString(v interface{}) string {
	s, _ := v.(string)
	return strings.TrimSpace(s)
}

func parseBool(v interface{}) bool {
	b, _ := v.(bool)
	return b
}

func maskStripeSecretForHeader(secret string) string {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return "sk_test_..."
	}
	if len(secret) <= 10 {
		return "sk_test_..."
	}
	return secret[:8] + "..."
}

func mapStripePaymentIntentStatus(status string) model.PaymentIntentStatus {
	switch status {
	case string(model.PaymentIntentStatusRequiresPaymentMethod):
		return model.PaymentIntentStatusRequiresPaymentMethod
	case string(model.PaymentIntentStatusRequiresConfirmation):
		return model.PaymentIntentStatusRequiresConfirmation
	case string(model.PaymentIntentStatusRequiresAction):
		return model.PaymentIntentStatusRequiresAction
	case string(model.PaymentIntentStatusProcessing):
		return model.PaymentIntentStatusProcessing
	case string(model.PaymentIntentStatusSucceeded):
		return model.PaymentIntentStatusSucceeded
	case string(model.PaymentIntentStatusCanceled):
		return model.PaymentIntentStatusCanceled
	default:
		return model.PaymentIntentStatusRequiresPaymentMethod
	}
}

func mapStripeCheckoutSessionStatus(status string) model.PaymentSessionStatus {
	if status == "complete" {
		return model.PaymentSessionStatusComplete
	}
	if status == "expired" {
		return model.PaymentSessionStatusExpired
	}
	return model.PaymentSessionStatusOpen
}

func stripeRequest(secretKey string, endpoint string, form url.Values) (map[string]interface{}, error) {
	request, err := http.NewRequest(http.MethodPost, endpoint, strings.NewReader(form.Encode()))
	if err != nil {
		return nil, err
	}

	request.Header.Set("Authorization", "Bearer "+secretKey)
	request.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 20 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	bodyBytes, err := io.ReadAll(response.Body)
	if err != nil {
		return nil, err
	}

	bodyMap := map[string]interface{}{}
	if len(bodyBytes) > 0 {
		if err := json.Unmarshal(bodyBytes, &bodyMap); err != nil {
			return nil, fmt.Errorf("解析 Stripe 响应失败: %w", err)
		}
	}

	if response.StatusCode >= 400 {
		message := "unknown stripe error"
		if stripeErr, ok := bodyMap["error"].(map[string]interface{}); ok {
			if msg, ok := stripeErr["message"].(string); ok && strings.TrimSpace(msg) != "" {
				message = msg
			}
		}
		return nil, fmt.Errorf("stripe api error (%d): %s", response.StatusCode, message)
	}

	return bodyMap, nil
}

func buildStripePaymentIntentForm(req CreatePaymentIntentRequest) url.Values {
	form := url.Values{}
	form.Set("amount", strconv.FormatInt(req.Amount, 10))
	form.Set("currency", strings.ToLower(req.Currency))

	if strings.TrimSpace(req.Description) != "" {
		form.Set("description", req.Description)
	}

	if req.ConfirmationMethod != "" {
		form.Set("confirmation_method", req.ConfirmationMethod)
	}
	if req.CaptureMethod != "" {
		form.Set("capture_method", req.CaptureMethod)
	}
	if req.SetupFutureUsage != "" {
		form.Set("setup_future_usage", req.SetupFutureUsage)
	}

	for _, method := range req.PaymentMethodTypes {
		method = strings.TrimSpace(method)
		if method != "" {
			form.Add("payment_method_types[]", method)
		}
	}

	for key, value := range req.Metadata {
		form.Set(fmt.Sprintf("metadata[%s]", key), fmt.Sprintf("%v", value))
	}

	return form
}

func buildStripeCheckoutSessionForm(paymentIntent *model.PaymentIntent, req CreatePaymentSessionRequest) url.Values {
	form := url.Values{}
	form.Set("mode", "payment")
	form.Set("success_url", req.SuccessURL)
	form.Set("cancel_url", req.CancelURL)

	if strings.TrimSpace(req.UserEmail) != "" {
		form.Set("customer_email", strings.TrimSpace(req.UserEmail))
	}

	description := strings.TrimSpace(paymentIntent.Description)
	if description == "" {
		description = "BasaltPass subscription"
	}

	form.Set("line_items[0][price_data][currency]", strings.ToLower(paymentIntent.Currency))
	form.Set("line_items[0][price_data][product_data][name]", description)
	form.Set("line_items[0][price_data][unit_amount]", strconv.FormatInt(paymentIntent.Amount, 10))
	form.Set("line_items[0][quantity]", "1")
	form.Set("metadata[payment_intent_id]", strconv.FormatUint(uint64(paymentIntent.ID), 10))
	form.Set("metadata[user_id]", strconv.FormatUint(uint64(paymentIntent.UserID), 10))

	var piMetadata map[string]interface{}
	if err := json.Unmarshal([]byte(paymentIntent.Metadata), &piMetadata); err == nil {
		tenantID := parseString(piMetadata["tenant_id"])
		if tenantID != "" {
			form.Set("metadata[tenant_id]", tenantID)
		}
	}

	return form
}

func parseStripeSignatureHeader(signatureHeader string) (string, []string) {
	parts := strings.Split(signatureHeader, ",")
	timestamp := ""
	v1Signatures := make([]string, 0, 1)

	for _, part := range parts {
		kv := strings.SplitN(strings.TrimSpace(part), "=", 2)
		if len(kv) != 2 {
			continue
		}
		if kv[0] == "t" {
			timestamp = kv[1]
		}
		if kv[0] == "v1" {
			v1Signatures = append(v1Signatures, kv[1])
		}
	}

	return timestamp, v1Signatures
}

func verifyStripeSignature(payload []byte, signatureHeader, webhookSecret string) bool {
	webhookSecret = strings.TrimSpace(webhookSecret)
	if webhookSecret == "" {
		return false
	}

	timestamp, v1Signatures := parseStripeSignatureHeader(signatureHeader)
	if timestamp == "" || len(v1Signatures) == 0 {
		return false
	}

	signedPayload := timestamp + "." + string(payload)
	h := hmac.New(sha256.New, []byte(webhookSecret))
	h.Write([]byte(signedPayload))
	computed := hex.EncodeToString(h.Sum(nil))

	for _, sig := range v1Signatures {
		if hmac.Equal([]byte(computed), []byte(sig)) {
			return true
		}
	}

	return false
}

func findWebhookSecretByTenantID(db *gorm.DB, tenantID uint) string {
	if tenantID == 0 {
		return ""
	}

	var tenant model.Tenant
	if err := db.Select("id", "metadata").First(&tenant, tenantID).Error; err != nil {
		return ""
	}

	metadata := map[string]interface{}(tenant.Metadata)
	rawStripe, ok := metadata["stripe"]
	if !ok {
		return ""
	}
	stripeMap, ok := rawStripe.(map[string]interface{})
	if !ok {
		return ""
	}
	if !parseBool(stripeMap["enabled"]) {
		return ""
	}
	return parseString(stripeMap["webhook_secret"])
}

func appendUniqueSecret(secrets []string, secret string) []string {
	secret = strings.TrimSpace(secret)
	if secret == "" {
		return secrets
	}
	for _, existing := range secrets {
		if existing == secret {
			return secrets
		}
	}
	return append(secrets, secret)
}

func collectCandidateWebhookSecrets(db *gorm.DB, eventObject map[string]interface{}) []string {
	secrets := make([]string, 0, 3)

	if metadata, ok := eventObject["metadata"].(map[string]interface{}); ok {
		if tenantIDStr := parseString(metadata["tenant_id"]); tenantIDStr != "" {
			if tenantID64, err := strconv.ParseUint(tenantIDStr, 10, 64); err == nil {
				secrets = appendUniqueSecret(secrets, findWebhookSecretByTenantID(db, uint(tenantID64)))
			}
		}
	}

	stripeObjectType := parseString(eventObject["object"])
	stripeObjectID := parseString(eventObject["id"])

	if stripeObjectType == "checkout.session" && stripeObjectID != "" {
		var session model.PaymentSession
		if err := db.Select("id", "user_id", "stripe_session_id").Where("stripe_session_id = ?", stripeObjectID).First(&session).Error; err == nil {
			var user model.User
			if err := db.Select("id", "tenant_id").First(&user, session.UserID).Error; err == nil {
				secrets = appendUniqueSecret(secrets, findWebhookSecretByTenantID(db, user.TenantID))
			}
		}
	}

	if stripeObjectType == "payment_intent" && stripeObjectID != "" {
		var paymentIntent model.PaymentIntent
		if err := db.Select("id", "user_id", "stripe_payment_intent_id").Where("stripe_payment_intent_id = ?", stripeObjectID).First(&paymentIntent).Error; err == nil {
			var user model.User
			if err := db.Select("id", "tenant_id").First(&user, paymentIntent.UserID).Error; err == nil {
				secrets = appendUniqueSecret(secrets, findWebhookSecretByTenantID(db, user.TenantID))
			}
		}
	}

	if len(secrets) > 0 {
		return secrets
	}

	var tenants []model.Tenant
	if err := db.Select("id", "metadata").Find(&tenants).Error; err != nil {
		return secrets
	}
	for _, tenant := range tenants {
		metadata := map[string]interface{}(tenant.Metadata)
		rawStripe, ok := metadata["stripe"]
		if !ok {
			continue
		}
		stripeMap, ok := rawStripe.(map[string]interface{})
		if !ok || !parseBool(stripeMap["enabled"]) {
			continue
		}
		secrets = appendUniqueSecret(secrets, parseString(stripeMap["webhook_secret"]))
	}

	return secrets
}

func parseUIntFromAny(v interface{}) uint {
	s := parseString(v)
	if s != "" {
		if n, err := strconv.ParseUint(s, 10, 64); err == nil {
			return uint(n)
		}
	}
	if n, ok := v.(float64); ok {
		return uint(n)
	}
	return 0
}

func processStripeCheckoutSessionEvent(tx *gorm.DB, eventType string, eventObject map[string]interface{}) error {
	stripeSessionID := parseString(eventObject["id"])
	if stripeSessionID == "" {
		return nil
	}

	var session model.PaymentSession
	if err := tx.Preload("PaymentIntent").Where("stripe_session_id = ?", stripeSessionID).First(&session).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	now := time.Now()
	if eventType == "checkout.session.completed" {
		wasComplete := session.Status == model.PaymentSessionStatusComplete

		if session.Status != model.PaymentSessionStatusComplete {
			session.Status = model.PaymentSessionStatusComplete
			session.CompletedAt = &now
			if err := tx.Save(&session).Error; err != nil {
				return err
			}
		}

		if session.PaymentIntent.Status != model.PaymentIntentStatusSucceeded {
			session.PaymentIntent.Status = model.PaymentIntentStatusSucceeded
			session.PaymentIntent.ProcessedAt = &now
			if err := tx.Save(&session.PaymentIntent).Error; err != nil {
				return err
			}
		}

		if !wasComplete {
			if err := wallet.RechargeByCode(session.UserID, session.Currency, session.Amount); err != nil {
				return fmt.Errorf("failed to update wallet: %w", err)
			}
		}

		if err := processSubscriptionPaymentWebhook(stripeSessionID, true); err != nil {
			return fmt.Errorf("process subscription webhook failed: %w", err)
		}
		if err := processOrderPaymentWebhook(stripeSessionID, true); err != nil {
			return fmt.Errorf("process order webhook failed: %w", err)
		}
		return nil
	}

	if eventType == "checkout.session.expired" {
		session.Status = model.PaymentSessionStatusExpired
		session.PaymentIntent.Status = model.PaymentIntentStatusCanceled
		session.PaymentIntent.LastPaymentError = "checkout session expired"
		if err := tx.Save(&session).Error; err != nil {
			return err
		}
		if err := tx.Save(&session.PaymentIntent).Error; err != nil {
			return err
		}
		if err := processSubscriptionPaymentWebhook(stripeSessionID, false); err != nil {
			return fmt.Errorf("process subscription webhook failed: %w", err)
		}
		if err := processOrderPaymentWebhook(stripeSessionID, false); err != nil {
			return fmt.Errorf("process order webhook failed: %w", err)
		}
	}

	return nil
}

func processStripePaymentIntentEvent(tx *gorm.DB, eventType string, eventObject map[string]interface{}) error {
	stripePaymentIntentID := parseString(eventObject["id"])
	if stripePaymentIntentID == "" {
		return nil
	}

	var paymentIntent model.PaymentIntent
	if err := tx.Where("stripe_payment_intent_id = ?", stripePaymentIntentID).First(&paymentIntent).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil
		}
		return err
	}

	now := time.Now()
	switch eventType {
	case "payment_intent.succeeded":
		paymentIntent.Status = model.PaymentIntentStatusSucceeded
		paymentIntent.ProcessedAt = &now
	case "payment_intent.processing":
		paymentIntent.Status = model.PaymentIntentStatusProcessing
	case "payment_intent.payment_failed":
		paymentIntent.Status = model.PaymentIntentStatusCanceled
		if lastErr, ok := eventObject["last_payment_error"].(map[string]interface{}); ok {
			paymentIntent.LastPaymentError = parseString(lastErr["message"])
		}
		if paymentIntent.LastPaymentError == "" {
			paymentIntent.LastPaymentError = "payment failed"
		}
	case "payment_intent.canceled":
		paymentIntent.Status = model.PaymentIntentStatusCanceled
		if reason := parseString(eventObject["cancellation_reason"]); reason != "" {
			paymentIntent.LastPaymentError = "canceled: " + reason
		}
	default:
		if status := parseString(eventObject["status"]); status != "" {
			paymentIntent.Status = mapStripePaymentIntentStatus(status)
		}
	}

	if err := tx.Save(&paymentIntent).Error; err != nil {
		return err
	}

	if eventType == "payment_intent.payment_failed" || eventType == "payment_intent.canceled" {
		var session model.PaymentSession
		if err := tx.Where("payment_intent_id = ?", paymentIntent.ID).Order("id desc").First(&session).Error; err == nil {
			session.Status = model.PaymentSessionStatusExpired
			_ = tx.Save(&session).Error
		}
	}

	return nil
}

func ProcessStripeWebhook(payload []byte, signatureHeader string) (string, string, error) {
	db := common.DB()

	var event map[string]interface{}
	if err := json.Unmarshal(payload, &event); err != nil {
		return "", "", fmt.Errorf("invalid stripe event json: %w", err)
	}

	eventID := parseString(event["id"])
	eventType := parseString(event["type"])
	if eventID == "" || eventType == "" {
		return "", "", errors.New("stripe event missing id or type")
	}

	dataMap, _ := event["data"].(map[string]interface{})
	eventObject, _ := dataMap["object"].(map[string]interface{})
	if eventObject == nil {
		return eventID, eventType, errors.New("stripe event missing data.object")
	}

	candidateSecrets := collectCandidateWebhookSecrets(db, eventObject)
	verified := false
	for _, secret := range candidateSecrets {
		if verifyStripeSignature(payload, signatureHeader, secret) {
			verified = true
			break
		}
	}
	if !verified {
		return eventID, eventType, errors.New("stripe webhook signature verification failed")
	}

	var existing model.PaymentWebhookEvent
	if err := db.Where("stripe_event_id = ?", eventID).First(&existing).Error; err == nil {
		return eventID, eventType, nil
	}

	now := time.Now()
	webhookEvent := model.PaymentWebhookEvent{
		StripeEventID:    eventID,
		EventType:        eventType,
		ProcessingStatus: "pending",
		EventData:        string(payload),
	}

	if metadata, ok := eventObject["metadata"].(map[string]interface{}); ok {
		if paymentIntentID := parseUIntFromAny(metadata["payment_intent_id"]); paymentIntentID > 0 {
			webhookEvent.PaymentIntentID = &paymentIntentID
		}
	}

	if err := db.Create(&webhookEvent).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return eventID, eventType, nil
		}
		return eventID, eventType, err
	}

	processErr := db.Transaction(func(tx *gorm.DB) error {
		switch eventType {
		case "checkout.session.completed", "checkout.session.expired":
			return processStripeCheckoutSessionEvent(tx, eventType, eventObject)
		case "payment_intent.succeeded", "payment_intent.processing", "payment_intent.payment_failed", "payment_intent.canceled":
			return processStripePaymentIntentEvent(tx, eventType, eventObject)
		default:
			return nil
		}
	})

	if processErr != nil {
		_ = db.Model(&webhookEvent).Updates(map[string]interface{}{
			"processing_status": "failed",
			"error_message":     processErr.Error(),
			"processed_at":      &now,
		}).Error
		return eventID, eventType, processErr
	}

	if err := db.Model(&webhookEvent).Updates(map[string]interface{}{
		"processing_status": "processed",
		"processed_at":      &now,
	}).Error; err != nil {
		return eventID, eventType, err
	}

	return eventID, eventType, nil
}

type WebhookEventStatus struct {
	EventID          string     `json:"event_id"`
	EventType        string     `json:"event_type"`
	ProcessingStatus string     `json:"processing_status"`
	ProcessedAt      *time.Time `json:"processed_at,omitempty"`
	ErrorMessage     string     `json:"error_message,omitempty"`
	PaymentIntentID  *uint      `json:"payment_intent_id,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

func GetWebhookEventStatus(eventID string) (*WebhookEventStatus, error) {
	db := common.DB()
	eventID = strings.TrimSpace(eventID)
	if eventID == "" {
		return nil, errors.New("event_id is required")
	}

	var event model.PaymentWebhookEvent
	if err := db.Where("stripe_event_id = ?", eventID).First(&event).Error; err != nil {
		return nil, err
	}

	return &WebhookEventStatus{
		EventID:          event.StripeEventID,
		EventType:        event.EventType,
		ProcessingStatus: event.ProcessingStatus,
		ProcessedAt:      event.ProcessedAt,
		ErrorMessage:     event.ErrorMessage,
		PaymentIntentID:  event.PaymentIntentID,
		CreatedAt:        event.CreatedAt,
		UpdatedAt:        event.UpdatedAt,
	}, nil
}

// CreatePaymentIntent 创建支付意图
func CreatePaymentIntent(userID uint, req CreatePaymentIntentRequest) (*model.PaymentIntent, *MockStripeResponse, error) {
	db := common.DB()
	stripeConfig, err := resolveTenantStripeConfigByUser(db, userID)
	if err != nil {
		return nil, nil, err
	}

	if isWalletRechargeMetadata(req.Metadata) && !wallet.RechargeWithdrawEnabled() {
		return nil, nil, wallet.ErrWalletRechargeWithdrawDisabled
	}

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
	if req.Metadata == nil {
		req.Metadata = map[string]interface{}{}
	}
	if stripeConfig.TenantID > 0 {
		req.Metadata["tenant_id"] = strconv.FormatUint(uint64(stripeConfig.TenantID), 10)
	}
	req.Metadata["user_id"] = strconv.FormatUint(uint64(userID), 10)

	// 序列化元数据
	metadataJSON, _ := json.Marshal(req.Metadata)

	stripePIBody, err := stripeRequest(stripeConfig.SecretKey, "https://api.stripe.com/v1/payment_intents", buildStripePaymentIntentForm(req))
	if err != nil {
		return nil, nil, err
	}

	stripePaymentIntentID := parseString(stripePIBody["id"])
	clientSecret := parseString(stripePIBody["client_secret"])
	stripePIStatus := mapStripePaymentIntentStatus(parseString(stripePIBody["status"]))
	if stripePaymentIntentID == "" || clientSecret == "" {
		return nil, nil, errors.New("stripe payment intent 响应缺少关键字段")
	}

	// 创建支付意图
	paymentIntent := model.PaymentIntent{
		StripePaymentIntentID: stripePaymentIntentID,
		UserID:                userID,
		Amount:                req.Amount,
		Currency:              req.Currency,
		Status:                stripePIStatus,
		Description:           req.Description,
		Metadata:              string(metadataJSON),
		PaymentMethodTypes:    strings.Join(req.PaymentMethodTypes, ","),
		ClientSecret:          clientSecret,
		ConfirmationMethod:    req.ConfirmationMethod,
		CaptureMethod:         req.CaptureMethod,
		SetupFutureUsage:      req.SetupFutureUsage,
		NextAction:            "{}",
	}

	if err := db.Create(&paymentIntent).Error; err != nil {
		return nil, nil, err
	}

	// Stripe API响应
	mockResponse := &MockStripeResponse{
		RequestURL:    "https://api.stripe.com/v1/payment_intents",
		RequestMethod: "POST",
		RequestHeaders: map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", maskStripeSecretForHeader(stripeConfig.SecretKey)),
			"Content-Type":  "application/x-www-form-urlencoded",
		},
		RequestBody: req,
		Response:    stripePIBody,
		Timestamp: time.Now(),
	}

	return &paymentIntent, mockResponse, nil
}

// CreatePaymentSession 创建支付会话
func CreatePaymentSession(userID uint, req CreatePaymentSessionRequest) (*model.PaymentSession, *MockStripeResponse, error) {
	db := common.DB()
	stripeConfig, err := resolveTenantStripeConfigByUser(db, userID)
	if err != nil {
		return nil, nil, err
	}

	// 验证支付意图是否存在且属于该用户
	var paymentIntent model.PaymentIntent
	// 检查支付意图是否存在且属于该用户
	if err := db.Where("id = ? AND user_id = ?", req.PaymentIntentID, userID).First(&paymentIntent).Error; err != nil {
		return nil, nil, errors.New("[CreatePaymentSession] payment intent not found. userID: " + fmt.Sprintf("%d", userID) + " paymentIntentID: " + fmt.Sprintf("%d", req.PaymentIntentID))
	}

	stripeSessionBody, err := stripeRequest(stripeConfig.SecretKey, "https://api.stripe.com/v1/checkout/sessions", buildStripeCheckoutSessionForm(&paymentIntent, req))
	if err != nil {
		return nil, nil, err
	}

	stripeSessionID := parseString(stripeSessionBody["id"])
	paymentURL := parseString(stripeSessionBody["url"])
	stripeSessionStatus := mapStripeCheckoutSessionStatus(parseString(stripeSessionBody["status"]))
	if stripeSessionID == "" || paymentURL == "" {
		return nil, nil, errors.New("stripe checkout session 响应缺少关键字段")
	}

	var expiresAt *time.Time
	if expiresUnix, ok := stripeSessionBody["expires_at"].(float64); ok {
		t := time.Unix(int64(expiresUnix), 0)
		expiresAt = &t
	}
	if expiresAt == nil {
		t := time.Now().Add(24 * time.Hour)
		expiresAt = &t
	}

	// 创建支付会话
	session := model.PaymentSession{
		StripeSessionID: stripeSessionID,
		PaymentIntentID: req.PaymentIntentID,
		UserID:          userID,
		Status:          stripeSessionStatus,
		Currency:        paymentIntent.Currency,
		Amount:          paymentIntent.Amount,
		SuccessURL:      req.SuccessURL,
		CancelURL:       req.CancelURL,
		PaymentURL:      paymentURL,
		UserEmail:       req.UserEmail,
		ExpiresAt:       expiresAt,
	}

	if err := db.Create(&session).Error; err != nil {
		return nil, nil, err
	}

	if err := bindOrderPaymentSessionIfPresent(db, userID, &paymentIntent, &session); err != nil {
		return nil, nil, err
	}

	// Stripe Checkout Session API响应
	mockResponse := &MockStripeResponse{
		RequestURL:    "https://api.stripe.com/v1/checkout/sessions",
		RequestMethod: "POST",
		RequestHeaders: map[string]string{
			"Authorization": fmt.Sprintf("Bearer %s", maskStripeSecretForHeader(stripeConfig.SecretKey)),
			"Content-Type":  "application/x-www-form-urlencoded",
		},
		RequestBody: req,
		Response:    stripeSessionBody,
		Timestamp: time.Now(),
	}

	return &session, mockResponse, nil
}

func bindOrderPaymentSessionIfPresent(db *gorm.DB, userID uint, paymentIntent *model.PaymentIntent, session *model.PaymentSession) error {
	if paymentIntent == nil || session == nil {
		return nil
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(paymentIntent.Metadata), &metadata); err != nil {
		return nil
	}

	orderID, err := parseOrderIDFromMetadata(metadata)
	if err != nil {
		return nil
	}

	updates := map[string]interface{}{
		"payment_session_id": session.ID,
		"updated_at":         time.Now(),
	}

	if err := db.Model(&model.Order{}).
		Where("id = ? AND user_id = ?", orderID, userID).
		Where("status = ?", model.OrderStatusPending).
		Updates(updates).Error; err != nil {
		return err
	}

	return nil
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
	wasComplete := session.Status == model.PaymentSessionStatusComplete
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
		if !wasComplete {
			if err := wallet.RechargeByCode(session.UserID, session.Currency, session.Amount); err != nil {
				return nil, fmt.Errorf("failed to update wallet: %w", err)
			}
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

		subscriptionID, err := parseSubscriptionIDFromMetadata(metadata)
		if err != nil {
			return nil // 不是订阅支付，忽略
		}
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
			if invoiceID, err := parseInvoiceIDFromMetadata(metadata); err == nil {
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

	if _, err := parseOrderIDFromMetadata(metadata); err == nil {
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

		orderID, err := parseOrderIDFromMetadata(metadata)
		if err != nil {
			return nil // 不是订单支付，忽略
		}
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

			item := &model.SubscriptionItem{
				SubscriptionID:   subscription.ID,
				PriceID:          order.PriceID,
				Quantity:         1,
				Metering:         model.MeteringPerUnit,
				UsageAggregation: model.UsageAggregationSum,
				Metadata:         model.JSONB{"source": "order_payment"},
			}
			if err := tx.Create(item).Error; err != nil {
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

func parseOrderIDFromMetadata(metadata map[string]interface{}) (uint, error) {
	if metadata == nil {
		return 0, fmt.Errorf("metadata is nil")
	}
	v, ok := metadata["order_id"]
	if !ok || v == nil {
		return 0, fmt.Errorf("order_id not found")
	}

	switch typed := v.(type) {
	case float64:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid order_id")
		}
		return uint(typed), nil
	case int:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid order_id")
		}
		return uint(typed), nil
	case int64:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid order_id")
		}
		return uint(typed), nil
	case uint:
		if typed == 0 {
			return 0, fmt.Errorf("invalid order_id")
		}
		return typed, nil
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(typed), 10, 64)
		if err != nil || parsed == 0 {
			return 0, fmt.Errorf("invalid order_id string")
		}
		return uint(parsed), nil
	default:
		return 0, fmt.Errorf("unsupported order_id type")
	}
}

func parseSubscriptionIDFromMetadata(metadata map[string]interface{}) (uint, error) {
	if metadata == nil {
		return 0, fmt.Errorf("metadata is nil")
	}
	v, ok := metadata["subscription_id"]
	if !ok || v == nil {
		return 0, fmt.Errorf("subscription_id not found")
	}

	switch typed := v.(type) {
	case float64:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid subscription_id")
		}
		return uint(typed), nil
	case int:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid subscription_id")
		}
		return uint(typed), nil
	case int64:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid subscription_id")
		}
		return uint(typed), nil
	case uint:
		if typed == 0 {
			return 0, fmt.Errorf("invalid subscription_id")
		}
		return typed, nil
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(typed), 10, 64)
		if err != nil || parsed == 0 {
			return 0, fmt.Errorf("invalid subscription_id string")
		}
		return uint(parsed), nil
	default:
		return 0, fmt.Errorf("unsupported subscription_id type")
	}
}

func parseInvoiceIDFromMetadata(metadata map[string]interface{}) (uint, error) {
	if metadata == nil {
		return 0, fmt.Errorf("metadata is nil")
	}
	v, ok := metadata["invoice_id"]
	if !ok || v == nil {
		return 0, fmt.Errorf("invoice_id not found")
	}

	switch typed := v.(type) {
	case float64:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid invoice_id")
		}
		return uint(typed), nil
	case int:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid invoice_id")
		}
		return uint(typed), nil
	case int64:
		if typed <= 0 {
			return 0, fmt.Errorf("invalid invoice_id")
		}
		return uint(typed), nil
	case uint:
		if typed == 0 {
			return 0, fmt.Errorf("invalid invoice_id")
		}
		return typed, nil
	case string:
		parsed, err := strconv.ParseUint(strings.TrimSpace(typed), 10, 64)
		if err != nil || parsed == 0 {
			return 0, fmt.Errorf("invalid invoice_id string")
		}
		return uint(parsed), nil
	default:
		return 0, fmt.Errorf("unsupported invoice_id type")
	}
}

// FinalizeOrderPaymentBySessionForUser 在确认用户归属后，按会话立即完成订单支付并创建订阅。
func FinalizeOrderPaymentBySessionForUser(userID uint, sessionID string) error {
	sessionID = strings.TrimSpace(sessionID)
	if sessionID == "" {
		return fmt.Errorf("session_id is required")
	}

	db := common.DB()
	var paymentSession model.PaymentSession
	if err := db.Preload("PaymentIntent").
		Where("stripe_session_id = ? AND user_id = ?", sessionID, userID).
		First(&paymentSession).Error; err != nil {
		return err
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(paymentSession.PaymentIntent.Metadata), &metadata); err != nil {
		return err
	}

	orderID, err := parseOrderIDFromMetadata(metadata)
	if err != nil {
		return err
	}

	var order model.Order
	if err := db.Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		return err
	}

	if order.Status == model.OrderStatusPaid && order.SubscriptionID != nil {
		return nil
	}

	return processOrderPaymentWebhook(sessionID, true)
}

// ReconcileUserOrderPaymentsFromStripe 主动向Stripe核验用户待支付订单，并在已支付时补齐订单/订阅状态。
func ReconcileUserOrderPaymentsFromStripe(userID uint) error {
	db := common.DB()
	stripeConfig, err := resolveTenantStripeConfigByUser(db, userID)
	if err != nil {
		return err
	}

	var orders []model.Order
	if err := db.Preload("PaymentSession").
		Where("user_id = ?", userID).
		Where("status = ?", model.OrderStatusPending).
		Find(&orders).Error; err != nil {
		return err
	}

	for _, order := range orders {
		paymentSession := order.PaymentSession
		if paymentSession == nil || strings.TrimSpace(paymentSession.StripeSessionID) == "" {
			discoveredSession, discoverErr := findLatestPaymentSessionForOrder(db, userID, order.ID)
			if discoverErr != nil {
				continue
			}
			if discoveredSession == nil || strings.TrimSpace(discoveredSession.StripeSessionID) == "" {
				continue
			}

			paymentSession = discoveredSession
			_ = db.Model(&model.Order{}).Where("id = ?", order.ID).Updates(map[string]interface{}{
				"payment_session_id": paymentSession.ID,
				"updated_at":         time.Now(),
			}).Error
		}

		endpoint := "https://api.stripe.com/v1/checkout/sessions/" + url.PathEscape(paymentSession.StripeSessionID)
		sessionBody, err := stripeRequest(stripeConfig.SecretKey, endpoint, nil)
		if err != nil {
			continue
		}

		status := strings.ToLower(strings.TrimSpace(parseString(sessionBody["status"])))
		paymentStatus := strings.ToLower(strings.TrimSpace(parseString(sessionBody["payment_status"])))
		if paymentStatus != "paid" && status != "complete" {
			continue
		}

		if err := processOrderPaymentWebhook(paymentSession.StripeSessionID, true); err != nil {
			continue
		}

		now := time.Now()
		_ = db.Model(&model.PaymentSession{}).Where("id = ?", paymentSession.ID).Updates(map[string]interface{}{
			"status":       model.PaymentSessionStatusComplete,
			"completed_at": &now,
			"updated_at":   now,
		}).Error
	}

	return nil
}

func findLatestPaymentSessionForOrder(db *gorm.DB, userID uint, orderID uint) (*model.PaymentSession, error) {
	var sessions []model.PaymentSession
	if err := db.Preload("PaymentIntent").
		Where("user_id = ?", userID).
		Order("id DESC").
		Limit(200).
		Find(&sessions).Error; err != nil {
		return nil, err
	}

	for _, session := range sessions {
		if session.PaymentIntent.ID == 0 || strings.TrimSpace(session.PaymentIntent.Metadata) == "" {
			continue
		}

		var metadata map[string]interface{}
		if err := json.Unmarshal([]byte(session.PaymentIntent.Metadata), &metadata); err != nil {
			continue
		}

		metadataOrderID, err := parseOrderIDFromMetadata(metadata)
		if err != nil {
			continue
		}
		if metadataOrderID != orderID {
			continue
		}

		matched := session
		return &matched, nil
	}

	return nil, nil
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
