package security

import (
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	emailservice "basaltpass-backend/internal/service/email"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Service 安全服务
type Service struct {
	db       *gorm.DB
	emailSvc *emailservice.Service
}

// NewService 创建安全服务
func NewService(db *gorm.DB) *Service {
	cfg := config.Get()
	emailSvc, _ := emailservice.NewServiceFromConfig(cfg)
	return &Service{
		db:       db,
		emailSvc: emailSvc,
	}
}

// EmailChangeRequest 邮箱变更请求
type EmailChangeRequest struct {
	NewEmail        string `json:"new_email" validate:"required,email"`
	CurrentPassword string `json:"current_password"` // re-auth验证
}

// PasswordChangeRequest 密码修改请求
type PasswordChangeRequest struct {
	CurrentPassword string `json:"current_password" validate:"required"`
	NewPassword     string `json:"new_password" validate:"required,min=8"`
}

// PasswordResetRequest 密码重置请求
type PasswordResetRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// PasswordResetConfirmRequest 密码重置确认请求
type PasswordResetConfirmRequest struct {
	Token       string `json:"token" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

// 常量定义
const (
	EmailChangeTokenLifetime   = 30 * time.Minute
	PasswordResetTokenLifetime = 60 * time.Minute
	SecurityOperationCooldown  = 5 * time.Minute

	// 安全操作类型
	OpPasswordChange = "password_change"
	OpEmailChange    = "email_change"
	OpPasswordReset  = "password_reset"
)

// StartEmailChange 开始邮箱变更流程
func (s *Service) StartEmailChange(userID uint, req *EmailChangeRequest, clientIP, deviceHash string) error {
	// 1. 获取用户信息
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return errors.New("用户不存在")
	}

	// 2. Re-auth验证 - 验证当前密码
	if req.CurrentPassword == "" {
		return errors.New("请输入当前密码进行身份验证")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		// 记录失败的安全操作
		s.recordSecurityOperation(userID, OpEmailChange, clientIP, deviceHash, false)
		return errors.New("当前密码错误")
	}

	// 3. 检查新邮箱是否已存在
	var existingUser model.User
	if err := s.db.Where("email = ? AND id != ?", req.NewEmail, userID).First(&existingUser).Error; err == nil {
		return errors.New("该邮箱已被其他账户使用")
	}

	// 4. 检查是否在冷却期内
	if err := s.checkSecurityCooldown(userID, OpEmailChange); err != nil {
		return err
	}

	// 5. 取消之前的邮箱变更请求
	s.db.Model(&model.EmailChangeRequest{}).
		Where("user_id = ? AND status = ?", userID, model.EmailChangePending).
		Update("status", model.EmailChangeCancelled)

	// 6. 生成安全令牌
	token, err := s.generateSecureToken()
	if err != nil {
		return fmt.Errorf("生成令牌失败: %v", err)
	}

	tokenHash := s.hashToken(token)

	// 7. 创建邮箱变更请求
	changeReq := &model.EmailChangeRequest{
		UserID:      userID,
		NewEmail:    req.NewEmail,
		TokenHash:   tokenHash,
		ExpiresAt:   time.Now().Add(EmailChangeTokenLifetime),
		Status:      model.EmailChangePending,
		RequestedIP: s.hashIP(clientIP),
		DeviceHash:  deviceHash,
	}

	if err := s.db.Create(changeReq).Error; err != nil {
		return fmt.Errorf("创建变更请求失败: %v", err)
	}

	// 8. 发送验证邮件到新邮箱
	if err := s.sendEmailChangeVerificationEmail(req.NewEmail, token, user.Email); err != nil {
		// 邮件发送失败但不要影响流程，记录错误
		fmt.Printf("发送验证邮件失败: %v\n", err)
	}

	// 9. 发送通知邮件到旧邮箱
	if err := s.sendEmailChangeNotificationEmail(user.Email, req.NewEmail, token); err != nil {
		// 邮件发送失败但不要影响流程，记录错误
		fmt.Printf("发送通知邮件失败: %v\n", err)
	}

	// 10. 记录成功的安全操作
	s.recordSecurityOperation(userID, OpEmailChange, clientIP, deviceHash, true)

	return nil
}

// ConfirmEmailChange 确认邮箱变更
func (s *Service) ConfirmEmailChange(token string) error {
	tokenHash := s.hashToken(token)

	// 1. 查找变更请求
	var changeReq model.EmailChangeRequest
	if err := s.db.Preload("User").Where("token_hash = ?", tokenHash).First(&changeReq).Error; err != nil {
		return errors.New("无效的验证链接")
	}

	// 2. 检查请求状态
	if !changeReq.IsValid() {
		return errors.New("验证链接已过期或无效")
	}

	// 3. 再次检查邮箱唯一性
	var existingUser model.User
	if err := s.db.Where("email = ? AND id != ?", changeReq.NewEmail, changeReq.UserID).First(&existingUser).Error; err == nil {
		changeReq.Status = model.EmailChangeCancelled
		s.db.Save(&changeReq)
		return errors.New("该邮箱已被其他账户使用")
	}

	// 4. 开始事务更新
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 更新用户邮箱
		now := time.Now()
		if err := tx.Model(&changeReq.User).Updates(map[string]interface{}{
			"email":             changeReq.NewEmail,
			"email_verified":    true,
			"email_verified_at": &now,
		}).Error; err != nil {
			return err
		}

		// 标记变更请求为已确认
		changeReq.Status = model.EmailChangeConfirmed
		if err := tx.Save(&changeReq).Error; err != nil {
			return err
		}

		// 发送确认邮件到新邮箱
		go s.sendEmailChangeSuccessEmail(changeReq.NewEmail, changeReq.User.Email)

		return nil
	})
}

// CancelEmailChange 取消邮箱变更
func (s *Service) CancelEmailChange(token string) error {
	tokenHash := s.hashToken(token)

	var changeReq model.EmailChangeRequest
	if err := s.db.Where("token_hash = ?", tokenHash).First(&changeReq).Error; err != nil {
		return errors.New("无效的取消链接")
	}

	if changeReq.Status != model.EmailChangePending {
		return errors.New("该变更请求不能被取消")
	}

	changeReq.Status = model.EmailChangeCancelled
	return s.db.Save(&changeReq).Error
}

// ChangePassword 修改密码
func (s *Service) ChangePassword(userID uint, req *PasswordChangeRequest, clientIP, deviceHash string) error {
	// 1. 获取用户信息
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		return errors.New("用户不存在")
	}

	// 2. 验证当前密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.CurrentPassword)); err != nil {
		s.recordSecurityOperation(userID, OpPasswordChange, clientIP, deviceHash, false)
		return errors.New("当前密码错误")
	}

	// 3. 检查新密码强度
	if err := s.validatePasswordStrength(req.NewPassword); err != nil {
		return err
	}

	// 4. 检查是否在冷却期内
	if err := s.checkSecurityCooldown(userID, OpPasswordChange); err != nil {
		return err
	}

	// 5. 生成新密码哈希
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败: %v", err)
	}

	// 6. 更新密码
	now := time.Now()
	if err := s.db.Model(&user).Updates(map[string]interface{}{
		"password_hash":       string(newHash),
		"password_changed_at": &now,
	}).Error; err != nil {
		return fmt.Errorf("密码更新失败: %v", err)
	}

	// 7. 记录成功的安全操作
	s.recordSecurityOperation(userID, OpPasswordChange, clientIP, deviceHash, true)

	// 8. 发送安全通知邮件
	go s.sendPasswordChangeNotificationEmail(user.Email)

	// TODO: 撤销其他会话 (需要会话管理系统)

	return nil
}

// StartPasswordReset 开始密码重置流程
func (s *Service) StartPasswordReset(req *PasswordResetRequest, clientIP, deviceHash string) error {
	// 无论邮箱是否存在都返回相同消息，防止邮箱枚举
	email := strings.ToLower(strings.TrimSpace(req.Email))

	var user model.User
	if err := s.db.Where("email = ?", email).First(&user).Error; err != nil {
		// 邮箱不存在，但不暴露这个信息
		return nil
	}

	// 检查重置频率限制
	var recentTokens int64
	oneDayAgo := time.Now().Add(-24 * time.Hour)
	s.db.Model(&model.PasswordResetToken{}).
		Where("user_id = ? AND created_at > ?", user.ID, oneDayAgo).
		Count(&recentTokens)

	if recentTokens >= 5 { // 每天最多5次
		return nil // 不暴露限制信息
	}

	// 生成重置令牌
	token, err := s.generateSecureToken()
	if err != nil {
		return nil // 不暴露内部错误
	}

	tokenHash := s.hashToken(token)

	// 创建重置令牌记录
	resetToken := &model.PasswordResetToken{
		UserID:      user.ID,
		TokenHash:   tokenHash,
		ExpiresAt:   time.Now().Add(PasswordResetTokenLifetime),
		RequestedIP: s.hashIP(clientIP),
		DeviceHash:  deviceHash,
	}

	if err := s.db.Create(resetToken).Error; err != nil {
		return nil // 不暴露内部错误
	}

	// 发送重置邮件
	go s.sendPasswordResetEmail(user.Email, token)

	return nil
}

// ConfirmPasswordReset 确认密码重置
func (s *Service) ConfirmPasswordReset(req *PasswordResetConfirmRequest, clientIP, deviceHash string) error {
	tokenHash := s.hashToken(req.Token)

	// 查找重置令牌
	var resetToken model.PasswordResetToken
	if err := s.db.Preload("User").Where("token_hash = ?", tokenHash).First(&resetToken).Error; err != nil {
		return errors.New("无效的重置链接")
	}

	// 检查令牌有效性
	if !resetToken.IsValid() {
		return errors.New("重置链接已过期或已使用")
	}

	// 验证新密码强度
	if err := s.validatePasswordStrength(req.NewPassword); err != nil {
		return err
	}

	// 生成新密码哈希
	newHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败: %v", err)
	}

	// 开始事务处理
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 标记令牌为已使用
		resetToken.MarkAsUsed()
		if err := tx.Save(&resetToken).Error; err != nil {
			return err
		}

		// 更新用户密码
		now := time.Now()
		if err := tx.Model(&resetToken.User).Updates(map[string]interface{}{
			"password_hash":       string(newHash),
			"password_changed_at": &now,
		}).Error; err != nil {
			return err
		}

		// 记录安全操作
		s.recordSecurityOperation(resetToken.UserID, OpPasswordReset, clientIP, deviceHash, true)

		// 发送密码重置成功通知
		go s.sendPasswordResetSuccessEmail(resetToken.User.Email)

		// TODO: 撤销所有会话

		return nil
	})
}

// 辅助方法

// generateSecureToken 生成安全令牌
func (s *Service) generateSecureToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashToken 对令牌进行哈希
func (s *Service) hashToken(token string) string {
	hash := sha256.Sum256([]byte(token))
	return hex.EncodeToString(hash[:])
}

// hashIP 对IP进行哈希
func (s *Service) hashIP(ip string) string {
	// 对IPv4保留前3段，IPv6保留前64位
	if parsedIP := net.ParseIP(ip); parsedIP != nil {
		if ipv4 := parsedIP.To4(); ipv4 != nil {
			// IPv4: 保留前3段，最后一段哈希
			parts := strings.Split(ip, ".")
			if len(parts) == 4 {
				hasher := sha256.Sum256([]byte(parts[3]))
				return fmt.Sprintf("%s.%s.%s.%x", parts[0], parts[1], parts[2], hasher[:4])
			}
		}
	}

	// 其他情况直接哈希
	hash := sha256.Sum256([]byte(ip))
	return hex.EncodeToString(hash[:8])
}

// recordSecurityOperation 记录安全操作
func (s *Service) recordSecurityOperation(userID uint, operation, clientIP, deviceHash string, success bool) {
	op := &model.SecurityOperation{
		UserID:     userID,
		Operation:  operation,
		IP:         s.hashIP(clientIP),
		DeviceHash: deviceHash,
		Success:    success,
	}
	s.db.Create(op)
}

// checkSecurityCooldown 检查安全操作冷却期
func (s *Service) checkSecurityCooldown(userID uint, operation string) error {
	cooldownTime := time.Now().Add(-SecurityOperationCooldown)

	var recentOp model.SecurityOperation
	if err := s.db.Where("user_id = ? AND operation = ? AND success = true AND created_at > ?",
		userID, operation, cooldownTime).First(&recentOp).Error; err == nil {
		return fmt.Errorf("操作过于频繁，请等待 %d 分钟后再试", int(SecurityOperationCooldown.Minutes()))
	}

	return nil
}

// validatePasswordStrength 验证密码强度
func (s *Service) validatePasswordStrength(password string) error {
	if len(password) < 8 {
		return errors.New("密码长度至少8位")
	}

	// 简单的密码强度检查
	hasUpper := false
	hasLower := false
	hasDigit := false

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUpper = true
		case char >= 'a' && char <= 'z':
			hasLower = true
		case char >= '0' && char <= '9':
			hasDigit = true
		}
	}

	if !hasUpper || !hasLower || !hasDigit {
		return errors.New("密码必须包含大写字母、小写字母和数字")
	}

	// TODO: 检查常见弱密码或泄露密码库

	return nil
}
