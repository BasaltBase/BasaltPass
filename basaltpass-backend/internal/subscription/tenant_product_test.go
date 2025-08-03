package subscription

import (
	"testing"

	"basaltpass-backend/internal/model"

	"github.com/stretchr/testify/assert"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// TestTenantProductService 测试租户产品服务
func TestTenantProductService(t *testing.T) {
	// 设置内存数据库用于测试
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	// 自动迁移
	err = db.AutoMigrate(&model.Product{}, &model.Plan{}, &model.PlanFeature{}, &model.Price{})
	assert.NoError(t, err)

	// 创建租户服务
	tenantID := uint64(1)
	service := NewTenantService(db, &tenantID)

	t.Run("CreateProduct", func(t *testing.T) {
		req := &CreateProductRequest{
			Code:        "TEST_PRODUCT",
			Name:        "测试产品",
			Description: "这是一个测试产品",
			Metadata: map[string]interface{}{
				"category": "test",
				"version":  "1.0",
			},
		}

		product, err := service.CreateProduct(req)
		assert.NoError(t, err)
		assert.Equal(t, "TEST_PRODUCT", product.Code)
		assert.Equal(t, "测试产品", product.Name)
		assert.Equal(t, "这是一个测试产品", product.Description)
		assert.Equal(t, &tenantID, product.TenantID)
		assert.NotNil(t, product.Metadata)
	})

	t.Run("GetProduct", func(t *testing.T) {
		// 首先获取刚创建的产品
		products, _, err := service.ListProducts(&ListProductsRequest{
			PaginationRequest: PaginationRequest{
				Page:     1,
				PageSize: 10,
			},
		})
		assert.NoError(t, err)
		assert.Len(t, products, 1)

		productID := products[0].ID

		product, err := service.GetProduct(productID)
		assert.NoError(t, err)
		assert.Equal(t, "TEST_PRODUCT", product.Code)
		assert.Equal(t, "测试产品", product.Name)
	})

	t.Run("ListProducts", func(t *testing.T) {
		// 创建更多测试产品
		service.CreateProduct(&CreateProductRequest{
			Code:        "TEST_PRODUCT_2",
			Name:        "测试产品2",
			Description: "这是第二个测试产品",
		})

		req := &ListProductsRequest{
			PaginationRequest: PaginationRequest{
				Page:     1,
				PageSize: 10,
			},
		}

		products, total, err := service.ListProducts(req)
		assert.NoError(t, err)
		assert.Equal(t, int64(2), total)
		assert.Len(t, products, 2)
	})

	t.Run("UpdateProduct", func(t *testing.T) {
		// 获取第一个产品
		products, _, err := service.ListProducts(&ListProductsRequest{
			PaginationRequest: PaginationRequest{
				Page:     1,
				PageSize: 1,
			},
		})
		assert.NoError(t, err)
		assert.Len(t, products, 1)

		productID := products[0].ID
		newName := "更新后的产品名称"
		newDescription := "更新后的产品描述"

		req := &UpdateProductRequest{
			Name:        &newName,
			Description: &newDescription,
		}

		product, err := service.UpdateProduct(productID, req)
		assert.NoError(t, err)
		assert.Equal(t, "更新后的产品名称", product.Name)
		assert.Equal(t, "更新后的产品描述", product.Description)
	})

	t.Run("DeleteProduct", func(t *testing.T) {
		// 获取第二个产品来删除
		products, _, err := service.ListProducts(&ListProductsRequest{
			PaginationRequest: PaginationRequest{
				Page:     1,
				PageSize: 10,
			},
		})
		assert.NoError(t, err)
		assert.Len(t, products, 2)

		productID := products[1].ID

		// 删除产品
		err = service.DeleteProduct(productID)
		assert.NoError(t, err)

		// 确认产品已被删除
		_, err = service.GetProduct(productID)
		assert.Error(t, err)
		assert.Contains(t, err.Error(), "产品不存在")
	})
}

// TestTenantProductIsolation 测试租户产品隔离
func TestTenantProductIsolation(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	assert.NoError(t, err)

	err = db.AutoMigrate(&model.Product{})
	assert.NoError(t, err)

	// 创建两个不同租户的服务
	tenant1ID := uint64(1)
	tenant2ID := uint64(2)
	service1 := NewTenantService(db, &tenant1ID)
	service2 := NewTenantService(db, &tenant2ID)

	// 租户1创建产品
	req1 := &CreateProductRequest{
		Code:        "TENANT1_PRODUCT",
		Name:        "租户1产品",
		Description: "租户1的产品",
	}
	product1, err := service1.CreateProduct(req1)
	assert.NoError(t, err)
	assert.Equal(t, &tenant1ID, product1.TenantID)

	// 租户2创建同名产品（应该允许，因为租户隔离）
	req2 := &CreateProductRequest{
		Code:        "TENANT1_PRODUCT", // 同样的代码
		Name:        "租户2产品",
		Description: "租户2的产品",
	}
	product2, err := service2.CreateProduct(req2)
	assert.NoError(t, err)
	assert.Equal(t, &tenant2ID, product2.TenantID)

	// 租户1不能访问租户2的产品
	_, err = service1.GetProduct(product2.ID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "产品不存在")

	// 租户2不能访问租户1的产品
	_, err = service2.GetProduct(product1.ID)
	assert.Error(t, err)
	assert.Contains(t, err.Error(), "产品不存在")

	// 验证各自只能看到自己的产品列表
	products1, total1, err := service1.ListProducts(&ListProductsRequest{
		PaginationRequest: PaginationRequest{Page: 1, PageSize: 10},
	})
	assert.NoError(t, err)
	assert.Equal(t, int64(1), total1)
	assert.Len(t, products1, 1)
	assert.Equal(t, "租户1产品", products1[0].Name)

	products2, total2, err := service2.ListProducts(&ListProductsRequest{
		PaginationRequest: PaginationRequest{Page: 1, PageSize: 10},
	})
	assert.NoError(t, err)
	assert.Equal(t, int64(1), total2)
	assert.Len(t, products2, 1)
	assert.Equal(t, "租户2产品", products2[0].Name)
}
