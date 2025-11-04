package middleware

import (
	common2 "basaltpass-backend/internal/common"
	"errors"
	"fmt"
	"os"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

/**
* Basalt TenantMiddleware
* Ensures requests are associated with a valid tenant context.
* Extracts tenant ID from JWT, headers, or user associations.
*
 */

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
		// 统一策略：仅基于用户身份关联解析租户，不信任客户端/令牌携带的租户ID
		userID := c.Locals("userID")
		if userID == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing user context",
			})
		}

		// 基于用户-租户关联关系查找默认租户：优先使用创建时间最早的一条作为默认
		var tenantAdmin model.TenantAdmin
		if err := common2.DB().Where("user_id = ?", userID).Order("created_at ASC").First(&tenantAdmin).Error; err != nil {
			fmt.Printf("[TenantMiddleware] No tenant association found for user %v: %v\n", userID, err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing tenant association",
			})
		}

		// 校验租户有效性
		var tenant model.Tenant
		if err := common2.DB().First(&tenant, tenantAdmin.TenantID).Error; err != nil {
			fmt.Printf("[TenantMiddleware] Tenant %v not found for user %v: %v\n", tenantAdmin.TenantID, userID, err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid tenant association",
			})
		}
		if tenant.Status != "active" {
			fmt.Printf("[TenantMiddleware] Tenant %v status is %s, not active\n", tenant.ID, tenant.Status)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tenant is not active",
			})
		}

		// 将租户上下文与角色放入请求上下文
		c.Locals("tenantID", tenant.ID)
		c.Locals("tenantRole", tenantAdmin.Role)

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
		if err := common2.DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error; err != nil {
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
			fmt.Printf("[TenantAdminMiddleware] Missing context - userID: %v, tenantID: %v\n", userID, tenantID)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing user or tenant context",
			})
		}

		// 检查用户在租户中的角色
		var tenantAdmin model.TenantAdmin
		if err := common2.DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error; err != nil {
			fmt.Printf("[TenantAdminMiddleware] No tenant tenant record found for user %v in tenant %v: %v\n", userID, tenantID, err)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
			})
		}

		if tenantAdmin.Role != model.TenantRoleOwner && tenantAdmin.Role != model.TenantRoleAdmin {
			fmt.Printf("[TenantAdminMiddleware] User %v has insufficient role %s in tenant %v\n", userID, tenantAdmin.Role, tenantID)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tenant tenant access required",
			})
		}

		fmt.Printf("[TenantAdminMiddleware] User %v authorized as %s in tenant %v\n", userID, tenantAdmin.Role, tenantID)
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
	if err := common2.DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantAdmin).Error; err != nil {
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
			return errors.New("tenant access required")
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

// GetUserIDFromContext 从上下文获取用户ID
func GetUserIDFromContext(c *fiber.Ctx) *uint {
	if userID := c.Locals("userID"); userID != nil {
		if uid, ok := userID.(uint); ok {
			return &uid
		}
	}
	return nil
}
