package main

import (
	"fmt"
	"log"
	"os"
	"time"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	// 获取数据库路径
	dbPath := "basaltpass.db"
	if len(os.Args) > 1 {
		dbPath = os.Args[1]
	}

	fmt.Printf("开始迁移数据库表名...\n")
	fmt.Printf("数据库路径: %s\n", dbPath)

	// 检查数据库文件是否存在
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Fatalf("错误: 数据库文件 %s 不存在", dbPath)
	}

	// 创建备份
	backupPath := fmt.Sprintf("%s.backup.%s", dbPath, time.Now().Format("20060102_150405"))
	fmt.Printf("正在备份数据库到: %s\n", backupPath)

	input, err := os.ReadFile(dbPath)
	if err != nil {
		log.Fatalf("读取数据库文件失败: %v", err)
	}

	if err := os.WriteFile(backupPath, input, 0644); err != nil {
		log.Fatalf("创建备份失败: %v", err)
	}

	// 打开数据库连接
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatalf("打开数据库失败: %v", err)
	}

	// 表重命名映射
	tables := map[string]string{
		"products":               "market_products",
		"plans":                  "market_plans",
		"plan_features":          "market_plan_features",
		"prices":                 "market_prices",
		"subscriptions":          "market_subscriptions",
		"subscription_items":     "market_subscription_items",
		"usage_records":          "market_usage_records",
		"subscription_events":    "market_subscription_events",
		"invoices":               "market_invoices",
		"invoice_items":          "market_invoice_items",
		"price_templates":        "market_price_templates",
		"product_categories":     "market_product_categories",
		"product_tags":           "market_product_tags",
		"product_tag_links":      "market_product_tag_links",
		"orders":                 "market_orders",
		"coupons":                "market_coupons",
		"coupon_redemptions":     "market_coupon_redemptions",
		"payments":               "market_payments",
		"payment_intents":        "market_payment_intents",
		"payment_sessions":       "market_payment_sessions",
		"payment_webhook_events": "market_payment_webhook_events",
		"currencies":             "market_currencies",
		"wallets":                "market_wallets",
		"wallet_txes":            "market_wallet_txes",
	}

	fmt.Println("\n正在重命名表...")

	// 执行重命名
	for oldName, newName := range tables {
		// 检查旧表是否存在
		var count int64
		if err := db.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", oldName).Scan(&count).Error; err != nil {
			log.Printf("警告: 检查表 %s 时出错: %v", oldName, err)
			continue
		}

		if count == 0 {
			fmt.Printf("⊗ 表 %s 不存在，跳过\n", oldName)
			continue
		}

		// 检查新表是否已存在
		if err := db.Raw("SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?", newName).Scan(&count).Error; err != nil {
			log.Printf("警告: 检查表 %s 时出错: %v", newName, err)
			continue
		}

		if count > 0 {
			fmt.Printf("⊗ 表 %s 已存在，跳过重命名\n", newName)
			continue
		}

		// 执行重命名
		sql := fmt.Sprintf("ALTER TABLE %s RENAME TO %s", oldName, newName)
		if err := db.Exec(sql).Error; err != nil {
			log.Fatalf("✗ 重命名表 %s -> %s 失败: %v\n正在恢复备份...", oldName, newName, err)
			// 恢复备份
			backup, _ := os.ReadFile(backupPath)
			os.WriteFile(dbPath, backup, 0644)
			log.Fatal("数据库已恢复到迁移前的状态")
		}

		fmt.Printf("✓ %s -> %s\n", oldName, newName)
	}

	fmt.Println("\n✓ 表重命名成功！")
	fmt.Printf("✓ 备份已保存到: %s\n", backupPath)
	fmt.Println("\n迁移完成！新的表名：")
	for old, new := range tables {
		fmt.Printf("  - %s -> %s\n", old, new)
	}
}
