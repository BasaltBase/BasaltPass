package tenant

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"errors"
	"log"

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

	// Try to verify tenant exists, but don't fail on database errors
	// Only fail if tenant definitely doesn't exist (ErrRecordNotFound)
	var tenant model.Tenant
	tenantErr := db.Select("id").First(&tenant, tenantID).Error
	
	// Log errors for debugging but distinguish between "not found" and "error"
	if tenantErr != nil {
		if errors.Is(tenantErr, gorm.ErrRecordNotFound) {
			// Tenant doesn't exist - this is a hard requirement
			log.Printf("[tenant][error] Tenant not found: tenantID=%d", tenantID)
			return nil, tenantErr
		}
		// For other errors (timeout, connection issues), log but continue
		// We'll attempt to get/create TenantAuthSetting anyway
		// as the auth setting might still be retrievable
		log.Printf("[tenant][warn] Failed to verify tenant existence: tenantID=%d, error=%v", tenantID, tenantErr)
	}

	// Try to get existing auth setting
	var setting model.TenantAuthSetting
	err := db.Where("tenant_id = ?", tenantID).First(&setting).Error
	if err == nil {
		return &setting, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		// Database error other than "not found" - return it
		return nil, err
	}

	// Auth setting doesn't exist, try to create it
	setting = model.TenantAuthSetting{
		TenantID:          tenantID,
		AllowRegistration: true,
		AllowLogin:        true,
	}
	
	// Try to create the setting
	if err := db.Create(&setting).Error; err != nil {
		// Creation failed - try to read it back (race condition)
		if retryErr := db.Where("tenant_id = ?", tenantID).First(&setting).Error; retryErr == nil {
			return &setting, nil
		}
		// Still failed, return the creation error
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
		log.Printf("[tenant][error] IsTenantLoginAllowed failed for tenantID=%d: %v", tenantID, err)
		return false, err
	}
	log.Printf("[tenant][debug] Tenant %d login allowed: %v", tenantID, setting.AllowLogin)
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
