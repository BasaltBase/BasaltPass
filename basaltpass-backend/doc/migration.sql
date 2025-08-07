-- ========================================================================
-- BasaltPass 订阅系统 PostgreSQL/MySQL DDL
-- ========================================================================

-- ========== 基础扩展（PostgreSQL） ==========
-- 仅对 PostgreSQL 有效
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========== 产品 & 套餐 ==========

-- 产品表
CREATE TABLE products (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NULL,
    code              VARCHAR(64) UNIQUE NOT NULL,
    name              VARCHAR(255) NOT NULL,
    description       TEXT NULL,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    effective_at      TIMESTAMP NULL,
    deprecated_at     TIMESTAMP NULL,
    deleted_at        TIMESTAMP NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 产品表索引
CREATE INDEX idx_products_tenant_id ON products(tenant_id);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_effective_at ON products(effective_at);

-- 套餐表
CREATE TABLE plans (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NULL,
    product_id        BIGINT NOT NULL,
    code              VARCHAR(64) NOT NULL,
    display_name      VARCHAR(255) NOT NULL,
    plan_version      INT NOT NULL DEFAULT 1,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    effective_at      TIMESTAMP NULL,
    deprecated_at     TIMESTAMP NULL,
    deleted_at        TIMESTAMP NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_plans_product FOREIGN KEY (product_id) REFERENCES products(id),
    CONSTRAINT uk_plans_product_code_version UNIQUE (product_id, code, plan_version)
);

-- 套餐表索引
CREATE INDEX idx_plans_tenant_id ON plans(tenant_id);
CREATE INDEX idx_plans_product_id ON plans(product_id);
CREATE INDEX idx_plans_deleted_at ON plans(deleted_at);

-- 套餐功能特性表
CREATE TABLE plan_features (
    id                BIGSERIAL PRIMARY KEY,
    plan_id           BIGINT NOT NULL,
    feature_key       VARCHAR(128) NOT NULL,
    value_numeric     DECIMAL(30,10) NULL,
    value_text        VARCHAR(255) NULL,
    unit              VARCHAR(32) NULL,
    is_unlimited      BOOLEAN NOT NULL DEFAULT FALSE,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_plan_features_plan FOREIGN KEY (plan_id) REFERENCES plans(id),
    CONSTRAINT uk_plan_features_plan_key UNIQUE (plan_id, feature_key)
);

-- 套餐功能表索引
CREATE INDEX idx_plan_features_plan_id ON plan_features(plan_id);

-- ========== 定价 ==========

-- 定价表
CREATE TABLE prices (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NULL,
    plan_id           BIGINT NOT NULL,
    currency          CHAR(3) NOT NULL,
    amount_cents      BIGINT NOT NULL,
    billing_period    VARCHAR(20) NOT NULL CHECK (billing_period IN ('day','week','month','year','custom')),
    billing_interval  INT NOT NULL DEFAULT 1,
    trial_days        INT NULL,
    usage_type        VARCHAR(20) NOT NULL CHECK (usage_type IN ('license','metered','tiered')),
    billing_scheme    JSONB NULL,  -- MySQL 使用 JSON
    effective_at      TIMESTAMP NULL,
    deprecated_at     TIMESTAMP NULL,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_prices_plan FOREIGN KEY (plan_id) REFERENCES plans(id)
);

-- 定价表索引
CREATE INDEX idx_prices_tenant_id ON prices(tenant_id);
CREATE INDEX idx_prices_plan_id ON prices(plan_id);
CREATE INDEX idx_prices_currency ON prices(currency);
CREATE INDEX idx_prices_usage_type ON prices(usage_type);

-- 优惠券表
CREATE TABLE coupons (
    id                BIGSERIAL PRIMARY KEY,
    code              VARCHAR(64) UNIQUE NOT NULL,
    discount_type     VARCHAR(20) NOT NULL CHECK (discount_type IN ('percent','fixed')),
    value             DECIMAL(20,4) NOT NULL,
    duration          VARCHAR(20) NOT NULL CHECK (duration IN ('once','repeating','forever')),
    duration_in_cycles INT NULL,
    max_redemptions   INT NULL,
    redeemed_count    INT NOT NULL DEFAULT 0,
    expires_at        TIMESTAMP NULL,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 优惠券表索引
CREATE INDEX idx_coupons_expires_at ON coupons(expires_at);
CREATE INDEX idx_coupons_duration ON coupons(duration);

-- ========== 订阅 ==========

-- 订阅表（核心表）
CREATE TABLE subscriptions (
    id                      BIGSERIAL PRIMARY KEY,
    tenant_id               BIGINT NULL,
    user_id             BIGINT NOT NULL,  -- 对应 users.id
    status                  VARCHAR(20) NOT NULL CHECK (status IN ('trialing','active','paused','canceled','overdue')),
    current_price_id        BIGINT NOT NULL,
    next_price_id           BIGINT NULL,
    coupon_id               BIGINT NULL,
    start_at                TIMESTAMP NOT NULL,
    current_period_start    TIMESTAMP NOT NULL,
    current_period_end      TIMESTAMP NOT NULL,
    cancel_at               TIMESTAMP NULL,
    canceled_at             TIMESTAMP NULL,
    gateway_subscription_id VARCHAR(128) NULL,
    metadata                JSONB NULL,  -- MySQL 使用 JSON
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_subscriptions_current_price FOREIGN KEY (current_price_id) REFERENCES prices(id),
    CONSTRAINT fk_subscriptions_next_price FOREIGN KEY (next_price_id) REFERENCES prices(id),
    CONSTRAINT fk_subscriptions_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id)
);

-- 订阅表索引（关键查询优化）
CREATE INDEX idx_subscriptions_tenant_id ON subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_user_status ON subscriptions(user_id, status);  -- 关键复合索引
CREATE INDEX idx_subscriptions_current_price_id ON subscriptions(current_price_id);
CREATE INDEX idx_subscriptions_next_price_id ON subscriptions(next_price_id);
CREATE INDEX idx_subscriptions_coupon_id ON subscriptions(coupon_id);
CREATE INDEX idx_subscriptions_current_period_end ON subscriptions(current_period_end);  -- 续费查询
CREATE INDEX idx_subscriptions_gateway_id ON subscriptions(gateway_subscription_id);

-- 订阅项目表
CREATE TABLE subscription_items (
    id                BIGSERIAL PRIMARY KEY,
    subscription_id   BIGINT NOT NULL,
    price_id          BIGINT NOT NULL,
    quantity          DECIMAL(20,6) NOT NULL DEFAULT 1,
    metering          VARCHAR(20) NOT NULL CHECK (metering IN ('per_unit','volume')),
    usage_aggregation VARCHAR(30) NOT NULL DEFAULT 'sum' CHECK (usage_aggregation IN ('sum','max','last_during_period')),
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subscription_items_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id),
    CONSTRAINT fk_subscription_items_price FOREIGN KEY (price_id) REFERENCES prices(id)
);

-- 订阅项目表索引
CREATE INDEX idx_subscription_items_subscription_id ON subscription_items(subscription_id);
CREATE INDEX idx_subscription_items_price_id ON subscription_items(price_id);

-- ========== 使用记录表（按月分区）==========

-- PostgreSQL 分区方案
-- 主表
CREATE TABLE usage_records (
    id                      BIGSERIAL,
    subscription_item_id    BIGINT NOT NULL,
    ts                      TIMESTAMP NOT NULL,
    quantity                DECIMAL(20,6) NOT NULL,
    source                  VARCHAR(64) NULL,
    idempotency_key         VARCHAR(128) NULL,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_usage_records_subscription_item FOREIGN KEY (subscription_item_id) REFERENCES subscription_items(id)
) PARTITION BY RANGE (ts);

-- 创建月度分区表示例（需要定期创建新分区）
CREATE TABLE usage_records_202401 PARTITION OF usage_records
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE usage_records_202402 PARTITION OF usage_records
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 使用记录表索引
CREATE INDEX idx_usage_records_subscription_item_ts ON usage_records(subscription_item_id, ts);
CREATE INDEX idx_usage_records_ts ON usage_records(ts);
CREATE UNIQUE INDEX idx_usage_records_idempotency ON usage_records(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ========== 订阅事件表（按月分区）==========

-- 订阅事件表
CREATE TABLE subscription_events (
    id                BIGSERIAL,
    subscription_id   BIGINT NOT NULL,
    event_type        VARCHAR(64) NOT NULL,
    data              JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_subscription_events_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
) PARTITION BY RANGE (created_at);

-- 创建月度分区表示例
CREATE TABLE subscription_events_202401 PARTITION OF subscription_events
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');

CREATE TABLE subscription_events_202402 PARTITION OF subscription_events
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');

-- 订阅事件表索引
CREATE INDEX idx_subscription_events_subscription_created ON subscription_events(subscription_id, created_at);
CREATE INDEX idx_subscription_events_type ON subscription_events(event_type);

-- ========== 账单&支付 ==========

-- 账单表
CREATE TABLE invoices (
    id                BIGSERIAL PRIMARY KEY,
    tenant_id         BIGINT NULL,
    user_id       BIGINT NOT NULL,
    subscription_id   BIGINT NULL,
    status            VARCHAR(20) NOT NULL CHECK (status IN ('draft','posted','paid','void','uncollectible')),
    currency          CHAR(3) NOT NULL,
    total_cents       BIGINT NOT NULL DEFAULT 0,
    due_at            TIMESTAMP NULL,
    posted_at         TIMESTAMP NULL,
    paid_at           TIMESTAMP NULL,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_invoices_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_invoices_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id)
);

-- 账单表索引
CREATE INDEX idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_subscription_id ON invoices(subscription_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_at ON invoices(due_at);

-- 账单项目表
CREATE TABLE invoice_items (
    id                BIGSERIAL PRIMARY KEY,
    invoice_id        BIGINT NOT NULL,
    price_id          BIGINT NULL,
    description       VARCHAR(255) NULL,
    quantity          DECIMAL(20,6) NOT NULL DEFAULT 1,
    amount_cents      BIGINT NOT NULL,
    metadata          JSONB NULL,  -- MySQL 使用 JSON
    created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_invoice_items_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    CONSTRAINT fk_invoice_items_price FOREIGN KEY (price_id) REFERENCES prices(id)
);

-- 账单项目表索引
CREATE INDEX idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX idx_invoice_items_price_id ON invoice_items(price_id);

-- 支付表
CREATE TABLE payments (
    id                        BIGSERIAL PRIMARY KEY,
    tenant_id                 BIGINT NULL,
    invoice_id                BIGINT NOT NULL,
    amount_cents              BIGINT NOT NULL,
    currency                  CHAR(3) NOT NULL,
    status                    VARCHAR(30) NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded','partially_refunded')),
    gateway                   VARCHAR(64) NULL,
    gateway_payment_intent_id VARCHAR(128) NULL,
    idempotency_key           VARCHAR(128) NULL,
    metadata                  JSONB NULL,  -- MySQL 使用 JSON
    created_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

-- 支付表索引
CREATE INDEX idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX idx_payments_invoice_id ON payments(invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_gateway ON payments(gateway);
CREATE UNIQUE INDEX idx_payments_idempotency ON payments(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- ========== 自动分区管理（PostgreSQL 示例）==========

-- 创建分区管理函数
CREATE OR REPLACE FUNCTION create_monthly_partitions(table_name text, start_date date, num_months int)
RETURNS void AS $$
DECLARE
    partition_name text;
    start_month date;
    end_month date;
    i int;
BEGIN
    FOR i IN 0..num_months-1 LOOP
        start_month := date_trunc('month', start_date) + (i || ' months')::interval;
        end_month := start_month + '1 month'::interval;
        partition_name := table_name || '_' || to_char(start_month, 'YYYYMM');
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %s PARTITION OF %s FOR VALUES FROM (%L) TO (%L)',
                       partition_name, table_name, start_month, end_month);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 自动创建未来6个月的分区
-- SELECT create_monthly_partitions('usage_records', current_date, 6);
-- SELECT create_monthly_partitions('subscription_events', current_date, 6);

-- ========== MySQL 替代方案（如果使用 MySQL）==========

-- MySQL 不支持声明式分区的外键，需要使用触发器或应用层保证一致性
-- 
-- 创建按月分区的示例（MySQL 8.0+）：
-- ALTER TABLE usage_records PARTITION BY RANGE (UNIX_TIMESTAMP(ts)) (
--     PARTITION p202401 VALUES LESS THAN (UNIX_TIMESTAMP('2024-02-01')),
--     PARTITION p202402 VALUES LESS THAN (UNIX_TIMESTAMP('2024-03-01')),
--     ...
-- );

-- ========== 性能优化建议 ==========

-- 1. 定期清理过期分区
-- 2. 为高频查询创建覆盖索引
-- 3. 使用连接池和读写分离
-- 4. 考虑对历史数据进行归档

-- ========== 数据完整性约束 ==========

-- 添加业务逻辑约束
ALTER TABLE subscriptions ADD CONSTRAINT chk_subscription_period 
    CHECK (current_period_start <= current_period_end);

ALTER TABLE subscriptions ADD CONSTRAINT chk_subscription_dates 
    CHECK (start_at <= current_period_start);

-- 确保取消相关字段的一致性
ALTER TABLE subscriptions ADD CONSTRAINT chk_cancel_dates 
    CHECK ((cancel_at IS NULL AND canceled_at IS NULL) OR 
           (cancel_at IS NOT NULL AND canceled_at IS NOT NULL AND canceled_at >= cancel_at)); 