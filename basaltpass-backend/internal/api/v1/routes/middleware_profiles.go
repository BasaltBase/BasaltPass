package routes

import (
	"basaltpass-backend/internal/middleware/authn"
	"basaltpass-backend/internal/middleware/authz"
	s2smw "basaltpass-backend/internal/middleware/s2s"

	"github.com/gofiber/fiber/v2"
)

func profileSuperAdminConsole() []fiber.Handler {
	return []fiber.Handler{
		authn.JWTMiddleware(),
		authz.SuperAdminMiddleware(),
	}
}

func profileTenantConsole() []fiber.Handler {
	return []fiber.Handler{
		authn.JWTMiddleware(),
		authz.RequireConsoleScope("tenant"),
		authz.TenantMiddleware(),
	}
}

func profileTenantContext() []fiber.Handler {
	return []fiber.Handler{
		authn.JWTMiddleware(),
		authz.TenantMiddleware(),
	}
}

func profileS2SBase() []fiber.Handler {
	return []fiber.Handler{
		s2smw.ClientAuthMiddleware(),
		s2smw.S2SAuditMiddleware(),
		s2smw.ClientRateLimitMiddleware(),
	}
}
