package security

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/aduit"
	notif "basaltpass-backend/internal/service/notification"
	securityservice "basaltpass-backend/internal/service/security"
	"basaltpass-backend/internal/utils"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"math/big"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/pquerna/otp/totp"
	"golang.org/x/crypto/bcrypt"
)

// SecurityStatus represents user's security status
type SecurityStatus struct {
	PasswordSet   bool   `json:"password_set"`
	TwoFAEnabled  bool   `json:"two_fa_enabled"`
	PasskeysCount int    `json:"passkeys_count"`
	Email         string `json:"email"`
	Phone         string `json:"phone,omitempty"`
	EmailVerified bool   `json:"email_verified"`
	PhoneVerified bool   `json:"phone_verified"`
}

// ChangePasswordRequest for password change
type ChangePasswordRequest struct {
	CurrentPassword string `json:"current_password"`
	NewPassword     string `json:"new_password"`
	ConfirmPassword string `json:"confirm_password"`
}

// UpdateContactRequest for contact info update.
// Email change is intentionally excluded: use POST /user/security/email/change instead,
// which sends a confirmation link to the new address before applying the change.
type UpdateContactRequest struct {
	Email string `json:"email,omitempty"` // rejected; kept for graceful error messaging
	Phone string `json:"phone,omitempty"`
}

// getTenantID 从请求中提取租户ID：优先 X-Tenant-ID header，默认 0（系统租户）
func getTenantID(c *fiber.Ctx) uint {
	if tidStr := c.Get("X-Tenant-ID"); tidStr != "" {
		if tid, err := strconv.ParseUint(tidStr, 10, 32); err == nil {
			return uint(tid)
		}
	}
	return 0
}

// GetSecurityStatusHandler returns user's security status
func GetSecurityStatusHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	tenantID := getTenantID(c)

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}

	// Count passkeys for this tenant
	var passkeysCount int64
	common.DB().Model(&model.Passkey{}).Where("user_id = ? AND tenant_id = ?", uid, tenantID).Count(&passkeysCount)

	// Check TOTP status for this tenant
	var totpCfg model.UserTenantTOTP
	totpEnabled := false
	if err := common.DB().Where("user_id = ? AND tenant_id = ?", uid, tenantID).First(&totpCfg).Error; err == nil {
		totpEnabled = totpCfg.Enabled
	}

	status := SecurityStatus{
		PasswordSet:   user.PasswordHash != "",
		TwoFAEnabled:  totpEnabled,
		PasskeysCount: int(passkeysCount),
		Email:         user.Email,
		Phone:         user.Phone,
		EmailVerified: user.EmailVerified,
		PhoneVerified: user.PhoneVerified,
	}

	return c.JSON(status)
}

// ChangePasswordHandler handles password changes
func ChangePasswordHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求格式错误"})
	}

	// Validate request
	if req.NewPassword != req.ConfirmPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "新密码与确认密码不匹配"})
	}

	if len(req.NewPassword) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "新密码长度至少8位"})
	}

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}

	// Verify current password if user has one
	if user.PasswordHash != "" {
		if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "当前密码错误"})
		}
	}

	// Hash new password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "密码加密失败"})
	}

	// Update password
	if err := common.DB().Model(&user).Update("password_hash", string(hashedPassword)).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "密码更新失败"})
	}

	// Log audit
	aduit.LogAudit(uid, "修改密码", "", "", c.IP(), c.Get("User-Agent"))

	// 发送通知
	go notif.Send(
		"安全中心",
		"密码已更改",
		"您的账户密码已于最近成功更改。如果不是您本人操作，请立即联系我们。",
		"warning",
		nil,
		"系统",
		[]uint{uid},
	)

	return c.JSON(fiber.Map{"message": "密码修改成功"})
}

// UpdateContactHandler updates contact information
func UpdateContactHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var req UpdateContactRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求格式错误"})
	}

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}

	// Email changes must go through the verified flow to prevent account hijacking.
	// Direct email updates are intentionally blocked here.
	if req.Email != "" {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error": "邮箱变更需通过安全验证流程，请使用 POST /api/v1/user/security/email/change 接口",
		})
	}

	updates := make(map[string]interface{})

	// Update phone if provided with E.164 normalization
	if req.Phone != user.Phone {
		if req.Phone == "" {
			updates["phone"] = nil
			updates["phone_verified"] = false
			aduit.LogAudit(uid, "删除手机号", "", "", c.IP(), c.Get("User-Agent"))
		} else {
			// 验证和标准化手机号为E.164格式
			phoneValidator := utils.NewPhoneValidator("+86")
			normalizedPhone, err := phoneValidator.NormalizeToE164(req.Phone)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "手机号格式不正确: " + err.Error()})
			}
			updates["phone"] = normalizedPhone
			updates["phone_verified"] = false // Reset verification status
			aduit.LogAudit(uid, "修改手机号", "", normalizedPhone, c.IP(), c.Get("User-Agent"))
		}
	}

	if len(updates) > 0 {
		if err := common.DB().Model(&user).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新失败"})
		}
	}

	return c.JSON(fiber.Map{"message": "联系方式更新成功"})
}

// Disable2FAHandler disables two-factor authentication for the current tenant
func Disable2FAHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	tenantID := getTenantID(c)

	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求格式错误"})
	}

	// 加载该租户下的 TOTP 配置
	var totpCfg model.UserTenantTOTP
	if err := common.DB().Where("user_id = ? AND tenant_id = ?", uid, tenantID).First(&totpCfg).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "此租户下未配置两步验证"})
	}

	if !totpCfg.Enabled {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "两步验证未启用"})
	}

	// 解密 TOTP 密钥后再验证
	rawSecret, err := utils.DecryptTOTPSecret(totpCfg.Secret)
	if err != nil || rawSecret == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "TOTP 密钥解密失败"})
	}

	if !totp.Validate(body.Code, rawSecret) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "验证码无效"})
	}

	// 禁用该租户的 TOTP：清空密钥并设为未启用
	now := c.Context().Time()
	updates := map[string]interface{}{
		"enabled":    false,
		"secret":     "",
		"enabled_at": nil,
		"updated_at": now,
	}
	if err := common.DB().Model(&totpCfg).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "禁用失败"})
	}

	aduit.LogAudit(uid, "禁用两步验证", "", "", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "两步验证已禁用"})
}

// GetLoginHistoryHandler 返回用户登录历史
func GetLoginHistoryHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	page, err := strconv.Atoi(c.Query("page", "1"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的页码"})
	}

	pageSize, err := strconv.Atoi(c.Query("page_size", "10"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "无效的分页大小"})
	}

	if page < 1 {
		page = 1
	}
	if pageSize <= 0 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	sortOrder := c.Query("sort", "desc")

	svc := NewLoginHistoryService(common.DB())
	records, total, err := svc.ListLoginHistory(uid, page, pageSize, sortOrder)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "获取登录历史失败"})
	}

	totalPages := 0
	if total > 0 {
		totalPages = int((total + int64(pageSize) - 1) / int64(pageSize))
	}

	items := make([]fiber.Map, 0, len(records))
	for _, record := range records {
		items = append(items, fiber.Map{
			"id":         record.ID,
			"ip":         record.IP,
			"user_agent": record.UserAgent,
			"status":     record.Status,
			"created_at": record.CreatedAt,
		})
	}

	return c.JSON(fiber.Map{
		"data": items,
		"pagination": fiber.Map{
			"page":        page,
			"page_size":   pageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// SetupHandler 生成该用户在当前租户下的 TOTP 密钥并返回（含 QR 码 URL）。
// 每次调用会为该租户重新生成新密钥（覆盖旧密钥但不自动启用，需调用 VerifyHandler 确认）。
func SetupHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	tenantID := getTenantID(c)

	// 用账户邮箱作为 TOTP 的 AccountName，区分来自不同租户的密钥
	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}

	// 拼接 Issuer：系统租户直接用 "BasaltPass"，
	// 其他租户使用 "租户名 (BasaltPass)"，
	// 这样同一邮箱/手机号在不同租户注册时，验证器 App 可以区分条目。
	issuer := "BasaltPass"
	if tenantID != 0 {
		var tenant model.Tenant
		if err := common.DB().Select("name").First(&tenant, tenantID).Error; err == nil && tenant.Name != "" {
			issuer = tenant.Name + " (BasaltPass)"
		}
	}

	accountName := user.Email
	if accountName == "" {
		accountName = user.Phone
	}

	secret, err := totp.Generate(totp.GenerateOpts{
		Issuer:      issuer,
		AccountName: accountName,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// 加密 TOTP 明文密钥后再持久化
	encryptedSecret, err := utils.EncryptTOTPSecret(secret.Secret())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "密钥加密失败"})
	}

	// 在 user_tenant_totps 表中 upsert（存在则更新密钥，不存在则创建）
	// 新密钥存入后默认未启用，需用 VerifyHandler 验证后才生效
	var totpCfg model.UserTenantTOTP
	err = common.DB().Where("user_id = ? AND tenant_id = ?", uid, tenantID).First(&totpCfg).Error
	if err != nil {
		// 不存在，新建
		totpCfg = model.UserTenantTOTP{
			UserID:   uid,
			TenantID: tenantID,
			Secret:   encryptedSecret,
			Enabled:  false,
		}
		if err := common.DB().Create(&totpCfg).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "保存失败"})
		}
	} else {
		// 已存在，更新密钥并重置启用状态
		if err := common.DB().Model(&totpCfg).Updates(map[string]interface{}{
			"secret":     encryptedSecret,
			"enabled":    false,
			"enabled_at": nil,
		}).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "保存失败"})
		}
	}

	// 返回明文密钥给客户端（用于显示 QR 码），数据库中存储的是密文
	return c.JSON(fiber.Map{"secret": secret.Secret(), "qr": secret.URL()})
}

// VerifyHandler 验证 TOTP 码并为当前租户启用 2FA。
func VerifyHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	tenantID := getTenantID(c)

	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	// 加载该租户的待激活 TOTP 配置
	var totpCfg model.UserTenantTOTP
	if err := common.DB().Where("user_id = ? AND tenant_id = ?", uid, tenantID).First(&totpCfg).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请先调用 /2fa/setup 生成密钥"})
	}

	if totpCfg.Secret == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "TOTP 密钥不存在，请重新调用 /2fa/setup"})
	}

	rawSecret, err := utils.DecryptTOTPSecret(totpCfg.Secret)
	if err != nil || rawSecret == "" {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "TOTP 密钥解密失败，请重新调用 /2fa/setup"})
	}

	if !totp.Validate(body.Code, rawSecret) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "验证码无效"})
	}

	now := c.Context().Time()
	if err := common.DB().Model(&totpCfg).Updates(map[string]interface{}{
		"enabled":    true,
		"enabled_at": &now,
	}).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "启用失败"})
	}

	aduit.LogAudit(uid, "启用两步验证", "", "", c.IP(), c.Get("User-Agent"))

	return c.SendStatus(fiber.StatusNoContent)
}

// generateEmailVerificationCode 生成6位纯数字验证码（加密安全随机）
func generateEmailVerificationCode() (string, error) {
	const digits = "0123456789"
	code := make([]byte, 6)
	for i := range code {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(digits))))
		if err != nil {
			return "", err
		}
		code[i] = digits[n.Int64()]
	}
	return string(code), nil
}

// hashEmailVerificationCode 对验证码做 SHA-256 哈希，返回十六进制字符串
func hashEmailVerificationCode(code string) string {
	h := sha256.Sum256([]byte(code))
	return hex.EncodeToString(h[:])
}

// SendEmailVerificationHandler 生成验证码并发送至用户邮箱
// POST /api/v1/security/email/send
// 限制：
//   - 用户邮箱不能为空
//   - 邮箱已验证时拒绝重复发送
//   - 若上一个有效 token 在冷却时间内（60s）则拒绝重发
func SendEmailVerificationHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}
	if user.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "账户未绑定邮箱"})
	}
	if user.EmailVerified {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "邮箱已完成验证，无需重复发送"})
	}

	// 冷却检查：若已有未过期且创建时间在 60 秒内的 token，拒绝重发
	cooldownCutoff := time.Now().Add(-time.Duration(model.EmailVerificationResendCooldown) * time.Second)
	var recent model.EmailVerificationToken
	if err := common.DB().
		Where("user_id = ? AND email = ? AND used_at IS NULL AND expires_at > ? AND created_at > ?",
			uid, user.Email, time.Now(), cooldownCutoff).
		Order("created_at DESC").
		First(&recent).Error; err == nil {
		remaining := int(time.Until(recent.CreatedAt.Add(
			time.Duration(model.EmailVerificationResendCooldown) * time.Second)).Seconds())
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":              fmt.Sprintf("请等待 %d 秒后再重新发送", remaining),
			"retry_after_seconds": remaining,
		})
	}

	// 生成验证码
	code, err := generateEmailVerificationCode()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "生成验证码失败"})
	}

	// 将旧的未使用 token 标记为过期（防止旧码仍可用）
	now := time.Now()
	common.DB().Model(&model.EmailVerificationToken{}).
		Where("user_id = ? AND used_at IS NULL", uid).
		Update("expires_at", now)

	// 存入新 token（只存哈希）
	token := model.EmailVerificationToken{
		UserID:      uid,
		Email:       user.Email,
		CodeHash:    hashEmailVerificationCode(code),
		ExpiresAt:   now.Add(time.Duration(model.EmailVerificationTTL) * time.Minute),
		RequestedIP: c.IP(),
	}
	if err := common.DB().Create(&token).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "创建验证记录失败"})
	}

	// 发送验证码邮件
	secSvc := securityservice.NewService(common.DB())
	if err := secSvc.SendEmailVerificationEmail(user.Email, code); err != nil {
		// 发送失败时回滚 token，避免留下孤立记录
		common.DB().Delete(&token)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证码发送失败，请稍后重试"})
	}

	aduit.LogAudit(uid, "发送邮箱验证码", "", user.Email, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{
		"message":    "验证码已发送至邮箱，请在 30 分钟内完成验证",
		"expires_in": model.EmailVerificationTTL * 60,
	})
}

// SendPhoneVerificationHandler 生成验证码并发送至用户手机
// POST /api/v1/security/phone/resend
// 限制：
//   - 用户账户必须已绑定手机号
//   - 手机号已验证时拒绝重复发送
//   - 若上一个有效 token 在冷却时间内（60s）则拒绝重发
func SendPhoneVerificationHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}
	if user.Phone == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "账户未绑定手机号"})
	}
	if user.PhoneVerified {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "手机号已完成验证，无需重复发送"})
	}

	// 冷却检查：若已有未过期且创建时间在 60 秒内的 token，拒绝重发
	cooldownCutoff := time.Now().Add(-time.Duration(model.PhoneVerificationResendCooldown) * time.Second)
	var recent model.PhoneVerificationToken
	if err := common.DB().
		Where("user_id = ? AND phone = ? AND used_at IS NULL AND expires_at > ? AND created_at > ?",
			uid, user.Phone, time.Now(), cooldownCutoff).
		Order("created_at DESC").
		First(&recent).Error; err == nil {
		remaining := int(time.Until(recent.CreatedAt.Add(
			time.Duration(model.PhoneVerificationResendCooldown) * time.Second)).Seconds())
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error":               fmt.Sprintf("请等待 %d 秒后再重新发送", remaining),
			"retry_after_seconds": remaining,
		})
	}

	// 生成验证码
	code, err := generateEmailVerificationCode() // 复用同一个6位加密随机数字码生成函数
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "生成验证码失败"})
	}

	// 将旧的未使用 token 标记为过期（防止旧码仍可用）
	now := time.Now()
	common.DB().Model(&model.PhoneVerificationToken{}).
		Where("user_id = ? AND used_at IS NULL", uid).
		Update("expires_at", now)

	// 存入新 token（只存哈希）
	token := model.PhoneVerificationToken{
		UserID:      uid,
		Phone:       user.Phone,
		CodeHash:    hashEmailVerificationCode(code), // 同 SHA-256 哈希
		ExpiresAt:   now.Add(time.Duration(model.PhoneVerificationTTL) * time.Minute),
		RequestedIP: c.IP(),
	}
	if err := common.DB().Create(&token).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "创建验证记录失败"})
	}

	// 发送验证码短信
	secSvc := securityservice.NewService(common.DB())
	if err := secSvc.SendPhoneVerificationSMS(user.Phone, code); err != nil {
		// 发送失败时回滚 token，避免留下孤立记录
		common.DB().Delete(&token)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证码发送失败，请稍后重试"})
	}

	aduit.LogAudit(uid, "发送手机验证码", "", user.Phone, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{
		"message":    "验证码已发送至手机，请在 10 分钟内完成验证",
		"expires_in": model.PhoneVerificationTTL * 60,
	})
}

// VerifyEmailHandler 验证用户提交的邮箱验证码
// POST /api/v1/security/email/verify
// Body: {"code": "123456"}
func VerifyEmailHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil || body.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请提供验证码"})
	}

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}
	if user.EmailVerified {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "邮箱已完成验证"})
	}

	// 查找最新的有效 token（未使用、未过期）
	var token model.EmailVerificationToken
	if err := common.DB().
		Where("user_id = ? AND email = ? AND used_at IS NULL AND expires_at > ?",
			uid, user.Email, time.Now()).
		Order("created_at DESC").
		First(&token).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "验证码无效或已过期，请重新发送"})
	}

	// 检查尝试次数
	if token.AttemptCount >= model.EmailVerificationMaxAttempts {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": "验证码尝试次数过多，请重新发送获取新验证码",
		})
	}

	// 递增尝试次数（先记录，防止枚举攻击）
	common.DB().Model(&token).UpdateColumn("attempt_count", token.AttemptCount+1)

	// 比对哈希（常量时间比较由 sha256 哈希输出长度固定保证枚举无法加速）
	if hashEmailVerificationCode(body.Code) != token.CodeHash {
		remaining := model.EmailVerificationMaxAttempts - (token.AttemptCount + 1)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             "验证码错误",
			"attempts_remaining": remaining,
		})
	}

	// 验证通过：标记 token 已使用，并更新用户邮箱验证状态（事务）
	now := time.Now()
	tx := common.DB().Begin()
	if err := tx.Model(&token).Updates(map[string]interface{}{"used_at": &now}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败，请重试"})
	}
	if err := tx.Model(&user).Updates(map[string]interface{}{
		"email_verified":    true,
		"email_verified_at": &now,
	}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败，请重试"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败，请重试"})
	}

	aduit.LogAudit(uid, "邮箱验证成功", "", user.Email, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "邮箱验证成功"})
}

// 导出TOTP校验函数
func ValidateTOTP(secret, code string) bool {
	return totp.Validate(code, secret)
}

// VerifyPhoneHandler 验证用户提交的手机验证码
// POST /api/v1/security/phone/verify
// Body: {"code": "XXXXXX"}
func VerifyPhoneHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil || body.Code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请提供验证码"})
	}

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}
	if user.PhoneVerified {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "手机号已完成验证"})
	}

	// 查找最新的有效 token（未使用、未过期，且与当前绑定手机号匹配）
	var token model.PhoneVerificationToken
	if err := common.DB().
		Where("user_id = ? AND phone = ? AND used_at IS NULL AND expires_at > ?",
			uid, user.Phone, time.Now()).
		Order("created_at DESC").
		First(&token).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "验证码无效或已过期，请重新发送"})
	}

	// 检查尝试次数
	if token.AttemptCount >= model.PhoneVerificationMaxAttempts {
		return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{
			"error": "验证码尝试次数过多，请重新发送获取新验证码",
		})
	}

	// 递增尝试次数（先记录，防止并发枚举攻击）
	common.DB().Model(&token).UpdateColumn("attempt_count", token.AttemptCount+1)

	// 比对哈希
	if hashEmailVerificationCode(body.Code) != token.CodeHash {
		remaining := model.PhoneVerificationMaxAttempts - (token.AttemptCount + 1)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":              "验证码错误",
			"attempts_remaining": remaining,
		})
	}

	// 验证通过：标记 token 已使用，并更新用户手机验证状态（事务）
	now := time.Now()
	tx := common.DB().Begin()
	if err := tx.Model(&token).Updates(map[string]interface{}{"used_at": &now}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败，请重试"})
	}
	if err := tx.Model(&user).Updates(map[string]interface{}{
		"phone_verified": true,
	}).Error; err != nil {
		tx.Rollback()
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败，请重试"})
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败，请重试"})
	}

	aduit.LogAudit(uid, "手机验证成功", "", user.Phone, c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "手机验证成功"})
}

// 新增安全功能处理器

// StartEmailChangeHandler 开始邮箱变更流程
func StartEmailChangeHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var req securityservice.EmailChangeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数无效",
		})
	}

	// 获取安全服务
	securitySvc := securityservice.NewService(common.DB())

	// 获取客户端信息
	clientIP := c.IP()
	deviceHash := c.Get("X-Device-Hash", "")

	if err := securitySvc.StartEmailChange(uid, &req, clientIP, deviceHash); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "邮箱变更请求已发送，请检查新邮箱中的验证邮件",
	})
}

// EnhancedChangePasswordHandler 增强版密码修改处理器
func EnhancedChangePasswordHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var req securityservice.PasswordChangeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "请求参数无效",
		})
	}

	// 获取安全服务
	securitySvc := securityservice.NewService(common.DB())

	// 获取客户端信息
	clientIP := c.IP()
	deviceHash := c.Get("X-Device-Hash", "")

	if err := securitySvc.ChangePassword(uid, &req, clientIP, deviceHash); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "密码修改成功",
	})
}
