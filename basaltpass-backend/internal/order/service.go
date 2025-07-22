package order

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// CreateOrderRequest 创建订单请求
type CreateOrderRequest struct {
	UserID     uint    `json:"user_id" validate:"required"`
	PriceID    uint    `json:"price_id" validate:"required"`
	Quantity   float64 `json:"quantity,omitempty"`
	CouponCode *string `json:"coupon_code,omitempty"`
}

// OrderResponse 订单响应
type OrderResponse struct {
	ID             uint                   `json:"id"`
	OrderNumber    string                 `json:"order_number"`
	UserID         uint                   `json:"user_id"`
	PriceID        uint                   `json:"price_id"`
	CouponID       *uint                  `json:"coupon_id"`
	Status         model.OrderStatus      `json:"status"`
	Quantity       float64                `json:"quantity"`
	BaseAmount     int64                  `json:"base_amount"`
	DiscountAmount int64                  `json:"discount_amount"`
	TotalAmount    int64                  `json:"total_amount"`
	Currency       string                 `json:"currency"`
	Description    string                 `json:"description"`
	ExpiresAt      time.Time              `json:"expires_at"`
	PaidAt         *time.Time             `json:"paid_at"`
	CreatedAt      time.Time              `json:"created_at"`
	UpdatedAt      time.Time              `json:"updated_at"`
	
	// 关联数据
	Price          *model.Price           `json:"price,omitempty"`
	Coupon         *model.Coupon          `json:"coupon,omitempty"`
}

// OrderService 订单服务
type OrderService struct {
	db *gorm.DB
}

// NewOrderService 创建订单服务
func NewOrderService(db *gorm.DB) *OrderService {
	return &OrderService{db: db}
}

// generateOrderNumber 生成订单号
func (s *OrderService) generateOrderNumber() string {
	timestamp := time.Now().Format("20060102150405")
	bytes := make([]byte, 4)
	rand.Read(bytes)
	return fmt.Sprintf("ORD%s%s", timestamp, hex.EncodeToString(bytes))
}

// CreateOrder 创建订单
func (s *OrderService) CreateOrder(req *CreateOrderRequest) (*OrderResponse, error) {
	var result *OrderResponse
	err := s.db.Transaction(func(tx *gorm.DB) error {
		// 验证用户
		var user model.User
		if err := tx.First(&user, req.UserID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("用户不存在")
			}
			return fmt.Errorf("查询用户失败: %w", err)
		}

		// 验证价格
		var price model.Price
		if err := tx.Preload("Plan.Product").First(&price, req.PriceID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return fmt.Errorf("价格不存在")
			}
			return fmt.Errorf("查询价格失败: %w", err)
		}

		// 处理优惠券
		var coupon *model.Coupon
		var couponID *uint
		discountAmount := int64(0)

		if req.CouponCode != nil && *req.CouponCode != "" {
			var c model.Coupon
			if err := tx.Where("code = ? AND is_active = true", *req.CouponCode).First(&c).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return fmt.Errorf("优惠券不存在或已失效")
				}
				return fmt.Errorf("查询优惠券失败: %w", err)
			}

			// 验证优惠券有效性
			now := time.Now()
			if c.ExpiresAt != nil && c.ExpiresAt.Before(now) {
				return fmt.Errorf("优惠券已过期")
			}

			if c.MaxRedemptions != nil && c.RedeemedCount >= *c.MaxRedemptions {
				return fmt.Errorf("优惠券使用次数已达上限")
			}

			coupon = &c
			couponID = &c.ID

			// 计算折扣金额
			if c.DiscountType == model.DiscountTypePercent {
				discountAmount = (price.AmountCents * c.DiscountValue) / 10000
			} else {
				discountAmount = c.DiscountValue
			}
		}

		// 设置数量
		quantity := req.Quantity
		if quantity <= 0 {
			quantity = 1
		}

		// 计算金额
		baseAmount := int64(float64(price.AmountCents) * quantity)
		totalAmount := baseAmount - discountAmount
		if totalAmount < 0 {
			totalAmount = 0
		}

		// 创建订单
		order := &model.Order{
			OrderNumber:    s.generateOrderNumber(),
			UserID:         req.UserID,
			PriceID:        req.PriceID,
			CouponID:       couponID,
			Status:         model.OrderStatusPending,
			Quantity:       quantity,
			BaseAmount:     baseAmount,
			DiscountAmount: discountAmount,
			TotalAmount:    totalAmount,
			Currency:       price.Currency,
			Description:    fmt.Sprintf("订阅：%s - %s", price.Plan.Product.Name, price.Plan.DisplayName),
			ExpiresAt:      time.Now().Add(30 * time.Minute), // 30分钟内支付
			Metadata:       model.JSONB{"source": "web_order"},
		}

		if err := tx.Create(order).Error; err != nil {
			return fmt.Errorf("创建订单失败: %w", err)
		}

		// 设置返回结果
		result = &OrderResponse{
			ID:             order.ID,
			OrderNumber:    order.OrderNumber,
			UserID:         order.UserID,
			PriceID:        order.PriceID,
			CouponID:       order.CouponID,
			Status:         order.Status,
			Quantity:       order.Quantity,
			BaseAmount:     order.BaseAmount,
			DiscountAmount: order.DiscountAmount,
			TotalAmount:    order.TotalAmount,
			Currency:       order.Currency,
			Description:    order.Description,
			ExpiresAt:      order.ExpiresAt,
			PaidAt:         order.PaidAt,
			CreatedAt:      order.CreatedAt,
			UpdatedAt:      order.UpdatedAt,
			Price:          &price,
			Coupon:         coupon,
		}
		return nil
	})
	
	if err != nil {
		return nil, err
	}
	return result, nil
}

// GetOrder 获取订单
func (s *OrderService) GetOrder(userID uint, orderID uint) (*OrderResponse, error) {
	var order model.Order
	if err := s.db.Preload("Price.Plan.Product").Preload("Coupon").
		Where("id = ? AND user_id = ?", orderID, userID).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("订单不存在")
		}
		return nil, fmt.Errorf("查询订单失败: %w", err)
	}

	return &OrderResponse{
		ID:             order.ID,
		OrderNumber:    order.OrderNumber,
		UserID:         order.UserID,
		PriceID:        order.PriceID,
		CouponID:       order.CouponID,
		Status:         order.Status,
		Quantity:       order.Quantity,
		BaseAmount:     order.BaseAmount,
		DiscountAmount: order.DiscountAmount,
		TotalAmount:    order.TotalAmount,
		Currency:       order.Currency,
		Description:    order.Description,
		ExpiresAt:      order.ExpiresAt,
		PaidAt:         order.PaidAt,
		CreatedAt:      order.CreatedAt,
		UpdatedAt:      order.UpdatedAt,
		Price:          &order.Price,
		Coupon:         order.Coupon,
	}, nil
}

// GetOrderByNumber 根据订单号获取订单
func (s *OrderService) GetOrderByNumber(userID uint, orderNumber string) (*OrderResponse, error) {
	var order model.Order
	if err := s.db.Preload("Price.Plan.Product").Preload("Coupon").
		Where("order_number = ? AND user_id = ?", orderNumber, userID).First(&order).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("订单不存在")
		}
		return nil, fmt.Errorf("查询订单失败: %w", err)
	}

	return &OrderResponse{
		ID:             order.ID,
		OrderNumber:    order.OrderNumber,
		UserID:         order.UserID,
		PriceID:        order.PriceID,
		CouponID:       order.CouponID,
		Status:         order.Status,
		Quantity:       order.Quantity,
		BaseAmount:     order.BaseAmount,
		DiscountAmount: order.DiscountAmount,
		TotalAmount:    order.TotalAmount,
		Currency:       order.Currency,
		Description:    order.Description,
		ExpiresAt:      order.ExpiresAt,
		PaidAt:         order.PaidAt,
		CreatedAt:      order.CreatedAt,
		UpdatedAt:      order.UpdatedAt,
		Price:          &order.Price,
		Coupon:         order.Coupon,
	}, nil
}

// UpdateOrderStatus 更新订单状态
func (s *OrderService) UpdateOrderStatus(orderID uint, status model.OrderStatus) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	if status == model.OrderStatusPaid {
		now := time.Now()
		updates["paid_at"] = &now
	}

	return s.db.Model(&model.Order{}).Where("id = ?", orderID).Updates(updates).Error
}

// ListUserOrders 获取用户订单列表
func (s *OrderService) ListUserOrders(userID uint, limit int) ([]*OrderResponse, error) {
	var orders []model.Order
	query := s.db.Preload("Price.Plan.Product").Preload("Coupon").
		Where("user_id = ?", userID).Order("created_at desc")
	
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&orders).Error; err != nil {
		return nil, fmt.Errorf("查询订单列表失败: %w", err)
	}

	var responses []*OrderResponse
	for _, order := range orders {
		responses = append(responses, &OrderResponse{
			ID:             order.ID,
			OrderNumber:    order.OrderNumber,
			UserID:         order.UserID,
			PriceID:        order.PriceID,
			CouponID:       order.CouponID,
			Status:         order.Status,
			Quantity:       order.Quantity,
			BaseAmount:     order.BaseAmount,
			DiscountAmount: order.DiscountAmount,
			TotalAmount:    order.TotalAmount,
			Currency:       order.Currency,
			Description:    order.Description,
			ExpiresAt:      order.ExpiresAt,
			PaidAt:         order.PaidAt,
			CreatedAt:      order.CreatedAt,
			UpdatedAt:      order.UpdatedAt,
			Price:          &order.Price,
			Coupon:         order.Coupon,
		})
	}

	return responses, nil
}

// ExpireOrders 过期未支付订单
func (s *OrderService) ExpireOrders() error {
	return s.db.Model(&model.Order{}).
		Where("status = ? AND expires_at < ?", model.OrderStatusPending, time.Now()).
		Update("status", model.OrderStatusExpired).Error
} 