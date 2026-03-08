package authz

import (
	accesssvc "basaltpass-backend/internal/service/access"
	"errors"
	"log"
	"strconv"

	"basaltpass-backend/internal/middleware/transport"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func SuperAdminMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		svc := accesssvc.NewService()

		if scope, _ := c.Locals("scope").(string); scope != "admin" {
			return transport.APIErrorResponse(c, fiber.StatusForbidden, "admin_scope_required", "admin console scope required")
		}

		userIDAny := c.Locals("userID")
		userID, ok := userIDAny.(uint)
		if !ok || userID == 0 {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "auth_unauthorized", "Unauthorized")
		}

		isSuperAdmin, err := svc.IsSuperAdmin(userID)
		if err != nil {
			if errors.Is(err, accesssvc.ErrUserNotFound) {
				return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "admin_user_not_found", "[admin_middleware] User not found")
			}
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "admin_user_lookup_failed", "[admin_middleware] User not found")
		}

		if !isSuperAdmin {
			return transport.APIErrorResponse(c, fiber.StatusForbidden, "admin_superadmin_required", "[admin_middleware] Basalt super admin access required")
		}

		return c.Next()
	}
}

func RequireConsoleScope(allowed ...string) fiber.Handler {
	allowedSet := map[string]struct{}{}
	for _, s := range allowed {
		if s == "" {
			continue
		}
		allowedSet[s] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		scope, _ := c.Locals("scope").(string)

		if scope == "" {
			if tok, ok := c.Locals("user").(*jwt.Token); ok {
				if claims, ok := tok.Claims.(jwt.MapClaims); ok {
					if scp, ok := claims["scp"].(string); ok {
						scope = scp
					}
				}
			}
		}
		if scope == "" {
			scope = "user"
		}

		if _, ok := allowedSet[scope]; !ok {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
				"error": "invalid console scope",
				"scope": scope,
			})
		}
		return c.Next()
	}
}

func TenantMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		svc := accesssvc.NewService()

		userIDAny := c.Locals("userID")
		userID, ok := userIDAny.(uint)
		if !ok || userID == 0 {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "tenant_missing_user_context", "Missing user context")
		}

		requestedTenantID := uint(0)
		if tidAny := c.Locals("tenantID"); tidAny != nil {
			if tid, ok := tidAny.(uint); ok {
				requestedTenantID = tid
			}
		}

		tenantID, tenantRole, err := svc.ResolveTenantContext(userID, requestedTenantID)
		if err != nil {
			switch {
			case errors.Is(err, accesssvc.ErrNoTenantAssociation):
				log.Printf("[TenantMiddleware] no tenant association for user %d", userID)
				return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "tenant_missing_association", "Missing tenant association")
			case errors.Is(err, accesssvc.ErrInvalidTenantAssociation):
				log.Printf("[TenantMiddleware] invalid tenant association for user %d", userID)
				return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "tenant_invalid_association", "Invalid tenant association")
			case errors.Is(err, accesssvc.ErrInactiveTenant):
				log.Printf("[TenantMiddleware] tenant %d inactive for user %d", tenantID, userID)
				return transport.APIErrorResponse(c, fiber.StatusForbidden, "tenant_inactive", "Tenant is not active")
			default:
				log.Printf("[TenantMiddleware] resolve tenant context failed user=%d err=%v", userID, err)
				return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "tenant_context_resolve_failed", "Missing tenant association")
			}
		}

		c.Locals("tenantID", tenantID)
		c.Locals("tenantRole", tenantRole)

		return c.Next()
	}
}

func TenantOwnerMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		svc := accesssvc.NewService()

		userID, tenantID, ok := tenantContextIDs(c)
		if !ok {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "tenant_missing_context", "Missing user or tenant context")
		}

		role, err := svc.GetTenantRole(userID, tenantID)
		if err != nil {
			if errors.Is(err, accesssvc.ErrTenantMembershipNotFound) {
				return transport.APIErrorResponse(c, fiber.StatusForbidden, "tenant_access_denied", "Access denied")
			}
			log.Printf("[TenantOwnerMiddleware] role lookup failed user=%d tenant=%d err=%v", userID, tenantID, err)
			return transport.APIErrorResponse(c, fiber.StatusForbidden, "tenant_access_denied", "Access denied")
		}

		if role != model.TenantRoleOwner {
			return transport.APIErrorResponse(c, fiber.StatusForbidden, "tenant_owner_required", "Tenant owner access required")
		}

		return c.Next()
	}
}

func TenantUserMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		svc := accesssvc.NewService()

		userID, tenantID, ok := tenantContextIDs(c)
		if !ok {
			log.Printf("[TenantUserMiddleware] missing context (userID=%v tenantID=%v)", c.Locals("userID"), c.Locals("tenantID"))
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "tenant_missing_context", "Missing user or tenant context")
		}

		role, err := svc.GetTenantRole(userID, tenantID)
		if err != nil {
			log.Printf("[TenantUserMiddleware] no tenant record for user %d in tenant %d: %v", userID, tenantID, err)
			return transport.APIErrorResponse(c, fiber.StatusForbidden, "tenant_access_denied", "Access denied")
		}

		if role != model.TenantRoleOwner && role != model.TenantRoleAdmin {
			log.Printf("[TenantUserMiddleware] user %d has insufficient role=%s in tenant %d", userID, role, tenantID)
			return transport.APIErrorResponse(c, fiber.StatusForbidden, "tenant_admin_required", "Tenant tenant access required")
		}

		return c.Next()
	}
}

func tenantContextIDs(c *fiber.Ctx) (uint, uint, bool) {
	userIDAny := c.Locals("userID")
	tenantIDAny := c.Locals("tenantID")

	if userIDAny == nil || tenantIDAny == nil {
		return 0, 0, false
	}

	userID, ok := userIDAny.(uint)
	if !ok || userID == 0 {
		s, ok := userIDAny.(string)
		if !ok {
			return 0, 0, false
		}
		parsed, err := strconv.ParseUint(s, 10, 64)
		if err != nil || parsed == 0 {
			return 0, 0, false
		}
		userID = uint(parsed)
	}

	tenantID, ok := tenantIDAny.(uint)
	if !ok || tenantID == 0 {
		s, ok := tenantIDAny.(string)
		if !ok {
			return 0, 0, false
		}
		parsed, err := strconv.ParseUint(s, 10, 64)
		if err != nil || parsed == 0 {
			return 0, 0, false
		}
		tenantID = uint(parsed)
	}

	return userID, tenantID, true
}
