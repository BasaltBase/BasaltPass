package middleware

import (
	"basaltpass-backend/internal/middleware/authn"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

// ExtractBearerToken extracts token string from Authorization header.
func ExtractBearerToken(c *fiber.Ctx) string {
	return authn.ExtractBearerToken(c)
}

// ParseJWTToken parses a JWT string and returns token + map claims.
// When ignoreClaimsValidation is true, exp/nbf claims are not validated.
func ParseJWTToken(tokenStr string, ignoreClaimsValidation bool) (*jwt.Token, jwt.MapClaims, error) {
	return authn.ParseJWTToken(tokenStr, ignoreClaimsValidation)
}
