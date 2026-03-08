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
	query := s.db.Where("user_id = ?", userID)
	if requestedTenantID > 0 {
		query = query.Where("tenant_id = ?", requestedTenantID)
	} else {
		query = query.Order("created_at ASC")
	}

	var tenantUser model.TenantUser
	if err := query.First(&tenantUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, "", ErrNoTenantAssociation
		}
		return 0, "", err
	}

	var tenant model.Tenant
	if err := s.db.First(&tenant, tenantUser.TenantID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, "", ErrInvalidTenantAssociation
		}
		return 0, "", err
	}

	if tenant.Status != model.TenantStatusActive {
		return tenant.ID, tenantUser.Role, ErrInactiveTenant
	}

	return tenant.ID, tenantUser.Role, nil
}

// GetTenantRole returns user's role in a tenant.
func (s *Service) GetTenantRole(userID, tenantID uint) (model.TenantRole, error) {
	var tenantUser model.TenantUser
	if err := s.db.Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantUser).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", ErrTenantMembershipNotFound
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
