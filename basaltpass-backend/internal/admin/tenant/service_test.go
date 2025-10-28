package tenant

import (
	"testing"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupTestAdminTenantService(t *testing.T) (*gorm.DB, *AdminTenantService) {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to create test database: %v", err)
	}

	err = db.AutoMigrate(
		&model.User{},
		&model.Tenant{},
		&model.TenantAdmin{},
		&model.App{},
		&model.AuditLog{},
		&model.Product{},
		&model.Plan{},
		&model.Price{},
		&model.Subscription{},
		&model.SubscriptionItem{},
		&model.UsageRecord{},
		&model.TenantUsageMetric{},
	)
	if err != nil {
		t.Fatalf("failed to migrate test database: %v", err)
	}

	return db, NewAdminTenantService(db)
}

func TestGetTenantStats_UsesMetricsTable(t *testing.T) {
	db, service := setupTestAdminTenantService(t)

	tenant := model.Tenant{
		Name:   "Acme",
		Code:   "acme",
		Plan:   model.TenantPlanPro,
		Status: model.TenantStatusActive,
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("failed to create tenant: %v", err)
	}

	periodStart := time.Date(time.Now().UTC().Year(), time.Now().UTC().Month(), 1, 0, 0, 0, 0, time.UTC)
	lastActive := periodStart.Add(48 * time.Hour)
	metric := model.TenantUsageMetric{
		TenantID:     tenant.ID,
		PeriodStart:  periodStart,
		StorageUsed:  2048,
		APICallCount: 321,
		LastActiveAt: &lastActive,
	}
	if err := db.Create(&metric).Error; err != nil {
		t.Fatalf("failed to create usage metric: %v", err)
	}

	stats, err := service.getTenantStats(tenant.ID)
	if err != nil {
		t.Fatalf("getTenantStats returned error: %v", err)
	}

	if stats.StorageUsed != 2048 {
		t.Fatalf("expected storage 2048, got %d", stats.StorageUsed)
	}
	if stats.APICallsThisMonth != 321 {
		t.Fatalf("expected api calls 321, got %d", stats.APICallsThisMonth)
	}
	if stats.LastActiveAt == nil || !stats.LastActiveAt.Equal(lastActive) {
		t.Fatalf("expected last active %v, got %v", lastActive, stats.LastActiveAt)
	}
}

func TestGetTenantStats_ComputesFallbackFromLogs(t *testing.T) {
	db, service := setupTestAdminTenantService(t)

	tenant := model.Tenant{
		Name:     "Fallback",
		Code:     "fallback",
		Metadata: model.JSONMap{"storage_used_mb": float64(512)},
	}
	if err := db.Create(&tenant).Error; err != nil {
		t.Fatalf("failed to create tenant: %v", err)
	}

	user := model.User{
		Email: "user@example.com",
	}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	admin := model.TenantAdmin{
		UserID:   user.ID,
		TenantID: tenant.ID,
	}
	if err := db.Create(&admin).Error; err != nil {
		t.Fatalf("failed to create tenant admin: %v", err)
	}

	auditTime := time.Now().UTC().Add(-2 * time.Hour)
	auditLog := model.AuditLog{
		Model:  gorm.Model{CreatedAt: auditTime},
		UserID: user.ID,
		Action: "login",
	}
	if err := db.Create(&auditLog).Error; err != nil {
		t.Fatalf("failed to create audit log: %v", err)
	}

	tenantID64 := uint64(tenant.ID)
	product := model.Product{
		Code: "prod",
		Name: "Product",
	}
	if err := db.Create(&product).Error; err != nil {
		t.Fatalf("failed to create product: %v", err)
	}

	plan := model.Plan{
		ProductID:   product.ID,
		Code:        "plan",
		DisplayName: "Plan",
		PlanVersion: 1,
	}
	if err := db.Create(&plan).Error; err != nil {
		t.Fatalf("failed to create plan: %v", err)
	}

	price := model.Price{
		PlanID:        plan.ID,
		Currency:      "CNY",
		AmountCents:   0,
		BillingPeriod: model.BillingPeriodMonth,
		UsageType:     model.UsageTypeMetered,
	}
	if err := db.Create(&price).Error; err != nil {
		t.Fatalf("failed to create price: %v", err)
	}

	now := time.Now().UTC()
	subscription := model.Subscription{
		TenantID:           &tenantID64,
		UserID:             user.ID,
		Status:             model.SubscriptionStatusActive,
		CurrentPriceID:     price.ID,
		StartAt:            now.Add(-24 * time.Hour),
		CurrentPeriodStart: now.Add(-24 * time.Hour),
		CurrentPeriodEnd:   now.Add(24 * time.Hour),
	}
	if err := db.Create(&subscription).Error; err != nil {
		t.Fatalf("failed to create subscription: %v", err)
	}

	item := model.SubscriptionItem{
		SubscriptionID: subscription.ID,
		PriceID:        price.ID,
		Quantity:       1,
		Metering:       model.MeteringPerUnit,
	}
	if err := db.Create(&item).Error; err != nil {
		t.Fatalf("failed to create subscription item: %v", err)
	}

	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	usageRecord := model.UsageRecord{
		SubscriptionItemID: item.ID,
		Ts:                 periodStart.Add(72 * time.Hour),
		Quantity:           99,
	}
	if err := db.Create(&usageRecord).Error; err != nil {
		t.Fatalf("failed to create usage record: %v", err)
	}

	stats, err := service.getTenantStats(tenant.ID)
	if err != nil {
		t.Fatalf("getTenantStats returned error: %v", err)
	}

	if stats.StorageUsed != 512 {
		t.Fatalf("expected fallback storage 512, got %d", stats.StorageUsed)
	}
	if stats.APICallsThisMonth != 99 {
		t.Fatalf("expected fallback api calls 99, got %d", stats.APICallsThisMonth)
	}
	if stats.LastActiveAt == nil {
		t.Fatalf("expected last active timestamp to be set")
	}
	if stats.LastActiveAt.Before(usageRecord.Ts) && !stats.LastActiveAt.Equal(usageRecord.Ts) {
		t.Fatalf("expected last active to be >= usage record time, got %v", stats.LastActiveAt)
	}

	var storedMetric model.TenantUsageMetric
	if err := db.Where("tenant_id = ?", tenant.ID).First(&storedMetric).Error; err != nil {
		t.Fatalf("expected tenant usage metric to be created: %v", err)
	}
	if storedMetric.StorageUsed != stats.StorageUsed {
		t.Fatalf("stored metric storage mismatch: expected %d, got %d", stats.StorageUsed, storedMetric.StorageUsed)
	}
	if storedMetric.APICallCount != stats.APICallsThisMonth {
		t.Fatalf("stored metric api calls mismatch: expected %d, got %d", stats.APICallsThisMonth, storedMetric.APICallCount)
	}
	if storedMetric.LastActiveAt == nil {
		t.Fatalf("stored metric last active should be set")
	}
}
