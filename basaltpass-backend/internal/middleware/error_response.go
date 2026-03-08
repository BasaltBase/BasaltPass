package middleware

import (
	"basaltpass-backend/internal/middleware/transport"

	"github.com/gofiber/fiber/v2"
)

const InternalServerErrorCode = "internal_server_error"

func requestIDFromCtx(c *fiber.Ctx) string {
	return transport.RequestIDFromCtx(c)
}

// APIErrorResponse writes a unified API error response envelope.
func APIErrorResponse(c *fiber.Ctx, status int, code, message string) error {
	return transport.APIErrorResponse(c, status, code, message)
}

// S2SErrorResponse writes a unified S2S error response envelope.
func S2SErrorResponse(c *fiber.Ctx, status int, code, message string) error {
	return transport.S2SErrorResponse(c, status, code, message)
}
