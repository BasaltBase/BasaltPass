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
		&model.OAuthClient{},
		&model.OAuthAuthorizationCode{},
		&model.OAuthAccessToken{},

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
	createDefaultRoles()
	seedSystemApps()
	createSubscriptionIndexes()
}

// createDefaultRoles 创建默认角色
func createDefaultRoles() {
	db := DB()
	roles := []model.Role{
		{Name: "admin", Description: "管理员"},
	}
	for _, role := range roles {
		var count int64
		db.Model(&model.Role{}).Where("name = ?", role.Name).Count(&count)
		if count == 0 {
			db.Create(&role)
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
