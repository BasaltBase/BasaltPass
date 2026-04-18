package wallet

import (
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
)

func setupWalletServiceTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}

	if err := db.AutoMigrate(&model.User{}, &model.TenantUser{}, &model.Currency{}, &model.Wallet{}, &model.WalletTx{}); err != nil {
		t.Fatalf("auto migrate failed: %v", err)
	}

	common.SetDBForTest(db)
	return db
}

func TestWalletTenantIsolationByActiveTenant(t *testing.T) {
	db := setupWalletServiceTestDB(t)

	curr := model.Currency{Code: "USD", Name: "US Dollar", IsActive: true, DecimalPlaces: 2}
	if err := db.Create(&curr).Error; err != nil {
		t.Fatalf("create currency failed: %v", err)
	}

	user := model.User{TenantID: 0, Email: "wallet-user@example.com", PasswordHash: "x"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	tenantA := uint(101)
	tenantB := uint(202)
	memberships := []model.TenantUser{
		{UserID: user.ID, TenantID: tenantA, Role: model.TenantRoleMember},
		{UserID: user.ID, TenantID: tenantB, Role: model.TenantRoleMember},
	}
	if err := db.Create(&memberships).Error; err != nil {
		t.Fatalf("create memberships failed: %v", err)
	}

	walletA := model.Wallet{TenantID: tenantA, UserID: &user.ID, CurrencyID: &curr.ID, Balance: 1000}
	walletB := model.Wallet{TenantID: tenantB, UserID: &user.ID, CurrencyID: &curr.ID, Balance: 3000}
	if err := db.Create(&walletA).Error; err != nil {
		t.Fatalf("create tenant A wallet failed: %v", err)
	}
	if err := db.Create(&walletB).Error; err != nil {
		t.Fatalf("create tenant B wallet failed: %v", err)
	}

	wa, err := GetBalanceByCodeWithTenant(user.ID, tenantA, "USD")
	if err != nil {
		t.Fatalf("get tenant A balance failed: %v", err)
	}
	if wa.TenantID != tenantA || wa.Balance != 1000 {
		t.Fatalf("unexpected tenant A wallet: tenant=%d balance=%d", wa.TenantID, wa.Balance)
	}

	wb, err := GetBalanceByCodeWithTenant(user.ID, tenantB, "USD")
	if err != nil {
		t.Fatalf("get tenant B balance failed: %v", err)
	}
	if wb.TenantID != tenantB || wb.Balance != 3000 {
		t.Fatalf("unexpected tenant B wallet: tenant=%d balance=%d", wb.TenantID, wb.Balance)
	}

	if err := RechargeByCodeWithTenant(user.ID, tenantA, "USD", 250); err != nil {
		t.Fatalf("recharge tenant A wallet failed: %v", err)
	}

	var afterA model.Wallet
	if err := db.Where("id = ?", walletA.ID).First(&afterA).Error; err != nil {
		t.Fatalf("reload tenant A wallet failed: %v", err)
	}
	if afterA.Balance != 1250 {
		t.Fatalf("expected tenant A balance 1250, got %d", afterA.Balance)
	}

	var afterB model.Wallet
	if err := db.Where("id = ?", walletB.ID).First(&afterB).Error; err != nil {
		t.Fatalf("reload tenant B wallet failed: %v", err)
	}
	if afterB.Balance != 3000 {
		t.Fatalf("tenant B balance changed unexpectedly: %d", afterB.Balance)
	}
}
