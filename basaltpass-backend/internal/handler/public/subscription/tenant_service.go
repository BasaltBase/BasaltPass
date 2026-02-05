package subscription

import (
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

// TenantService 租户订阅服务
type TenantService struct {
	db       *gorm.DB
	tenantID *uint64
}

// NewTenantService 创建租户订阅服务
func NewTenantService(db *gorm.DB, tenantID *uint64) *TenantService {
	return &TenantService{
		db:       db,
		tenantID: tenantID,
	}
}

// ========== 产品管理 ==========

// CreateProduct 创建产品
func (s *TenantService) CreateProduct(req *CreateProductRequest) (*model.Product, error) {
	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	product := &model.Product{
		TenantID:    s.tenantID,
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		IsActive:    isActive,
		CategoryID:  req.CategoryID,
		Metadata:    model.JSONB(req.Metadata),
		EffectiveAt: req.EffectiveAt,
	}

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(product).Error; err != nil {
			return fmt.Errorf("创建产品失败: %w", err)
		}

		if len(req.TagIDs) > 0 {
			var tags []model.ProductTag
			tagQuery := tx.Where("id IN ?", req.TagIDs)
			if s.tenantID != nil {
				tagQuery = tagQuery.Where("tenant_id = ?", *s.tenantID)
			}
			if err := tagQuery.Find(&tags).Error; err != nil {
				return fmt.Errorf("查询标签失败: %w", err)
			}
			if err := tx.Model(product).Association("Tags").Replace(tags); err != nil {
				return fmt.Errorf("绑定标签失败: %w", err)
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	// 回读关联
	_ = s.db.Preload("Category").Preload("Tags").First(product, product.ID).Error
	return product, nil
}

// GetProduct 获取产品详情
func (s *TenantService) GetProduct(id uint) (*model.Product, error) {
	var product model.Product
	query := s.db.Preload("Category").Preload("Tags").Preload("Plans.Features").Preload("Plans.Prices").
		Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&product).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("产品不存在")
		}
		return nil, fmt.Errorf("获取产品失败: %w", err)
	}

	return &product, nil
}

// ListProducts 获取产品列表
func (s *TenantService) ListProducts(req *ListProductsRequest) ([]*model.Product, int64, error) {
	var products []*model.Product
	var total int64

	query := s.db.Model(&model.Product{}).Preload("Category").Preload("Tags").Preload("Plans").Preload("Plans.Features").Preload("Plans.Prices")

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
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
func (s *TenantService) UpdateProduct(id uint, req *UpdateProductRequest) (*model.Product, error) {
	var product model.Product
	query := s.db.Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&product).Error; err != nil {
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
	if req.IsActive != nil {
		product.IsActive = *req.IsActive
	}
	if req.CategoryID != nil {
		product.CategoryID = req.CategoryID
	}
	if req.DeprecatedAt != nil {
		product.DeprecatedAt = req.DeprecatedAt
	}
	product.UpdatedAt = time.Now()

	if err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&product).Error; err != nil {
			return fmt.Errorf("更新产品失败: %w", err)
		}
		if req.TagIDs != nil {
			if len(*req.TagIDs) == 0 {
				if err := tx.Model(&product).Association("Tags").Clear(); err != nil {
					return fmt.Errorf("清空标签失败: %w", err)
				}
			} else {
				var tags []model.ProductTag
				tagQuery := tx.Where("id IN ?", *req.TagIDs)
				if s.tenantID != nil {
					tagQuery = tagQuery.Where("tenant_id = ?", *s.tenantID)
				}
				if err := tagQuery.Find(&tags).Error; err != nil {
					return fmt.Errorf("查询标签失败: %w", err)
				}
				if err := tx.Model(&product).Association("Tags").Replace(tags); err != nil {
					return fmt.Errorf("绑定标签失败: %w", err)
				}
			}
		}
		return nil
	}); err != nil {
		return nil, err
	}

	_ = s.db.Preload("Category").Preload("Tags").First(&product, product.ID).Error
	return &product, nil
}

// DeleteProduct 删除产品（软删除）
func (s *TenantService) DeleteProduct(id uint) error {
	query := s.db.Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.Delete(&model.Product{}).Error; err != nil {
		return fmt.Errorf("删除产品失败: %w", err)
	}
	return nil
}

// ========== 套餐管理 ==========

// CreatePlan 创建套餐
func (s *TenantService) CreatePlan(req *CreatePlanRequest) (*model.Plan, error) {
	// 检查产品是否存在且属于当前租户
	var product model.Product
	productQuery := s.db.Where("id = ?", req.ProductID)
	if s.tenantID != nil {
		productQuery = productQuery.Where("tenant_id = ?", *s.tenantID)
	} else {
		productQuery = productQuery.Where("tenant_id IS NULL")
	}

	if err := productQuery.First(&product).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("产品不存在或无权限访问")
		}
		return nil, fmt.Errorf("查询产品失败: %w", err)
	}

	planVersion := req.PlanVersion
	if planVersion == 0 {
		planVersion = 1
	}

	plan := &model.Plan{
		TenantID:    s.tenantID,
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
func (s *TenantService) GetPlan(id uint) (*model.Plan, error) {
	var plan model.Plan
	query := s.db.Preload("Product").Preload("Features").Preload("Prices").
		Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&plan).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("套餐不存在")
		}
		return nil, fmt.Errorf("获取套餐失败: %w", err)
	}

	return &plan, nil
}

// ListPlans 获取套餐列表
func (s *TenantService) ListPlans(req *ListPlansRequest) ([]*model.Plan, int64, error) {
	var plans []*model.Plan
	var total int64

	query := s.db.Model(&model.Plan{}).Preload("Product").Preload("Features").Preload("Prices")

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
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
func (s *TenantService) UpdatePlan(id uint, req *UpdatePlanRequest) (*model.Plan, error) {
	var plan model.Plan
	query := s.db.Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&plan).Error; err != nil {
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
		return nil, fmt.Errorf("更新套餐失败: %w", err)
	}

	return &plan, nil
}

// DeletePlan 删除套餐（软删除）
func (s *TenantService) DeletePlan(id uint) error {
	query := s.db.Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.Delete(&model.Plan{}).Error; err != nil {
		return fmt.Errorf("删除套餐失败: %w", err)
	}
	return nil
}

// ========== 定价管理 ==========

// CreatePrice 创建定价
func (s *TenantService) CreatePrice(req *CreatePriceRequest) (*model.Price, error) {
	// 检查套餐是否存在且属于当前租户
	var plan model.Plan
	planQuery := s.db.Where("id = ?", req.PlanID)
	if s.tenantID != nil {
		planQuery = planQuery.Where("tenant_id = ?", *s.tenantID)
	} else {
		planQuery = planQuery.Where("tenant_id IS NULL")
	}

	if err := planQuery.First(&plan).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("套餐不存在或无权限访问")
		}
		return nil, fmt.Errorf("查询套餐失败: %w", err)
	}

	billingInterval := req.BillingInterval
	if billingInterval == 0 {
		billingInterval = 1
	}

	price := &model.Price{
		TenantID:        s.tenantID,
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
func (s *TenantService) GetPrice(id uint) (*model.Price, error) {
	var price model.Price
	query := s.db.Preload("Plan.Product").Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&price).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("定价不存在")
		}
		return nil, fmt.Errorf("获取定价失败: %w", err)
	}

	return &price, nil
}

// ListPrices 获取定价列表
func (s *TenantService) ListPrices(req *ListPricesRequest) ([]*model.Price, int64, error) {
	var prices []*model.Price
	var total int64

	query := s.db.Model(&model.Price{}).Preload("Plan").Preload("Plan.Product")

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
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
func (s *TenantService) UpdatePrice(id uint, req *UpdatePriceRequest) (*model.Price, error) {
	var price model.Price
	query := s.db.Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&price).Error; err != nil {
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
func (s *TenantService) DeletePrice(id uint) error {
	query := s.db.Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.Delete(&model.Price{}).Error; err != nil {
		return fmt.Errorf("删除定价失败: %w", err)
	}
	return nil
}

// ========== 订阅管理 ==========

// CreateSubscription 创建订阅
func (s *TenantService) CreateSubscription(req *CreateSubscriptionRequest) (*model.Subscription, error) {
	// 检查价格是否存在且属于当前租户
	var price model.Price
	priceQuery := s.db.Where("id = ?", req.PriceID)
	if s.tenantID != nil {
		priceQuery = priceQuery.Where("tenant_id = ?", *s.tenantID)
	} else {
		priceQuery = priceQuery.Where("tenant_id IS NULL")
	}

	if err := priceQuery.First(&price).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("价格不存在或无权限访问")
		}
		return nil, fmt.Errorf("查询价格失败: %w", err)
	}

	now := time.Now()
	subscription := &model.Subscription{
		TenantID:           s.tenantID,
		UserID:             req.UserID,
		CurrentPriceID:     req.PriceID,
		Status:             model.SubscriptionStatusActive,
		StartAt:            now,
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   s.calculateNextBillingDate(now, price.BillingPeriod, price.BillingInterval),
		Metadata:           model.JSONB(req.Metadata),
	}

	if err := s.db.Create(subscription).Error; err != nil {
		return nil, fmt.Errorf("创建订阅失败: %w", err)
	}

	return subscription, nil
}

// GetSubscription 获取订阅详情
func (s *TenantService) GetSubscription(id uint, userID *uint) (*model.Subscription, error) {
	var subscription model.Subscription
	query := s.db.Preload("CurrentPrice.Plan.Product").Preload("Coupon").
		Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	// 如果指定了客户ID，则只返回该客户的订阅
	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	if err := query.First(&subscription).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("订阅不存在")
		}
		return nil, fmt.Errorf("获取订阅失败: %w", err)
	}

	return &subscription, nil
}

// ListSubscriptions 获取订阅列表
func (s *TenantService) ListSubscriptions(req *SubscriptionListRequest) ([]model.Subscription, int64, error) {
	var subscriptions []model.Subscription
	var total int64

	query := s.db.Model(&model.Subscription{}).
		Preload("CurrentPrice.Plan.Product").
		Preload("User").
		Preload("Coupon")

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
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

	// 计算总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页
	if req.Page > 0 && req.PageSize > 0 {
		offset := (req.Page - 1) * req.PageSize
		query = query.Offset(offset).Limit(req.PageSize)
	}

	if err := query.Find(&subscriptions).Error; err != nil {
		return nil, 0, err
	}

	return subscriptions, total, nil
}

// CancelSubscription 取消订阅
func (s *TenantService) CancelSubscription(id uint, userID *uint, req *CancelSubscriptionRequest) error {
	query := s.db.Model(&model.Subscription{}).Where("id = ?", id)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if userID != nil {
		query = query.Where("user_id = ?", *userID)
	}

	updates := map[string]interface{}{
		"status":     model.SubscriptionStatusCanceled,
		"updated_at": time.Now(),
	}

	if req.CancelAt != nil {
		updates["cancel_at"] = *req.CancelAt
	}

	if err := query.Updates(updates).Error; err != nil {
		return fmt.Errorf("取消订阅失败: %w", err)
	}

	return nil
}

// ========== 优惠券管理 ==========

// CreateCoupon 创建优惠券
func (s *TenantService) CreateCoupon(req *CreateCouponRequest) (*model.Coupon, error) {
	// 设置默认值
	duration := req.Duration
	if duration == "" {
		duration = model.CouponDurationOnce
	}

	isActive := true
	if req.IsActive != nil {
		isActive = *req.IsActive
	}

	coupon := &model.Coupon{
		TenantID:         s.tenantID,
		Code:             req.Code,
		Name:             req.Name,
		DiscountType:     req.DiscountType,
		DiscountValue:    req.DiscountValue,
		Duration:         duration,
		DurationInCycles: req.DurationInCycles,
		MaxRedemptions:   req.MaxRedemptions,
		ExpiresAt:        req.ExpiresAt,
		IsActive:         isActive,
		Metadata:         model.JSONB(req.Metadata),
	}

	if err := s.db.Select("*").Create(coupon).Error; err != nil {
		return nil, fmt.Errorf("创建优惠券失败: %w", err)
	}

	// 如果 IsActive 是 false，需要显式更新，因为 GORM 可能忽略零值
	if req.IsActive != nil && !*req.IsActive {
		if err := s.db.Model(coupon).Update("is_active", false).Error; err != nil {
			return nil, fmt.Errorf("更新优惠券状态失败: %w", err)
		}
	}

	return coupon, nil
}

// GetCoupon 获取优惠券详情
func (s *TenantService) GetCoupon(code string) (*model.Coupon, error) {
	var coupon model.Coupon
	query := s.db.Where("code = ?", code)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&coupon).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("优惠券不存在")
		}
		return nil, fmt.Errorf("获取优惠券失败: %w", err)
	}

	return &coupon, nil
}

// ListCoupons 获取优惠券列表
func (s *TenantService) ListCoupons(req *ListCouponsRequest) ([]*model.Coupon, int64, error) {
	var coupons []*model.Coupon
	var total int64

	query := s.db.Model(&model.Coupon{})

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	// 添加过滤条件
	if req.Code != nil && *req.Code != "" {
		query = query.Where("code ILIKE ?", "%"+*req.Code+"%")
	}

	if req.DiscountType != nil && *req.DiscountType != "" {
		query = query.Where("discount_type = ?", *req.DiscountType)
	}

	if req.IsActive != nil {
		query = query.Where("is_active = ?", *req.IsActive)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("获取优惠券总数失败: %w", err)
	}

	// 分页和排序
	offset := (req.Page - 1) * req.PageSize
	if err := query.Order("created_at DESC").
		Offset(offset).
		Limit(req.PageSize).
		Find(&coupons).Error; err != nil {
		return nil, 0, fmt.Errorf("获取优惠券列表失败: %w", err)
	}

	return coupons, total, nil
}

// UpdateCoupon 更新优惠券
func (s *TenantService) UpdateCoupon(code string, req *UpdateCouponRequest) (*model.Coupon, error) {
	var coupon model.Coupon
	query := s.db.Where("code = ?", code)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.First(&coupon).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("优惠券不存在")
		}
		return nil, fmt.Errorf("获取优惠券失败: %w", err)
	}

	// 构建更新数据
	updates := make(map[string]interface{})

	if req.Name != nil {
		updates["name"] = *req.Name
	}

	if req.DiscountValue != nil {
		updates["discount_value"] = *req.DiscountValue
	}

	if req.MaxRedemptions != nil {
		updates["max_redemptions"] = *req.MaxRedemptions
	}

	if req.ExpiresAt != nil {
		updates["expires_at"] = *req.ExpiresAt
	}

	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	if req.Metadata != nil {
		updates["metadata"] = model.JSONB(*req.Metadata)
	}

	// 执行更新
	if len(updates) > 0 {
		if err := s.db.Model(&coupon).Updates(updates).Error; err != nil {
			return nil, fmt.Errorf("更新优惠券失败: %w", err)
		}
	}

	// 重新获取更新后的数据
	if err := query.First(&coupon).Error; err != nil {
		return nil, fmt.Errorf("获取更新后的优惠券失败: %w", err)
	}

	return &coupon, nil
}

// DeleteCoupon 删除优惠券
func (s *TenantService) DeleteCoupon(code string) error {
	query := s.db.Where("code = ?", code)

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	// 检查优惠券是否存在
	var coupon model.Coupon
	if err := query.First(&coupon).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("优惠券不存在")
		}
		return fmt.Errorf("获取优惠券失败: %w", err)
	}

	// 检查是否有关联的订阅
	var subscriptionCount int64
	if err := s.db.Model(&model.Subscription{}).Where("coupon_id = ?", coupon.ID).Count(&subscriptionCount).Error; err != nil {
		return fmt.Errorf("检查关联订阅失败: %w", err)
	}

	if subscriptionCount > 0 {
		return fmt.Errorf("优惠券已被使用，无法删除")
	}

	// 执行删除
	if err := s.db.Delete(&coupon).Error; err != nil {
		return fmt.Errorf("删除优惠券失败: %w", err)
	}

	return nil
}

// ValidateCoupon 验证优惠券
func (s *TenantService) ValidateCoupon(code string) (*model.Coupon, error) {
	coupon, err := s.GetCoupon(code)
	if err != nil {
		return nil, err
	}

	// 检查优惠券是否激活
	if !coupon.IsActive {
		return nil, fmt.Errorf("优惠券已停用")
	}

	// 检查是否过期
	if coupon.ExpiresAt != nil && coupon.ExpiresAt.Before(time.Now()) {
		return nil, fmt.Errorf("优惠券已过期")
	}

	// 检查使用次数限制
	if coupon.MaxRedemptions != nil && coupon.RedeemedCount >= *coupon.MaxRedemptions {
		return nil, fmt.Errorf("优惠券已达到最大使用次数")
	}

	return coupon, nil
}

// ========== 账单管理 ==========

// CreateInvoice 创建账单
func (s *TenantService) CreateInvoice(req *CreateInvoiceRequest) (*model.Invoice, error) {
	// 计算总金额
	var totalCents int64
	for _, item := range req.Items {
		totalCents += item.AmountCents
	}

	invoice := &model.Invoice{
		TenantID:       s.tenantID,
		UserID:         req.UserID,
		SubscriptionID: req.SubscriptionID,
		Status:         model.InvoiceStatusDraft,
		Currency:       req.Currency,
		TotalCents:     totalCents,
		DueAt:          req.DueAt,
		Metadata:       model.JSONB(req.Metadata),
	}

	if err := s.db.Create(invoice).Error; err != nil {
		return nil, fmt.Errorf("创建账单失败: %w", err)
	}

	return invoice, nil
}

// ListInvoices 获取账单列表
func (s *TenantService) ListInvoices(req *InvoiceListRequest) ([]model.Invoice, int64, error) {
	var invoices []model.Invoice
	var total int64

	query := s.db.Model(&model.Invoice{}).
		Preload("User").
		Preload("Subscription")

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if req.UserID != nil {
		query = query.Where("user_id = ?", *req.UserID)
	}

	if req.SubscriptionID != nil {
		query = query.Where("subscription_id = ?", *req.SubscriptionID)
	}

	if req.Status != nil {
		query = query.Where("status = ?", *req.Status)
	}

	if req.Currency != nil {
		query = query.Where("currency = ?", *req.Currency)
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

	if err := query.Find(&invoices).Error; err != nil {
		return nil, 0, err
	}

	return invoices, total, nil
}

// ========== 辅助方法 ==========

// calculateNextBillingDate 计算下一个计费日期
func (s *TenantService) calculateNextBillingDate(startDate time.Time, period model.BillingPeriod, interval int) time.Time {
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

// GetTenantSubscriptionStats 获取租户订阅统计
func (s *TenantService) GetTenantSubscriptionStats() (*TenantSubscriptionStats, error) {
	var stats TenantSubscriptionStats

	// 查询订阅统计
	var subscriptionCounts []struct {
		Status string `json:"status"`
		Count  int64  `json:"count"`
	}

	query := s.db.Model(&model.Subscription{}).
		Select("status, COUNT(*) as count").
		Group("status")

	// 添加租户过滤
	if s.tenantID != nil {
		query = query.Where("tenant_id = ?", *s.tenantID)
	} else {
		query = query.Where("tenant_id IS NULL")
	}

	if err := query.Find(&subscriptionCounts).Error; err != nil {
		return nil, fmt.Errorf("查询订阅统计失败: %w", err)
	}

	// 处理统计结果
	for _, count := range subscriptionCounts {
		switch count.Status {
		case string(model.SubscriptionStatusActive):
			stats.ActiveSubscriptions = count.Count
		case string(model.SubscriptionStatusCanceled):
			stats.CanceledSubscriptions = count.Count
		case string(model.SubscriptionStatusPaused):
			stats.PausedSubscriptions = count.Count
		}
		stats.TotalSubscriptions += count.Count
	}

	// 查询客户数量
	userQuery := s.db.Model(&model.Subscription{}).
		Distinct("user_id")

	if s.tenantID != nil {
		userQuery = userQuery.Where("tenant_id = ?", *s.tenantID)
	} else {
		userQuery = userQuery.Where("tenant_id IS NULL")
	}

	if err := userQuery.Count(&stats.TotalUsers).Error; err != nil {
		return nil, fmt.Errorf("查询客户统计失败: %w", err)
	}

	// 查询月收入
	var monthlyRevenue struct {
		Revenue int64 `json:"revenue"`
	}

	revenueQuery := s.db.Model(&model.Subscription{}).
		Select("COALESCE(SUM(p.amount_cents), 0) as revenue").
		Joins("JOIN market_prices p ON market_subscriptions.current_price_id = p.id").
		Where("market_subscriptions.status = ? AND p.billing_period = ?",
			model.SubscriptionStatusActive, model.BillingPeriodMonth)

	if s.tenantID != nil {
		revenueQuery = revenueQuery.Where("market_subscriptions.tenant_id = ?", *s.tenantID)
	} else {
		revenueQuery = revenueQuery.Where("market_subscriptions.tenant_id IS NULL")
	}

	if err := revenueQuery.Find(&monthlyRevenue).Error; err != nil {
		return nil, fmt.Errorf("查询收入统计失败: %w", err)
	}

	stats.MonthlyRevenueCents = monthlyRevenue.Revenue

	return &stats, nil
}

// TenantSubscriptionStats 租户订阅统计
type TenantSubscriptionStats struct {
	TotalSubscriptions    int64 `json:"total_subscriptions"`
	ActiveSubscriptions   int64 `json:"active_subscriptions"`
	CanceledSubscriptions int64 `json:"canceled_subscriptions"`
	PausedSubscriptions   int64 `json:"paused_subscriptions"`
	TotalUsers            int64 `json:"total_users"`
	MonthlyRevenueCents   int64 `json:"monthly_revenue_cents"`
}
