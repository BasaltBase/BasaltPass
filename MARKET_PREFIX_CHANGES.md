# Market表前缀迁移 - 更改总结

## 修改文件列表

### 1. 模型定义 (已修改)
- `basaltpass-backend/internal/model/subscription_models.go`
  - 为 8 个模型添加了 `TableName()` 方法

### 2. 处理器 (已修改)
- `basaltpass-backend/internal/handler/s2s/commerce_handler.go`
  - 更新了所有直接的SQL表引用

### 3. 迁移工具 (新增)
- `basaltpass-backend/migrate_market_tables.go` - Go语言迁移工具
- `basaltpass-backend/scripts/migrate_market_tables.sh` - Shell脚本迁移工具
- `basaltpass-backend/MARKET_TABLE_MIGRATION.md` - 迁移指南

## 修改的模型和表名

| 模型 | 旧表名 | 新表名 |
|------|--------|--------|
| Product | products | market_products |
| Plan | plans | market_plans |
| PlanFeature | plan_features | market_plan_features |
| Price | prices | market_prices |
| Subscription | subscriptions | market_subscriptions |
| SubscriptionItem | subscription_items | market_subscription_items |
| UsageRecord | usage_records | market_usage_records |
| SubscriptionEvent | subscription_events | market_subscription_events |
| Invoice | invoices | market_invoices |
| InvoiceItem | invoice_items | market_invoice_items |
| PriceTemplate | price_templates | market_price_templates |
| ProductCategory | product_categories | market_product_categories |
| ProductTag | product_tags | market_product_tags |

## 技术细节

### TableName() 方法实现

每个模型都添加了以下格式的方法：

```go
func (ModelName) TableName() string {
    return "market_table_name"
}
```

这告诉GORM使用自定义表名而不是默认的复数形式。

### 直接SQL查询更新

在 `commerce_handler.go` 中更新了以下JOIN查询：
- `subscriptions` → `market_subscriptions`
- `prices` → `market_prices`
- `plans` → `market_plans`
- `products` → `market_products`

## 测试验证

✅ 后端代码编译成功
✅ 迁移工具编译成功
✅ 所有TableName方法正确返回market_前缀的表名

## 迁移步骤 (针对现有数据库)

1. **停止应用程序**
   ```bash
   # 停止正在运行的后端服务
   ```

2. **运行迁移 (三选一)**
   
   选项A: Go迁移工具 (推荐)
   ```bash
   cd basaltpass-backend
   go run migrate_market_tables.go
   ```
   
   选项B: Shell脚本
   ```bash
   cd basaltpass-backend
   ./scripts/migrate_market_tables.sh
   ```
   
   选项C: 直接SQL
   ```bash
   sqlite3 basaltpass.db < migration_script.sql
   ```

3. **启动应用程序**
   ```bash
   cd basaltpass-backend
   go run cmd/basaltpass/main.go
   ```

4. **验证迁移**
   ```bash
   sqlite3 basaltpass.db ".tables" | grep market
   ```

## 重要提示

⚠️ **备份**: 所有迁移工具都会自动创建数据库备份

⚠️ **原子性**: 如果迁移失败，会自动回滚

⚠️ **幂等性**: 可以安全地多次运行迁移工具

## 影响范围

### ✅ 不影响的部分
- API接口 (对外保持不变)
- 前端代码
- 业务逻辑
- 数据内容

### ⚙️ 影响的部分
- 数据库表名
- GORM模型到表的映射
- 直接SQL查询 (已更新)

## 后续维护

- 新表将自动使用market_前缀
- 不需要额外配置
- GORM会自动处理外键关系

## 回滚方案

如需回滚，使用自动创建的备份：

```bash
cp basaltpass.db.backup.YYYYMMDD_HHMMSS basaltpass.db
```

并撤销代码更改：

```bash
git checkout -- basaltpass-backend/internal/model/subscription_models.go
git checkout -- basaltpass-backend/internal/handler/s2s/commerce_handler.go
```

---

完成时间: 2026-02-04
修改者: GitHub Copilot
