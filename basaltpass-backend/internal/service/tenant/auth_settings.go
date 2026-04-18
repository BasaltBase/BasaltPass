package tenant

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"errors"

	"gorm.io/gorm"
)

type TenantAuthSettings struct {
	TenantID          uint `json:"tenant_id"`
	AllowRegistration bool `json:"allow_registration"`
	AllowLogin        bool `json:"allow_login"`
}

type UpdateTenantAuthSettingsRequest struct {
	AllowRegistration *bool `json:"allow_registration,omitempty"`
	AllowLogin        *bool `json:"allow_login,omitempty"`
}

func loadOrCreateTenantAuthSetting(db *gorm.DB, tenantID uint) (*model.TenantAuthSetting, error) {
	if tenantID == 0 {
		return &model.TenantAuthSetting{
			TenantID:          0,
			AllowRegistration: true,
			AllowLogin:        true,
		}, nil
	}

	var tenant model.Tenant
	if err := db.Select("id").First(&tenant, tenantID).Error; err != nil {
		return nil, err
	}

	var setting model.TenantAuthSetting
	err := db.Where("tenant_id = ?", tenantID).First(&setting).Error
	if err == nil {
		return &setting, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	setting = model.TenantAuthSetting{
		TenantID:          tenantID,
		AllowRegistration: true,
		AllowLogin:        true,
	}
	if err := db.Create(&setting).Error; err != nil {
		if retryErr := db.Where("tenant_id = ?", tenantID).First(&setting).Error; retryErr == nil {
			return &setting, nil
		}
		return nil, err
	}

	return &setting, nil
}

func toTenantAuthSettings(setting *model.TenantAuthSetting) *TenantAuthSettings {
	return &TenantAuthSettings{
		TenantID:          setting.TenantID,
		AllowRegistration: setting.AllowRegistration,
		AllowLogin:        setting.AllowLogin,
	}
}

func IsTenantRegistrationAllowed(tenantID uint) (bool, error) {
	setting, err := loadOrCreateTenantAuthSetting(common.DB(), tenantID)
	if err != nil {
		return false, err
	}
	return setting.AllowRegistration, nil
}

func IsTenantLoginAllowed(tenantID uint) (bool, error) {
	setting, err := loadOrCreateTenantAuthSetting(common.DB(), tenantID)
	if err != nil {
		return false, err
	}
	return setting.AllowLogin, nil
}

func (s *TenantService) GetTenantAuthSettings(tenantID uint) (*TenantAuthSettings, error) {
	setting, err := loadOrCreateTenantAuthSetting(s.db, tenantID)
	if err != nil {
		return nil, err
	}
	return toTenantAuthSettings(setting), nil
}

func (s *TenantService) UpdateTenantAuthSettings(tenantID uint, req *UpdateTenantAuthSettingsRequest) (*TenantAuthSettings, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if req.AllowRegistration == nil && req.AllowLogin == nil {
		return nil, errors.New("no auth setting to update")
	}

	setting, err := loadOrCreateTenantAuthSetting(s.db, tenantID)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.AllowRegistration != nil {
		updates["allow_registration"] = *req.AllowRegistration
	}
	if req.AllowLogin != nil {
		updates["allow_login"] = *req.AllowLogin
	}

	if len(updates) > 0 {
		if err := s.db.Model(setting).Updates(updates).Error; err != nil {
			return nil, err
		}
		if err := s.db.Where("tenant_id = ?", tenantID).First(setting).Error; err != nil {
			return nil, err
		}
	}

	return toTenantAuthSettings(setting), nil
}

func (s *AdminTenantService) GetTenantAuthSettings(tenantID uint) (*TenantAuthSettings, error) {
	setting, err := loadOrCreateTenantAuthSetting(s.db, tenantID)
	if err != nil {
		return nil, err
	}
	return toTenantAuthSettings(setting), nil
}

func (s *AdminTenantService) UpdateTenantAuthSettings(tenantID uint, req *UpdateTenantAuthSettingsRequest) (*TenantAuthSettings, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if req.AllowRegistration == nil && req.AllowLogin == nil {
		return nil, errors.New("no auth setting to update")
	}

	setting, err := loadOrCreateTenantAuthSetting(s.db, tenantID)
	if err != nil {
		return nil, err
	}

	updates := map[string]interface{}{}
	if req.AllowRegistration != nil {
		updates["allow_registration"] = *req.AllowRegistration
	}
	if req.AllowLogin != nil {
		updates["allow_login"] = *req.AllowLogin
	}

	if len(updates) > 0 {
		if err := s.db.Model(setting).Updates(updates).Error; err != nil {
			return nil, err
		}
		if err := s.db.Where("tenant_id = ?", tenantID).First(setting).Error; err != nil {
			return nil, err
		}
	}

	return toTenantAuthSettings(setting), nil
}
