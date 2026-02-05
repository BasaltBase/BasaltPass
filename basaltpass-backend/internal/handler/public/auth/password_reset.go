package auth

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/utils"

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
	
	// 尝试用邮箱查找用户
	err := db.Where("email = ?", identifier).First(&user).Error
	if err != nil {
		// 如果邮箱找不到，尝试手机号查找
		// 首先尝试将输入标准化为E.164格式
		phoneValidator := utils.NewPhoneValidator("+86")
		normalizedPhone, phoneErr := phoneValidator.NormalizeToE164(identifier)
		if phoneErr == nil {
			// 如果能标准化成功，用标准化后的手机号查找
			err = db.Where("phone = ?", normalizedPhone).First(&user).Error
		}
		if err != nil {
			// 如果仍然找不到，用原始输入查找（兼容旧数据）
			err = db.Where("phone = ?", identifier).First(&user).Error
			if err != nil {
				return "", err
			}
		}
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
	
	// 尝试用邮箱查找用户
	err := db.Where("email = ?", identifier).First(&user).Error
	if err != nil {
		// 如果邮箱找不到，尝试手机号查找
		// 首先尝试将输入标准化为E.164格式
		phoneValidator := utils.NewPhoneValidator("+86")
		normalizedPhone, phoneErr := phoneValidator.NormalizeToE164(identifier)
		if phoneErr == nil {
			// 如果能标准化成功，用标准化后的手机号查找
			err = db.Where("phone = ?", normalizedPhone).First(&user).Error
		}
		if err != nil {
			// 如果仍然找不到，用原始输入查找（兼容旧数据）
			err = db.Where("phone = ?", identifier).First(&user).Error
			if err != nil {
				return err
			}
		}
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
