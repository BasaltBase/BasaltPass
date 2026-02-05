package migration

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"log"

	"gorm.io/gorm"
)

// MigrateWalletCurrencyField migrates existing wallet data from currency/currency_code to currency_id field
func MigrateWalletCurrencyField() {
	db := common.DB()

	// 确保 market_currencies 表存在且有数据
	if !db.Migrator().HasTable("market_currencies") {
		log.Println("[Migration] Currencies table doesn't exist, skipping wallet migration")
		return
	}

	// 检查是否有货币数据
	var currencyCount int64
	db.Model(&model.Currency{}).Count(&currencyCount)
	if currencyCount == 0 {
		log.Println("[Migration] No currencies found, skipping wallet migration")
		return
	}

	// 检查 market_wallets 表是否存在
	if !db.Migrator().HasTable("market_wallets") {
		log.Println("[Migration] Wallets table doesn't exist yet, skipping currency migration")
		return
	} // 检查是否存在旧的currency字段或currency_code字段
	hasCurrency := db.Migrator().HasColumn("wallets", "currency")
	hasCurrencyCode := db.Migrator().HasColumn("wallets", "currency_code")
	hasCurrencyID := db.Migrator().HasColumn("wallets", "currency_id")

	if !hasCurrency && !hasCurrencyCode {
		log.Println("[Migration] No old currency fields found in wallets table, skipping migration")
		return
	}

	if hasCurrencyID {
		log.Println("[Migration] currency_id field already exists, cleaning up old fields")
		dropOldCurrencyColumns(db, hasCurrency, hasCurrencyCode)
		return
	}

	log.Println("[Migration] Migrating wallet currency field to currency_id...")

	// 先添加 currency_id 字段（允许为空）
	if err := db.Exec("ALTER TABLE wallets ADD COLUMN currency_id INTEGER").Error; err != nil {
		log.Printf("[Migration] Failed to add currency_id column: %v", err)
		return
	}

	// 查询现有钱包记录
	var wallets []struct {
		ID           uint
		Currency     *string // 可能为空
		CurrencyCode *string // 可能为空
	}

	// 构建查询SQL
	var query string
	if hasCurrency && hasCurrencyCode {
		query = "SELECT id, currency, currency_code FROM market_wallets WHERE (currency IS NOT NULL AND currency != '') OR (currency_code IS NOT NULL AND currency_code != '')"
	} else if hasCurrency {
		query = "SELECT id, currency FROM market_wallets WHERE currency IS NOT NULL AND currency != ''"
	} else {
		query = "SELECT id, currency_code FROM market_wallets WHERE currency_code IS NOT NULL AND currency_code != ''"
	}

	if err := db.Raw(query).Scan(&wallets).Error; err != nil {
		log.Printf("[Migration] Failed to query existing wallet currency data: %v", err)
		return
	}

	if len(wallets) == 0 {
		log.Println("[Migration] No existing wallet data to migrate")
	} else {
		log.Printf("[Migration] Found %d wallet records to migrate", len(wallets))

		// 创建货币代码到ID的映射
		currencyMap := make(map[string]uint)
		var currencies []model.Currency
		db.Find(&currencies)
		for _, curr := range currencies {
			currencyMap[curr.Code] = curr.ID
		}

		// 更新每个钱包记录的currency_id字段
		migrated := 0
		for _, wallet := range wallets {
			var currencyCode string

			// 优先使用currency_code，如果没有则使用currency
			if wallet.CurrencyCode != nil && *wallet.CurrencyCode != "" {
				currencyCode = *wallet.CurrencyCode
			} else if wallet.Currency != nil && *wallet.Currency != "" {
				currencyCode = *wallet.Currency
			} else {
				continue
			}

			if currencyID, exists := currencyMap[currencyCode]; exists {
				if err := db.Exec("UPDATE market_wallets SET currency_id = ? WHERE id = ?", currencyID, wallet.ID).Error; err != nil {
					log.Printf("[Migration] Failed to update wallet %d: %v", wallet.ID, err)
				} else {
					migrated++
				}
			} else {
				// 如果找不到对应的货币，使用默认货币（USD）
				if defaultCurrencyID, exists := currencyMap["USD"]; exists {
					if err := db.Exec("UPDATE market_wallets SET currency_id = ? WHERE id = ?", defaultCurrencyID, wallet.ID).Error; err != nil {
						log.Printf("[Migration] Failed to update wallet %d with default currency: %v", wallet.ID, err)
					} else {
						migrated++
						log.Printf("[Migration] Wallet %d migrated to default currency (USD) from unknown currency '%s'", wallet.ID, currencyCode)
					}
				} else {
					log.Printf("[Migration] Currency code '%s' not found and no default currency available for wallet %d", currencyCode, wallet.ID)
				}
			}
		}

		log.Printf("[Migration] Successfully migrated %d wallet records", migrated)
	}

	// 现在设置 currency_id 为 NOT NULL
	if err := db.Exec("UPDATE market_wallets SET currency_id = (SELECT id FROM market_currencies WHERE code = 'USD' LIMIT 1) WHERE currency_id IS NULL").Error; err != nil {
		log.Printf("[Migration] Failed to set default currency for null records: %v", err)
	}

	// 删除旧的字段
	dropOldCurrencyColumns(db, hasCurrency, hasCurrencyCode)

	log.Println("[Migration] Wallet currency migration completed")
}

func dropOldCurrencyColumns(db *gorm.DB, hasCurrency, hasCurrencyCode bool) {
	if hasCurrency {
		if err := db.Migrator().DropColumn(&model.Wallet{}, "currency"); err != nil {
			log.Printf("[Migration] Failed to drop old currency column: %v", err)
		} else {
			log.Println("[Migration] Dropped old currency column")
		}
	}

	if hasCurrencyCode {
		if err := db.Migrator().DropColumn(&model.Wallet{}, "currency_code"); err != nil {
			log.Printf("[Migration] Failed to drop old currency_code column: %v", err)
		} else {
			log.Println("[Migration] Dropped old currency_code column")
		}
	}
}
