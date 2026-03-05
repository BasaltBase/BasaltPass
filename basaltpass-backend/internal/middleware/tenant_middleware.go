package middleware

import (
	common2 "basaltpass-backend/internal/common"
	"log"

	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
)

/**
* Basalt TenantMiddleware
* Ensures requests are associated with a valid tenant context.
* Extracts tenant ID from JWT, headers, or user associations.
*
 */

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

		// 若令牌中携带了目标租户ID，只把它作为“候选值”进行 tenant_user 关系校验
		requestedTenantID := uint(0)
		if tidAny := c.Locals("tenantID"); tidAny != nil {
			if tid, ok := tidAny.(uint); ok {
				requestedTenantID = tid
			}
		}

		// 控制台访问统一要求在 tenant_users 中存在对应关系
		tenantID, tenantRole, err := resolveUserTenantContext(userID, requestedTenantID)
		if err != nil {
			log.Printf("[TenantMiddleware] no tenant association for user %d: %v", userID, err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing tenant association",
			})
		}

		// 校验租户有效性
		var tenant model.Tenant
		if err := common2.DB().First(&tenant, tenantID).Error; err != nil {
			log.Printf("[TenantMiddleware] tenant %d not found for user %d: %v", tenantID, userID, err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid tenant association",
			})
		}
		if tenant.Status != "active" {
			log.Printf("[TenantMiddleware] tenant %d status=%q, not active", tenant.ID, tenant.Status)
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
// 1) 若有请求租户ID，则必须命中 tenant_users(user_id, tenant_id)
// 2) 若无请求租户ID，则使用 tenant_users 的首条记录作为默认租户
func resolveUserTenantContext(userID uint, requestedTenantID uint) (uint, model.TenantRole, error) {
	query := common2.DB().Where("user_id = ?", userID)
	if requestedTenantID > 0 {
		query = query.Where("tenant_id = ?", requestedTenantID)
	} else {
		query = query.Order("created_at ASC")
	}

	var tenantUser model.TenantUser
	if err := query.First(&tenantUser).Error; err != nil {
		return 0, "", err
	}

	return tenantUser.TenantID, tenantUser.Role, nil
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
		var tenantUser model.TenantUser
		if err := common2.DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantUser).Error; err != nil {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
			})
		}

		if tenantUser.Role != model.TenantRoleOwner {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tenant owner access required",
			})
		}

		return c.Next()
	}
}

// TenantUserMiddleware 租户管理员中间件（所有者或管理员）
func TenantUserMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		userID := c.Locals("userID")
		tenantID := c.Locals("tenantID")

		if userID == nil || tenantID == nil {
			log.Printf("[TenantUserMiddleware] missing context (userID=%v tenantID=%v)", userID, tenantID)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing user or tenant context",
			})
		}

		// 检查用户在租户中的角色
		var tenantUser model.TenantUser
		if err := common2.DB().Where("user_id = ? AND tenant_id = ?", userID, tenantID).First(&tenantUser).Error; err != nil {
			log.Printf("[TenantUserMiddleware] no tenant record for user %v in tenant %v: %v", userID, tenantID, err)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Access denied",
			})
		}

		if tenantUser.Role != model.TenantRoleOwner && tenantUser.Role != model.TenantRoleAdmin {
			log.Printf("[TenantUserMiddleware] user %v has insufficient role in tenant %v", userID, tenantID)
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "Tenant tenant access required",
			})
		}

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
