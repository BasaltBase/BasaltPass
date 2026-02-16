package oauth

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

const oauthClientIDLocalKey = "oauth_client_id"

// OAuthClientAuthMiddleware authenticates OAuth clients for endpoints that must
// not be publicly callable (e.g. introspect / revoke).
func OAuthClientAuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		clientID, clientSecret := extractClientCredentials(c)
		clientID = strings.TrimSpace(clientID)

		if clientID == "" || clientSecret == "" {
			return oauthInvalidClient(c)
		}

		if _, err := oauthServerService.ValidateClientCredentials(clientID, clientSecret); err != nil {
			return oauthInvalidClient(c)
		}

		c.Locals(oauthClientIDLocalKey, clientID)
		return c.Next()
	}
}

func getAuthenticatedOAuthClientID(c *fiber.Ctx) string {
	clientID, _ := c.Locals(oauthClientIDLocalKey).(string)
	return strings.TrimSpace(clientID)
}

func oauthInvalidClient(c *fiber.Ctx) error {
	c.Set("WWW-Authenticate", `Basic realm="oauth2", error="invalid_client"`)
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error":             "invalid_client",
		"error_description": "Client authentication failed",
	})
}
