package common

import (
	"log"

	"basaltpass-backend/internal/model"
)

// 迁移数据库，自动迁移数据库表结构
// RunMigrations performs GORM auto migration for all models.
func RunMigrations() {
	err := DB().AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		&model.Team{},
		&model.TeamMember{},
		&model.Wallet{},
		&model.WalletTx{},
		&model.AuditLog{},
		&model.OAuthAccount{},
		&model.PasswordReset{},
		&model.Permission{},
		&model.Passkey{},
		&model.SystemApp{},
		&model.Notification{},
		&model.Invitation{},

		// 租户和应用模型
		&model.Tenant{},
		&model.TenantAdmin{},
		&model.App{},
		&model.AppUser{},
		&model.TenantQuota{},

		// OAuth2模型
		&model.OAuthClient{},
		&model.OAuthAuthorizationCode{},
		&model.OAuthAccessToken{},
		&model.OAuthRefreshToken{},
		&model.RolePermission{},

		// 订阅系统模型
		&model.Product{},
		&model.Plan{},
		&model.PlanFeature{},
		&model.Price{},
		&model.Coupon{},
		&model.Subscription{},
		&model.SubscriptionItem{},
		&model.UsageRecord{},
		&model.SubscriptionEvent{},
		&model.Invoice{},
		&model.InvoiceItem{},
		&model.Payment{},

		// 支付系统模型
		&model.PaymentIntent{},
		&model.PaymentSession{},
		&model.PaymentWebhookEvent{},

		// 订单系统模型
		&model.Order{},
	)
	if err != nil {
		log.Fatalf("[Error][RunMigrations] auto migration failed: %v", err)
	}

	// 在自动迁移后处理特殊的迁移情况
	handleSpecialMigrations()

	createDefaultRoles()
	seedSystemApps()
	createSubscriptionIndexes()
}

// handleSpecialMigrations 处理特殊的迁移情况
func handleSpecialMigrations() {
	db := DB()

	// 检查是否为全新数据库（基于tenants表是否已经有数据）
	var count int64
	if err := db.Model(&model.Tenant{}).Count(&count).Error; err != nil {
		// 如果查询失败，说明表可能不存在，跳过特殊迁移
		log.Println("[Migration] Tenants table not accessible, skipping special migrations")
		return
	}

	if count == 0 {
		log.Println("[Migration] Fresh database detected, ensuring default tenant...")
		ensureDefaultTenant()
		return
	}

	// 现有数据库的特殊迁移逻辑
	log.Println("[Migration] Existing database detected, applying compatibility migrations...")

	// 处理 user_tenants 表重命名为 tenant_admins
	if db.Migrator().HasTable("user_tenants") {
		log.Println("[Migration] Found user_tenants table, migrating to tenant_admins...")

		// 检查 tenant_admins 表是否已存在
		if !db.Migrator().HasTable("tenant_admins") {
			// 重命名表
			if err := db.Exec("ALTER TABLE user_tenants RENAME TO tenant_admins").Error; err != nil {
				log.Printf("[Migration] Failed to rename user_tenants to tenant_admins: %v", err)
			} else {
				log.Println("[Migration] Successfully renamed user_tenants to tenant_admins")
			}
		} else {
			// 如果两个表都存在，需要迁移数据
			log.Println("[Migration] Both user_tenants and tenant_admins exist, migrating data...")
			if err := db.Exec(`
				INSERT INTO tenant_admins (id, user_id, tenant_id, role, created_at, updated_at)
				SELECT id, user_id, tenant_id, role, created_at, updated_at
				FROM user_tenants
				WHERE NOT EXISTS (
					SELECT 1 FROM tenant_admins 
					WHERE tenant_admins.user_id = user_tenants.user_id 
					AND tenant_admins.tenant_id = user_tenants.tenant_id
				)
			`).Error; err != nil {
				log.Printf("[Migration] Failed to migrate data from user_tenants to tenant_admins: %v", err)
			} else {
				log.Println("[Migration] Successfully migrated data from user_tenants to tenant_admins")
				// 删除旧表
				if err := db.Migrator().DropTable("user_tenants"); err != nil {
					log.Printf("[Migration] Failed to drop user_tenants table: %v", err)
				} else {
					log.Println("[Migration] Dropped user_tenants table")
				}
			}
		}
	}

	// 处理租户表缺失字段
	if !db.Migrator().HasColumn(&model.Tenant{}, "code") {
		log.Println("[Migration] Adding code column to tenants table...")
		if err := db.Exec("ALTER TABLE tenants ADD COLUMN code VARCHAR(64)").Error; err != nil {
			log.Printf("[Migration] Failed to add code column: %v", err)
		} else {
			// 为现有租户设置code值
			db.Exec("UPDATE tenants SET code = 'tenant_' || id WHERE code IS NULL OR code = ''")
			log.Println("[Migration] Successfully added code column to tenants")
		}
	}

	if !db.Migrator().HasColumn(&model.Tenant{}, "status") {
		log.Println("[Migration] Adding status column to tenants table...")
		db.Exec("ALTER TABLE tenants ADD COLUMN status VARCHAR(20) DEFAULT 'active'")
		db.Exec("UPDATE tenants SET status = 'active' WHERE status IS NULL")
	}

	if !db.Migrator().HasColumn(&model.Tenant{}, "description") {
		log.Println("[Migration] Adding description column to tenants table...")
		db.Exec("ALTER TABLE tenants ADD COLUMN description VARCHAR(500)")
	}

	// 处理角色表tenant_id字段
	if !db.Migrator().HasColumn(&model.Role{}, "tenant_id") {
		log.Println("[Migration] Adding tenant_id column to roles table...")

		// 添加可空的tenant_id字段
		if err := db.Exec("ALTER TABLE roles ADD COLUMN tenant_id INTEGER").Error; err != nil {
			log.Printf("[Migration] Failed to add tenant_id column: %v", err)
			return
		}

		// 获取默认租户ID
		var defaultTenant model.Tenant
		if err := db.First(&defaultTenant).Error; err == nil {
			db.Exec("UPDATE roles SET tenant_id = ? WHERE tenant_id IS NULL", defaultTenant.ID)
			log.Printf("[Migration] Updated existing roles with default tenant_id: %d", defaultTenant.ID)
		}

		log.Println("[Migration] Successfully migrated roles table with tenant_id")
	}
}

// ensureDefaultTenant 确保存在默认租户
func ensureDefaultTenant() {
	db := DB()
	var count int64
	db.Model(&model.Tenant{}).Count(&count)

	if count == 0 {
		defaultTenant := model.Tenant{
			Name:        "默认租户",
			Code:        "default",
			Description: "系统默认租户",
			Status:      "active",
			Plan:        "free",
			// 不设置Metadata字段，让GORM使用默认值
		}
		if err := db.Create(&defaultTenant).Error; err != nil {
			log.Printf("[Migration] Failed to create default tenant: %v", err)
		} else {
			log.Println("[Migration] Created default tenant")
		}
	}
}

// createDefaultRoles 创建默认角色
func createDefaultRoles() {
	db := DB()

	// 获取默认租户
	var defaultTenant model.Tenant
	if err := db.First(&defaultTenant).Error; err != nil {
		log.Printf("[Migration] No default tenant found, skipping role creation: %v", err)
		return
	}

	roles := []model.Role{
		{
			TenantID:    defaultTenant.ID,
			Code:        "admin",
			Name:        "管理员",
			Description: "系统管理员角色",
			IsSystem:    true,
		},
		{
			TenantID:    defaultTenant.ID,
			Code:        "user",
			Name:        "普通用户",
			Description: "普通用户角色",
			IsSystem:    true,
		},
	}

	for _, role := range roles {
		var count int64
		db.Model(&model.Role{}).Where("code = ? AND tenant_id = ?", role.Code, role.TenantID).Count(&count)
		if count == 0 {
			if err := db.Create(&role).Error; err != nil {
				log.Printf("[Migration] Failed to create role %s: %v", role.Code, err)
			} else {
				log.Printf("[Migration] Created role: %s", role.Code)
			}
		}
	}
}

// seedSystemApps 插入默认系统应用
func seedSystemApps() {
	db := DB()
	apps := []model.SystemApp{
		{Name: "安全中心", Description: "账户安全相关通知"},
		{Name: "团队", Description: "团队协作相关通知"},
		{Name: "系统信息", Description: "系统公告与更新"},
		{Name: "订阅管理", Description: "订阅相关通知"},
	}
	for _, app := range apps {
		var count int64
		db.Model(&model.SystemApp{}).Where("name = ?", app.Name).Count(&count)
		if count == 0 {
			db.Create(&app)
		}
	}
}

// createSubscriptionIndexes 创建订阅系统相关的数据库索引
func createSubscriptionIndexes() {
	db := DB()

	// 检查数据库类型并创建相应的索引
	// 注意：GORM 会自动创建大部分索引，这里只处理特殊的复合索引

	// 为 subscriptions 表创建复合索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_subscriptions_customer_status ON subscriptions(customer_id, status)")
	db.Exec("CREATE INDEX IF NOT EXISTS idx_subscriptions_current_period_end ON subscriptions(current_period_end)")

	// 为 usage_records 表创建复合索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_usage_records_subscription_item_ts ON usage_records(subscription_item_id, ts)")

	// 为 subscription_events 表创建复合索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_subscription_events_subscription_created ON subscription_events(subscription_id, created_at)")

	// 为 plan_features 表创建唯一约束
	db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_features_plan_key ON plan_features(plan_id, feature_key)")

	// 为 plans 表创建唯一约束
	db.Exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_plans_product_code_version ON plans(product_id, code, plan_version)")
}
