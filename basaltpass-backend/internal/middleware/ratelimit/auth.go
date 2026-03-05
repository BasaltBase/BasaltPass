package ratelimit

import (
	"basaltpass-backend/internal/common"
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// loginRateLimitConfig 登录限速的两层策略
const (
	// 第一层：IP 维度，防止单 IP 的大规模扫描
	loginIPLimit      = 20             // 每分钟最多 20 次（宽松，只阻断明显的扫射）
	loginIPWindow     = time.Minute

	// 第二层：IP + 账号标识符，精准防暴力破解
	loginComboLimit   = 5              // 5 次失败后锁定
	loginComboWindow  = 15 * time.Minute // 锁定窗口 15 分钟

	// 第三层：verify-2fa IP + user_id，防 TOTP/SMS 枚举
	twoFAComboLimit   = 5
	twoFAComboWindow  = 15 * time.Minute
)

// checkRateLimitDetailed 扩展版限速检查，额外返回剩余封锁时间（秒）。
// 返回 (allowed, retryAfterSeconds, error)
func checkRateLimitDetailed(key string, cfg RateLimitConfig) (bool, int, error) {
	now := time.Now()
	db := common.DB()

	// 清理过期记录（可选，降低表膨胀）
	db.Where("window_end < ? AND category = ?", now.Add(-cfg.Window), cfg.Category).
		Delete(&RateLimitRecord{})

	var record RateLimitRecord
	err := db.Where("key = ? AND category = ?", key, cfg.Category).First(&record).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			record = RateLimitRecord{
				Key:       key,
				Category:  cfg.Category,
				Count:     1,
				WindowEnd: now.Add(cfg.Window),
			}
			return true, 0, db.Create(&record).Error
		}
		return false, 0, err
	}

	// 窗口已过期 → 重置
	if now.After(record.WindowEnd) {
		record.Count = 1
		record.WindowEnd = now.Add(cfg.Window)
		return true, 0, db.Save(&record).Error
	}

	// 已超限
	if record.Count >= cfg.Limit {
		retryAfter := int(time.Until(record.WindowEnd).Seconds()) + 1
		if retryAfter < 0 {
			retryAfter = 0
		}
		return false, retryAfter, nil
	}

	// 正常计数
	record.Count++
	return true, 0, db.Save(&record).Error
}

// LoginRateLimit 为 POST /auth/login 添加双层频率限制：
//   - 第一层：同一 IP 每分钟最多 20 次请求（宽松，仅拦截大规模扫射）
//   - 第二层：同一 IP + 账号标识符 在 15 分钟内最多 5 次（精准防暴力破解）
//
// 超限时返回 HTTP 429，并设置 Retry-After 和 X-RateLimit-Reset 响应头。
func LoginRateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := normalizeIP(c.IP())

		// ── 第一层：IP 维度 ──────────────────────────────────────
		ipKey := fmt.Sprintf("login_ip:%s", ip)
		allowed, retryAfter, err := checkRateLimitDetailed(ipKey, RateLimitConfig{
			Limit:    loginIPLimit,
			Window:   loginIPWindow,
			Category: "login_ip",
		})
		if err != nil {
			// 限速检查失败时放行（Fail open，避免合法用户被误锁）
			return c.Next()
		}
		if !allowed {
			return rateLimitResponse(c, retryAfter,
				"登录请求过于频繁，请稍后再试")
		}

		// ── 第二层：IP + 账号标识 维度 ──────────────────────────
		identifier := extractLoginIdentifier(c)
		if identifier != "" {
			comboKey := fmt.Sprintf("login_combo:%s:%s", ip, strings.ToLower(identifier))
			allowed2, retryAfter2, err2 := checkRateLimitDetailed(comboKey, RateLimitConfig{
				Limit:    loginComboLimit,
				Window:   loginComboWindow,
				Category: "login_combo",
			})
			if err2 != nil {
				return c.Next()
			}
			if !allowed2 {
				return rateLimitResponse(c, retryAfter2,
					fmt.Sprintf("该账号登录尝试过多，已暂时锁定，请 %d 秒后再试", retryAfter2))
			}
		}

		return c.Next()
	}
}

// Verify2FARateLimit 为 POST /auth/verify-2fa 添加频率限制：
//   - 第一层：同一 IP 每分钟最多 20 次
//   - 第二层：同一 IP + user_id 在 15 分钟内最多 5 次（防 TOTP/SMS 枚举）
func Verify2FARateLimit() fiber.Handler {
	return func(c *fiber.Ctx) error {
		ip := normalizeIP(c.IP())

		// ── 第一层：IP 维度 ──────────────────────────────────────
		ipKey := fmt.Sprintf("2fa_ip:%s", ip)
		allowed, retryAfter, err := checkRateLimitDetailed(ipKey, RateLimitConfig{
			Limit:    loginIPLimit,
			Window:   loginIPWindow,
			Category: "2fa_ip",
		})
		if err != nil {
			return c.Next()
		}
		if !allowed {
			return rateLimitResponse(c, retryAfter, "请求过于频繁，请稍后再试")
		}

		// ── 第二层：IP + user_id 维度 ────────────────────────────
		userID := extractUserID(c)
		if userID != "" {
			comboKey := fmt.Sprintf("2fa_combo:%s:%s", ip, userID)
			allowed2, retryAfter2, err2 := checkRateLimitDetailed(comboKey, RateLimitConfig{
				Limit:    twoFAComboLimit,
				Window:   twoFAComboWindow,
				Category: "2fa_combo",
			})
			if err2 != nil {
				return c.Next()
			}
			if !allowed2 {
				return rateLimitResponse(c, retryAfter2,
					fmt.Sprintf("验证码尝试次数过多，已暂时锁定，请 %d 秒后再试", retryAfter2))
			}
		}

		return c.Next()
	}
}

// ── 内部辅助函数 ──────────────────────────────────────────────────────────────

// normalizeIP 去除 IPv6 链路本地地址的 zone ID（如 fe80::1%eth0 → fe80::1）
func normalizeIP(ip string) string {
	if idx := strings.IndexByte(ip, '%'); idx != -1 {
		return ip[:idx]
	}
	return ip
}

// extractLoginIdentifier 从请求体中提取账号标识（email 或 phone），兼容多种字段名。
// 注意：Fiber 会缓冲 body，BodyParser 可多次调用。
func extractLoginIdentifier(c *fiber.Ctx) string {
	var body struct {
		Identifier   string `json:"identifier"`
		EmailOrPhone string `json:"email_or_phone"`
		Email        string `json:"email"`
		Phone        string `json:"phone"`
		Account      string `json:"account"`
	}
	// 忽略解析错误；无法解析时降级为仅 IP 限速
	_ = c.BodyParser(&body)

	for _, v := range []string{
		body.Identifier,
		body.EmailOrPhone,
		body.Email,
		body.Phone,
		body.Account,
	} {
		if strings.TrimSpace(v) != "" {
			return strings.TrimSpace(v)
		}
	}
	return ""
}

// extractUserID 从请求体中提取 user_id（verify-2fa 端点）
func extractUserID(c *fiber.Ctx) string {
	var body struct {
		UserID uint `json:"user_id"`
	}
	_ = c.BodyParser(&body)
	if body.UserID == 0 {
		return ""
	}
	return fmt.Sprintf("%d", body.UserID)
}

// rateLimitResponse 返回标准的 429 响应，包含 Retry-After 和 X-RateLimit-Reset 头
func rateLimitResponse(c *fiber.Ctx, retryAfterSeconds int, msg string) error {
	resetAt := time.Now().Add(time.Duration(retryAfterSeconds) * time.Second).Unix()
	c.Set("Retry-After", fmt.Sprintf("%d", retryAfterSeconds))
	c.Set("X-RateLimit-Reset", fmt.Sprintf("%d", resetAt))
	return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
		"error":               msg,
		"retry_after_seconds": retryAfterSeconds,
	})
}
