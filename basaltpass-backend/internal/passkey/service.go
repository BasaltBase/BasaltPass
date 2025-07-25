package passkey

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"time"

	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/go-webauthn/webauthn/webauthn"
)

type Service struct{}

// GetWebAuthnInstance 获取WebAuthn实例
func (s *Service) GetWebAuthnInstance() (*webauthn.WebAuthn, error) {
	webAuthnConfig := &webauthn.Config{
		RPDisplayName: "BasaltPass",
		RPID:          "localhost", // 在生产环境中应该是实际的域名
		RPOrigins:     []string{"http://localhost:3000", "http://localhost:8080", "http://localhost:5173"},
		Debug:         true, // 开发环境启用调试
	}

	return webauthn.New(webAuthnConfig)
}

// PrepareUserForWebAuthn 为WebAuthn准备用户，确保用户有WebAuthn ID
func (s *Service) PrepareUserForWebAuthn(userID uint) (*model.User, error) {
	var user model.User
	err := common.DB().Preload("Passkeys").First(&user, userID).Error
	if err != nil {
		return nil, errors.New("user not found")
	}

	// 如果用户没有WebAuthn ID，生成一个
	if len(user.WebAuthnID()) == 0 {
		webAuthnID := make([]byte, 32)
		_, err := rand.Read(webAuthnID)
		if err != nil {
			return nil, err
		}

		// 保存WebAuthn ID
		err = common.DB().Model(&user).Update("web_authn_id", webAuthnID).Error
		if err != nil {
			return nil, err
		}

		// 重新加载用户信息
		err = common.DB().Preload("Passkeys").First(&user, userID).Error
		if err != nil {
			return nil, err
		}
	}

	return &user, nil
}

// GetUserByEmail 根据邮箱获取用户
func (s *Service) GetUserByEmail(email string) (*model.User, error) {
	var user model.User
	err := common.DB().Where("email = ?", email).Preload("Passkeys").First(&user).Error
	if err != nil {
		return nil, errors.New("user not found")
	}
	return &user, nil
}

// SavePasskey 保存Passkey到数据库
func (s *Service) SavePasskey(userID uint, name string, credential *webauthn.Credential) (*model.Passkey, error) {
	passkey := &model.Passkey{
		UserID:       userID,
		CredentialID: base64.StdEncoding.EncodeToString(credential.ID),
		PublicKey:    credential.PublicKey,
		SignCount:    credential.Authenticator.SignCount,
		Name:         name,
	}

	err := common.DB().Create(passkey).Error
	if err != nil {
		return nil, err
	}

	return passkey, nil
}

// UpdatePasskeyUsage 更新Passkey的使用记录
func (s *Service) UpdatePasskeyUsage(credentialID []byte, signCount uint32) error {
	credentialIDStr := base64.StdEncoding.EncodeToString(credentialID)
	now := time.Now()

	err := common.DB().Model(&model.Passkey{}).
		Where("credential_id = ?", credentialIDStr).
		Updates(map[string]interface{}{
			"sign_count":   signCount,
			"last_used_at": &now,
		}).Error

	return err
}

// GenerateTokensForUser 为用户生成JWT tokens
func (s *Service) GenerateTokensForUser(userID uint) (*auth.TokenPair, error) {
	tokens, err := auth.GenerateTokenPair(userID)
	if err != nil {
		return nil, err
	}

	// 记录审计日志
	auditLog := model.AuditLog{
		UserID: userID,
		Action: "passkey_login",
		IP:     "", // TODO: 从请求中获取IP
		Data:   "User logged in using Passkey",
	}
	common.DB().Create(&auditLog)

	return &tokens, nil
}

// ListPasskeys 获取用户的Passkey列表
func (s *Service) ListPasskeys(userID uint) ([]model.Passkey, error) {
	var passkeys []model.Passkey
	err := common.DB().Where("user_id = ?", userID).Find(&passkeys).Error
	if err != nil {
		return nil, err
	}
	return passkeys, nil
}

// DeletePasskey 删除指定的Passkey
func (s *Service) DeletePasskey(userID, passkeyID uint) error {
	// 验证Passkey属于该用户
	var passkey model.Passkey
	err := common.DB().Where("id = ? AND user_id = ?", passkeyID, userID).First(&passkey).Error
	if err != nil {
		return errors.New("passkey not found")
	}

	// 删除Passkey
	err = common.DB().Delete(&passkey).Error
	if err != nil {
		return err
	}

	// 记录审计日志
	auditLog := model.AuditLog{
		UserID: userID,
		Action: "delete_passkey",
		IP:     "", // TODO: 从请求中获取IP
		Data:   "User deleted a Passkey: " + passkey.Name,
	}
	common.DB().Create(&auditLog)

	return nil
}
