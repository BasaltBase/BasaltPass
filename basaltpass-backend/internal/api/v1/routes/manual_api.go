package routes

import (
	"basaltpass-backend/internal/handler/manualapi"
	"basaltpass-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterManualAPIRoutes(v1 fiber.Router) {
	group := v1.Group("/manual", middleware.ManualAPIKeyAuthMiddleware())
	group.Get("/apps", manualapi.ManualListAppsHandler)
	group.Post("/apps", manualapi.ManualCreateAppHandler)
	group.Get("/apps/:app_id", manualapi.ManualGetAppHandler)
	group.Put("/apps/:app_id", manualapi.ManualUpdateAppHandler)
	group.Delete("/apps/:app_id", manualapi.ManualDeleteAppHandler)
	group.Get("/apps/:app_id/stats", manualapi.ManualGetAppStatsHandler)
	group.Patch("/apps/:app_id/status", manualapi.ManualToggleAppStatusHandler)
	group.Put("/apps/:app_id/permissions", manualapi.ManualReplaceAppPermissionsHandler)
	group.Put("/apps/:app_id/roles", manualapi.ManualReplaceAppRolesHandler)
	group.Get("/oauth/clients", manualapi.ManualListOAuthClientsHandler)
	group.Post("/oauth/clients", manualapi.ManualCreateOAuthClientHandler)
	group.Get("/oauth/clients/:client_id", manualapi.ManualGetOAuthClientHandler)
	group.Put("/oauth/clients/:client_id", manualapi.ManualUpdateOAuthClientHandler)
	group.Delete("/oauth/clients/:client_id", manualapi.ManualDeleteOAuthClientHandler)
	group.Get("/oauth/clients/:client_id/stats", manualapi.ManualGetOAuthClientStatsHandler)
	group.Post("/oauth/clients/:client_id/regenerate-secret", manualapi.ManualRegenerateOAuthClientSecretHandler)
	group.Post("/oauth/clients/:client_id/revoke-tokens", manualapi.ManualRevokeOAuthClientTokensHandler)
}
