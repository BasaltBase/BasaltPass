package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"golang.org/x/crypto/bcrypt"
)

func generateCode(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

// RequestPasswordReset generates code and stores in DB (mock send).
func RequestPasswordReset(identifier string) (string, error) {
	var user model.User
	db := common.DB()
	if err := db.Where("email = ? OR phone = ?", identifier, identifier).First(&user).Error; err != nil {
		return "", err
	}
	code := generateCode(3) // 6 hex chars
	pr := model.PasswordReset{UserID: user.ID, Code: code, ExpiresAt: time.Now().Add(15 * time.Minute)}
	db.Create(&pr)
	return code, nil // In real system, send via email/SMS
}

// ResetPassword verifies code and updates password.
func ResetPassword(identifier, code, newPassword string) error {
	var user model.User
	db := common.DB()
	if err := db.Where("email = ? OR phone = ?", identifier, identifier).First(&user).Error; err != nil {
		return err
	}
	var pr model.PasswordReset
	if err := db.Where("user_id = ? AND code = ?", user.ID, code).First(&pr).Error; err != nil {
		return err
	}
	if time.Now().After(pr.ExpiresAt) {
		return errors.New("code expired")
	}
	hash, _ := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	db.Model(&user).Update("password_hash", string(hash))
	db.Delete(&pr)
	return nil
}
