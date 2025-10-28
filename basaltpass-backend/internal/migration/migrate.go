package migration

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/currency"
	"basaltpass-backend/internal/model"
	"log"
	"strings"
)

// 迁移数据库，自动迁移数据库表结构
// RunMigrations performs GORM auto migration for all models.
func RunMigrations() {
	// 首先创建 currencies 表
	db := common.DB()
	if err := db.AutoMigrate(&model.Currency{}); err != nil {
		log.Fatalf("[Error] Failed to create currencies table: %v", err)
	}

	// 然后初始化默认货币
	if err := currency.InitDefaultCurrencies(); err != nil {
		log.Printf("[Migration] Failed to initialize default currencies: %v", err)
	} else {
		log.Println("[Migration] Successfully initialized default currencies")
	}

	// 迁移钱包货币字段（在完整AutoMigrate之前处理）
	MigrateWalletCurrencyField()

	// 执行完整的自动迁移
	err := db.AutoMigrate(
		&model.User{},
		&model.Role{},
		&model.UserRole{},
		&model.Permission{},

		// 团队
		&model.Team{},
		&model.TeamMember{},

		// 钱包（货币表已经在前面创建了）
		&model.Wallet{},
		&model.WalletTx{},
		&model.AuditLog{},
		&model.LoginHistory{},
		&model.OAuthAccount{},
		&model.PasswordReset{},
		&model.Passkey{},
		&model.SystemApp{},
		&model.Notification{},
		&model.Invitation{},

		// 租户和应用模型
		&model.Tenant{},
		&model.TenantAdmin{}, // 租户管理员
		&model.App{},
		&model.AppUser{},     // 业务应用用户映射
		&model.TenantQuota{}, // 租户配额
		&model.TenantUsageMetric{},

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

		// 业务应用权限系统模型
		&model.AppPermission{},
		&model.AppRole{},
		&model.AppUserPermission{},
		&model.AppUserRole{},
	)
	if err != nil {
		log.Fatalf("[Error][RunMigrations] auto migration failed: %v", err)
	}

	// 在自动迁移后处理特殊的迁移情况
	handleSpecialMigrations()

	createDefaultRoles()
	seedSystemApps()
	createSubscriptionIndexes()

	// 系统权限种子化，并赋予默认租户的 admin 角色
	seedSystemPermissions()
	createAdditionalSystemRoles()
	assignPermissionsToPredefinedRoles()
	assignPermissionsToAdminRole()
} // handleSpecialMigrations 处理特殊的迁移情况
func handleSpecialMigrations() {
	db := common.DB()

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
				log.Printf("[Migration] Failed to migration data from user_tenants to tenant_admins: %v", err)
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
	db := common.DB()
	var count int64
	db.Model(&model.Tenant{}).Count(&count)

	if count == 0 {
		defaultTenant := model.Tenant{
			Name:        "BasaltPass",
			Code:        "default",
			Description: "Default tenant for BasaltPass",
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
	db := common.DB()

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
			Name:        "Admin",
			Description: "Basalt system admin role",
			IsSystem:    true,
		},
		{
			TenantID:    defaultTenant.ID,
			Code:        "user",
			Name:        "Common user",
			Description: "Common user role",
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
	db := common.DB()
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
	db := common.DB()

	// 检查数据库类型并创建相应的索引
	// 注意：GORM 会自动创建大部分索引，这里只处理特殊的复合索引

	// 为 subscriptions 表创建复合索引
	db.Exec("CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions(user_id, status)")
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

// seedSystemPermissions 创建（若不存在）系统级权限清单
func seedSystemPermissions() {
	db := common.DB()
	type perm struct{ Code, Desc string }
	perms := []perm{
		// 仪表盘
		{Code: "admin.dashboard.stats.read", Desc: "查看管理仪表盘统计"},
		{Code: "admin.dashboard.activities.read", Desc: "查看管理仪表盘活动"},

		// 角色与权限
		{Code: "admin.roles.read", Desc: "查看系统角色"},
		{Code: "admin.roles.create", Desc: "创建系统角色"},
		{Code: "admin.roles.permissions.read", Desc: "查看角色的权限"},
		{Code: "admin.roles.permissions.set", Desc: "设置角色的权限"},
		{Code: "admin.roles.permissions.remove", Desc: "移除角色的权限"},
		{Code: "admin.permissions.read", Desc: "查看系统权限"},
		{Code: "admin.permissions.create", Desc: "创建系统权限"},
		{Code: "admin.permissions.update", Desc: "更新系统权限"},
		{Code: "admin.permissions.delete", Desc: "删除系统权限"},

		// 用户管理
		{Code: "admin.users.read", Desc: "查看用户"},
		{Code: "admin.users.create", Desc: "创建用户"},
		{Code: "admin.users.update", Desc: "更新用户"},
		{Code: "admin.users.delete", Desc: "删除用户"},
		{Code: "admin.users.stats.read", Desc: "查看用户统计"},
		{Code: "admin.users.ban", Desc: "封禁用户"},

		// 租户管理（系统级）
		{Code: "admin.tenants.read", Desc: "查看租户"},
		{Code: "admin.tenants.create", Desc: "创建租户"},
		{Code: "admin.tenants.update", Desc: "更新租户"},
		{Code: "admin.tenants.delete", Desc: "删除租户"},
		{Code: "admin.tenants.stats.read", Desc: "查看租户统计"},
		{Code: "admin.tenants.users.read", Desc: "查看租户用户"},
		{Code: "admin.tenants.users.delete", Desc: "移除租户用户"},

		// 钱包与货币
		{Code: "admin.wallets.read", Desc: "查看钱包"},
		{Code: "admin.wallets.create", Desc: "创建钱包"},
		{Code: "admin.wallets.delete", Desc: "删除钱包"},
		{Code: "admin.wallets.stats.read", Desc: "查看钱包统计"},
		{Code: "admin.wallets.transactions.read", Desc: "查看钱包交易"},
		{Code: "admin.wallets.adjust", Desc: "调整钱包余额"},
		{Code: "admin.wallets.freeze", Desc: "冻结钱包"},
		{Code: "admin.wallets.unfreeze", Desc: "解冻钱包"},
		{Code: "admin.currencies.read", Desc: "查看货币列表"},

		// 通知
		{Code: "admin.notifications.read", Desc: "查看通知"},
		{Code: "admin.notifications.create", Desc: "创建通知"},
		{Code: "admin.notifications.delete", Desc: "删除通知"},

		// OAuth 客户端
		{Code: "admin.oauth.clients.read", Desc: "查看 OAuth 客户端"},
		{Code: "admin.oauth.clients.create", Desc: "创建 OAuth 客户端"},
		{Code: "admin.oauth.clients.update", Desc: "更新 OAuth 客户端"},
		{Code: "admin.oauth.clients.delete", Desc: "删除 OAuth 客户端"},
		{Code: "admin.oauth.clients.secret.regenerate", Desc: "重置客户端密钥"},
		{Code: "admin.oauth.clients.tokens.read", Desc: "查看客户端令牌"},
		{Code: "admin.oauth.clients.tokens.revoke", Desc: "吊销客户端令牌"},

		// 系统级应用管理
		{Code: "admin.apps.read", Desc: "查看系统应用"},
		{Code: "admin.apps.create", Desc: "创建系统应用"},
		{Code: "admin.apps.update", Desc: "更新系统应用"},
		{Code: "admin.apps.delete", Desc: "删除系统应用"},
		{Code: "admin.apps.status.update", Desc: "更新系统应用状态"},
		{Code: "admin.apps.stats.read", Desc: "查看系统应用统计"},
		{Code: "admin.app_users.read", Desc: "查看应用用户"},
		{Code: "admin.app_users.delete", Desc: "移除应用用户"},
		{Code: "admin.app_users.status.update", Desc: "更新应用用户状态"},
		{Code: "admin.app_users.by_status.read", Desc: "按状态查看应用用户"},

		// 商业化 / 订阅
		{Code: "admin.products.read", Desc: "查看产品"},
		{Code: "admin.products.create", Desc: "创建产品"},
		{Code: "admin.products.update", Desc: "更新产品"},
		{Code: "admin.products.delete", Desc: "删除产品"},

		{Code: "admin.plans.read", Desc: "查看套餐"},
		{Code: "admin.plans.create", Desc: "创建套餐"},
		{Code: "admin.plans.update", Desc: "更新套餐"},
		{Code: "admin.plans.delete", Desc: "删除套餐"},
		{Code: "admin.plans.features.create", Desc: "创建套餐功能项"},

		{Code: "admin.prices.read", Desc: "查看定价"},
		{Code: "admin.prices.create", Desc: "创建定价"},
		{Code: "admin.prices.update", Desc: "更新定价"},
		{Code: "admin.prices.delete", Desc: "删除定价"},

		{Code: "admin.coupons.read", Desc: "查看优惠券"},
		{Code: "admin.coupons.create", Desc: "创建优惠券"},
		{Code: "admin.coupons.update", Desc: "更新优惠券"},
		{Code: "admin.coupons.delete", Desc: "删除优惠券"},

		{Code: "admin.subscriptions.read", Desc: "查看订阅"},
		{Code: "admin.subscriptions.cancel", Desc: "取消订阅"},

		// 超管专用（/_admin/**）
		{Code: "superadmin.tenants.create", Desc: "超管：创建租户"},
		{Code: "superadmin.tenants.read", Desc: "超管：查看租户"},
		{Code: "superadmin.tenants.update", Desc: "超管：更新租户"},
		{Code: "superadmin.tenants.delete", Desc: "超管：删除租户"},
	}

	for _, p := range perms {
		var count int64
		if err := db.Model(&model.Permission{}).Where("code = ?", p.Code).Count(&count).Error; err != nil {
			log.Printf("[Migration] Failed to check permission %s: %v", p.Code, err)
			continue
		}
		if count == 0 {
			if err := db.Create(&model.Permission{Code: p.Code, Desc: p.Desc}).Error; err != nil {
				log.Printf("[Migration] Failed to create permission %s: %v", p.Code, err)
			} else {
				log.Printf("[Migration] Created permission: %s", p.Code)
			}
		}
	}
}

// assignPermissionsToAdminRole 将全部系统权限授予默认租户的 admin 角色
func assignPermissionsToAdminRole() {
	db := common.DB()

	// 查找默认租户（优先 code=default，其次任意一个）
	var tenant model.Tenant
	if err := db.Where("code = ?", "default").First(&tenant).Error; err != nil {
		if err := db.First(&tenant).Error; err != nil {
			log.Printf("[Migration] No tenant found, skip assigning permissions to admin role")
			return
		}
	}

	// 查找默认租户的 admin 角色
	var adminRole model.Role
	if err := db.Where("code = ? AND tenant_id = ?", "admin", tenant.ID).First(&adminRole).Error; err != nil {
		log.Printf("[Migration] Admin role not found for tenant %d, skip permission binding", tenant.ID)
		return
	}

	// 取回所有系统权限
	var perms []model.Permission
	if err := db.Find(&perms).Error; err != nil {
		log.Printf("[Migration] Failed to load permissions: %v", err)
		return
	}

	// 为 admin 角色绑定权限（若未绑定）
	for _, p := range perms {
		var cnt int64
		if err := db.Model(&model.RolePermission{}).
			Where("role_id = ? AND permission_id = ?", adminRole.ID, p.ID).
			Count(&cnt).Error; err != nil {
			log.Printf("[Migration] Failed to check role_permission for role %d perm %d: %v", adminRole.ID, p.ID, err)
			continue
		}
		if cnt == 0 {
			if err := db.Create(&model.RolePermission{RoleID: adminRole.ID, PermissionID: p.ID}).Error; err != nil {
				log.Printf("[Migration] Failed to bind permission %s to admin role: %v", p.Code, err)
			}
		}
	}
}

// createAdditionalSystemRoles 在默认租户下创建额外的系统“职能型角色”（幂等）
func createAdditionalSystemRoles() {
	db := common.DB()

	// 查找默认租户（优先 code=default，其次任意一个）
	var tenant model.Tenant
	if err := db.Where("code = ?", "default").First(&tenant).Error; err != nil {
		if err := db.First(&tenant).Error; err != nil {
			log.Printf("[Migration] No tenant found, skip creating additional roles")
			return
		}
	}

	roles := []model.Role{
		{TenantID: tenant.ID, Code: "viewer", Name: "Viewer", Description: "System read-only role", IsSystem: true},
		{TenantID: tenant.ID, Code: "user_manager", Name: "User Manager", Description: "Manage users", IsSystem: true},
		{TenantID: tenant.ID, Code: "tenant_viewer", Name: "Tenant Viewer", Description: "View tenants and stats", IsSystem: true},
		{TenantID: tenant.ID, Code: "wallet_manager", Name: "Wallet Manager", Description: "Manage wallets and balances", IsSystem: true},
		{TenantID: tenant.ID, Code: "oauth_manager", Name: "OAuth Manager", Description: "Manage OAuth clients and tokens", IsSystem: true},
		{TenantID: tenant.ID, Code: "notification_manager", Name: "Notification Manager", Description: "Manage notifications", IsSystem: true},
		{TenantID: tenant.ID, Code: "app_manager", Name: "App Manager", Description: "Manage system apps and app users", IsSystem: true},
		{TenantID: tenant.ID, Code: "product_manager", Name: "Product Manager", Description: "Manage products, plans, prices and coupons", IsSystem: true},
		{TenantID: tenant.ID, Code: "subscription_manager", Name: "Subscription Manager", Description: "Manage subscriptions", IsSystem: true},
		{TenantID: tenant.ID, Code: "auditor", Name: "Auditor", Description: "Compliance auditor (read-only)", IsSystem: true},
		{TenantID: tenant.ID, Code: "support", Name: "Support", Description: "Support operations with limited actions", IsSystem: true},
	}

	for _, r := range roles {
		var cnt int64
		if err := db.Model(&model.Role{}).Where("code = ? AND tenant_id = ?", r.Code, r.TenantID).Count(&cnt).Error; err != nil {
			log.Printf("[Migration] Failed to check role %s: %v", r.Code, err)
			continue
		}
		if cnt == 0 {
			if err := db.Create(&r).Error; err != nil {
				log.Printf("[Migration] Failed to create role %s: %v", r.Code, err)
			} else {
				log.Printf("[Migration] Created role: %s", r.Code)
			}
		}
	}
}

// assignPermissionsToPredefinedRoles 将预定义权限集合绑定到对应“职能型角色”（幂等）
func assignPermissionsToPredefinedRoles() {
	db := common.DB()

	// 查找默认租户
	var tenant model.Tenant
	if err := db.Where("code = ?", "default").First(&tenant).Error; err != nil {
		if err := db.First(&tenant).Error; err != nil {
			log.Printf("[Migration] No tenant found, skip assigning permissions to predefined roles")
			return
		}
	}

	// 加载全部权限，构建索引
	var perms []model.Permission
	if err := db.Find(&perms).Error; err != nil {
		log.Printf("[Migration] Failed to load permissions for predefined roles: %v", err)
		return
	}
	codeToPerm := make(map[string]model.Permission, len(perms))
	for _, p := range perms {
		codeToPerm[p.Code] = p
	}

	// 动态生成只读权限集合（admin.* 的只读、统计、只读变体）
	var viewerCodes []string
	for _, p := range perms {
		c := p.Code
		if strings.HasPrefix(c, "admin.") && (strings.HasSuffix(c, ".read") || strings.HasSuffix(c, ".stats.read") || strings.HasSuffix(c, ".transactions.read") || strings.HasSuffix(c, ".by_status.read")) {
			viewerCodes = append(viewerCodes, c)
		}
	}

	// 预定义角色到权限码的映射（部分显式列出）
	rolePerms := map[string][]string{
		// 读者与审计
		"viewer":  append([]string{}, viewerCodes...),
		"auditor": append([]string{}, viewerCodes...),

		// 用户管理
		"user_manager": {
			"admin.dashboard.stats.read", "admin.dashboard.activities.read",
			"admin.users.read", "admin.users.create", "admin.users.update", "admin.users.delete", "admin.users.ban", "admin.users.stats.read",
		},

		// 租户查看
		"tenant_viewer": {"admin.tenants.read", "admin.tenants.stats.read", "admin.tenants.users.read"},

		// 钱包管理
		"wallet_manager": {
			"admin.wallets.read", "admin.wallets.create", "admin.wallets.delete", "admin.wallets.stats.read", "admin.wallets.transactions.read",
			"admin.wallets.adjust", "admin.wallets.freeze", "admin.wallets.unfreeze", "admin.currencies.read",
		},

		// OAuth 管理
		"oauth_manager": {
			"admin.oauth.clients.read", "admin.oauth.clients.create", "admin.oauth.clients.update", "admin.oauth.clients.delete",
			"admin.oauth.clients.secret.regenerate", "admin.oauth.clients.tokens.read", "admin.oauth.clients.tokens.revoke",
		},

		// 通知管理
		"notification_manager": {"admin.notifications.read", "admin.notifications.create", "admin.notifications.delete"},

		// 系统应用管理
		"app_manager": {
			"admin.apps.read", "admin.apps.create", "admin.apps.update", "admin.apps.delete", "admin.apps.status.update", "admin.apps.stats.read",
			"admin.app_users.read", "admin.app_users.delete", "admin.app_users.status.update", "admin.app_users.by_status.read",
		},

		// 商品与定价管理
		"product_manager": {
			"admin.products.read", "admin.products.create", "admin.products.update", "admin.products.delete",
			"admin.plans.read", "admin.plans.create", "admin.plans.update", "admin.plans.delete", "admin.plans.features.create",
			"admin.prices.read", "admin.prices.create", "admin.prices.update", "admin.prices.delete",
			"admin.coupons.read", "admin.coupons.create", "admin.coupons.update", "admin.coupons.delete",
		},

		// 订阅运营
		"subscription_manager": {
			"admin.subscriptions.read", "admin.subscriptions.cancel",
			// 只读的商品与定价
			"admin.products.read", "admin.plans.read", "admin.prices.read", "admin.coupons.read",
		},
	}

	// support 角色 = viewer 基础 + 少量操作权限
	supportCodes := append([]string{}, viewerCodes...)
	supportCodes = append(supportCodes, "admin.subscriptions.cancel", "admin.app_users.status.update", "admin.users.ban")
	rolePerms["support"] = supportCodes

	// 绑定函数（幂等）
	bind := func(roleCode string, codes []string) {
		// 查角色
		var role model.Role
		if err := db.Where("code = ? AND tenant_id = ?", roleCode, tenant.ID).First(&role).Error; err != nil {
			log.Printf("[Migration] Role %s not found for tenant %d, skip", roleCode, tenant.ID)
			return
		}

		// 去重
		uniq := make(map[string]struct{}, len(codes))
		var filtered []string
		for _, c := range codes {
			if _, ok := uniq[c]; ok {
				continue
			}
			// 仅允许 admin.*，避免意外赋予 superadmin.* 到普通角色
			if strings.HasPrefix(c, "admin.") {
				uniq[c] = struct{}{}
				filtered = append(filtered, c)
			}
		}

		for _, code := range filtered {
			p, ok := codeToPerm[code]
			if !ok {
				// 权限可能尚未 seed，跳过
				continue
			}
			var cnt int64
			if err := db.Model(&model.RolePermission{}).
				Where("role_id = ? AND permission_id = ?", role.ID, p.ID).
				Count(&cnt).Error; err != nil {
				log.Printf("[Migration] Failed checking role_permission for role %d code %s: %v", role.ID, code, err)
				continue
			}
			if cnt == 0 {
				if err := db.Create(&model.RolePermission{RoleID: role.ID, PermissionID: p.ID}).Error; err != nil {
					log.Printf("[Migration] Failed binding perm %s to role %s: %v", code, roleCode, err)
				}
			}
		}
	}

	// 执行绑定
	for rc, codes := range rolePerms {
		bind(rc, codes)
	}
}
