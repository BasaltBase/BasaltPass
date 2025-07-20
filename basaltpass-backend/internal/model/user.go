package model

import (
	"encoding/base64"

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
	EmailVerified bool   `gorm:"default:false"`
	PhoneVerified bool   `gorm:"default:false"`
	Banned        bool

	// WebAuthn相关字段
	WebAuthnUserID []byte `gorm:"size:64;column:web_authn_id"` // WebAuthn用户ID (固定长度的随机字节)

	// 关联的Passkeys
	Passkeys []Passkey `gorm:"foreignKey:UserID"`
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
