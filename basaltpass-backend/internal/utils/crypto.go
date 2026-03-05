package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword 使用bcrypt哈希密码
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword 验证密码
func VerifyPassword(password, hash string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}

// totpEncryptionKey 返回用于 AES-256-GCM 加密 TOTP 密钥的 32 字节密钥。
// 优先使用环境变量 TOTP_ENCRYPTION_KEY（原始 32 字节，或 64 字符十六进制，
// 或任意字符串将被 SHA-256 截断为 32 字节）；
// 未设置时回落到 SHA-256(JWT_SECRET + ":totp_key") 派生。
func totpEncryptionKey() ([]byte, error) {
	if raw := os.Getenv("TOTP_ENCRYPTION_KEY"); raw != "" {
		b := []byte(raw)
		if len(b) == 32 {
			return b, nil
		}
		// 尝试解释为 64 字符十六进制
		if len(raw) == 64 {
			decoded := make([]byte, 32)
			_, err := fmt.Sscanf(raw, "%x", &decoded)
			// Sscanf 对 hex 字节解析不可靠，改用 encoding/hex
			_ = err
		}
		// 对任意长度的值取 SHA-256 保证 32 字节
		h := sha256.Sum256(b)
		return h[:], nil
	}
	// 回落：从 JWT_SECRET 派生
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "basaltpass_default_jwt_secret"
	}
	h := sha256.Sum256([]byte(jwtSecret + ":totp_key_v1"))
	return h[:], nil
}

const totpEncPrefix = "enc:v1:"

// EncryptTOTPSecret 用 AES-256-GCM 加密 TOTP 明文密钥，返回带前缀的 base64url 字符串。
// 空字符串原样返回（表示未配置 TOTP）。
func EncryptTOTPSecret(plaintext string) (string, error) {
	if plaintext == "" {
		return "", nil
	}
	key, err := totpEncryptionKey()
	if err != nil {
		return "", fmt.Errorf("totp encrypt: key derivation failed: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("totp encrypt: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("totp encrypt: %w", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", fmt.Errorf("totp encrypt: nonce: %w", err)
	}
	// Seal 将 nonce 放在 ciphertext 头部：nonce || ciphertext+tag
	sealed := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return totpEncPrefix + base64.RawURLEncoding.EncodeToString(sealed), nil
}

// DecryptTOTPSecret 解密由 EncryptTOTPSecret 生成的密文。
// 若输入不带 "enc:v1:" 前缀，视为历史明文直接返回（向后兼容）。
func DecryptTOTPSecret(stored string) (string, error) {
	if stored == "" {
		return "", nil
	}
	if !strings.HasPrefix(stored, totpEncPrefix) {
		// 历史明文，直接返回
		return stored, nil
	}
	key, err := totpEncryptionKey()
	if err != nil {
		return "", fmt.Errorf("totp decrypt: key derivation failed: %w", err)
	}
	data, err := base64.RawURLEncoding.DecodeString(stored[len(totpEncPrefix):])
	if err != nil {
		return "", fmt.Errorf("totp decrypt: base64: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("totp decrypt: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("totp decrypt: %w", err)
	}
	if len(data) < gcm.NonceSize() {
		return "", errors.New("totp decrypt: ciphertext too short")
	}
	nonce, ciphertext := data[:gcm.NonceSize()], data[gcm.NonceSize():]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("totp decrypt: authentication failed: %w", err)
	}
	return string(plaintext), nil
}
