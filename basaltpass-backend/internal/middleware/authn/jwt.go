package authn

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/middleware/transport"
	serviceauth "basaltpass-backend/internal/service/auth"
	"errors"
	"strconv"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var errInvalidJWTClaims = errors.New("invalid jwt claims")

func ExtractBearerToken(c *fiber.Ctx) string {
	authHeader := strings.TrimSpace(c.Get("Authorization"))
	if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
}

func ParseJWTToken(tokenStr string, ignoreClaimsValidation bool) (*jwt.Token, jwt.MapClaims, error) {
	tokenStr = strings.TrimSpace(tokenStr)
	if tokenStr == "" {
		return nil, nil, jwt.ErrTokenMalformed
	}

	parserOpts := []jwt.ParserOption{}
	if ignoreClaimsValidation {
		parserOpts = append(parserOpts, jwt.WithoutClaimsValidation())
	}

	parser := jwt.NewParser(parserOpts...)
	token, err := parser.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, jwt.ErrTokenSignatureInvalid
		}
		return common.MustJWTSecret(), nil
	})
	if err != nil {
		return nil, nil, err
	}
	if token == nil {
		return nil, nil, jwt.ErrTokenUnverifiable
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return token, nil, errInvalidJWTClaims
	}

	return token, claims, nil
}

func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		tokenStr := ExtractBearerToken(c)
		if tokenStr == "" {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "auth_missing_token", "[Basalt Auth] missing token")
		}

		token, claims, err := ParseJWTToken(tokenStr, false)
		if err != nil || !token.Valid {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "auth_invalid_token", "[Basalt Auth] invalid token")
		}
		if claims == nil {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "auth_invalid_claims", "[Basalt Auth] invalid claims")
		}
		if err := serviceauth.ValidateAccessTokenType(claims); err != nil {
			return transport.APIErrorResponse(c, fiber.StatusUnauthorized, "auth_invalid_token", "[Basalt Auth] invalid token")
		}

		if userID, exists := claims["sub"]; exists {
			switch typed := userID.(type) {
			case float64:
				c.Locals("userID", uint(typed))
			case string:
				if parsed, parseErr := strconv.ParseUint(typed, 10, 64); parseErr == nil {
					c.Locals("userID", uint(parsed))
				}
			}
		}

		if tenantID, exists := claims["tid"]; exists {
			switch typed := tenantID.(type) {
			case float64:
				c.Locals("tenantID", uint(typed))
			case string:
				if parsed, parseErr := strconv.ParseUint(typed, 10, 64); parseErr == nil {
					c.Locals("tenantID", uint(parsed))
				}
			}
		}

		if scope, exists := claims["scp"]; exists {
			if scopeStr, ok := scope.(string); ok {
				c.Locals("scope", scopeStr)
			}
		}

		c.Locals("user", token)
		return c.Next()
	}
}
