#!/bin/bash
# 验证表名更改
# 此脚本验证GORM模型是否使用了正确的market_前缀表名

echo "验证Market前缀表名更改..."
echo "========================================"

cd "$(dirname "$0")"

# 创建临时测试数据库
TEST_DB="/tmp/test_market_tables.db"
rm -f "$TEST_DB"

echo "1. 创建测试数据库..."

# 创建一个简单的Go程序来初始化表
cat > /tmp/test_market_init.go << 'EOF'
package main

import (
	"fmt"
	"log"
	"basaltpass-backend/internal/model"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func main() {
	db, err := gorm.Open(sqlite.Open("/tmp/test_market_tables.db"), &gorm.Config{})
	if err != nil {
		log.Fatal(err)
	}

	// 自动迁移订阅相关表
	err = db.AutoMigrate(
		&model.Product{},
		&model.Plan{},
		&model.PlanFeature{},
		&model.Price{},
		&model.Subscription{},
		&model.SubscriptionItem{},
		&model.UsageRecord{},
		&model.SubscriptionEvent{},
	)
	if err != nil {
		log.Fatal(err)
	}

	fmt.Println("✓ 数据库初始化成功")
}
EOF

# 运行初始化
cd /workspaces/BasaltPass/basaltpass-backend
go run /tmp/test_market_init.go 2>&1 | grep -v "go:"

if [ $? -eq 0 ]; then
	echo "2. 检查表名..."
	echo ""
	
	TABLES=$(sqlite3 "$TEST_DB" ".tables" 2>/dev/null | tr ' ' '\n')
	
	EXPECTED_TABLES=(
		"market_products"
		"market_plans"
		"market_plan_features"
		"market_prices"
		"market_subscriptions"
		"market_subscription_items"
		"market_usage_records"
		"market_subscription_events"
	)
	
	ALL_OK=true
	
	for table in "${EXPECTED_TABLES[@]}"; do
		if echo "$TABLES" | grep -q "^${table}$"; then
			echo "  ✓ $table"
		else
			echo "  ✗ $table (未找到)"
			ALL_OK=false
		fi
	done
	
	echo ""
	
	# 检查旧表名是否还存在
	OLD_TABLES=("products" "plans" "plan_features" "prices" "subscriptions" "subscription_items" "usage_records" "subscription_events")
	
	for table in "${OLD_TABLES[@]}"; do
		if echo "$TABLES" | grep -q "^${table}$"; then
			echo "  ⚠ 警告: 旧表名 $table 仍然存在"
			ALL_OK=false
		fi
	done
	
	echo ""
	echo "========================================"
	if [ "$ALL_OK" = true ]; then
		echo "✓ 验证通过！所有表都使用market_前缀"
		rm -f "$TEST_DB" /tmp/test_market_init.go
		exit 0
	else
		echo "✗ 验证失败"
		echo "临时数据库保存在: $TEST_DB"
		exit 1
	fi
else
	echo "✗ 数据库初始化失败"
	exit 1
fi
