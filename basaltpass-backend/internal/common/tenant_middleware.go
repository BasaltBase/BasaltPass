package common

import (
	"errors"
	"os"
	"strconv"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// getJWTSecret 获取JWT密钥
func getJWTSecret() string {
	if secret := os.Getenv("JWT_SECRET"); secret != "" {
		return secret
	}
	return "supersecret"
}

// TenantMiddleware 租户隔离中间件
func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 首先尝试从JWT中间件设置的tenantID获取
		if tenantID := c.Locals("tenantID"); tenantID != nil {
			// 验证租户是否存在且有效
			var tenant model.Tenant
			if err := DB().First(&tenant, tenantID).Error; err == nil && tenant.Status == "active" {
				return c.Next()
			}
		}

		// 如果JWT中没有租户信息，尝试从Header获取（管理API）
		tenantIDStr := c.Get("X-Tenant-ID")
		if tenantIDStr != "" {
			tenantID, err := strconv.ParseUint(tenantIDStr, 10, 32)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid tenant ID",
				})
			}
			c.Locals("tenantID", uint(tenantID))
			return c.Next()
		}

		// 尝试从用户ID获取默认租户
		if userID := c.Locals("userID"); userID != nil {
			var tenantAdmin model.TenantAdmin
			if err := DB().Where("user_id = ?", userID).Order("created_at ASC").First(&tenantAdmin).Error; err == nil {
				c.Locals("tenantID", tenantAdmin.TenantID)
				return c.Next()
			}
		}

		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing tenant context",
		})
	}
}

// SuperAdminMiddleware 超级管理员中间件
func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Unauthorized",
			})
		}

		// 检查是否为超级管理员
		var user model.User
		if err := DB().First(&user, userID).Error; err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "User not found",
			})
		}

		if !user.IsSuperAdmin {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Super admin access required",
			})
		}

		return c.Next()
	}
}

// TenantOwnerMiddleware 租户所有者中间件
func TenantOwnerMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		tenantID := c.Locals("tenantID")

		if userID == nil || tenantID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing user or tenant context",
			})
		}

		// 检查用户在租户中的角色
		var tenantAdmin model.TenantAdmin
		if err := DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
			})
		}

		if tenantAdmin.Role != model.TenantRoleOwner {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tenant owner access required",
			})
		}

		return c.Next()
	}
}

// TenantAdminMiddleware 租户管理员中间件（所有者或管理员）
func TenantAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		tenantID := c.Locals("tenantID")

		if userID == nil || tenantID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing user or tenant context",
			})
		}

		// 检查用户在租户中的角色
		var tenantAdmin model.TenantAdmin
		if err := DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
			})
		}

		if tenantAdmin.Role != model.TenantRoleOwner && tenantAdmin.Role != model.TenantRoleAdmin {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tenant admin access required",
			})
		}

		return c.Next()
	}
}

// TenantScope 添加租户作用域到GORM查询
func TenantScope(tenantID uint) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("tenant_id = ?", tenantID)
	}
}

// AppScope 添加应用作用域到GORM查询
func AppScope(appID uint) func(*gorm.DB) *gorm.DB {
	return func(db *gorm.DB) *gorm.DB {
		return db.Where("app_id = ?", appID)
	}
}

// ExtractTenantFromJWT 从JWT令牌中提取租户信息
func ExtractTenantFromJWT(tokenString string) (uint, uint, error) {
	// 解析JWT令牌
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(getJWTSecret()), nil
	})

	if err != nil || !token.Valid {
		return 0, 0, errors.New("invalid token")
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return 0, 0, errors.New("invalid claims")
	}

	var tenantID, appID uint

	// 提取租户ID
	if tid, exists := claims["tid"]; exists {
		if tenantIDFloat, ok := tid.(float64); ok {
			tenantID = uint(tenantIDFloat)
		}
	}

	// 提取应用ID（可选）
	if aid, exists := claims["aid"]; exists {
		if appIDFloat, ok := aid.(float64); ok {
			appID = uint(appIDFloat)
		}
	}

	return tenantID, appID, nil
}

// ValidateTenantAccess 验证用户对租户的访问权限
func ValidateTenantAccess(userID, tenantID uint, requiredRole model.TenantRole) error {
	var tenantAdmin model.TenantAdmin
	if err := DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("access denied")
		}
		return err
	}

	// 检查角色层级
	switch requiredRole {
	case model.TenantRoleOwner:
		if tenantAdmin.Role != model.TenantRoleOwner {
			return errors.New("owner access required")
		}
	case model.TenantRoleAdmin:
		if tenantAdmin.Role != model.TenantRoleOwner && tenantAdmin.Role != model.TenantRoleAdmin {
			return errors.New("admin access required")
		}
	case model.TenantRoleMember:
		// 任何角色都可以访问
	}

	return nil
}

// GetTenantIDFromContext 从上下文获取租户ID
func GetTenantIDFromContext(c *fiber.Ctx) uint {
	if tenantID := c.Locals("tenantID"); tenantID != nil {
		if tid, ok := tenantID.(uint); ok {
			return tid
		}
	}
	return 0
}

// GetAppIDFromContext 从上下文获取应用ID
func GetAppIDFromContext(c *fiber.Ctx) uint {
	if appID := c.Locals("appID"); appID != nil {
		if aid, ok := appID.(uint); ok {
			return aid
		}
	}
	return 0
}
