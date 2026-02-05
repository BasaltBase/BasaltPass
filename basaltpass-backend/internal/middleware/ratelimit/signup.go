package ratelimit

import (
	"basaltpass-backend/internal/common"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// RateLimitRecord 速率限制记录
type RateLimitRecord struct {
	ID        uint      `gorm:"primaryKey"`
	Key       string    `gorm:"uniqueIndex;size:255"` // 限制键：IP、邮箱等
	Category  string    `gorm:"index;size:50"`        // 限制类别：signup_start, signup_send等
	Count     int       `gorm:"default:1"`            // 计数
	WindowEnd time.Time `gorm:"index"`                // 窗口结束时间
	CreatedAt time.Time
	UpdatedAt time.Time
}

// RateLimitConfig 速率限制配置
type RateLimitConfig struct {
	Limit    int           // 限制次数
	Window   time.Duration // 时间窗口
	Category string        // 限制类别
}

// SignupRateLimit 注册相关的速率限制中间件
func SignupRateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := c.IP()
		path := c.Path()

		var config RateLimitConfig

		switch path {
		case "/api/v1/signup/start":
			config = RateLimitConfig{
				Limit:    10, // 10 次/小时
				Window:   time.Hour,
				Category: "signup_start",
			}
		case "/api/v1/signup/send_email_code", "/api/v1/signup/resend_email_code":
			config = RateLimitConfig{
				Limit:    5, // 5 次/小时
				Window:   time.Hour,
				Category: "signup_send_email",
			}
		case "/api/v1/signup/verify_email_code":
			config = RateLimitConfig{
				Limit:    20, // 20 次/小时（允许多次尝试）
				Window:   time.Hour,
				Category: "signup_verify",
			}
		default:
			return c.Next() // 不限制其他路径
		}

		// 生成限制键
		key := fmt.Sprintf("%s:%s:%s", config.Category, ip, path)

		// 检查速率限制
		allowed, err := checkRateLimit(key, config)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Rate limit check failed",
			})
		}

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Rate limit exceeded. Please try again later.",
			})
		}

		return c.Next()
	}
}

// EmailRateLimit 邮箱级别的速率限制
func EmailRateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 只对发送验证码的接口进行邮箱级别限制
		path := c.Path()
		if path != "/api/v1/signup/send_email_code" && path != "/api/v1/signup/resend_email_code" {
			return c.Next()
		}

		// 从请求体中提取邮箱
		var body struct {
			Email string `json:"email"`
		}
		if err := c.BodyParser(&body); err != nil {
			return c.Next() // 解析失败让后续处理器处理
		}

		if body.Email == "" {
			return c.Next()
		}

		// 邮箱级别限制：每天最多10次
		config := RateLimitConfig{
			Limit:    10,
			Window:   24 * time.Hour,
			Category: "email_send_daily",
		}

		key := fmt.Sprintf("%s:%s", config.Category, body.Email)
		allowed, err := checkRateLimit(key, config)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Rate limit check failed",
			})
		}

		if !allowed {
			// 为了安全，不暴露具体的限制信息
			return c.JSON(fiber.Map{
				"message": "If eligible, we sent a verification code to your email.",
			})
		}

		return c.Next()
	}
}

// checkRateLimit 检查速率限制
func checkRateLimit(key string, config RateLimitConfig) (bool, error) {
	now := time.Now()
	windowStart := now.Add(-config.Window)

	// 清理过期记录
	common.DB().Where("window_end < ? AND category = ?", windowStart, config.Category).Delete(&RateLimitRecord{})

	// 查找或创建记录
	var record RateLimitRecord
	err := common.DB().Where("key = ? AND category = ?", key, config.Category).First(&record).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// 创建新记录
			record = RateLimitRecord{
				Key:       key,
				Category:  config.Category,
				Count:     1,
				WindowEnd: now.Add(config.Window),
			}
			return true, common.DB().Create(&record).Error
		}
		return false, err
	}

	// 检查窗口是否过期
	if now.After(record.WindowEnd) {
		// 重置计数器
		record.Count = 1
		record.WindowEnd = now.Add(config.Window)
		return true, common.DB().Save(&record).Error
	}

	// 检查是否超出限制
	if record.Count >= config.Limit {
		return false, nil
	}

	// 增加计数
	record.Count++
	return true, common.DB().Save(&record).Error
}

// DeviceRateLimit 设备级别的速率限制
func DeviceRateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		deviceID := c.Get("X-Device-ID")
		if deviceID == "" {
			return c.Next() // 没有设备ID则跳过
		}

		path := c.Path()
		if path != "/api/v1/signup/start" {
			return c.Next()
		}

		// 设备级别限制：每天最多3个注册会话
		config := RateLimitConfig{
			Limit:    3,
			Window:   24 * time.Hour,
			Category: "device_signup_daily",
		}

		key := fmt.Sprintf("%s:%s", config.Category, deviceID)
		allowed, err := checkRateLimit(key, config)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Rate limit check failed",
			})
		}

		if !allowed {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
				"error": "Daily registration limit reached for this device.",
			})
		}

		return c.Next()
	}
}

// SetRateLimitHeaders 设置速率限制响应头
func SetRateLimitHeaders() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 执行请求
		err := c.Next()

		// 添加通用的速率限制提示头
		c.Set("X-RateLimit-Policy", "Please don't abuse our APIs")

		return err
	}
}

// CleanupExpiredRecords 清理过期的速率限制记录（定时任务）
func CleanupExpiredRecords() error {
	cutoff := time.Now().Add(-7 * 24 * time.Hour) // 保留7天
	return common.DB().Where("window_end < ?", cutoff).Delete(&RateLimitRecord{}).Error
}
