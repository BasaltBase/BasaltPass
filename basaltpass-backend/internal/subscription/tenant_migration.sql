-- ========================================================================
-- BasaltPass 多租户订阅系统适配 DDL
-- ========================================================================

-- 此文件更新现有的订阅系统以支持多租户
-- 需要在现有 migration.sql 基础上执行

-- ========== 多租户适配：添加 tenant_id 和更新约束 ==========

-- 1. 产品表多租户适配
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_code_key;
ALTER TABLE products ADD CONSTRAINT uk_products_tenant_code UNIQUE (tenant_id, code);

-- 2. 套餐表多租户适配
ALTER TABLE plans DROP CONSTRAINT IF EXISTS uk_plans_product_code_version;
ALTER TABLE plans ADD CONSTRAINT uk_plans_tenant_product_code_version UNIQUE (tenant_id, product_id, code, plan_version);

-- 3. 定价表多租户适配
ALTER TABLE prices ADD CONSTRAINT uk_prices_tenant_plan_currency_period UNIQUE (tenant_id, plan_id, currency, billing_period, billing_interval);

-- 4. 优惠券表多租户适配
ALTER TABLE coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
ALTER TABLE coupons ADD CONSTRAINT uk_coupons_tenant_code UNIQUE (tenant_id, code);

-- 5. 订阅表多租户适配 - 关键索引优化
CREATE INDEX idx_subscriptions_tenant_user_status ON subscriptions(tenant_id, user_id, status);
CREATE INDEX idx_subscriptions_tenant_status ON subscriptions(tenant_id, status);
CREATE INDEX idx_subscriptions_tenant_current_period_end ON subscriptions(tenant_id, current_period_end);

-- 6. 账单表多租户适配
CREATE INDEX idx_invoices_tenant_user ON invoices(tenant_id, user_id);
CREATE INDEX idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX idx_invoices_tenant_due_at ON invoices(tenant_id, due_at);

-- 7. 支付表多租户适配
CREATE INDEX idx_payments_tenant_status ON payments(tenant_id, status);
CREATE INDEX idx_payments_tenant_created_at ON payments(tenant_id, created_at);

-- 8. 使用记录表多租户适配（如果分区表存在）
-- 注意：使用记录表通常按时间分区，tenant_id 应该是每个分区表的前缀索引
-- CREATE INDEX idx_usage_records_tenant_subscription_item ON usage_records(tenant_id, subscription_item_id);

-- 9. 外键约束更新 - 确保租户一致性
-- 这些约束确保跨表的租户一致性，但可能影响性能，根据需要启用

-- 产品和套餐的租户一致性
-- ALTER TABLE plans ADD CONSTRAINT chk_plans_tenant_consistency 
--   CHECK (tenant_id = (SELECT tenant_id FROM products WHERE id = product_id));

-- 套餐和定价的租户一致性  
-- ALTER TABLE prices ADD CONSTRAINT chk_prices_tenant_consistency
--   CHECK (tenant_id = (SELECT tenant_id FROM plans WHERE id = plan_id));

-- 订阅和价格的租户一致性
-- ALTER TABLE subscriptions ADD CONSTRAINT chk_subscriptions_price_tenant_consistency
--   CHECK (tenant_id = (SELECT p.tenant_id FROM prices p WHERE p.id = current_price_id));

-- 账单和订阅的租户一致性
-- ALTER TABLE invoices ADD CONSTRAINT chk_invoices_subscription_tenant_consistency
--   CHECK (tenant_id = (SELECT tenant_id FROM subscriptions WHERE id = subscription_id) OR subscription_id IS NULL);

-- ========== 数据视图 - 便于租户级查询 ==========

-- 租户产品概览视图
CREATE OR REPLACE VIEW tenant_products_overview AS
SELECT 
    p.tenant_id,
    p.id as product_id,
    p.code as product_code,
    p.name as product_name,
    COUNT(DISTINCT pl.id) as plans_count,
    COUNT(DISTINCT pr.id) as prices_count,
    COUNT(DISTINCT s.id) as active_subscriptions_count,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN plans pl ON p.id = pl.product_id AND p.tenant_id = pl.tenant_id
LEFT JOIN prices pr ON pl.id = pr.plan_id AND pl.tenant_id = pr.tenant_id
LEFT JOIN subscriptions s ON pr.id = s.current_price_id AND pr.tenant_id = s.tenant_id AND s.status = 'active'
WHERE p.deleted_at IS NULL
GROUP BY p.tenant_id, p.id, p.code, p.name, p.created_at, p.updated_at;

-- 租户订阅统计视图
CREATE OR REPLACE VIEW tenant_subscription_stats AS
SELECT 
    s.tenant_id,
    s.status,
    COUNT(*) as subscription_count,
    SUM(p.amount_cents) as total_mrr_cents,
    AVG(p.amount_cents) as avg_price_cents
FROM subscriptions s
JOIN prices p ON s.current_price_id = p.id
WHERE s.tenant_id = p.tenant_id
GROUP BY s.tenant_id, s.status;

-- 租户收入统计视图
CREATE OR REPLACE VIEW tenant_revenue_stats AS
SELECT 
    i.tenant_id,
    DATE_TRUNC('month', i.created_at) as month,
    i.currency,
    i.status,
    COUNT(*) as invoice_count,
    SUM(i.total_cents) as total_amount_cents
FROM invoices i
GROUP BY i.tenant_id, DATE_TRUNC('month', i.created_at), i.currency, i.status;

-- ========== 索引优化建议 ==========

-- 为高频查询创建复合索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tenant_price_status 
ON subscriptions(tenant_id, current_price_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_tenant_subscription_status 
ON invoices(tenant_id, subscription_id, status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payments_tenant_invoice_status 
ON payments(tenant_id, invoice_id, status);

-- 为时间查询优化
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscriptions_tenant_periods 
ON subscriptions(tenant_id, current_period_start, current_period_end);

-- ========== 租户级数据清理函数 ==========

-- 函数：清理租户的已删除数据（软删除转硬删除）
CREATE OR REPLACE FUNCTION cleanup_tenant_deleted_data(target_tenant_id BIGINT, older_than_days INT DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    temp_count INTEGER;
BEGIN
    -- 清理已软删除超过指定天数的产品
    DELETE FROM products 
    WHERE tenant_id = target_tenant_id 
      AND deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '1 day' * older_than_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    -- 清理已软删除超过指定天数的套餐
    DELETE FROM plans 
    WHERE tenant_id = target_tenant_id 
      AND deleted_at IS NOT NULL 
      AND deleted_at < NOW() - INTERVAL '1 day' * older_than_days;
    GET DIAGNOSTICS temp_count = ROW_COUNT;
    deleted_count := deleted_count + temp_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 函数：获取租户订阅统计
CREATE OR REPLACE FUNCTION get_tenant_subscription_summary(target_tenant_id BIGINT)
RETURNS TABLE (
    total_subscriptions BIGINT,
    active_subscriptions BIGINT,
    monthly_revenue_cents BIGINT,
    users_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_subscriptions,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_subscriptions,
        COALESCE(SUM(CASE WHEN status = 'active' AND p.billing_period = 'month' THEN p.amount_cents END), 0) as monthly_revenue_cents,
        COUNT(DISTINCT user_id) as users_count
    FROM subscriptions s
    LEFT JOIN prices p ON s.current_price_id = p.id
    WHERE s.tenant_id = target_tenant_id;
END;
$$ LANGUAGE plpgsql;

-- ========== 数据完整性验证查询 ==========

-- 查询：检查租户数据一致性
-- 使用这些查询来验证迁移后的数据完整性

-- 1. 检查产品和套餐的租户一致性
/*
SELECT 
    p.id as product_id,
    p.tenant_id as product_tenant_id,
    pl.id as plan_id,
    pl.tenant_id as plan_tenant_id,
    CASE WHEN p.tenant_id = pl.tenant_id THEN 'OK' ELSE 'MISMATCH' END as status
FROM products p
JOIN plans pl ON p.id = pl.product_id
WHERE p.tenant_id != pl.tenant_id OR (p.tenant_id IS NULL) != (pl.tenant_id IS NULL);
*/

-- 2. 检查套餐和定价的租户一致性
/*
SELECT 
    pl.id as plan_id,
    pl.tenant_id as plan_tenant_id,
    pr.id as price_id,
    pr.tenant_id as price_tenant_id,
    CASE WHEN pl.tenant_id = pr.tenant_id THEN 'OK' ELSE 'MISMATCH' END as status
FROM plans pl
JOIN prices pr ON pl.id = pr.plan_id
WHERE pl.tenant_id != pr.tenant_id OR (pl.tenant_id IS NULL) != (pr.tenant_id IS NULL);
*/

-- 3. 检查订阅和价格的租户一致性
/*
SELECT 
    s.id as subscription_id,
    s.tenant_id as subscription_tenant_id,
    pr.id as price_id,
    pr.tenant_id as price_tenant_id,
    CASE WHEN s.tenant_id = pr.tenant_id THEN 'OK' ELSE 'MISMATCH' END as status
FROM subscriptions s
JOIN prices pr ON s.current_price_id = pr.id
WHERE s.tenant_id != pr.tenant_id OR (s.tenant_id IS NULL) != (pr.tenant_id IS NULL);
*/

COMMENT ON TABLE products IS '产品表 - 支持多租户，每个租户可以有独立的产品目录';
COMMENT ON TABLE plans IS '套餐表 - 支持多租户，套餐属于特定租户的产品';
COMMENT ON TABLE prices IS '定价表 - 支持多租户，价格属于特定租户的套餐';
COMMENT ON TABLE coupons IS '优惠券表 - 支持多租户，优惠券在租户范围内唯一';
COMMENT ON TABLE subscriptions IS '订阅表 - 支持多租户，订阅隔离在租户范围内';
COMMENT ON TABLE invoices IS '账单表 - 支持多租户，账单属于特定租户';
COMMENT ON TABLE payments IS '支付表 - 支持多租户，支付记录隔离在租户范围内';
