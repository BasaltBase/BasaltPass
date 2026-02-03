package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// RequireConsoleScope enforces that the authenticated JWT has a console scope in the allowed list.
//
// If the token has no "scp" claim, it's treated as "user".
func RequireConsoleScope(allowed ...string) fiber.Handler {
	allowedSet := map[string]struct{}{}
	for _, s := range allowed {
		if s == "" {
			continue
		}
		allowedSet[s] = struct{}{}
	}

	return func(c *fiber.Ctx) error {
		// Prefer cached scope from JWTMiddleware
		scope, _ := c.Locals("scope").(string)

		if scope == "" {
			// Fallback: read from token claims
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
