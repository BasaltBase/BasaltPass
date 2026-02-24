package verification

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	emailservice "basaltpass-backend/internal/service/email"
	"basaltpass-backend/internal/utils"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	mathrand "math/rand"
	"strings"
	"time"

	"gorm.io/gorm"
)

const (
	ServerPepper = "basaltpass_verification_pepper_2024" // 全局胡椒值
)

// Service 验证码服务
type Service struct {
	config   *RiskLevelConfig
	emailSvc *emailservice.Service
}

// NewService 创建验证码服务
func NewService() *Service {
	cfg := config.Get()
	emailSvc, _ := emailservice.NewServiceFromConfig(cfg) // 使用全局配置
	return &Service{
		config:   DefaultConfig(),
		emailSvc: emailSvc,
	}
}

// StartSignupRequest 开始注册请求
type StartSignupRequest struct {
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Username string `json:"username"`
	Password string `json:"password"`
	TenantID uint   `json:"tenant_id"` // 租户ID，0表示平台用户

	// 风控信息
	IP        string `json:"-"` // 通过中间件设置
	UserAgent string `json:"-"`
	DeviceID  string `json:"device_id,omitempty"`
}

// StartSignupResponse 开始注册响应
type StartSignupResponse struct {
	SignupID string `json:"signup_id"`
	Message  string `json:"message"`
}

// SendVerificationRequest 发送验证码请求
type SendVerificationRequest struct {
	SignupID string                 `json:"signup_id"`
	Channel  model.ChallengeChannel `json:"channel"`          // email/sms
	Target   string                 `json:"target,omitempty"` // 可选，用于更换邮箱/手机
}

// VerifyCodeRequest 验证码验证请求
type VerifyCodeRequest struct {
	SignupID string `json:"signup_id"`
	Code     string `json:"code"`
}

// CompleteSignupRequest 完成注册请求
type CompleteSignupRequest struct {
	SignupID string `json:"signup_id"`
}

// StartSignup 开始注册流程
func (s *Service) StartSignup(req StartSignupRequest) (*StartSignupResponse, error) {
	if req.Email == "" && req.Phone == "" {
		return nil, errors.New("email or phone required")
	}
	if req.Password == "" {
		return nil, errors.New("password required")
	}

	// 密码强度检查
	if len(req.Password) < 6 {
		return nil, errors.New("password must be at least 6 characters")
	}

	// 标准化邮箱和手机号
	normalizedEmail := strings.ToLower(strings.TrimSpace(req.Email))
	var normalizedPhone string
	if req.Phone != "" {
		phoneValidator := utils.NewPhoneValidator("+86")
		normalized, err := phoneValidator.NormalizeToE164(req.Phone)
		if err != nil {
			return nil, fmt.Errorf("invalid phone number: %v", err)
		}
		normalizedPhone = normalized
	}

	// 风控评估
	riskLevel := s.assessRisk(req.IP, req.UserAgent, normalizedEmail)

	// 生成注册会话ID
	signupID, err := s.generateSignupID()
	if err != nil {
		return nil, err
	}

	// 密码哈希
	passwordHash, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// 创建或更新注册会话
	config := s.config.GetConfigByRiskLevel(riskLevel)
	expiresAt := time.Now().Add(config.GetSignupSessionTTLDuration())

	pendingSignup := &model.PendingSignup{
		ID:            signupID,
		Email:         normalizedEmail,
		Phone:         normalizedPhone,
		Username:      req.Username,
		PasswordHash:  passwordHash,
		Status:        model.SignupStatusPendingEmail,
		ExpiresAt:     expiresAt,
		IPHash:        s.hashWithSalt(req.IP, signupID),
		DeviceIDHash:  s.hashWithSalt(req.DeviceID, signupID),
		UserAgentHash: s.hashWithSalt(req.UserAgent, signupID),
		RiskLevel:     riskLevel,
		TenantID:      req.TenantID, // 保存租户ID
	}

	if err := common.DB().Create(pendingSignup).Error; err != nil {
		return nil, err
	}

	return &StartSignupResponse{
		SignupID: signupID,
		Message:  "If eligible, we will send a verification code.",
	}, nil
}

// SendVerificationCode 发送验证码
func (s *Service) SendVerificationCode(req SendVerificationRequest) error {
	// 获取注册会话
	var pendingSignup model.PendingSignup
	if err := common.DB().Where("id = ? AND status IN ?", req.SignupID,
		[]model.SignupStatus{model.SignupStatusPendingEmail, model.SignupStatusPendingPhone}).
		First(&pendingSignup).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 统一响应，不暴露是否存在
			return nil
		}
		return err
	}

	// 检查是否过期
	if time.Now().After(pendingSignup.ExpiresAt) {
		common.DB().Model(&pendingSignup).Update("status", model.SignupStatusExpired)
		return nil // 统一响应
	}

	// 获取配置
	config := s.config.GetConfigByRiskLevel(pendingSignup.RiskLevel)

	// 确定发送目标
	var target string
	if req.Target != "" {
		target = req.Target
	} else {
		if req.Channel == model.ChallengeChannelEmail {
			target = pendingSignup.Email
		} else {
			target = pendingSignup.Phone
		}
	}

	if target == "" {
		return errors.New("target not specified")
	}

	// 检查现有的活跃挑战
	var existingChallenge model.VerificationChallenge
	err := common.DB().Where("signup_id = ? AND channel = ? AND target = ? AND status = ?",
		req.SignupID, req.Channel, target, model.ChallengeStatusActive).
		First(&existingChallenge).Error

	if err == nil {
		// 存在活跃挑战，检查重发条件
		return s.handleResend(&existingChallenge, &config)
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	// 创建新的验证码挑战
	return s.createNewChallenge(req.SignupID, req.Channel, target, &config)
}

// VerifyCode 验证验证码
func (s *Service) VerifyCode(req VerifyCodeRequest) error {
	// 获取活跃的验证码挑战
	var challenge model.VerificationChallenge
	if err := common.DB().Where("signup_id = ? AND status = ?",
		req.SignupID, model.ChallengeStatusActive).
		First(&challenge).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("verification code not found or expired")
		}
		return err
	}

	// 检查是否可以尝试
	if !challenge.CanAttempt() {
		if challenge.IsExpired() {
			common.DB().Model(&challenge).Update("status", model.ChallengeStatusExpired)
			return errors.New("verification code expired")
		}
		if challenge.IsLocked() {
			return errors.New("verification temporarily locked, please try again later")
		}
		if challenge.AttemptCount >= challenge.MaxAttempts {
			return errors.New("maximum attempts exceeded")
		}
	}

	// 增加尝试次数（无论成功失败）
	challenge.AttemptCount++

	// 验证验证码
	isValid := s.verifyCode(req.Code, challenge.CodeHash, challenge.CodeSalt)

	if !isValid {
		// 验证失败，检查是否需要锁定
		if challenge.AttemptCount >= challenge.MaxAttempts {
			lockUntil := time.Now().Add(GetLockDuration())
			challenge.LockedUntil = &lockUntil
		}

		// 更新挑战状态
		common.DB().Save(&challenge)

		// 添加延迟防暴力破解
		time.Sleep(time.Millisecond * time.Duration(300+mathrand.Intn(500))) // 300-800ms 随机延迟

		return errors.New("invalid verification code")
	}

	// 验证成功，标记挑战为已验证
	challenge.Status = model.ChallengeStatusVerified
	common.DB().Save(&challenge)

	// 更新注册会话状态
	var pendingSignup model.PendingSignup
	if err := common.DB().Where("id = ?", req.SignupID).First(&pendingSignup).Error; err != nil {
		return err
	}

	// 根据验证的渠道更新状态
	if challenge.Channel == model.ChallengeChannelEmail {
		pendingSignup.Status = model.SignupStatusCompleted // 假设只需要邮箱验证
	} else if challenge.Channel == model.ChallengeChannelSMS {
		pendingSignup.Status = model.SignupStatusCompleted
	}

	return common.DB().Save(&pendingSignup).Error
}

// CompleteSignup 完成注册
func (s *Service) CompleteSignup(req CompleteSignupRequest) (*model.User, error) {
	var pendingSignup model.PendingSignup
	if err := common.DB().Where("id = ? AND status = ?",
		req.SignupID, model.SignupStatusCompleted).First(&pendingSignup).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("signup session not found or not ready for completion")
		}
		return nil, err
	}

	// 开始事务
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 检查邮箱和租户组合是否已被注册（同一邮箱可以在不同租户注册）
	var existingUser model.User
	if err := tx.Where("email = ? AND tenant_id = ?", pendingSignup.Email, pendingSignup.TenantID).First(&existingUser).Error; err == nil {
		tx.Rollback()
		return nil, errors.New("email already registered in this tenant")
	}

	// 检查是否是第一个用户
	var userCount int64
	if err := tx.Model(&model.User{}).Count(&userCount).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	isFirstUser := userCount == 0

	// 创建正式用户
	user := &model.User{
		Email:         pendingSignup.Email,
		Phone:         pendingSignup.Phone,
		PasswordHash:  pendingSignup.PasswordHash,
		Nickname:      pendingSignup.Username,
		TenantID:      pendingSignup.TenantID, // 设置租户ID
		EmailVerified: true,                   // 已通过邮箱验证
		PhoneVerified: pendingSignup.Phone != "" && pendingSignup.Status == model.SignupStatusCompleted,
	}

	// 如果是第一个用户，设置为系统管理员
	if isFirstUser {
		t := true
		user.IsSystemAdmin = &t
		// TODO: 实现setupFirstUserAsGlobalAdmin逻辑
		// 暂时跳过，用户模型中已设置IsSystemAdmin
	}

	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 自动处理租户邀请（如果用户存在未处理的邀请记录）
	var invitations []model.TenantInvitation
	if err := tx.Where("email = ? AND status = ?", user.Email, "pending").Find(&invitations).Error; err == nil && len(invitations) > 0 {
		for _, inv := range invitations {
			// 更新邀请状态
			inv.Status = "accepted"
			tx.Save(&inv)

			// 如果用户的主租户未设置或为 0，且当前邀请属于某个租户，则可以更新主租户
			if user.TenantID == 0 {
				user.TenantID = inv.TenantID
				tx.Save(user)
			}

			// 检查是否已经是该租户成员
			var cnt int64
			tx.Model(&model.TenantUser{}).Where("user_id = ? AND tenant_id = ?", user.ID, inv.TenantID).Count(&cnt)
			if cnt == 0 {
				tenantUser := model.TenantUser{
					UserID:   user.ID,
					TenantID: inv.TenantID,
					Role:     inv.Role,
				}
				tx.Create(&tenantUser)
			}
		}
	}

	// 清理：标记注册会话为已完成，使相关挑战失效
	tx.Model(&pendingSignup).Update("status", model.SignupStatusCompleted)
	tx.Model(&model.VerificationChallenge{}).Where("signup_id = ? AND status = ?",
		req.SignupID, model.ChallengeStatusActive).Update("status", model.ChallengeStatusInvalidated)

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return user, nil
}

// 私有辅助方法

// generateSignupID 生成随机的注册会话ID
func (s *Service) generateSignupID() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// assessRisk 评估风险等级
func (s *Service) assessRisk(ip, userAgent, email string) string {
	// 这里实现简单的风险评估逻辑
	// 实际项目中可以集成更复杂的风控系统

	// 检查IP是否为数据中心或代理
	if strings.Contains(userAgent, "bot") || strings.Contains(userAgent, "crawler") {
		return "high"
	}

	// 检查是否为常见的临时邮箱域名
	tempEmailDomains := []string{"10minutemail.com", "guerrillamail.com", "tempmail.org"}
	for _, domain := range tempEmailDomains {
		if strings.Contains(email, domain) {
			return "high"
		}
	}

	// 简单的IP检查（可以接入IP信誉库）
	if ip == "127.0.0.1" || strings.HasPrefix(ip, "192.168.") {
		return "low" // 内网IP
	}

	return "low" // 默认低风险
}

// hashWithSalt 使用盐值哈希
func (s *Service) hashWithSalt(data, salt string) string {
	hash := sha256.Sum256([]byte(data + salt + ServerPepper))
	return hex.EncodeToString(hash[:])
}

// generateCode 生成验证码
func (s *Service) generateCode(length int, charset string) (string, error) {
	var chars string
	if charset == "alphanumeric" {
		chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	} else {
		chars = "0123456789"
	}

	result := make([]byte, length)
	for i := range result {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			return "", err
		}
		result[i] = chars[num.Int64()]
	}

	return string(result), nil
}

// hashCode 哈希验证码
func (s *Service) hashCode(code, salt string) string {
	hash := sha256.Sum256([]byte(code + salt + ServerPepper))
	return hex.EncodeToString(hash[:])
}

// verifyCode 验证验证码（常量时间比较）
func (s *Service) verifyCode(inputCode, storedHash, salt string) bool {
	expectedHash := s.hashCode(inputCode, salt)
	return subtle.ConstantTimeCompare([]byte(expectedHash), []byte(storedHash)) == 1
}

// handleResend 处理重发逻辑
func (s *Service) handleResend(challenge *model.VerificationChallenge, config *VerificationConfig) error {
	// 检查重发条件
	if !challenge.CanResend() {
		return nil // 统一响应，不暴露具体原因
	}

	// 检查重发次数限制
	now := time.Now()

	// 检查小时限制（简化版，实际需要更精确的滑动窗口）
	if challenge.ResendCount >= config.MaxResendsPerHour {
		return nil
	}

	// 更新重发计数和下次发送时间
	challenge.ResendCount++
	challenge.NextSendAt = now.Add(config.GetResendCooldownDuration())

	// 根据配置决定是否换码
	if config.RotateCodeOnResend {
		// 生成新验证码
		newCode, err := s.generateCode(config.CodeLength, config.CodeCharset)
		if err != nil {
			return err
		}

		// 生成新的盐值
		salt, err := s.generateSalt()
		if err != nil {
			return err
		}

		challenge.CodeHash = s.hashCode(newCode, salt)
		challenge.CodeSalt = salt

		// 根据配置调整过期时间
		switch config.ExtendTTLOnResend {
		case "reset_to_full":
			challenge.ExpiresAt = now.Add(config.GetTTLDuration())
		case "add_small":
			if time.Until(challenge.ExpiresAt) < 2*time.Minute {
				challenge.ExpiresAt = now.Add(2 * time.Minute)
			}
		}

		// 根据配置重置尝试次数
		if config.ResetAttemptsOnResend {
			challenge.AttemptCount = 0
			challenge.LockedUntil = nil
		}

		// 发送新验证码
		if err := common.DB().Save(challenge).Error; err != nil {
			return err
		}
		return s.sendVerificationEmail(challenge.Target, newCode, challenge.ExpiresAt)
	}

	// 不换码，直接重发
	// 注意：这里无法获取原始验证码，需要重新设计
	// 在实际实现中，可以考虑存储加密的验证码用于重发
	return nil
}

// createNewChallenge 创建新的验证码挑战
func (s *Service) createNewChallenge(signupID string, channel model.ChallengeChannel, target string, config *VerificationConfig) error {
	// 生成验证码
	code, err := s.generateCode(config.CodeLength, config.CodeCharset)
	if err != nil {
		return err
	}

	// 生成盐值
	salt, err := s.generateSalt()
	if err != nil {
		return err
	}

	// 创建挑战
	challenge := &model.VerificationChallenge{
		SignupID:     signupID,
		Channel:      channel,
		Target:       target,
		CodeHash:     s.hashCode(code, salt),
		CodeSalt:     salt,
		ExpiresAt:    time.Now().Add(config.GetTTLDuration()),
		MaxAttempts:  config.MaxAttempts,
		NextSendAt:   time.Now().Add(config.GetResendCooldownDuration()),
		Status:       model.ChallengeStatusActive,
		ResendCount:  1,
		AttemptCount: 0,
	}

	if err := common.DB().Create(challenge).Error; err != nil {
		return err
	}

	// 发送验证码
	if channel == model.ChallengeChannelEmail {
		return s.sendVerificationEmail(target, code, challenge.ExpiresAt)
	}

	// TODO: 实现短信发送
	return errors.New("SMS sending not implemented yet")
}

// generateSalt 生成盐值
func (s *Service) generateSalt() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// sendVerificationEmail 发送验证邮件
func (s *Service) sendVerificationEmail(email, code string, expiresAt time.Time) error {
	subject := "BasaltPass - Verification Code"

	// 计算剩余有效时间
	remaining := time.Until(expiresAt)
	minutes := int(remaining.Minutes())

	// 纯文本版本
	textBody := fmt.Sprintf(`
Dear User,

Your BasaltPass verification code is: %s

This verification code will expire in %d minutes.

If this request did not come from you, please safely ignore this email.

Best regards,
The BasaltPass Team
`, code, minutes)

	// HTML版本 - 现代专业样式 (无 Emoji)
	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BasaltPass Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f7f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        
        <!-- 头部 -->
        <div style="padding: 32px 40px; border-bottom: 1px solid #edf2f7; text-align: center;">
            <h1 style="color: #1a202c; font-size: 24px; font-weight: 600; margin: 0; letter-spacing: -0.5px;">BasaltPass</h1>
        </div>
        
        <!-- 主内容 -->
        <div style="padding: 40px;">
            <h2 style="color: #2d3748; font-size: 20px; font-weight: 600; margin: 0 0 24px; text-align: center;">Verification Code</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px; text-align: center;">
                You are trying to register a BasaltPass account. Please use the verification code below to complete the process:
            </p>
            
            <!-- 验证码框 -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 0 auto 32px; max-width: 320px; text-align: center;">
                <div style="color: #2b6cb0; font-size: 36px; font-weight: 700; letter-spacing: 8px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;">
                    %s
                </div>
            </div>
            
            <!-- 提示信息 -->
            <div style="margin: 0 0 32px; text-align: center;">
                <p style="color: #718096; font-size: 14px; margin: 0;">
                    This verification code will expire in <strong style="color: #e53e3e; font-weight: 600;">%d minutes</strong>.
                </p>
            </div>
            
            <p style="color: #a0aec0; font-size: 13px; line-height: 1.6; margin: 0; text-align: center;">
                If you did not request this verification code, please disregard this email. For the security of your account, do not share this code with anyone.
            </p>
        </div>
        
        <!-- 页脚 -->
        <div style="background-color: #f7fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #edf2f7;">
            <p style="color: #a0aec0; font-size: 13px; margin: 0;">
                &copy; %d BasaltPass. All rights reserved.<br>
                This is an automated message, please do not reply directly.
            </p>
        </div>
    </div>
</body>
</html>`, code, minutes, time.Now().Year())

	// 发送验证码
	msg := &emailservice.Message{
		To:       []string{email},
		Subject:  subject,
		TextBody: textBody,
		HTMLBody: htmlBody, // 添加HTML版本
	}
	_, err := s.emailSvc.SendWithLogging(context.Background(), msg, nil, "email_verification")
	return err
}
