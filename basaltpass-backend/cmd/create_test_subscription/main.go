package main

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"fmt"
	"os"
	"strings"
)

func main() {
	db := common.DB()

	tenantCode := strings.TrimSpace(os.Getenv("TENANT_CODE"))
	if tenantCode == "" {
		tenantCode = "default"
	}

	var tenant model.Tenant
	err := db.Where("code = ?", tenantCode).First(&tenant).Error
	if err != nil {
		if err := db.Order("id asc").First(&tenant).Error; err != nil {
			panic(fmt.Errorf("failed to resolve tenant: %w", err))
		}
		fmt.Printf("tenant code '%s' not found, fallback to tenant '%s' (id=%d)\n", tenantCode, tenant.Code, tenant.ID)
	}

	tenantID := uint64(tenant.ID)
	fmt.Printf("using tenant: code=%s id=%d\n", tenant.Code, tenant.ID)

	product := model.Product{
		TenantID:    &tenantID,
		Code:        "stripe-test-product",
		Name:        "Stripe Test Product",
		Description: "Subscription product for Stripe checkout testing",
		IsActive:    true,
	}
	if err := db.Where("tenant_id = ? AND code = ?", tenantID, product.Code).FirstOrCreate(&product).Error; err != nil {
		panic(fmt.Errorf("failed to create/find product: %w", err))
	}

	plan := model.Plan{
		TenantID:    &tenantID,
		ProductID:   product.ID,
		Code:        "stripe-test-monthly",
		DisplayName: "Stripe Test Monthly",
		PlanVersion: 1,
	}
	if err := db.Where("tenant_id = ? AND code = ?", tenantID, plan.Code).FirstOrCreate(&plan).Error; err != nil {
		panic(fmt.Errorf("failed to create/find plan: %w", err))
	}

	price := model.Price{
		TenantID:        &tenantID,
		PlanID:          plan.ID,
		Currency:        "USD",
		AmountCents:     990,
		BillingPeriod:   model.BillingPeriodMonth,
		BillingInterval: 1,
		UsageType:       model.UsageTypeLicense,
	}
	if err := db.Where("tenant_id = ? AND plan_id = ? AND currency = ? AND amount_cents = ? AND billing_period = ? AND billing_interval = ? AND usage_type = ?",
		tenantID, plan.ID, price.Currency, price.AmountCents, price.BillingPeriod, price.BillingInterval, price.UsageType,
	).FirstOrCreate(&price).Error; err != nil {
		panic(fmt.Errorf("failed to create/find price: %w", err))
	}

	fmt.Println("test subscription resources ready")
	fmt.Printf("product_id=%d code=%s\n", product.ID, product.Code)
	fmt.Printf("plan_id=%d code=%s\n", plan.ID, plan.Code)
	fmt.Printf("price_id=%d amount_cents=%d currency=%s period=%s interval=%d\n", price.ID, price.AmountCents, price.Currency, price.BillingPeriod, price.BillingInterval)
}
