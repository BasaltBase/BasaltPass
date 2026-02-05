package model

import (
	"basaltpass-backend/internal/common"
	"encoding/base64"
	"time"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"gorm.io/gorm"
)

// User represents an authenticated account in the system.
type User struct {
	gorm.Model
	Email         string `gorm:"uniqueIndex;size:128"`
	Phone         string `gorm:"uniqueIndex;size:32"`
	PasswordHash  string `gorm:"size:255"`
	Nickname      string `gorm:"size:64"`
	AvatarURL     string `gorm:"size:255"`
	TOTPSecret    string `gorm:"size:64"`
	TwoFAEnabled  bool
	EmailVerified bool `gorm:"default:false"`
	PhoneVerified bool `gorm:"default:false"`
	Banned        bool

	// 安全相关字段
	EmailVerifiedAt   *time.Time // 邮箱验证时间
	PasswordChangedAt *time.Time // 密码修改时间
	MFAEnabled        bool       `gorm:"default:false"` // 多因子认证启用状态
	RiskFlags         uint32     `gorm:"default:0"`     // 风险标记位掩码

	// IsSystemAdmin 标记是否为系统最高管理员（首位用户）
	// 使用指针指针类型配合 uniqueIndex 实现：全表只能有一个 true，其他均为 NULL
	// MySQL/SQLite 都支持在 Unique Index 中存在多个 NULL
	IsSystemAdmin *bool `gorm:"uniqueIndex"`

	// WebAuthn相关字段
	WebAuthnUserID []byte `gorm:"size:64;column:web_authn_id"` // WebAuthn用户ID (固定长度的随机字节)

	// 关联的Passkeys
	Passkeys []Passkey `gorm:"foreignKey:UserID"`

	// 团队关联
	TeamMemberships []TeamMember `gorm:"foreignKey:UserID"`

	// 租户关联
	TenantMemberships []TenantAdmin `gorm:"foreignKey:UserID"`

	// 应用授权关联
	AppAuthorizations []AppUser `gorm:"foreignKey:UserID"`
}

// isSuperAdmin
// IsSuperAdmin 检查用户是否为超级管理员
func (u *User) IsSuperAdmin() bool {
	return u.HasRole(1) // 默认超级管理员的角色ID为1
}

// WebAuthnID 返回用户的WebAuthn ID
func (u *User) WebAuthnID() []byte {
	return u.WebAuthnUserID
}

// WebAuthnName 返回用户的WebAuthn显示名称
func (u *User) WebAuthnName() string {
	if u.Nickname != "" {
		return u.Nickname
	}
	return u.Email
}

// WebAuthnDisplayName 返回用户的WebAuthn显示名称
func (u *User) WebAuthnDisplayName() string {
	return u.WebAuthnName()
}

// WebAuthnIcon 返回用户的图标URL
func (u *User) WebAuthnIcon() string {
	return u.AvatarURL
}

// WebAuthnCredentials 返回用户的所有WebAuthn凭证
func (u *User) WebAuthnCredentials() []webauthn.Credential {
	var credentials []webauthn.Credential

	for _, passkey := range u.Passkeys {
		credentialID, err := base64.StdEncoding.DecodeString(passkey.CredentialID)
		if err != nil {
			continue
		}

		credential := webauthn.Credential{
			ID:              credentialID,
			PublicKey:       passkey.PublicKey,
			AttestationType: "none",
			Authenticator: webauthn.Authenticator{
				AAGUID:    make([]byte, 16),
				SignCount: passkey.SignCount,
			},
		}
		credentials = append(credentials, credential)
	}

	return credentials
}

// CredentialExcludeList 返回用户已有的凭证ID列表，用于注册时排除
func (u *User) CredentialExcludeList() []protocol.CredentialDescriptor {
	var excludeList []protocol.CredentialDescriptor

	for _, passkey := range u.Passkeys {
		credentialID, err := base64.StdEncoding.DecodeString(passkey.CredentialID)
		if err != nil {
			continue
		}

		descriptor := protocol.CredentialDescriptor{
			Type:         "public-key",
			CredentialID: credentialID,
		}
		excludeList = append(excludeList, descriptor)
	}

	return excludeList
}

// HasRole 检查用户是否具有指定角色
func (u *User) HasRole(roleID uint) bool {
	var count int64
	common.DB().Model(&UserRole{}).
		Where("user_id = ? AND role_id = ?", u.ID, roleID).
		Count(&count)
	return count > 0
}

// HasRoleInTenant 检查用户在指定租户中是否具有指定角色代码
func (u *User) HasRoleInTenant(tenantID uint, roleCode string) bool {
	var count int64
	common.DB().Table("user_roles").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ? AND roles.code = ?", u.ID, tenantID, roleCode).
		Count(&count)
	return count > 0
}

// GetRolesInTenant 获取用户在指定租户中的所有角色
func (u *User) GetRolesInTenant(tenantID uint) ([]Role, error) {
	var roles []Role
	err := common.DB().
		Joins("JOIN user_roles ON roles.id = user_roles.role_id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ?", u.ID, tenantID).
		Preload("App").
		Find(&roles).Error
	return roles, err
}

// GetRoleCodesInTenant 获取用户在指定租户中的所有角色代码
func (u *User) GetRoleCodesInTenant(tenantID uint) ([]string, error) {
	var codes []string
	err := common.DB().Table("user_roles").
		Select("roles.code").
		Joins("JOIN roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ? AND roles.tenant_id = ?", u.ID, tenantID).
		Pluck("roles.code", &codes).Error
	return codes, err
}
