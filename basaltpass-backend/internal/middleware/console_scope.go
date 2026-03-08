package middleware

import (
	"basaltpass-backend/internal/middleware/authz"

	"github.com/gofiber/fiber/v2"
)

// RequireConsoleScope enforces that the authenticated JWT has a console scope in the allowed list.
//
// If the token has no "scp" claim, it's treated as "user".
func RequireConsoleScope(allowed ...string) fiber.Handler {
	return authz.RequireConsoleScope(allowed...)
}
