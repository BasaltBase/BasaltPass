package security

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/public/aduit"
	"basaltpass-backend/internal/public/notification"

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

// UpdateContactRequest for contact info update
type UpdateContactRequest struct {
	Email string `json:"email,omitempty"`
	Phone string `json:"phone,omitempty"`
}

// GetSecurityStatusHandler returns user's security status
func GetSecurityStatusHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}

	// Count passkeys
	var passkeysCount int64
	common.DB().Model(&model.Passkey{}).Where("user_id = ?", uid).Count(&passkeysCount)

	status := SecurityStatus{
		PasswordSet:   user.PasswordHash != "",
		TwoFAEnabled:  user.TwoFAEnabled,
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
	go notification.Send(
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

	updates := make(map[string]interface{})

	// Update email if provided
	if req.Email != "" && req.Email != user.Email {
		updates["email"] = req.Email
		updates["email_verified"] = false // Reset verification status
		aduit.LogAudit(uid, "修改邮箱", "", req.Email, c.IP(), c.Get("User-Agent"))
	}

	// Update phone if provided
	if req.Phone != user.Phone {
		if req.Phone == "" {
			updates["phone"] = nil
			updates["phone_verified"] = false
		} else {
			updates["phone"] = req.Phone
			updates["phone_verified"] = false // Reset verification status
		}
		aduit.LogAudit(uid, "修改手机号", "", req.Phone, c.IP(), c.Get("User-Agent"))
	}

	if len(updates) > 0 {
		if err := common.DB().Model(&user).Updates(updates).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "更新失败"})
		}
	}

	return c.JSON(fiber.Map{"message": "联系方式更新成功"})
}

// Disable2FAHandler disables two-factor authentication
func Disable2FAHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求格式错误"})
	}

	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "用户不存在"})
	}

	if !user.TwoFAEnabled {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "两步验证未启用"})
	}

	// Verify TOTP code
	if !totp.Validate(body.Code, user.TOTPSecret) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "验证码无效"})
	}

	// Disable 2FA
	updates := map[string]interface{}{
		"two_fa_enabled": false,
		"totp_secret":    "",
	}
	if err := common.DB().Model(&user).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "禁用失败"})
	}

	// Log audit
	aduit.LogAudit(uid, "禁用两步验证", "", "", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "两步验证已禁用"})
}

// SetupHandler generates TOTP secret and returns it.
func SetupHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	secret, err := totp.Generate(totp.GenerateOpts{Issuer: "BasaltPass", AccountName: "user"})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	common.DB().Model(&model.User{}).Where("id = ?", uid).Updates(map[string]interface{}{"totp_secret": secret.Secret()})
	return c.JSON(fiber.Map{"secret": secret.Secret(), "qr": secret.URL()})
}

// VerifyHandler verifies submitted TOTP code and enables 2FA.
func VerifyHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)
	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	var user model.User
	if err := common.DB().First(&user, uid).Error; err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	ok := totp.Validate(body.Code, user.TOTPSecret)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid code"})
	}

	// Enable 2FA and log audit
	common.DB().Model(&user).Update("two_fa_enabled", true)
	aduit.LogAudit(uid, "启用两步验证", "", "", c.IP(), c.Get("User-Agent"))

	return c.SendStatus(fiber.StatusNoContent)
}

// SendEmailVerificationHandler sends email verification (mock implementation)
func SendEmailVerificationHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	// In a real implementation, you would:
	// 1. Generate a verification token
	// 2. Send email with verification link
	// 3. Store token in database with expiration

	// For now, just log the action
	aduit.LogAudit(uid, "发送邮箱验证", "", "", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "验证邮件已发送"})
}

// SendPhoneVerificationHandler sends phone verification (mock implementation)
func SendPhoneVerificationHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	// In a real implementation, you would:
	// 1. Generate a verification code
	// 2. Send SMS with verification code
	// 3. Store code in database with expiration

	// For now, just log the action
	aduit.LogAudit(uid, "发送手机验证", "", "", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "验证短信已发送"})
}

// VerifyEmailHandler verifies email verification code
func VerifyEmailHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	// Mock implementation - in real app, verify token from email link
	if err := common.DB().Model(&model.User{}).Where("id = ?", uid).Update("email_verified", true).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败"})
	}

	aduit.LogAudit(uid, "邮箱验证成功", "", "", c.IP(), c.Get("User-Agent"))

	return c.JSON(fiber.Map{"message": "邮箱验证成功"})
}

// 导出TOTP校验函数
func ValidateTOTP(secret, code string) bool {
	return totp.Validate(code, secret)
}

// VerifyPhoneHandler verifies phone verification code
func VerifyPhoneHandler(c *fiber.Ctx) error {
	uid := c.Locals("userID").(uint)

	var body struct {
		Code string `json:"code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "请求格式错误"})
	}

	// Mock implementation - in real app, verify SMS code
	if body.Code == "123456" { // Mock verification code
		if err := common.DB().Model(&model.User{}).Where("id = ?", uid).Update("phone_verified", true).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "验证失败"})
		}

		aduit.LogAudit(uid, "手机验证成功", "", "", c.IP(), c.Get("User-Agent"))

		return c.JSON(fiber.Map{"message": "手机验证成功"})
	}

	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "验证码错误"})
}
