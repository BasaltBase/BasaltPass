package user

import (
	"errors"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
)

// Service encapsulates user-related operations.
type Service struct{}

// GetProfile returns user profile by ID.
func (s Service) GetProfile(userID uint) (ProfileResponse, error) {
	var u model.User
	if err := common.DB().First(&u, userID).Error; err != nil {
		return ProfileResponse{}, err
	}
	return ProfileResponse{
		ID:        u.ID,
		Email:     u.Email,
		Phone:     u.Phone,
		Nickname:  u.Nickname,
		AvatarURL: u.AvatarURL,
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
		updates["phone"] = *req.Phone
	}
	if req.AvatarURL != nil {
		updates["avatar_url"] = *req.AvatarURL
	}
	if len(updates) == 0 {
		return errors.New("no fields to update")
	}
	return common.DB().Model(&model.User{}).Where("id = ?", userID).Updates(updates).Error
}
