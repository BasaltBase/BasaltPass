package oauth

import (
	txsvc "basaltpass-backend/internal/service/tokenexchange"
	"strings"

	"github.com/gofiber/fiber/v2"
)

var tokenExchangeSvc = txsvc.NewService()

// handleTokenExchangeGrant processes an OAuth 2.0 Token Exchange (RFC 8693) request.
//
// Required form parameters:
//   - grant_type = urn:ietf:params:oauth:grant-type:token-exchange
//   - subject_token: the existing access token to exchange
//   - subject_token_type: urn:ietf:params:oauth:token-type:access_token
//   - resource: the target app identifier (name or ID)
//   - scope: space-separated scopes requested for the target app
//
// Client authentication is required via one of:
//   - Authorization: Basic (client_id:client_secret)
//   - Form parameters client_id / client_secret
//   - Headers client_id / client_secret
func handleTokenExchangeGrant(c *fiber.Ctx) error {
	// 1. Authenticate the client
	clientID, clientSecret := extractClientCredentials(c)
	if clientID == "" || clientSecret == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             "invalid_client",
			"error_description": "Client authentication failed",
		})
	}

	client, err := oauthServerService.ValidateClientCredentials(clientID, clientSecret)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":             "invalid_client",
			"error_description": "Client authentication failed",
		})
	}

	// 2. Parse token exchange parameters
	subjectToken := strings.TrimSpace(c.FormValue("subject_token"))
	subjectTokenType := strings.TrimSpace(c.FormValue("subject_token_type"))
	resource := strings.TrimSpace(c.FormValue("resource"))
	scope := strings.TrimSpace(c.FormValue("scope"))

	if subjectToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             "invalid_request",
			"error_description": "subject_token is required",
		})
	}
	if subjectTokenType != "" && subjectTokenType != "urn:ietf:params:oauth:token-type:access_token" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             "invalid_request",
			"error_description": "Only access_token subject_token_type is supported",
		})
	}
	if resource == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             "invalid_request",
			"error_description": "resource (target app) is required",
		})
	}
	if scope == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":             "invalid_request",
			"error_description": "scope is required",
		})
	}

	// 3. Resolve the client's app and tenant context
	clientAppID := client.AppID
	clientTenantID := oauthServerService.resolveClientTenantID(client)

	// 4. Perform the exchange
	result, err := tokenExchangeSvc.Exchange(
		clientID,
		clientAppID,
		clientTenantID,
		txsvc.ExchangeRequest{
			SubjectToken:     subjectToken,
			SubjectTokenType: subjectTokenType,
			Resource:         resource,
			Scope:            scope,
		},
		c.IP(),
	)
	if err != nil {
		code := "invalid_request"
		status := fiber.StatusBadRequest

		switch err {
		case txsvc.ErrInvalidSubjectToken, txsvc.ErrTokenExpired:
			code = "invalid_token"
			status = fiber.StatusUnauthorized
		case txsvc.ErrTokenOwnership:
			code = "invalid_token"
			status = fiber.StatusForbidden
		case txsvc.ErrTargetAppNotFound:
			code = "invalid_target"
		case txsvc.ErrNoTrustRelation:
			code = "access_denied"
			status = fiber.StatusForbidden
		case txsvc.ErrUserNotAuthorized:
			code = "access_denied"
			status = fiber.StatusForbidden
		case txsvc.ErrInsufficientScope:
			code = "insufficient_scope"
			status = fiber.StatusForbidden
		}

		return c.Status(status).JSON(fiber.Map{
			"error":             code,
			"error_description": err.Error(),
		})
	}

	return c.JSON(result)
}
