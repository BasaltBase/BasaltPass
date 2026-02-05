# 数据库表重命名迁移指南

## 概述

此迁移将以下数据库表添加 `market_` 前缀：

- `products` → `market_products`
- `plans` → `market_plans`
- `plan_features` → `market_plan_features`
- `prices` → `market_prices`
- `subscriptions` → `market_subscriptions`
- `subscription_items` → `market_subscription_items`
- `usage_records` → `market_usage_records`
- `subscription_events` → `market_subscription_events`
- `invoices` → `market_invoices`
- `invoice_items` → `market_invoice_items`
- `price_templates` → `market_price_templates`
- `product_categories` → `market_product_categories`
- `product_tags` → `market_product_tags`

## 代码更改

已在模型文件中为以下模型添加了 `TableName()` 方法：

- `Product`
- `Plan`
- `PlanFeature`
- `Price`
- `Subscription`
- `SubscriptionItem`
- `UsageRecord`
- `SubscriptionEvent`
- `Invoice`
- `InvoiceItem`
- `PriceTemplate`
- `ProductCategory`
- `ProductTag`

同时更新了 `internal/handler/s2s/commerce_handler.go` 中的直接表引用。

## 迁移现有数据库

### 方法1: 使用Go迁移工具（推荐）

```bash
cd basaltpass-backend
go run migrate_market_tables.go [数据库路径]
```

如果不指定路径，默认使用 `basaltpass.db`。

### 方法2: 使用Shell脚本

```bash
cd basaltpass-backend
./scripts/migrate_market_tables.sh [数据库路径]
```

### 方法3: 手动使用SQLite命令

```bash
sqlite3 basaltpass.db << EOF
ALTER TABLE products RENAME TO market_products;
ALTER TABLE plans RENAME TO market_plans;
ALTER TABLE plan_features RENAME TO market_plan_features;
ALTER TABLE prices RENAME TO market_prices;
ALTER TABLE subscriptions RENAME TO market_subscriptions;
ALTER TABLE subscription_items RENAME TO market_subscription_items;
ALTER TABLE usage_records RENAME TO market_usage_records;
ALTER TABLE subscription_events RENAME TO market_subscription_events;
ALTER TABLE invoices RENAME TO market_invoices;
ALTER TABLE invoice_items RENAME TO market_invoice_items;
ALTER TABLE price_templates RENAME TO market_price_templates;
ALTER TABLE product_categories RENAME TO market_product_categories;
ALTER TABLE product_tags RENAME TO market_product_tags;
EOF
```

## 新数据库

对于新的数据库安装，GORM会自动使用新的表名创建表。只需运行正常的迁移流程：

```bash
cd basaltpass-backend
go run cmd/basaltpass/main.go
```

## 备份

**重要**: 所有迁移工具都会在执行前自动创建数据库备份，备份文件命名格式为：
```
basaltpass.db.backup.YYYYMMDD_HHMMSS
```

## 回滚

如果迁移出现问题，可以从备份恢复：

```bash
cp basaltpass.db.backup.YYYYMMDD_HHMMSS basaltpass.db
```

## 验证迁移

迁移完成后，可以检查表是否正确重命名：

```bash
sqlite3 basaltpass.db ".tables" | grep market
```

应该看到所有带 `market_` 前缀的新表名。

## 注意事项

1. 迁移前请确保应用程序已停止运行
2. 迁移过程会自动创建备份
3. 如果表已经存在新名称，迁移工具会跳过
4. 迁移是原子性的 - 如果任何步骤失败，会自动回滚

## 影响范围

此更改影响：
- 数据库表名
- GORM模型定义
- 直接SQL查询（已在 `commerce_handler.go` 中更新）

不影响：
- API接口
- 前端代码
- 业务逻辑

## 后续步骤

迁移完成后：
1. 重启应用程序
2. 验证所有订阅相关功能正常工作
3. 可以删除旧的备份文件（如果确认一切正常）
