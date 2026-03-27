package routes

import (
	"basaltpass-backend/internal/handler/manualapi"
	"basaltpass-backend/internal/middleware"

	"github.com/gofiber/fiber/v2"
)

func RegisterManualAPIRoutes(v1 fiber.Router) {
	group := v1.Group("/manual", middleware.ManualAPIKeyAuthMiddleware())
	group.Post("/apps", manualapi.ManualCreateAppHandler)
	group.Put("/apps/:app_id/permissions", manualapi.ManualReplaceAppPermissionsHandler)
}
