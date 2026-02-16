package auth

import (
	"basaltpass-backend/internal/handler/user/security"
	"basaltpass-backend/internal/service/aduit"
	settingssvc "basaltpass-backend/internal/service/settings"
	"basaltpass-backend/internal/utils"
	"context"
	"errors"
	"fmt"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Service encapsulates auth related operations.
type Service struct{}

var (
	ErrMissingCredentials = errors.New("identifier and password required")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrPlatformAdminOnly  = errors.New("only administrators can login to platform")
	ErrServiceUnavailable = errors.New("authentication service temporarily unavailable")
)

const loginQueryTimeout = 8 * time.Second

func normalizeLoginQueryError(err error) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return ErrInvalidCredentials
	}
	return fmt.Errorf("%w: %v", ErrServiceUnavailable, err)
}

// Register creates a new user with hashed password.
func (s Service) Register(req RegisterRequest) (*model.User, error) {
	if req.Email == "" && req.Phone == "" {
		return nil, errors.New("email or phone required")
	}
	if req.Password == "" {
		return nil, errors.New("password required")
	}

	// 验证和标准化手机号为E.164格式
	var normalizedPhone string
	if req.Phone != "" {
		phoneValidator := utils.NewPhoneValidator("+86") // 使用中国为默认国家
		normalized, err := phoneValidator.NormalizeToE164(req.Phone)
		if err != nil {
			return nil, errors.New("手机号格式不正确: " + err.Error())
		}
		normalizedPhone = normalized
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// 检查是否是第一个用户
	var userCount int64
	if err := common.DB().Model(&model.User{}).Count(&userCount).Error; err != nil {
		return nil, err
	}
	isFirstUser := userCount == 0

	// 检查用户是否已存在（同一个租户下的邮箱/手机号）
	// 注意：admin用户（tenant_id=0）可以与普通用户使用相同的邮箱/手机号
	db := common.DB()
	var existingUser model.User

	// 构建检查条件
	checkQuery := db.Where("tenant_id = ?", req.TenantID)
	if req.Email != "" {
		checkQuery = checkQuery.Where("email = ?", req.Email)
	} else if normalizedPhone != "" {
		checkQuery = checkQuery.Where("phone = ?", normalizedPhone)
	}

	if err := checkQuery.First(&existingUser).Error; err == nil {
		return nil, errors.New("user already exists in this tenant")
	}

	// 开始事务
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	user := &model.User{
		Email:        req.Email,
		Phone:        normalizedPhone,
		PasswordHash: string(hash),
		Nickname:     "New User",
		TenantID:     req.TenantID, // 设置租户ID
	}

	// 利用数据库唯一约束防止并发注册导致产生多个超级管理员
	if isFirstUser {
		t := true
		user.IsSystemAdmin = &t
		user.TenantID = 0 // 第一个用户是平台级管理员，不属于任何租户
	}

	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}

	// 如果是第一个用户，设置为全局管理员
	if isFirstUser {
		if err := s.setupFirstUserAsGlobalAdmin(tx, user); err != nil {
			tx.Rollback()
			return nil, err
		}
	}

	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return user, nil
}

// LoginResult 用于登录结果的多态返回
// 如果需要二次验证，Need2FA=true，TokenPair为空
// 如果不需要二次验证，Need2FA=false，TokenPair有效
// Available2FAMethods: 用户可用的所有2FA方式列表
type LoginResult struct {
	Need2FA             bool     `json:"need_2fa"`
	TwoFAType           string   `json:"2fa_type,omitempty"`              // 默认推荐的2FA方式
	Available2FAMethods []string `json:"available_2fa_methods,omitempty"` // 所有可用的2FA方式
	UserID              uint     `json:"user_id,omitempty"`
	TokenPair
}

// Login 校验用户名密码，判断是否需要二次验证
func (s Service) LoginV2(req LoginRequest) (LoginResult, error) {
	if req.EmailOrPhone == "" || req.Password == "" {
		return LoginResult{}, ErrMissingCredentials
	}

	var user model.User
	ctx, cancel := context.WithTimeout(context.Background(), loginQueryTimeout)
	defer cancel()

	db := common.DB().WithContext(ctx)

	// 构建查询条件：email/phone + tenant_id
	// 特殊处理：
	// 1. 如果tenant_id = 0，表示平台登录，只允许admin和tenant_user登录
	// 2. 如果tenant_id > 0，表示租户登录，只查询该租户下的用户
	query := db.Preload("Passkeys").Where("email = ? OR phone = ?", req.EmailOrPhone, req.EmailOrPhone)

	if req.TenantID == 0 {
		// 平台登录：只允许admin(is_system_admin=true)或tenant_user(存在于tenant_users表)
		// 先查询用户
		if err := query.First(&user).Error; err != nil {
			return LoginResult{}, normalizeLoginQueryError(err)
		}

		// 检查是否是系统管理员
		isAdmin := user.IsSystemAdmin != nil && *user.IsSystemAdmin

		// 检查是否是租户管理员
		var isTenantUser bool
		var tenantUserCount int64
		if err := db.Model(&model.TenantUser{}).Where("user_id = ?", user.ID).Count(&tenantUserCount).Error; err != nil {
			return LoginResult{}, fmt.Errorf("%w: %v", ErrServiceUnavailable, err)
		}
		isTenantUser = tenantUserCount > 0

		// 如果既不是admin也不是tenant_user，拒绝平台登录
		if !isAdmin && !isTenantUser {
			return LoginResult{}, ErrPlatformAdminOnly
		}
	} else {
		// 租户登录：查询指定租户下的用户
		query = query.Where("tenant_id = ?", req.TenantID)
		if err := query.First(&user).Error; err != nil {
			return LoginResult{}, normalizeLoginQueryError(err)
		}
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return LoginResult{}, ErrInvalidCredentials
	}

	// 收集用户可用的所有2FA方式
	var availableMethods []string
	var defaultMethod string

	// 是否具备强二次验证方式（TOTP 或 Passkey）
	hasStrong2FA := (user.TwoFAEnabled && user.TOTPSecret != "") || len(user.Passkeys) > 0

	if hasStrong2FA {
		// 已开启强二次验证时，仅要求这些方式，不再因为未验证邮箱/手机号而拦截登录
		if user.TwoFAEnabled && user.TOTPSecret != "" {
			availableMethods = append(availableMethods, "totp")
			defaultMethod = "totp"
		}
		if len(user.Passkeys) > 0 {
			availableMethods = append(availableMethods, "passkey")
			if defaultMethod == "" {
				defaultMethod = "passkey"
			}
		}
	} else if settingssvc.GetBool("auth.require_email_verification", false) {
		// 仅在显式要求邮箱验证时，才将 email 作为登录前置校验。
		// 默认关闭，避免未实现完整验证码流程时导致登录被卡住。
		if !user.EmailVerified {
			availableMethods = append(availableMethods, "email")
			if defaultMethod == "" {
				defaultMethod = "email"
			}
		}
		// 如需支持手机号，可按需启用以下逻辑（目前未在 Verify2FA 中实现 phone 分支）
		// if !user.PhoneVerified && user.Phone != "" {
		//     availableMethods = append(availableMethods, "phone")
		//     if defaultMethod == "" {
		//         defaultMethod = "phone"
		//     }
		// }
	}

	// 如果有2FA方式，返回需要验证
	if len(availableMethods) > 0 {
		return LoginResult{
			Need2FA:             true,
			TwoFAType:           defaultMethod,
			Available2FAMethods: availableMethods,
			UserID:              user.ID,
		}, nil
	}

	// 不需要二次验证，直接登录
	tokens, err := GenerateTokenPair(user.ID)
	if err != nil {
		return LoginResult{}, fmt.Errorf("%w: %v", ErrServiceUnavailable, err)
	}
	return LoginResult{Need2FA: false, TokenPair: tokens, UserID: user.ID}, nil
}

// Refresh validates a refresh token and returns a new token pair.
func (s Service) Refresh(refreshToken string) (TokenPair, error) {
	token, err := ParseToken(refreshToken)
	if err != nil || !token.Valid {
		return TokenPair{}, errors.New("invalid token")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return TokenPair{}, errors.New("invalid token type")
	}
	userIDFloat, ok := claims["sub"].(float64)
	if !ok {
		return TokenPair{}, errors.New("invalid subject")
	}
	// Preserve console scope, but do not trust tenant context from token.
	scope := ConsoleScopeUser
	if scp, ok := claims["scp"].(string); ok && scp != "" {
		scope = scp
	}
	// Refresh: tenant context is re-derived from DB for non-admin scopes.
	return GenerateTokenPairWithTenantAndScope(uint(userIDFloat), 0, scope)
}

// Verify2FA 校验二次验证信息，成功返回token
func (s Service) Verify2FA(req Verify2FARequest) (TokenPair, error) {
	db := common.DB()
	var user model.User
	if err := db.Preload("Passkeys").First(&user, req.UserID).Error; err != nil {
		return TokenPair{}, errors.New("user not found")
	}
	switch req.TwoFAType {
	case "totp":
		if user.TOTPSecret == "" || !user.TwoFAEnabled {
			return TokenPair{}, errors.New("2FA not enabled")
		}
		if !security.ValidateTOTP(user.TOTPSecret, req.Code) {
			return TokenPair{}, errors.New("invalid TOTP code")
		}
	case "passkey":
		// 这里只做简单校验，实际Passkey校验应由passkey模块完成
		if len(user.Passkeys) == 0 {
			return TokenPair{}, errors.New("no passkey registered")
		}
		// 这里假设前端已完成WebAuthn流程，后端只需确认用户有passkey
		// 可扩展为调用passkey.FinishLoginHandler等
	case "email":
		if !user.EmailVerified {
			return TokenPair{}, errors.New("email not verified")
		}
		// 邮箱验证码校验逻辑可扩展
	default:
		return TokenPair{}, errors.New("unsupported 2FA type")
	}
	return GenerateTokenPair(user.ID)
}

// setupFirstUserAsGlobalAdmin 设置第一个用户为全局管理员
func (s Service) setupFirstUserAsGlobalAdmin(tx *gorm.DB, user *model.User) error {
	// 1. 获取或创建默认租户
	var defaultTenant model.Tenant
	if err := tx.Where("code = ?", "default").First(&defaultTenant).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建默认租户
			defaultTenant = model.Tenant{
				Name:        "BasaltPass",
				Code:        "default",
				Description: "BasaltPass系统默认租户",
				Status:      "active",
				Plan:        "enterprise", // 给第一个用户企业版权限
			}
			if err := tx.Create(&defaultTenant).Error; err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// 2. 创建租户管理员关联，设置为Owner
	tenantUser := model.TenantUser{
		UserID:   user.ID,
		TenantID: defaultTenant.ID,
		Role:     "owner", // 设置为租户Owner
	}
	if err := tx.Create(&tenantUser).Error; err != nil {
		return err
	}

	// 3. 获取或创建租户管理员角色（RBAC角色）
	var adminRole model.TenantRbacRole
	if err := tx.Where("code = ? AND tenant_id = ?", "admin", defaultTenant.ID).First(&adminRole).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// 创建租户管理员角色
			adminRole = model.TenantRbacRole{
				TenantID:    defaultTenant.ID,
				Code:        "admin",
				Name:        "租户管理员",
				Description: "租户管理员，拥有租户内所有权限",
				IsSystem:    true,
			}
			if err := tx.Create(&adminRole).Error; err != nil {
				return err
			}
		} else {
			return err
		}
	}

	// 4. 创建用户-角色关联（租户RBAC角色）
	userRole := model.TenantUserRbacRole{
		UserID:     user.ID,
		TenantID:   defaultTenant.ID,
		RoleID:     adminRole.ID,
		AssignedAt: time.Now(),
		AssignedBy: user.ID, // 第一个用户自己分配给自己
	}
	if err := tx.Create(&userRole).Error; err != nil {
		return err
	}

	// 5. 更新用户昵称为更友好的名称
	if err := tx.Model(user).Update("nickname", "系统管理员").Error; err != nil {
		return err
	}

	// 6.将email验证状态设置为已验证
	if err := tx.Model(user).Update("email_verified", true).Error; err != nil {
		return err
	}

	aduit.LogAudit(user.ID, "首位用户注册", "user", string(rune(user.ID)), "", "自动设置为全局管理员")

	return nil
}
