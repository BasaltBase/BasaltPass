package subscription

import (
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

type Service struct {
	db *gorm.DB
}

func NewService(db *gorm.DB) *Service {
	return &Service{db: db}
}

// ========== 产品管理 ==========

// CreateProduct 创建产品
func (s *Service) CreateProduct(req *CreateProductRequest) (*model.Product, error) {
	product := &model.Product{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Metadata:    model.JSONB(req.Metadata),
		EffectiveAt: req.EffectiveAt,
	}

	if err := s.db.Create(product).Error; err != nil {
		return nil, fmt.Errorf("创建产品失败: %w", err)
	}

	return product, nil
}

// GetProduct 获取产品详情
func (s *Service) GetProduct(id uint) (*model.Product, error) {
	var product model.Product
	if err := s.db.Preload("Plans.Features").Preload("Plans.Prices").
		First(&product, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("产品不存在")
		}
		return nil, fmt.Errorf("获取产品失败: %w", err)
	}

	return &product, nil
}

// ListProducts 获取产品列表
func (s *Service) ListProducts(req *ListProductsRequest) ([]*model.Product, int64, error) {
	var products []*model.Product
	var total int64

	query := s.db.Model(&model.Product{}).Preload("Plans").Preload("Plans.Features").Preload("Plans.Prices")

	// 按租户筛选（可选）
	if req.TenantID != nil {
		query = query.Where("tenant_id = ?", *req.TenantID)
	}

	// 根据code过滤
	if req.Code != nil && *req.Code != "" {
		query = query.Where("code LIKE ?", "%"+*req.Code+"%")
	}

	// 根据is_active过滤
	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页
	if req.Page > 0 && req.PageSize > 0 {
		offset := (req.Page - 1) * req.PageSize
		query = query.Offset(offset).Limit(req.PageSize)
	}

	if err := query.Find(&products).Error; err != nil {
		return nil, 0, err
	}

	return products, total, nil
}

// UpdateProduct 更新产品
func (s *Service) UpdateProduct(id uint, req *UpdateProductRequest) (*model.Product, error) {
	var product model.Product
	if err := s.db.First(&product, id).Error; err != nil {
		return nil, err
	}

	if req.Name != nil {
		product.Name = *req.Name
	}
	if req.Description != nil {
		product.Description = *req.Description
	}
	if req.Metadata != nil {
		product.Metadata = model.JSONB(req.Metadata)
	}
	product.UpdatedAt = time.Now()

	if err := s.db.Save(&product).Error; err != nil {
		return nil, err
	}

	return &product, nil
}

// DeleteProduct 删除产品
func (s *Service) DeleteProduct(id uint) error {
	// 检查是否有关联的套餐
	var planCount int64
	s.db.Model(&model.Plan{}).Where("product_id = ?", id).Count(&planCount)
	if planCount > 0 {
		return errors.New("无法删除产品：存在关联的套餐")
	}

	// 软删除产品
	return s.db.Delete(&model.Product{}, id).Error
}

// ========== 套餐管理 ==========

// CreatePlan 创建套餐
func (s *Service) CreatePlan(req *CreatePlanRequest) (*model.Plan, error) {
	// 检查产品是否存在
	var product model.Product
	if err := s.db.First(&product, req.ProductID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("产品不存在")
		}
		return nil, fmt.Errorf("查询产品失败: %w", err)
	}

	planVersion := req.PlanVersion
	if planVersion == 0 {
		planVersion = 1
	}

	plan := &model.Plan{
		ProductID:   req.ProductID,
		Code:        req.Code,
		DisplayName: req.DisplayName,
		PlanVersion: planVersion,
		Metadata:    model.JSONB(req.Metadata),
		EffectiveAt: req.EffectiveAt,
	}

	if err := s.db.Create(plan).Error; err != nil {
		return nil, fmt.Errorf("创建套餐失败: %w", err)
	}

	return plan, nil
}

// GetPlan 获取套餐详情
func (s *Service) GetPlan(id uint) (*model.Plan, error) {
	var plan model.Plan
	if err := s.db.Preload("Product").Preload("Features").Preload("Prices").
		First(&plan, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("套餐不存在")
		}
		return nil, fmt.Errorf("获取套餐失败: %w", err)
	}

	return &plan, nil
}

// ListPlans 获取套餐列表
func (s *Service) ListPlans(req *ListPlansRequest) ([]*model.Plan, int64, error) {
	var plans []*model.Plan
	var total int64

	query := s.db.Model(&model.Plan{}).Preload("Product").Preload("Features").Preload("Prices")

	// 按租户筛选（可选）
	if req.TenantID != nil {
		query = query.Where("tenant_id = ?", *req.TenantID)
	}

	if req.ProductID != nil {
		query = query.Where("product_id = ?", *req.ProductID)
	}

	if req.Code != nil && *req.Code != "" {
		query = query.Where("code LIKE ?", "%"+*req.Code+"%")
	}

	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页
	if req.Page > 0 && req.PageSize > 0 {
		offset := (req.Page - 1) * req.PageSize
		query = query.Offset(offset).Limit(req.PageSize)
	}

	if err := query.Find(&plans).Error; err != nil {
		return nil, 0, err
	}

	return plans, total, nil
}

// UpdatePlan 更新套餐
func (s *Service) UpdatePlan(id uint, req *UpdatePlanRequest) (*model.Plan, error) {
	var plan model.Plan
	if err := s.db.First(&plan, id).Error; err != nil {
		return nil, err
	}

	if req.DisplayName != nil {
		plan.DisplayName = *req.DisplayName
	}
	if req.Metadata != nil {
		plan.Metadata = model.JSONB(*req.Metadata)
	}
	plan.UpdatedAt = time.Now()

	if err := s.db.Save(&plan).Error; err != nil {
		return nil, err
	}

	return &plan, nil
}

// DeletePlan 删除套餐
func (s *Service) DeletePlan(id uint) error {
	// 检查是否有关联的定价
	var priceCount int64
	s.db.Model(&model.Price{}).Where("plan_id = ?", id).Count(&priceCount)
	if priceCount > 0 {
		return errors.New("无法删除套餐：存在关联的定价")
	}

	// 检查是否有活跃的订阅
	var activeSubCount int64
	s.db.Model(&model.Subscription{}).
		Joins("JOIN market_prices ON market_subscriptions.current_price_id = market_prices.id").
		Where("market_prices.plan_id = ? AND market_subscriptions.status IN ?", id, []string{"trialing", "active"}).
		Count(&activeSubCount)
	if activeSubCount > 0 {
		return errors.New("无法删除套餐：存在活跃的订阅")
	}

	// 软删除套餐
	return s.db.Delete(&model.Plan{}, id).Error
}

// CreatePlanFeature 创建套餐功能
func (s *Service) CreatePlanFeature(req *CreatePlanFeatureRequest) (*model.PlanFeature, error) {
	// 检查套餐是否存在
	var plan model.Plan
	if err := s.db.First(&plan, req.PlanID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("套餐不存在")
		}
		return nil, fmt.Errorf("查询套餐失败: %w", err)
	}

	feature := &model.PlanFeature{
		PlanID:       req.PlanID,
		FeatureKey:   req.FeatureKey,
		ValueNumeric: req.ValueNumeric,
		ValueText:    req.ValueText,
		Unit:         req.Unit,
		IsUnlimited:  req.IsUnlimited,
		Metadata:     model.JSONB(req.Metadata),
	}

	if err := s.db.Create(feature).Error; err != nil {
		return nil, fmt.Errorf("创建套餐功能失败: %w", err)
	}

	return feature, nil
}

// ========== 定价管理 ==========

// CreatePrice 创建定价
func (s *Service) CreatePrice(req *CreatePriceRequest) (*model.Price, error) {
	// 检查套餐是否存在
	var plan model.Plan
	if err := s.db.First(&plan, req.PlanID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("套餐不存在")
		}
		return nil, fmt.Errorf("查询套餐失败: %w", err)
	}

	billingInterval := req.BillingInterval
	if billingInterval == 0 {
		billingInterval = 1
	}

	price := &model.Price{
		PlanID:          req.PlanID,
		Currency:        req.Currency,
		AmountCents:     req.AmountCents,
		BillingPeriod:   req.BillingPeriod,
		BillingInterval: billingInterval,
		TrialDays:       req.TrialDays,
		UsageType:       req.UsageType,
		BillingScheme:   model.JSONB(req.BillingScheme),
		EffectiveAt:     req.EffectiveAt,
		Metadata:        model.JSONB(req.Metadata),
	}

	if err := s.db.Create(price).Error; err != nil {
		return nil, fmt.Errorf("创建定价失败: %w", err)
	}

	return price, nil
}

// GetPrice 获取定价详情
func (s *Service) GetPrice(id uint) (*model.Price, error) {
	var price model.Price
	if err := s.db.Preload("Plan.Product").First(&price, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("定价不存在")
		}
		return nil, fmt.Errorf("获取定价失败: %w", err)
	}

	return &price, nil
}

// ListPrices 获取定价列表
func (s *Service) ListPrices(req *ListPricesRequest) ([]*model.Price, int64, error) {
	var prices []*model.Price
	var total int64

	query := s.db.Model(&model.Price{}).Preload("Plan").Preload("Plan.Product")

	// 按租户筛选（可选）
	if req.TenantID != nil {
		query = query.Where("tenant_id = ?", *req.TenantID)
	}

	if req.PlanID != nil {
		query = query.Where("plan_id = ?", *req.PlanID)
	}

	if req.Currency != nil && *req.Currency != "" {
		query = query.Where("currency = ?", *req.Currency)
	}

	if req.UsageType != nil && *req.UsageType != "" {
		query = query.Where("usage_type = ?", *req.UsageType)
	}

	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页
	if req.Page > 0 && req.PageSize > 0 {
		offset := (req.Page - 1) * req.PageSize
		query = query.Offset(offset).Limit(req.PageSize)
	}

	if err := query.Find(&prices).Error; err != nil {
		return nil, 0, err
	}

	return prices, total, nil
}

// UpdatePrice 更新定价
func (s *Service) UpdatePrice(id uint, req *UpdatePriceRequest) (*model.Price, error) {
	var price model.Price
	if err := s.db.First(&price, id).Error; err != nil {
		return nil, err
	}

	if req.AmountCents != nil {
		price.AmountCents = *req.AmountCents
	}
	if req.Currency != nil {
		price.Currency = *req.Currency
	}
	if req.TrialDays != nil {
		price.TrialDays = req.TrialDays
	}
	if req.Metadata != nil {
		price.Metadata = model.JSONB(*req.Metadata)
	}
	price.UpdatedAt = time.Now()

	if err := s.db.Save(&price).Error; err != nil {
		return nil, err
	}

	return &price, nil
}

// DeletePrice 删除定价
func (s *Service) DeletePrice(id uint) error {
	// 检查是否有活跃的订阅
	var activeSubCount int64
	s.db.Model(&model.Subscription{}).
		Where("current_price_id = ? AND status IN ?", id, []string{"trialing", "active"}).
		Count(&activeSubCount)
	if activeSubCount > 0 {
		return errors.New("无法删除定价：存在活跃的订阅")
	}

	// 软删除定价
	return s.db.Delete(&model.Price{}, id).Error
}

// ========== 优惠券管理 ==========

// CreateCoupon 创建优惠券
func (s *Service) CreateCoupon(req *CreateCouponRequest) (*model.Coupon, error) {
	// 检查优惠券代码是否已存在
	var existingCoupon model.Coupon
	if err := s.db.Where("code = ?", req.Code).First(&existingCoupon).Error; err == nil {
		return nil, fmt.Errorf("优惠券代码已存在")
	}

	// 设置默认的IsActive值
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	coupon := &model.Coupon{
		Code:             req.Code,
		Name:             req.Name,
		DiscountType:     req.DiscountType,
		DiscountValue:    req.DiscountValue,
		Duration:         req.Duration,
		DurationInCycles: req.DurationInCycles,
		MaxRedemptions:   req.MaxRedemptions,
		ExpiresAt:        req.ExpiresAt,
		IsActive:         isActive,
		Metadata:         model.JSONB(req.Metadata),
	}

	if err := s.db.Create(coupon).Error; err != nil {
		return nil, fmt.Errorf("创建优惠券失败: %w", err)
	}

	return coupon, nil
}

// GetCouponByCode 根据代码获取优惠券
func (s *Service) GetCouponByCode(code string) (*model.Coupon, error) {
	var coupon model.Coupon
	if err := s.db.Where("code = ?", code).First(&coupon).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("优惠券不存在")
		}
		return nil, fmt.Errorf("获取优惠券失败: %w", err)
	}

	return &coupon, nil
}

// GetCoupon 获取优惠券详情
func (s *Service) GetCoupon(code string) (*model.Coupon, error) {
	var coupon model.Coupon
	err := s.db.Where("code = ?", code).First(&coupon).Error
	if err != nil {
		return nil, err
	}
	return &coupon, nil
}

// ListCoupons 获取优惠券列表
func (s *Service) ListCoupons(req *ListCouponsRequest) ([]*model.Coupon, int64, error) {
	var coupons []*model.Coupon
	var total int64

	query := s.db.Model(&model.Coupon{})

	if req.DiscountType != nil && *req.DiscountType != "" {
		query = query.Where("discount_type = ?", *req.DiscountType)
	}

	if req.Code != nil && *req.Code != "" {
		query = query.Where("code LIKE ?", "%"+*req.Code+"%")
	}

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页
	if req.Page > 0 && req.PageSize > 0 {
		offset := (req.Page - 1) * req.PageSize
		query = query.Offset(offset).Limit(req.PageSize)
	}

	if err := query.Find(&coupons).Error; err != nil {
		return nil, 0, err
	}

	return coupons, total, nil
}

// UpdateCoupon 更新优惠券
func (s *Service) UpdateCoupon(code string, req *UpdateCouponRequest) (*model.Coupon, error) {
	var coupon model.Coupon
	if err := s.db.Where("code = ?", code).First(&coupon).Error; err != nil {
		return nil, err
	}

	if req.Name != nil {
		coupon.Name = *req.Name
	}
	if req.DiscountValue != nil {
		coupon.DiscountValue = *req.DiscountValue
	}
	if req.MaxRedemptions != nil {
		coupon.MaxRedemptions = req.MaxRedemptions
	}
	if req.ExpiresAt != nil {
		coupon.ExpiresAt = req.ExpiresAt
	}
	if req.IsActive != nil {
		coupon.IsActive = *req.IsActive
	}
	if req.Metadata != nil {
		coupon.Metadata = model.JSONB(*req.Metadata)
	}
	coupon.UpdatedAt = time.Now()

	if err := s.db.Save(&coupon).Error; err != nil {
		return nil, err
	}

	return &coupon, nil
}

// DeleteCoupon 删除优惠券
func (s *Service) DeleteCoupon(code string) error {
	// 检查是否有使用中的订阅
	var activeSubCount int64
	s.db.Model(&model.Subscription{}).
		Joins("JOIN coupons ON subscriptions.coupon_id = coupons.id").
		Where("coupons.code = ? AND subscriptions.status IN ?", code, []string{"trialing", "active"}).
		Count(&activeSubCount)
	if activeSubCount > 0 {
		return errors.New("无法删除优惠券：存在使用中的订阅")
	}

	// 软删除优惠券
	return s.db.Where("code = ?", code).Delete(&model.Coupon{}).Error
}

// ========== 订阅管理 ==========

// CreateSubscription 创建订阅
func (s *Service) CreateSubscription(req *CreateSubscriptionRequest) (*model.Subscription, error) {
	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 验证用户存在
	var user model.User
	if err := tx.First(&user, req.UserID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("用户不存在")
		}
		return nil, fmt.Errorf("查询用户失败: %w", err)
	}

	// 验证价格存在
	var price model.Price
	if err := tx.Preload("Plan").First(&price, req.PriceID).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("价格不存在")
		}
		return nil, fmt.Errorf("查询价格失败: %w", err)
	}

	// 处理优惠券
	var couponID *uint
	if req.CouponCode != nil {
		coupon, err := s.GetCouponByCode(*req.CouponCode)
		if err != nil {
			tx.Rollback()
			return nil, err
		}
		couponID = &coupon.ID
	}

	// 确定开始时间
	startAt := time.Now()
	if req.StartAt != nil {
		startAt = *req.StartAt
	}

	// 计算计费周期
	currentPeriodStart := startAt
	currentPeriodEnd := s.calculateNextBillingDate(startAt, price.BillingPeriod, price.BillingInterval)

	// 处理试用期
	if req.TrialEnd != nil {
		currentPeriodEnd = *req.TrialEnd
	} else if price.TrialDays != nil && *price.TrialDays > 0 {
		currentPeriodEnd = startAt.AddDate(0, 0, *price.TrialDays)
	}

	// 确定初始状态
	status := model.SubscriptionStatusActive
	if price.TrialDays != nil && *price.TrialDays > 0 {
		status = model.SubscriptionStatusTrialing
	}

	subscription := &model.Subscription{
		UserID:             req.UserID,
		Status:             status,
		CurrentPriceID:     req.PriceID,
		CouponID:           couponID,
		StartAt:            startAt,
		CurrentPeriodStart: currentPeriodStart,
		CurrentPeriodEnd:   currentPeriodEnd,
		Metadata:           model.JSONB(req.Metadata),
	}

	if err := tx.Create(subscription).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("创建订阅失败: %w", err)
	}

	// 创建订阅项目
	if len(req.Items) == 0 {
		// 如果没有指定项目，创建默认项目
		item := &model.SubscriptionItem{
			SubscriptionID:   subscription.ID,
			PriceID:          req.PriceID,
			Quantity:         1,
			Metering:         model.MeteringPerUnit,
			UsageAggregation: model.UsageAggregationSum,
		}
		if err := tx.Create(item).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("创建订阅项目失败: %w", err)
		}
	} else {
		for _, itemReq := range req.Items {
			quantity := itemReq.Quantity
			if quantity == 0 {
				quantity = 1
			}

			metering := itemReq.Metering
			if metering == "" {
				metering = model.MeteringPerUnit
			}

			usageAggregation := itemReq.UsageAggregation
			if usageAggregation == "" {
				usageAggregation = model.UsageAggregationSum
			}

			item := &model.SubscriptionItem{
				SubscriptionID:   subscription.ID,
				PriceID:          itemReq.PriceID,
				Quantity:         quantity,
				Metering:         metering,
				UsageAggregation: usageAggregation,
				Metadata:         model.JSONB(itemReq.Metadata),
			}
			if err := tx.Create(item).Error; err != nil {
				tx.Rollback()
				return nil, fmt.Errorf("创建订阅项目失败: %w", err)
			}
		}
	}

	// 更新优惠券使用次数
	if couponID != nil {
		if err := tx.Model(&model.Coupon{}).Where("id = ?", *couponID).
			UpdateColumn("redeemed_count", gorm.Expr("redeemed_count + ?", 1)).Error; err != nil {
			tx.Rollback()
			return nil, fmt.Errorf("更新优惠券使用次数失败: %w", err)
		}
	}

	// 记录订阅事件
	event := &model.SubscriptionEvent{
		SubscriptionID: subscription.ID,
		EventType:      "subscription.created",
		Data:           model.JSONB(map[string]interface{}{"price_id": req.PriceID}),
	}
	if err := tx.Create(event).Error; err != nil {
		tx.Rollback()
		return nil, fmt.Errorf("记录订阅事件失败: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return nil, fmt.Errorf("提交事务失败: %w", err)
	}

	// 重新加载订阅数据
	if err := s.db.Preload("CurrentPrice.Plan.Product").Preload("Coupon").
		Preload("Items.Price").First(subscription, subscription.ID).Error; err != nil {
		return nil, fmt.Errorf("重新加载订阅数据失败: %w", err)
	}

	return subscription, nil
}

// GetSubscription 获取订阅详情
func (s *Service) GetSubscription(id uint, userID *uint) (*model.Subscription, error) {
	query := s.db.Preload("CurrentPrice.Plan.Product").
		Preload("NextPrice.Plan.Product").
		Preload("Coupon").
		Preload("Items.Price")

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	var subscription model.Subscription
	if err := query.First(&subscription, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("订阅不存在")
		}
		return nil, fmt.Errorf("获取订阅失败: %w", err)
	}

	return &subscription, nil
}

// ListSubscriptions 获取订阅列表
func (s *Service) ListSubscriptions(req *SubscriptionListRequest) ([]model.Subscription, int64, error) {
	var subscriptions []model.Subscription
	var total int64

	query := s.db.Model(&model.Subscription{})

	// 按租户筛选（可选）
	if req.TenantID != nil {
		query = query.Where("tenant_id = ?", *req.TenantID)
	}

	if req.UserID != nil {
		query = query.Where("user_id = ?", *req.UserID)
	}
	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}
	if req.PriceID != nil {
		query = query.Where("current_price_id = ?", *req.PriceID)
	}

	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("获取订阅总数失败: %w", err)
	}

	page := req.Page
	pageSize := req.PageSize
	if page > 0 && pageSize > 0 {
		offset := (page - 1) * pageSize
		query = query.Offset(offset).Limit(pageSize)
	}

	if err := query.Preload("CurrentPrice.Plan.Product").
		Preload("NextPrice").Preload("Coupon").
		Order("created_at DESC").Find(&subscriptions).Error; err != nil {
		return nil, 0, fmt.Errorf("获取订阅列表失败: %w", err)
	}

	return subscriptions, total, nil
}

// CancelSubscription 取消订阅
func (s *Service) CancelSubscription(id uint, userID *uint, req *CancelSubscriptionRequest) error {
	// 开启事务
	tx := s.db.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	query := tx.Model(&model.Subscription{}).Where("id = ?", id)
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	// 检查订阅是否存在且可取消
	var subscription model.Subscription
	if err := query.First(&subscription).Error; err != nil {
		tx.Rollback()
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("订阅不存在")
		}
		return fmt.Errorf("查询订阅失败: %w", err)
	}

	if subscription.Status == model.SubscriptionStatusCanceled {
		tx.Rollback()
		return fmt.Errorf("订阅已取消")
	}

	// 确定取消时间
	cancelAt := time.Now()
	if req.CancelAt != nil {
		cancelAt = *req.CancelAt
	}

	canceledAt := cancelAt
	status := model.SubscriptionStatusCanceled

	// 如果取消时间在未来，设置为在期末取消
	if cancelAt.After(time.Now()) {
		canceledAt = cancelAt
		status = subscription.Status // 保持当前状态，在期末时才真正取消
	}

	// 更新订阅状态
	updates := map[string]interface{}{
		"status":      status,
		"cancel_at":   cancelAt,
		"canceled_at": canceledAt,
	}

	if err := query.Updates(updates).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("更新订阅状态失败: %w", err)
	}

	// 记录取消事件
	eventData := map[string]interface{}{
		"cancel_at":   cancelAt,
		"canceled_at": canceledAt,
	}
	if req.Reason != nil {
		eventData["reason"] = *req.Reason
	}

	event := &model.SubscriptionEvent{
		SubscriptionID: id,
		EventType:      "subscription.canceled",
		Data:           model.JSONB(eventData),
	}
	if err := tx.Create(event).Error; err != nil {
		tx.Rollback()
		return fmt.Errorf("记录取消事件失败: %w", err)
	}

	if err := tx.Commit().Error; err != nil {
		return fmt.Errorf("提交事务失败: %w", err)
	}

	return nil
}

// ========== 使用记录管理 ==========

// CreateUsageRecord 创建使用记录
func (s *Service) CreateUsageRecord(req *CreateUsageRecordRequest) (*model.UsageRecord, error) {
	// 验证订阅项目存在
	var item model.SubscriptionItem
	if err := s.db.First(&item, req.SubscriptionItemID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("订阅项目不存在")
		}
		return nil, fmt.Errorf("查询订阅项目失败: %w", err)
	}

	timestamp := req.Timestamp
	if timestamp.IsZero() {
		timestamp = time.Now()
	}

	usageRecord := &model.UsageRecord{
		SubscriptionItemID: req.SubscriptionItemID,
		Ts:                 timestamp,
		Quantity:           req.Quantity,
		Source:             req.Source,
		IdempotencyKey:     req.IdempotencyKey,
	}

	if err := s.db.Create(usageRecord).Error; err != nil {
		return nil, fmt.Errorf("创建使用记录失败: %w", err)
	}

	return usageRecord, nil
}

// ========== 辅助方法 ==========

// calculateNextBillingDate 计算下一个计费日期
func (s *Service) calculateNextBillingDate(startDate time.Time, period model.BillingPeriod, interval int) time.Time {
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
		return startDate.AddDate(0, interval, 0) // 默认按月
	}
}
