package transport

import "github.com/gofiber/fiber/v2"

const InternalServerErrorCode = "internal_server_error"

func RequestIDFromCtx(c *fiber.Ctx) string {
	if requestID, ok := c.Locals("requestid").(string); ok {
		return requestID
	}
	if requestID := c.Get("X-Request-ID"); requestID != "" {
		return requestID
	}
	return ""
}

func APIErrorResponse(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(fiber.Map{
		"error":      message,
		"code":       code,
		"status":     status,
		"path":       c.Path(),
		"request_id": RequestIDFromCtx(c),
	})
}

func S2SErrorResponse(c *fiber.Ctx, status int, code, message string) error {
	return c.Status(status).JSON(fiber.Map{
		"data": nil,
		"error": fiber.Map{
			"code":    code,
			"message": message,
		},
		"request_id": RequestIDFromCtx(c),
	})
}
