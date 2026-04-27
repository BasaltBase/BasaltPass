package order

import (
	"testing"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupOrderServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.Product{},
		&model.Plan{},
		&model.Price{},
		&model.Coupon{},
		&model.PaymentIntent{},
		&model.PaymentSession{},
		&model.Order{},
	); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func createPriceForTenant(t *testing.T, db *gorm.DB, tenantID uint64, codeSuffix string, amount int64) model.Price {
	t.Helper()

	product := model.Product{
		TenantID: &tenantID,
		Code:     "prod-" + codeSuffix,
		Name:     "Product " + codeSuffix,
		IsActive: true,
	}
	if err := db.Create(&product).Error; err != nil {
		t.Fatalf("create product failed: %v", err)
	}

	plan := model.Plan{
		TenantID:    &tenantID,
		ProductID:   product.ID,
		Code:        "plan-" + codeSuffix,
		DisplayName: "Plan " + codeSuffix,
	}
	if err := db.Create(&plan).Error; err != nil {
		t.Fatalf("create plan failed: %v", err)
	}

	price := model.Price{
		TenantID:        &tenantID,
		PlanID:          plan.ID,
		Currency:        "USD",
		AmountCents:     amount,
		BillingPeriod:   model.BillingPeriodMonth,
		BillingInterval: 1,
		UsageType:       model.UsageTypeLicense,
	}
	if err := db.Create(&price).Error; err != nil {
		t.Fatalf("create price failed: %v", err)
	}

	return price
}

func TestOrderServiceTenantIsolation(t *testing.T) {
	db := setupOrderServiceTestDB(t)

	user := model.User{TenantID: 0, Email: "order-user@example.com", PasswordHash: "x"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	tenantA := uint64(111)
	tenantB := uint64(222)
	priceA := createPriceForTenant(t, db, tenantA, "a", 1000)
	priceB := createPriceForTenant(t, db, tenantB, "b", 2000)

	orderA := model.Order{
		OrderNumber:    "ORD-TENANT-A",
		UserID:         user.ID,
		PriceID:        priceA.ID,
		Status:         model.OrderStatusPending,
		Quantity:       1,
		BaseAmount:     1000,
		DiscountAmount: 0,
		TotalAmount:    1000,
		Currency:       "USD",
		Description:    "tenant-a-order",
		ExpiresAt:      time.Now().Add(30 * time.Minute),
	}
	orderB := model.Order{
		OrderNumber:    "ORD-TENANT-B",
		UserID:         user.ID,
		PriceID:        priceB.ID,
		Status:         model.OrderStatusPending,
		Quantity:       1,
		BaseAmount:     2000,
		DiscountAmount: 0,
		TotalAmount:    2000,
		Currency:       "USD",
		Description:    "tenant-b-order",
		ExpiresAt:      time.Now().Add(30 * time.Minute),
	}
	if err := db.Create(&orderA).Error; err != nil {
		t.Fatalf("create order A failed: %v", err)
	}
	if err := db.Create(&orderB).Error; err != nil {
		t.Fatalf("create order B failed: %v", err)
	}

	svc := NewOrderService(db)

	orders, err := svc.ListUserOrders(user.ID, 20, tenantA)
	if err != nil {
		t.Fatalf("list orders failed: %v", err)
	}
	if len(orders) != 1 {
		t.Fatalf("expected 1 order under tenant A, got %d", len(orders))
	}
	if orders[0].OrderNumber != orderA.OrderNumber {
		t.Fatalf("expected tenant A order %s, got %s", orderA.OrderNumber, orders[0].OrderNumber)
	}

	if _, err := svc.GetOrder(user.ID, orderB.ID, false, tenantA); err == nil {
		t.Fatalf("expected tenant-isolated get to reject tenant B order under tenant A context")
	}

	got, err := svc.GetOrder(user.ID, orderA.ID, false, tenantA)
	if err != nil {
		t.Fatalf("expected get order in matching tenant to succeed, got %v", err)
	}
	if got.OrderNumber != orderA.OrderNumber {
		t.Fatalf("unexpected order returned: %s", got.OrderNumber)
	}
}
