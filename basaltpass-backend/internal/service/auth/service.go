package auth

import (
	"basaltpass-backend/internal/handler/user/security"
	"basaltpass-backend/internal/service/aduit"
	"errors"
	"time"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// Service encapsulates auth related operations.
type Service struct{}

// Register creates a new user with hashed password.
func (s Service) Register(req RegisterRequest) (*model.User, error) {
	if req.Email == "" && req.Phone == "" {
		return nil, errors.New("email or phone required")
	}
	if req.Password == "" {
		return nil, errors.New("password required")
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

	// 开始事务
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	user := &model.User{
		Email:        req.Email,
		Phone:        req.Phone,
		PasswordHash: string(hash),
		Nickname:     "New User",
	}

	// 利用数据库唯一约束防止并发注册导致产生多个超级管理员
	if isFirstUser {
		t := true
		user.IsSystemAdmin = &t
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
		return LoginResult{}, errors.New("identifier and password required")
	}

	var user model.User
	db := common.DB()
	if err := db.Preload("Passkeys").Where("email = ? OR phone = ?", req.EmailOrPhone, req.EmailOrPhone).First(&user).Error; err != nil {
		// return LoginResult{}, errors.New("user not found")
		// 为防止用户枚举，统一返回无效凭证错误
		return LoginResult{}, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		return LoginResult{}, errors.New("invalid email or password")
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
	} else {
		// 未开启强二次验证时，作为兜底：未验证邮箱（或未来支持的手机号）需要做验证
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
		return LoginResult{}, err
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
	tenantAdmin := model.TenantAdmin{
		UserID:   user.ID,
		TenantID: defaultTenant.ID,
		Role:     "owner", // 设置为租户Owner
	}
	if err := tx.Create(&tenantAdmin).Error; err != nil {
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
