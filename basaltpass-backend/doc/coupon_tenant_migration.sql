-- ========================================================================
-- 优惠券表多租户支持迁移文件
-- ========================================================================

-- 为优惠券表添加tenant_id字段和相关约束

-- 1. 添加tenant_id字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'coupons' AND column_name = 'tenant_id'
    ) THEN
        ALTER TABLE coupons ADD COLUMN tenant_id BIGINT;
        CREATE INDEX idx_coupons_tenant_id ON coupons(tenant_id);
    END IF;
END $$;

-- 2. 更新唯一约束，从全局唯一改为租户内唯一
DO $$
BEGIN
    -- 删除旧的全局唯一约束（如果存在）
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'coupons_code_key' AND table_name = 'coupons'
    ) THEN
        ALTER TABLE coupons DROP CONSTRAINT coupons_code_key;
    END IF;

    -- 添加新的租户级唯一约束
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'uk_coupons_tenant_code' AND table_name = 'coupons'
    ) THEN
        ALTER TABLE coupons ADD CONSTRAINT uk_coupons_tenant_code UNIQUE (tenant_id, code);
    END IF;
END $$;

-- 3. 添加优惠券使用情况的索引优化
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_active ON coupons(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_expires ON coupons(tenant_id, expires_at);
CREATE INDEX IF NOT EXISTS idx_coupons_tenant_type ON coupons(tenant_id, discount_type);

-- 4. 创建优惠券统计视图
CREATE OR REPLACE VIEW tenant_coupon_stats AS
SELECT 
    c.tenant_id,
    COUNT(*) as total_coupons,
    COUNT(CASE WHEN c.is_active = true THEN 1 END) as active_coupons,
    COUNT(CASE WHEN c.expires_at IS NOT NULL AND c.expires_at < NOW() THEN 1 END) as expired_coupons,
    COUNT(CASE WHEN c.max_redemptions IS NOT NULL AND c.redeemed_count >= c.max_redemptions THEN 1 END) as exhausted_coupons,
    SUM(c.redeemed_count) as total_redemptions,
    AVG(c.discount_value) as avg_discount_value,
    COUNT(CASE WHEN c.discount_type = 'percent' THEN 1 END) as percent_coupons,
    COUNT(CASE WHEN c.discount_type = 'fixed' THEN 1 END) as fixed_coupons
FROM coupons c
WHERE c.deleted_at IS NULL
GROUP BY c.tenant_id;

-- 5. 创建优惠券使用明细视图（需要关联订阅表）
CREATE OR REPLACE VIEW tenant_coupon_usage AS
SELECT 
    c.tenant_id,
    c.id as coupon_id,
    c.code as coupon_code,
    c.name as coupon_name,
    c.discount_type,
    c.discount_value,
    c.redeemed_count,
    c.max_redemptions,
    COUNT(s.id) as subscription_count,
    SUM(COALESCE(p.amount_cents, 0)) as total_subscription_value,
    c.created_at as coupon_created_at
FROM coupons c
LEFT JOIN subscriptions s ON c.id = s.coupon_id AND c.tenant_id = s.tenant_id
LEFT JOIN prices p ON s.current_price_id = p.id
WHERE c.deleted_at IS NULL
GROUP BY c.tenant_id, c.id, c.code, c.name, c.discount_type, c.discount_value, 
         c.redeemed_count, c.max_redemptions, c.created_at;

-- 6. 创建用于清理过期优惠券的函数
CREATE OR REPLACE FUNCTION cleanup_expired_coupons(target_tenant_id BIGINT DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- 如果指定了租户ID，只清理该租户的过期优惠券
    IF target_tenant_id IS NOT NULL THEN
        UPDATE coupons 
        SET is_active = false 
        WHERE tenant_id = target_tenant_id 
          AND expires_at IS NOT NULL 
          AND expires_at < NOW() 
          AND is_active = true;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    ELSE
        -- 清理所有租户的过期优惠券
        UPDATE coupons 
        SET is_active = false 
        WHERE expires_at IS NOT NULL 
          AND expires_at < NOW() 
          AND is_active = true;
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
    END IF;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建优惠券使用记录更新函数
CREATE OR REPLACE FUNCTION update_coupon_redemption_count()
RETURNS TRIGGER AS $$
BEGIN
    -- 当订阅使用优惠券时，更新优惠券的使用次数
    IF NEW.coupon_id IS NOT NULL AND (OLD.coupon_id IS NULL OR OLD.coupon_id != NEW.coupon_id) THEN
        UPDATE coupons 
        SET redeemed_count = redeemed_count + 1 
        WHERE id = NEW.coupon_id;
    END IF;
    
    -- 当订阅取消优惠券时，减少优惠券的使用次数
    IF OLD.coupon_id IS NOT NULL AND (NEW.coupon_id IS NULL OR NEW.coupon_id != OLD.coupon_id) THEN
        UPDATE coupons 
        SET redeemed_count = GREATEST(0, redeemed_count - 1) 
        WHERE id = OLD.coupon_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. 创建触发器来自动更新优惠券使用次数
DROP TRIGGER IF EXISTS tr_update_coupon_redemption ON subscriptions;
CREATE TRIGGER tr_update_coupon_redemption
    BEFORE UPDATE OF coupon_id ON subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION update_coupon_redemption_count();

-- 9. 添加数据完整性检查
-- 创建函数来验证优惠券和订阅的租户一致性
CREATE OR REPLACE FUNCTION check_coupon_subscription_tenant_consistency()
RETURNS TABLE (
    subscription_id BIGINT,
    subscription_tenant_id BIGINT,
    coupon_id BIGINT,
    coupon_tenant_id BIGINT,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as subscription_id,
        s.tenant_id as subscription_tenant_id,
        c.id as coupon_id,
        c.tenant_id as coupon_tenant_id,
        CASE 
            WHEN s.tenant_id = c.tenant_id THEN 'OK'
            WHEN s.tenant_id IS NULL AND c.tenant_id IS NULL THEN 'OK'
            ELSE 'MISMATCH'
        END as status
    FROM subscriptions s
    JOIN coupons c ON s.coupon_id = c.id
    WHERE s.coupon_id IS NOT NULL
      AND (s.tenant_id != c.tenant_id OR (s.tenant_id IS NULL) != (c.tenant_id IS NULL));
END;
$$ LANGUAGE plpgsql;

-- 添加表注释
COMMENT ON COLUMN coupons.tenant_id IS '租户ID，NULL表示全局优惠券';
COMMENT ON CONSTRAINT uk_coupons_tenant_code ON coupons IS '优惠券代码在租户范围内唯一';
COMMENT ON VIEW tenant_coupon_stats IS '租户优惠券统计视图';
COMMENT ON VIEW tenant_coupon_usage IS '租户优惠券使用明细视图';
COMMENT ON FUNCTION cleanup_expired_coupons(BIGINT) IS '清理过期优惠券的函数';
COMMENT ON FUNCTION update_coupon_redemption_count() IS '自动更新优惠券使用次数的触发器函数';
