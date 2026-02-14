package middleware

import (
	common2 "basaltpass-backend/internal/common"
	"fmt"
	"os"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
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
	// 在测试环境下允许默认值，但在生产环境必须配置
	if os.Getenv("BASALTPASS_DYNO_MODE") == "test" {
		return "test-secret"
	}
	panic("JWT_SECRET environment variable is required")
}

// TenantMiddleware 租户隔离中间件
func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// 统一策略：仅基于用户身份关联解析租户，不信任客户端/令牌携带的租户ID
		userIDAny := c.Locals("userID")
		userID, ok := userIDAny.(uint)
		if !ok || userID == 0 {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing user context",
			})
		}

		// 若令牌中携带了目标租户ID，只把它作为“候选值”进行 tenant_admin 关系校验
		requestedTenantID := uint(0)
		if tidAny := c.Locals("tenantID"); tidAny != nil {
			if tid, ok := tidAny.(uint); ok {
				requestedTenantID = tid
			}
		}

		// 控制台访问统一要求在 tenant_admins 中存在对应关系
		tenantID, tenantRole, err := resolveUserTenantContext(userID, requestedTenantID)
		if err != nil {
			fmt.Printf("[TenantMiddleware] No tenant association found for user %v: %v\n", userID, err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing tenant association",
			})
		}

		// 校验租户有效性
		var tenant model.Tenant
		if err := common2.DB().First(&tenant, tenantID).Error; err != nil {
			fmt.Printf("[TenantMiddleware] Tenant %v not found for user %v: %v\n", tenantID, userID, err)
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
		c.Locals("tenantRole", tenantRole)

		return c.Next()
	}
}

// resolveUserTenantContext 解析用户当前租户上下文：
// 1) 若有请求租户ID，则必须命中 tenant_admins(user_id, tenant_id)
// 2) 若无请求租户ID，则使用 tenant_admins 的首条记录作为默认租户
func resolveUserTenantContext(userID uint, requestedTenantID uint) (uint, model.TenantRole, error) {
	query := common2.DB().Where("user_id = ?", userID)
	if requestedTenantID > 0 {
		query = query.Where("tenant_id = ?", requestedTenantID)
	} else {
		query = query.Order("created_at ASC")
	}

	var tenantAdmin model.TenantAdmin
	if err := query.First(&tenantAdmin).Error; err != nil {
		return 0, "", err
	}

	return tenantAdmin.TenantID, tenantAdmin.Role, nil
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

// GetTenantIDFromContext 从上下文获取租户ID
func GetTenantIDFromContext(c *fiber.Ctx) uint {
	if tenantID := c.Locals("tenantID"); tenantID != nil {
		if tid, ok := tenantID.(uint); ok {
			return tid
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
