package subscription

import (
	"encoding/json"
	"testing"
	"time"

	"basaltpass-backend/internal/model"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestTenantCouponService 测试租户优惠券服务
func TestTenantCouponService(t *testing.T) {
	// 设置内存数据库用于测试
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 自动迁移
	err = db.AutoMigrate(&model.Coupon{}, &model.Subscription{})
	assert.NoError(t, err)

	// 创建租户服务
	tenantID := uint64(1)
	service := NewTenantService(db, &tenantID)

	t.Run("CreateCoupon", func(t *testing.T) {
		req := &CreateCouponRequest{
			Code:          "TEST20",
			Name:          "测试优惠券",
			DiscountType:  model.DiscountTypePercent,
			DiscountValue: 2000, // 20%
			Duration:      model.CouponDurationOnce,
		}

		coupon, err := service.CreateCoupon(req)
		assert.NoError(t, err)
		assert.Equal(t, "TEST20", coupon.Code)
		assert.Equal(t, "测试优惠券", coupon.Name)
		assert.Equal(t, model.DiscountTypePercent, coupon.DiscountType)
		assert.Equal(t, int64(2000), coupon.DiscountValue)
		assert.Equal(t, &tenantID, coupon.TenantID)
		assert.True(t, coupon.IsActive)
	})

	t.Run("GetCoupon", func(t *testing.T) {
		coupon, err := service.GetCoupon("TEST20")
		assert.NoError(t, err)
		assert.Equal(t, "TEST20", coupon.Code)
		assert.Equal(t, "测试优惠券", coupon.Name)
	})

	t.Run("ListCoupons", func(t *testing.T) {
		// 创建更多测试优惠券
		service.CreateCoupon(&CreateCouponRequest{
			Code:          "TEST30",
			Name:          "测试优惠券2",
			DiscountType:  model.DiscountTypeFixed,
			DiscountValue: 1000,
			Duration:      model.CouponDurationOnce,
		})

		req := &ListCouponsRequest{
			PaginationRequest: PaginationRequest{
				Page:     1,
				PageSize: 10,
			},
		}

		coupons, total, err := service.ListCoupons(req)
		assert.NoError(t, err)
		assert.Equal(t, int64(2), total)
		assert.Len(t, coupons, 2)
	})

	t.Run("UpdateCoupon", func(t *testing.T) {
		newName := "更新后的优惠券"
		newValue := int64(2500)

		req := &UpdateCouponRequest{
			Name:          &newName,
			DiscountValue: &newValue,
		}

		coupon, err := service.UpdateCoupon("TEST20", req)
		assert.NoError(t, err)
		assert.Equal(t, "更新后的优惠券", coupon.Name)
		assert.Equal(t, int64(2500), coupon.DiscountValue)
	})

	t.Run("ValidateCoupon", func(t *testing.T) {
		// 测试有效优惠券
		coupon, err := service.ValidateCoupon("TEST20")
		assert.NoError(t, err)
		assert.Equal(t, "TEST20", coupon.Code)

		// 测试无效优惠券（不存在）
		_, err = service.ValidateCoupon("INVALID")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "优惠券不存在")
	})

	t.Run("ValidateCouponExpired", func(t *testing.T) {
		// 创建已过期的优惠券
		expiredTime := time.Now().Add(-24 * time.Hour)
		service.CreateCoupon(&CreateCouponRequest{
			Code:          "EXPIRED",
			Name:          "过期优惠券",
			DiscountType:  model.DiscountTypePercent,
			DiscountValue: 1000,
			Duration:      model.CouponDurationOnce,
			ExpiresAt:     &expiredTime,
		})

		_, err := service.ValidateCoupon("EXPIRED")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "优惠券已过期")
	})

	t.Run("ValidateCouponInactive", func(t *testing.T) {
		// 创建未激活的优惠券
		isActive := false
		service.CreateCoupon(&CreateCouponRequest{
			Code:          "INACTIVE",
			Name:          "未激活优惠券",
			DiscountType:  model.DiscountTypePercent,
			DiscountValue: 1000,
			Duration:      model.CouponDurationOnce,
			IsActive:      &isActive,
		})

		_, err := service.ValidateCoupon("INACTIVE")
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "优惠券已停用")
	})

	t.Run("DeleteCoupon", func(t *testing.T) {
		// 删除未使用的优惠券
		err := service.DeleteCoupon("TEST30")
		assert.NoError(t, err)

		// 确认优惠券已被删除
		_, err = service.GetCoupon("TEST30")
		assert.Error(t, err)
	})
}

// TestCouponMetadata 测试优惠券元数据功能
func TestCouponMetadata(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	err = db.AutoMigrate(&model.Coupon{})
	assert.NoError(t, err)

	tenantID := uint64(1)
	service := NewTenantService(db, &tenantID)

	metadata := map[string]interface{}{
		"campaign":    "test_campaign",
		"description": "测试元数据",
		"tags":        []string{"promotion", "discount"},
		"settings": map[string]interface{}{
			"auto_apply": true,
			"priority":   1,
		},
	}

	req := &CreateCouponRequest{
		Code:          "META_TEST",
		Name:          "元数据测试优惠券",
		DiscountType:  model.DiscountTypePercent,
		DiscountValue: 1500,
		Duration:      model.CouponDurationOnce,
		Metadata:      metadata,
	}

	coupon, err := service.CreateCoupon(req)
	assert.NoError(t, err)

	// 验证元数据正确存储
	savedMetadata := map[string]interface{}(coupon.Metadata)
	assert.Equal(t, "test_campaign", savedMetadata["campaign"])
	assert.Equal(t, "测试元数据", savedMetadata["description"])

	// 测试元数据的JSON序列化
	jsonData, err := json.Marshal(coupon.Metadata)
	assert.NoError(t, err)
	assert.Contains(t, string(jsonData), "test_campaign")
}

// TestTenantIsolation 测试租户隔离
func TestTenantIsolation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	err = db.AutoMigrate(&model.Coupon{})
	assert.NoError(t, err)

	// 创建两个不同租户的服务
	tenant1ID := uint64(1)
	tenant2ID := uint64(2)
	service1 := NewTenantService(db, &tenant1ID)
	service2 := NewTenantService(db, &tenant2ID)

	// 租户1创建优惠券
	req1 := &CreateCouponRequest{
		Code:          "TENANT1",
		Name:          "租户1优惠券",
		DiscountType:  model.DiscountTypePercent,
		DiscountValue: 1000,
		Duration:      model.CouponDurationOnce,
	}
	coupon1, err := service1.CreateCoupon(req1)
	assert.NoError(t, err)
	assert.Equal(t, &tenant1ID, coupon1.TenantID)

	// 租户2创建同名优惠券（应该允许，因为租户隔离）
	req2 := &CreateCouponRequest{
		Code:          "TENANT1", // 同样的代码
		Name:          "租户2优惠券",
		DiscountType:  model.DiscountTypeFixed,
		DiscountValue: 500,
		Duration:      model.CouponDurationOnce,
	}
	coupon2, err := service2.CreateCoupon(req2)
	assert.NoError(t, err)
	assert.Equal(t, &tenant2ID, coupon2.TenantID)

	// 租户1不能访问租户2的优惠券
	_, err = service1.GetCoupon("TENANT1")
	assert.NoError(t, err) // 找到的是自己的优惠券

	// 验证获取的优惠券属于正确的租户
	coupon1Retrieved, err := service1.GetCoupon("TENANT1")
	assert.NoError(t, err)
	assert.Equal(t, "租户1优惠券", coupon1Retrieved.Name)

	coupon2Retrieved, err := service2.GetCoupon("TENANT1")
	assert.NoError(t, err)
	assert.Equal(t, "租户2优惠券", coupon2Retrieved.Name)
}
