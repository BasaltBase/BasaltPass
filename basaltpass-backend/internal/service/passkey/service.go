package passkey

import (
	"basaltpass-backend/internal/service/auth"
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/go-webauthn/webauthn/webauthn"
)

type Service struct{}

// RequestContext encapsulates metadata about the incoming request for audit logging.
type RequestContext struct {
	IP        string
	UserAgent string
	Data      map[string]interface{}
}

func buildAuditLogData(ctx *RequestContext, defaults map[string]interface{}) (string, error) {
	combined := make(map[string]interface{})
	for k, v := range defaults {
		combined[k] = v
	}

	if ctx != nil && ctx.Data != nil {
		for k, v := range ctx.Data {
			combined[k] = v
		}
	}

	if len(combined) == 0 {
		return "", nil
	}

	payload, err := json.Marshal(combined)
	if err != nil {
		return "", err
	}

	return string(payload), nil
}

// GetWebAuthnInstance 获取指定租户的 WebAuthn 实例。
//
// 配置优先级：
//  1. 该租户在 tenant_webauthn_configs 表中的专属配置（RPID + RPDisplayName 均来自数据库）
//  2. 系统租户(0)的配置作为 RPID/Origins 基础，但若请求的是非系统租户，
//     RPDisplayName 会自动改为 "租户名 (BasaltPass)"，使用户在验证器 App 中
//     能区分来自不同租户的 passkey 条目
//  3. 内置开发默认值（RPID=localhost）
func (s *Service) GetWebAuthnInstance(tenantID uint) (*webauthn.WebAuthn, error) {
	var tenantCfg model.TenantWebAuthnConfig
	hasTenantCfg := false

	// 1. 尝试加载该租户的专属配置
	if err := common.DB().Where("tenant_id = ?", tenantID).First(&tenantCfg).Error; err == nil && tenantCfg.RPID != "" {
		hasTenantCfg = true
	}

	var rpID, rpDisplayName string
	var rpOrigins []string

	if hasTenantCfg {
		// 使用租户专属配置（RPDisplayName 由管理员自行设置）
		rpID = tenantCfg.RPID
		rpDisplayName = tenantCfg.RPDisplayName
		if jsonErr := json.Unmarshal([]byte(tenantCfg.RPOrigins), &rpOrigins); jsonErr != nil || len(rpOrigins) == 0 {
			rpOrigins = []string{"http://localhost:3000"}
		}
	} else {
		// 2. 回退到系统租户配置获取 RPID / Origins
		var sysCfg model.TenantWebAuthnConfig
		if err := common.DB().Where("tenant_id = ?", 0).First(&sysCfg).Error; err == nil && sysCfg.RPID != "" {
			rpID = sysCfg.RPID
			rpDisplayName = sysCfg.RPDisplayName
			if jsonErr := json.Unmarshal([]byte(sysCfg.RPOrigins), &rpOrigins); jsonErr != nil || len(rpOrigins) == 0 {
				rpOrigins = []string{"http://localhost:3000"}
			}
		} else {
			// 3. 内置开发默认值
			rpID = "localhost"
			rpDisplayName = "BasaltPass"
			rpOrigins = []string{"http://localhost:3000", "http://localhost:8080", "http://localhost:5173", "http://localhost:5101"}
		}

		// 非系统租户走回退路径时，将租户名拼入 RPDisplayName，
		// 与 TOTP 的 Issuer 处理保持一致，让用户在验证器 App 中能区分条目。
		if tenantID != 0 {
			var tenant model.Tenant
			if err := common.DB().Select("name").First(&tenant, tenantID).Error; err == nil && tenant.Name != "" {
				rpDisplayName = tenant.Name + " (BasaltPass)"
			}
		}
	}

	return webauthn.New(&webauthn.Config{
		RPDisplayName: rpDisplayName,
		RPID:          rpID,
		RPOrigins:     rpOrigins,
	})
}

// PrepareUserForWebAuthn 为WebAuthn准备用户，确保用户有WebAuthn ID，
// 并只加载属于指定租户的Passkeys。
func (s *Service) PrepareUserForWebAuthn(userID uint, tenantID uint) (*model.User, error) {
	var user model.User
	err := common.DB().
		Preload("Passkeys", "tenant_id = ?", tenantID).
		First(&user, userID).Error
	if err != nil {
		return nil, errors.New("user not found")
	}

	if len(user.WebAuthnID()) == 0 {
		webAuthnID := make([]byte, 32)
		if _, err := rand.Read(webAuthnID); err != nil {
			return nil, err
		}
		if err := common.DB().Model(&user).Update("web_authn_id", webAuthnID).Error; err != nil {
			return nil, err
		}
		// 重新加载
		if err := common.DB().Preload("Passkeys", "tenant_id = ?", tenantID).First(&user, userID).Error; err != nil {
			return nil, err
		}
	}

	return &user, nil
}

// GetUserByEmailInTenant 在指定租户内根据邮箱获取用户，并只预加载该租户的Passkeys。
func (s *Service) GetUserByEmailInTenant(email string, tenantID uint) (*model.User, error) {
	var user model.User
	query := common.DB().Where("email = ?", email)
	if tenantID > 0 {
		query = query.Where("tenant_id = ?", tenantID)
	}
	err := query.Preload("Passkeys", "tenant_id = ?", tenantID).First(&user).Error
	if err != nil {
		return nil, errors.New("user not found")
	}
	return &user, nil
}

// SavePasskey 保存Passkey到数据库（含租户归属）
func (s *Service) SavePasskey(userID uint, tenantID uint, name string, credential *webauthn.Credential) (*model.Passkey, error) {
	passkey := &model.Passkey{
		UserID:       userID,
		TenantID:     tenantID,
		CredentialID: base64.StdEncoding.EncodeToString(credential.ID),
		PublicKey:    credential.PublicKey,
		SignCount:    credential.Authenticator.SignCount,
		Name:         name,
	}

	if err := common.DB().Create(passkey).Error; err != nil {
		return nil, err
	}
	return passkey, nil
}

// UpdatePasskeyUsage 更新Passkey的签名计数器和最后使用时间
func (s *Service) UpdatePasskeyUsage(credentialID []byte, tenantID uint, signCount uint32) error {
	credentialIDStr := base64.StdEncoding.EncodeToString(credentialID)
	now := time.Now()

	return common.DB().Model(&model.Passkey{}).
		Where("credential_id = ? AND tenant_id = ?", credentialIDStr, tenantID).
		Updates(map[string]interface{}{
			"sign_count":   signCount,
			"last_used_at": &now,
		}).Error
}

// GenerateTokensForUser 为用户生成JWT tokens并记录审计日志。
func (s *Service) GenerateTokensForUser(userID uint, tenantID uint, scope string, ctx *RequestContext) (*auth.TokenPair, error) {
	tokens, err := auth.GenerateTokenPairWithTenantAndScope(userID, tenantID, scope)
	if err != nil {
		return nil, err
	}

	defaults := map[string]interface{}{
		"event": "User logged in using Passkey",
	}

	data, err := buildAuditLogData(ctx, defaults)
	if err != nil {
		return nil, err
	}

	auditLog := model.AuditLog{
		UserID:    userID,
		Action:    "passkey_login",
		IP:        "",
		UserAgent: "",
		Data:      data,
	}

	if ctx != nil {
		auditLog.IP = ctx.IP
		auditLog.UserAgent = ctx.UserAgent
	}

	if err := common.DB().Create(&auditLog).Error; err != nil {
		return nil, err
	}

	return &tokens, nil
}

// ListPasskeys 获取用户在指定租户下的Passkey列表
func (s *Service) ListPasskeys(userID uint, tenantID uint) ([]model.Passkey, error) {
	var passkeys []model.Passkey
	err := common.DB().
		Where("user_id = ? AND tenant_id = ?", userID, tenantID).
		Find(&passkeys).Error
	if err != nil {
		return nil, err
	}
	return passkeys, nil
}

// DeletePasskey 删除指定租户下属于该用户的Passkey
func (s *Service) DeletePasskey(userID, tenantID, passkeyID uint, ctx *RequestContext) error {
	var passkey model.Passkey
	err := common.DB().
		Where("id = ? AND user_id = ? AND tenant_id = ?", passkeyID, userID, tenantID).
		First(&passkey).Error
	if err != nil {
		return errors.New("passkey not found")
	}

	if err := common.DB().Delete(&passkey).Error; err != nil {
		return err
	}

	defaults := map[string]interface{}{
		"event":        "User deleted a Passkey",
		"passkey_name": passkey.Name,
	}

	data, err := buildAuditLogData(ctx, defaults)
	if err != nil {
		return err
	}

	auditLog := model.AuditLog{
		UserID:    userID,
		Action:    "delete_passkey",
		IP:        "",
		UserAgent: "",
		Data:      data,
	}

	if ctx != nil {
		auditLog.IP = ctx.IP
		auditLog.UserAgent = ctx.UserAgent
	}

	return common.DB().Create(&auditLog).Error
}
