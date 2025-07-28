package admin

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"database/sql"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
)

// ListUsersHandler GET /admin/users
func ListUsersHandler(c *fiber.Ctx) error {
	q := c.Query("q")
	var users []model.User
	db := common.DB()
	if q != "" {
		db = db.Where("email LIKE ? OR phone LIKE ? OR nickname LIKE ?", "%"+q+"%", "%"+q+"%", "%"+q+"%")
	}
	db.Find(&users)
	return c.JSON(users)
}

// BanUserHandler POST /admin/user/:id/ban {banned}
func BanUserHandler(c *fiber.Ctx) error {
	id := c.Params("id")
	var body struct {
		Banned bool `json:"banned"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if err := common.DB().Model(&model.User{}).Where("id = ?", id).Update("banned", body.Banned).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

// DashboardStatsHandler GET /admin/dashboard/stats
func DashboardStatsHandler(c *fiber.Ctx) error {
	db := common.DB()

	var stats struct {
		TotalUsers          int64   `json:"totalUsers"`
		ActiveUsers         int64   `json:"activeUsers"`
		TotalWallets        int64   `json:"totalWallets"`
		TotalRevenue        float64 `json:"totalRevenue"`
		TodayRevenue        float64 `json:"todayRevenue"`
		TotalSubscriptions  int64   `json:"totalSubscriptions"`
		ActiveSubscriptions int64   `json:"activeSubscriptions"`
		TotalApplications   int64   `json:"totalApplications"`
	}

	// 统计用户数
	db.Model(&model.User{}).Count(&stats.TotalUsers)
	db.Model(&model.User{}).Where("status = ?", 1).Count(&stats.ActiveUsers)

	// 统计钱包数
	db.Model(&model.Wallet{}).Count(&stats.TotalWallets)

	// 统计收入 (这里需要根据实际的交易记录计算)
	var totalRevenue, todayRevenue sql.NullFloat64
	db.Model(&model.WalletTx{}).
		Where("type = ? AND status = ?", "recharge", "success").
		Select("COALESCE(SUM(amount), 0) / 100.0").
		Scan(&totalRevenue)

	db.Model(&model.WalletTx{}).
		Where("type = ? AND status = ? AND DATE(created_at) = CURDATE()", "recharge", "success").
		Select("COALESCE(SUM(amount), 0) / 100.0").
		Scan(&todayRevenue)

	stats.TotalRevenue = totalRevenue.Float64
	stats.TodayRevenue = todayRevenue.Float64

	// 如果有订阅模型，统计订阅数据
	if db.Migrator().HasTable(&model.Subscription{}) {
		db.Model(&model.Subscription{}).Count(&stats.TotalSubscriptions)
		db.Model(&model.Subscription{}).Where("status = ?", "active").Count(&stats.ActiveSubscriptions)
	}

	// 如果有应用模型，统计应用数据（这里假设有App模型）
	// db.Model(&model.Application{}).Count(&stats.TotalApplications)
	stats.TotalApplications = 0 // 暂时设为0

	return c.JSON(stats)
}

// RecentActivitiesHandler GET /admin/dashboard/activities
func RecentActivitiesHandler(c *fiber.Ctx) error {
	db := common.DB()

	var activities []map[string]interface{}

	// 获取最近的审计日志作为活动记录
	var logs []model.AuditLog
	db.Order("created_at DESC").Limit(10).Find(&logs)

	for _, log := range logs {
		activity := map[string]interface{}{
			"id":          log.ID,
			"type":        getActivityType(log.Action),
			"description": formatActivityDescription(log.Action),
			"timestamp":   formatTimeAgo(log.CreatedAt),
			"user":        getUserEmail(&log.UserID),
		}

		// 如果是钱包交易，添加金额信息
		if log.Action == "wallet_recharge" || log.Action == "wallet_withdraw" {
			// 这里可以从Data中解析金额信息
			activity["amount"] = 0.0 // 暂时设为0
		}

		activities = append(activities, activity)
	}

	return c.JSON(activities)
}

// 辅助函数：根据action确定活动类型
func getActivityType(action string) string {
	switch action {
	case "user_register", "user_create":
		return "user_register"
	case "wallet_recharge", "wallet_withdraw":
		return "wallet_transaction"
	case "subscription_create":
		return "subscription_created"
	case "app_create":
		return "app_created"
	default:
		return "other"
	}
}

// 辅助函数：格式化活动描述
func formatActivityDescription(action string) string {
	switch action {
	case "user_register", "user_create":
		return "新用户注册"
	case "wallet_recharge":
		return "钱包充值"
	case "wallet_withdraw":
		return "钱包提现"
	case "subscription_create":
		return "新订阅创建"
	case "app_create":
		return "新应用创建"
	default:
		return "系统操作"
	}
}

// 辅助函数：格式化时间为相对时间
func formatTimeAgo(createdAt time.Time) string {
	now := time.Now()
	duration := now.Sub(createdAt)

	if duration < time.Minute {
		return "刚刚"
	} else if duration < time.Hour {
		minutes := int(duration.Minutes())
		return fmt.Sprintf("%d分钟前", minutes)
	} else if duration < 24*time.Hour {
		hours := int(duration.Hours())
		return fmt.Sprintf("%d小时前", hours)
	} else {
		days := int(duration.Hours() / 24)
		return fmt.Sprintf("%d天前", days)
	}
}

// 辅助函数：获取用户邮箱
func getUserEmail(userID *uint) string {
	if userID == nil {
		return "系统"
	}

	var user model.User
	if err := common.DB().First(&user, *userID).Error; err != nil {
		return "未知用户"
	}

	return user.Email
}
