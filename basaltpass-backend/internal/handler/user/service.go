package user

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/utils"
	"errors"
)

// Service encapsulates user-related operations.
type Service struct{}

// GetProfile returns user profile by ID.
func (s Service) GetProfile(userID uint) (ProfileResponse, error) {
	var u model.User
	if err := common.DB().First(&u, userID).Error; err != nil {
		return ProfileResponse{}, err
	}

	isSuperAdmin := u.IsSuperAdmin()

	var (
		hasTenant  bool
		tenantID   *uint
		tenantRole string
	)
	var ta model.TenantAdmin
	if err := common.DB().Where("user_id = ?", userID).Order("created_at ASC").First(&ta).Error; err == nil {
		hasTenant = true
		tenantID = &ta.TenantID
		tenantRole = string(ta.Role)
	}

	return ProfileResponse{
		ID:           u.ID,
		Email:        u.Email,
		Phone:        u.Phone,
		Nickname:     u.Nickname,
		AvatarURL:    u.AvatarURL,
		IsSuperAdmin: isSuperAdmin,
		HasTenant:    hasTenant,
		TenantID:     tenantID,
		TenantRole:   tenantRole,
	}, nil
}

// UpdateProfile updates allowed fields for user.
func (s Service) UpdateProfile(userID uint, req UpdateProfileRequest) error {
	var updates = make(map[string]interface{})
	if req.Nickname != nil {
		updates["nickname"] = *req.Nickname
	}
	if req.Email != nil {
		updates["email"] = *req.Email
	}
	if req.Phone != nil {
		// 验证和标准化手机号为E.164格式
		if *req.Phone == "" {
			updates["phone"] = nil
			updates["phone_verified"] = false
		} else {
			phoneValidator := utils.NewPhoneValidator("+86")
			normalizedPhone, err := phoneValidator.NormalizeToE164(*req.Phone)
			if err != nil {
				return errors.New("手机号格式不正确: " + err.Error())
			}
			updates["phone"] = normalizedPhone
			updates["phone_verified"] = false // Reset verification when phone changes
		}
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if len(updates) == 0 {
		return errors.New("no fields to update")
	}
	return common.DB().Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error
}

// SearchUsers searches users by nickname or email
func (s Service) SearchUsers(query string, limit int) ([]UserSearchResult, error) {
	var users []model.User

	if limit <= 0 || limit > 50 {
		limit = 10 // 默认限制10个，最多50个
	}

	err := common.DB().
		Where("nickname LIKE ? OR email LIKE ?", "%"+query+"%", "%"+query+"%").
		Limit(limit).
		Find(&users).Error

	if err != nil {
		return nil, err
	}

	var results []UserSearchResult
	for _, user := range users {
		results = append(results, UserSearchResult{
			ID:       user.ID,
			Nickname: user.Nickname,
			Email:    user.Email,
			Avatar:   user.AvatarURL,
		})
	}

	return results, nil
}
