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
	)
	if err != nil {
		log.Fatalf("[Error][RunMigrations] auto migration failed: %v", err)
	}
	createDefaultRoles()
	seedSystemApps()
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
	}
	for _, app := range apps {
		var count int64
		db.Model(&model.SystemApp{}).Where("name = ?", app.Name).Count(&count)
		if count == 0 {
			db.Create(&app)
		}
	}
}
