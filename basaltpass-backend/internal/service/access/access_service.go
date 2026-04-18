package access

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"errors"

	"gorm.io/gorm"
)

var (
	ErrNoTenantAssociation      = errors.New("no_tenant_association")
	ErrInvalidTenantAssociation = errors.New("invalid_tenant_association")
	ErrInactiveTenant           = errors.New("inactive_tenant")
	ErrTenantMembershipNotFound = errors.New("tenant_membership_not_found")
	ErrUserNotFound             = errors.New("user_not_found")
)

// Service encapsulates middleware-facing authorization data access.
type Service struct {
	db *gorm.DB
}

func NewService() *Service {
	return &Service{db: common.DB()}
}

// ResolveTenantContext resolves a user's tenant context and validates tenant status.
func (s *Service) ResolveTenantContext(userID uint, requestedTenantID uint) (uint, model.TenantRole, error) {
	var user model.User
	if err := s.db.Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, "", ErrUserNotFound
		}
		return 0, "", err
	}

	tenantID := requestedTenantID
	if tenantID == 0 {
		if user.TenantID > 0 {
			tenantID = user.TenantID
		} else {
			var membership model.TenantUser
			if err := s.db.Select("tenant_id").Where("user_id = ?", userID).Order("created_at ASC").First(&membership).Error; err != nil {
				if errors.Is(err, gorm.ErrRecordNotFound) {
					return 0, "", ErrNoTenantAssociation
				}
				return 0, "", err
			}
			tenantID = membership.TenantID
		}
	}

	if tenantID == 0 {
		return 0, "", ErrNoTenantAssociation
	}

	if user.TenantID != tenantID {
		var membershipCount int64
		if err := s.db.Model(&model.TenantUser{}).Where("user_id = ? AND tenant_id = ?", userID, tenantID).Count(&membershipCount).Error; err != nil {
			return 0, "", err
		}
		if membershipCount == 0 {
			return 0, "", ErrInvalidTenantAssociation
		}
	}

	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, "", ErrInvalidTenantAssociation
		}
		return 0, "", err
	}

	if tenant.Status != model.TenantStatusActive {
		return tenant.ID, model.TenantRoleUser, ErrInactiveTenant
	}

	role, err := s.GetTenantRole(userID, tenant.ID)
	if err != nil {
		if errors.Is(err, ErrTenantMembershipNotFound) {
			return tenant.ID, model.TenantRoleUser, nil
		}
		return 0, "", err
	}

	return tenant.ID, role, nil
}

// GetTenantRole returns user's role in a tenant.
func (s *Service) GetTenantRole(userID, tenantID uint) (model.TenantRole, error) {
	if tenantID == 0 {
		return "", ErrTenantMembershipNotFound
	}

	var user model.User
	if err := s.db.Select("id", "tenant_id").First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrUserNotFound
		}
		return "", err
	}

	if user.TenantID != tenantID {
		var membershipCount int64
		if err := s.db.Model(&model.TenantUser{}).Where("user_id = ? AND tenant_id = ?", userID, tenantID).Count(&membershipCount).Error; err != nil {
			return "", err
		}
		if membershipCount == 0 {
			return "", ErrTenantMembershipNotFound
		}
	}

	var tenantUser model.TenantUser
	if err := s.db.Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return model.TenantRoleUser, nil
		}
		return "", err
	}
	return tenantUser.Role, nil
}

// IsSuperAdmin checks whether user is platform super admin.
func (s *Service) IsSuperAdmin(userID uint) (bool, error) {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return false, ErrUserNotFound
		}
		return false, err
	}

	return user.IsSuperAdmin(), nil
}
