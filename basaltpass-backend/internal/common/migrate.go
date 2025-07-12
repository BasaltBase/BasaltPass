package common

import (
	"log"

	"basaltpass-backend/internal/model"
)

// RunMigrations performs GORM auto migration for all models.
func RunMigrations() {
	err := DB().AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		&model.Wallet{},
		&model.WalletTx{},
		&model.AuditLog{},
		&model.OAuthAccount{},
	)
	if err != nil {
		log.Fatalf("auto migration failed: %v", err)
	}
}
