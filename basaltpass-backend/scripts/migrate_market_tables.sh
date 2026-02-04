#!/bin/bash
# 迁移脚本：将旧的表名重命名为带有market_前缀的新表名
# 使用方法: ./migrate_market_tables.sh [database_path]
# 如果不提供路径，默认使用 basaltpass.db

DB_PATH="${1:-basaltpass.db}"

echo "开始迁移数据库表名..."
echo "数据库路径: $DB_PATH"

# 检查数据库文件是否存在
if [ ! -f "$DB_PATH" ]; then
    echo "错误: 数据库文件 $DB_PATH 不存在"
    exit 1
fi

# 备份数据库
BACKUP_PATH="${DB_PATH}.backup.$(date +%Y%m%d_%H%M%S)"
echo "正在备份数据库到: $BACKUP_PATH"
cp "$DB_PATH" "$BACKUP_PATH"

# 重命名表
echo "正在重命名表..."

sqlite3 "$DB_PATH" << EOF
-- 重命名 products 表
ALTER TABLE products RENAME TO market_products;

-- 重命名 plans 表
ALTER TABLE plans RENAME TO market_plans;

-- 重命名 plan_features 表
ALTER TABLE plan_features RENAME TO market_plan_features;

-- 重命名 prices 表
ALTER TABLE prices RENAME TO market_prices;

-- 重命名 subscriptions 表
ALTER TABLE subscriptions RENAME TO market_subscriptions;

-- 重命名 subscription_items 表
ALTER TABLE subscription_items RENAME TO market_subscription_items;

-- 重命名 usage_records 表
ALTER TABLE usage_records RENAME TO market_usage_records;

-- 重命名 subscription_events 表
ALTER TABLE subscription_events RENAME TO market_subscription_events;

-- 重命名 invoices 表
ALTER TABLE invoices RENAME TO market_invoices;

-- 重命名 invoice_items 表
ALTER TABLE invoice_items RENAME TO market_invoice_items;

-- 重命名 price_templates 表
ALTER TABLE price_templates RENAME TO market_price_templates;

-- 重命名 product_categories 表
ALTER TABLE product_categories RENAME TO market_product_categories;

-- 重命名 product_tags 表
ALTER TABLE product_tags RENAME TO market_product_tags;

-- 重命名 product_tag_links 表
ALTER TABLE product_tag_links RENAME TO market_product_tag_links;

-- 重命名 orders 表
ALTER TABLE orders RENAME TO market_orders;

-- 重命名 coupons 表
ALTER TABLE coupons RENAME TO market_coupons;

-- 重命名 coupon_redemptions 表
ALTER TABLE coupon_redemptions RENAME TO market_coupon_redemptions;

-- 重命名 payments 表
ALTER TABLE payments RENAME TO market_payments;

-- 重命名 payment_intents 表
ALTER TABLE payment_intents RENAME TO market_payment_intents;

-- 重命名 payment_sessions 表
ALTER TABLE payment_sessions RENAME TO market_payment_sessions;

-- 重命名 payment_webhook_events 表
ALTER TABLE payment_webhook_events RENAME TO market_payment_webhook_events;

-- 重命名 currencies 表
ALTER TABLE currencies RENAME TO market_currencies;

-- 重命名 wallets 表
ALTER TABLE wallets RENAME TO market_wallets;

-- 重命名 wallet_txes 表
ALTER TABLE wallet_txes RENAME TO market_wallet_txes;
EOF

if [ $? -eq 0 ]; then
    echo "✓ 表重命名成功！"
    echo "✓ 备份已保存到: $BACKUP_PATH"
    echo ""
    echo "迁移完成！新的表名："
    echo "  - products -> market_products"
    echo "  - plans -> market_plans"
    echo "  - plan_features -> market_plan_features"
    echo "  - prices -> market_prices"
    echo "  - subscriptions -> market_subscriptions"
    echo "  - subscription_items -> market_subscription_items"
    echo "  - usage_records -> market_usage_records"
    echo "  - subscription_events -> market_subscription_events"
    echo "  - invoices -> market_invoices"
    echo "  - invoice_items -> market_invoice_items"
    echo "  - price_templates -> market_price_templates"
    echo "  - product_categories -> market_product_categories"
    echo "  - product_tags -> market_product_tags"
    echo "  - product_tag_links -> market_product_tag_links"
    echo "  - orders -> market_orders"
    echo "  - coupons -> market_coupons"
    echo "  - coupon_redemptions -> market_coupon_redemptions"
    echo "  - payments -> market_payments"
    echo "  - payment_intents -> market_payment_intents"
    echo "  - payment_sessions -> market_payment_sessions"
    echo "  - payment_webhook_events -> market_payment_webhook_events"
    echo "  - currencies -> market_currencies"
    echo "  - wallets -> market_wallets"
    echo "  - wallet_txes -> market_wallet_txes"
else
    echo "✗ 迁移失败，正在恢复备份..."
    cp "$BACKUP_PATH" "$DB_PATH"
    echo "数据库已恢复到迁移前的状态"
    exit 1
fi
