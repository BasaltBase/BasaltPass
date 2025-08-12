package subscription

import (
	"encoding/json"
	"fmt"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// WebhookService webhook服务
type WebhookService struct {
	db *gorm.DB
}

// NewWebhookService 创建webhook服务
func NewWebhookService(db *gorm.DB) *WebhookService {
	return &WebhookService{db: db}
}

// HandlePaymentSucceeded 处理支付成功事件
func (s *WebhookService) HandlePaymentSucceeded(paymentIntentID string, eventData map[string]interface{}) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 根据stripe payment intent ID查找支付记录
		var payment model.Payment
		if err := tx.Where("gateway_payment_intent_id = ?", paymentIntentID).First(&payment).Error; err != nil {
			return fmt.Errorf("支付记录不存在: %w", err)
		}

		// 检查支付是否已经处理过
		if payment.Status == model.PaymentStatusSucceeded {
			return nil // 幂等处理，已经成功的支付不重复处理
		}

		// 更新支付状态
		now := time.Now()
		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status":     model.PaymentStatusSucceeded,
			"updated_at": now,
		}).Error; err != nil {
			return fmt.Errorf("更新支付状态失败: %w", err)
		}

		// 获取关联的账单
		var invoice model.Invoice
		if err := tx.First(&invoice, payment.InvoiceID).Error; err != nil {
			return fmt.Errorf("账单不存在: %w", err)
		}

		// 更新账单状态
		if err := tx.Model(&invoice).Updates(map[string]interface{}{
			"status":     model.InvoiceStatusPaid,
			"paid_at":    &now,
			"updated_at": now,
		}).Error; err != nil {
			return fmt.Errorf("更新账单状态失败: %w", err)
		}

		// 如果是订阅相关的支付，更新订阅状态
		if invoice.SubscriptionID != nil {
			var subscription model.Subscription
			if err := tx.First(&subscription, *invoice.SubscriptionID).Error; err != nil {
				return fmt.Errorf("订阅不存在: %w", err)
			}

			// 根据当前状态决定新状态
			newStatus := model.SubscriptionStatusActive
			if subscription.Status == model.SubscriptionStatusPending {
				// 检查是否有试用期
				var price model.Price
				if err := tx.First(&price, subscription.CurrentPriceID).Error; err == nil {
					if price.TrialDays != nil && *price.TrialDays > 0 && subscription.CurrentPeriodEnd.After(now) {
						newStatus = model.SubscriptionStatusTrialing
					}
				}
			}

			// 更新订阅状态
			if err := tx.Model(&subscription).Updates(map[string]interface{}{
				"status":     newStatus,
				"updated_at": now,
			}).Error; err != nil {
				return fmt.Errorf("更新订阅状态失败: %w", err)
			}

			// 创建订阅事件
			event := &model.SubscriptionEvent{
				SubscriptionID: subscription.ID,
				EventType:      "subscription.activated",
				Data: model.JSONB{
					"activated_at":        now,
					"payment_intent_id":   paymentIntentID,
					"invoice_id":          invoice.ID,
					"payment_id":          payment.ID,
					"reason":              "payment_succeeded",
					"subscription_status": newStatus,
				},
			}
			if err := tx.Create(event).Error; err != nil {
				return fmt.Errorf("创建订阅事件失败: %w", err)
			}
		}

		return nil
	})
}

// HandlePaymentFailed 处理支付失败事件
func (s *WebhookService) HandlePaymentFailed(paymentIntentID string, eventData map[string]interface{}) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 根据stripe payment intent ID查找支付记录
		var payment model.Payment
		if err := tx.Where("gateway_payment_intent_id = ?", paymentIntentID).First(&payment).Error; err != nil {
			return fmt.Errorf("支付记录不存在: %w", err)
		}

		// 检查支付是否已经处理过
		if payment.Status == model.PaymentStatusFailed {
			return nil // 幂等处理
		}

		// 更新支付状态
		now := time.Now()
		errorMessage := "Payment failed"
		if errMsg, ok := eventData["error_message"].(string); ok {
			errorMessage = errMsg
		}

		if err := tx.Model(&payment).Updates(map[string]interface{}{
			"status":     model.PaymentStatusFailed,
			"updated_at": now,
		}).Error; err != nil {
			return fmt.Errorf("更新支付状态失败: %w", err)
		}

		// 获取关联的账单
		var invoice model.Invoice
		if err := tx.First(&invoice, payment.InvoiceID).Error; err != nil {
			return fmt.Errorf("账单不存在: %w", err)
		}

		// 更新账单状态
		if err := tx.Model(&invoice).Updates(map[string]interface{}{
			"status":     model.InvoiceStatusVoid,
			"updated_at": now,
		}).Error; err != nil {
			return fmt.Errorf("更新账单状态失败: %w", err)
		}

		// 如果是订阅相关的支付，更新订阅状态
		if invoice.SubscriptionID != nil {
			var subscription model.Subscription
			if err := tx.First(&subscription, *invoice.SubscriptionID).Error; err != nil {
				return fmt.Errorf("订阅不存在: %w", err)
			}

			// 将订阅状态设为overdue（如果不是pending）
			newStatus := model.SubscriptionStatusOverdue
			if subscription.Status == model.SubscriptionStatusPending {
				// 对于pending的订阅，保持pending状态，等待重试
				newStatus = model.SubscriptionStatusPending
			}

			// 更新订阅状态
			if err := tx.Model(&subscription).Updates(map[string]interface{}{
				"status":     newStatus,
				"updated_at": now,
			}).Error; err != nil {
				return fmt.Errorf("更新订阅状态失败: %w", err)
			}

			// 创建订阅事件
			event := &model.SubscriptionEvent{
				SubscriptionID: subscription.ID,
				EventType:      "subscription.payment_failed",
				Data: model.JSONB{
					"failed_at":           now,
					"payment_intent_id":   paymentIntentID,
					"invoice_id":          invoice.ID,
					"payment_id":          payment.ID,
					"error_message":       errorMessage,
					"subscription_status": newStatus,
				},
			}
			if err := tx.Create(event).Error; err != nil {
				return fmt.Errorf("创建订阅事件失败: %w", err)
			}
		}

		return nil
	})
}

// HandlePaymentWebhook 统一的webhook处理入口
func (s *WebhookService) HandlePaymentWebhook(sessionID string, success bool, eventData map[string]interface{}) error {
	// 根据session ID查找payment intent
	var paymentSession model.PaymentSession
	if err := s.db.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&paymentSession).Error; err != nil {
		return fmt.Errorf("支付会话不存在: %w", err)
	}

	paymentIntentID := paymentSession.PaymentIntent.StripePaymentIntentID

	if success {
		return s.HandlePaymentSucceeded(paymentIntentID, eventData)
	} else {
		return s.HandlePaymentFailed(paymentIntentID, eventData)
	}
}

// ProcessSubscriptionWebhook 处理订阅相关的webhook
func ProcessSubscriptionWebhook(sessionID string, success bool) error {
	webhookService := NewWebhookService(common.DB())

	// 构建事件数据
	eventData := map[string]interface{}{
		"session_id":   sessionID,
		"success":      success,
		"processed_at": time.Now(),
		"source":       "basaltpass_simulator",
	}

	if !success {
		eventData["error_message"] = "Payment was canceled or failed during simulation"
	}

	return webhookService.HandlePaymentWebhook(sessionID, success, eventData)
}

// GetSubscriptionByPaymentSession 根据支付会话获取订阅信息
func GetSubscriptionByPaymentSession(sessionID string) (*model.Subscription, error) {
	db := common.DB()

	var paymentSession model.PaymentSession
	if err := db.Preload("PaymentIntent").Where("stripe_session_id = ?", sessionID).First(&paymentSession).Error; err != nil {
		return nil, fmt.Errorf("支付会话不存在: %w", err)
	}

	// 从payment intent的metadata中获取subscription_id
	var paymentIntent model.PaymentIntent
	if err := db.First(&paymentIntent, paymentSession.PaymentIntentID).Error; err != nil {
		return nil, fmt.Errorf("支付意图不存在: %w", err)
	}

	var metadata map[string]interface{}
	if err := json.Unmarshal([]byte(paymentIntent.Metadata), &metadata); err != nil {
		return nil, fmt.Errorf("解析支付意图元数据失败: %w", err)
	}

	subscriptionIDFloat, ok := metadata["subscription_id"].(float64)
	if !ok {
		return nil, fmt.Errorf("支付意图中未找到订阅ID")
	}

	subscriptionID := uint(subscriptionIDFloat)

	var subscription model.Subscription
	if err := db.Preload("CurrentPrice.Plan.Product").
		Preload("Coupon").
		First(&subscription, subscriptionID).Error; err != nil {
		return nil, fmt.Errorf("订阅不存在: %w", err)
	}

	return &subscription, nil
}
