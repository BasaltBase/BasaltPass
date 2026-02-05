package email

import (
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/service/email"
	"context"

	"github.com/gofiber/fiber/v2"
)

// SendTestEmailHandler sends a test email to the specified recipient
func SendTestEmailHandler(c *fiber.Ctx) error {
	var req SendTestEmailRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body: " + err.Error(),
		})
	}

	// Basic validation
	if req.To == " " {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email recipient is required",
		})
	}

	// Load configuration
	cfg := config.Get()

	// Create email service
	service, err := email.NewServiceFromConfig(cfg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize email service: " + err.Error(),
		})
	}

	sender := service.GetSender()

	// Default subject if not provided
	if req.Subject == "" {
		req.Subject = "Test Email from BasaltPass Admin"
	}

	// Default body if not provided
	if req.Body == "" {
		req.Body = "This is a test email sent from the BasaltPass Admin Dashboard."
	}

	msg := &email.Message{
		From:     req.From,
		FromName: "BasaltPass Admin",
		To:       []string{req.To},
		Subject:  req.Subject,
	}

	// Determine sender if not provided
	if msg.From == "" {
		if cfg.Email.Provider == "smtp" && cfg.Email.SMTP.Username != "" {
			msg.From = cfg.Email.SMTP.Username
		} else {
			// Fallback standard email
			msg.From = "noreply@basaltpass.com"
		}
	}

	// If the user specificies a sender in the request (optional feature for future), we could use that.

	if req.IsHTML {
		msg.HTMLBody = req.Body
	} else {
		msg.TextBody = req.Body
	}

	result, err := sender.Send(context.Background(), msg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to send email: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Email sent successfully",
		"data":    result,
	})
}

// GetEmailConfigHandler returns the current email configuration summary
func GetEmailConfigHandler(c *fiber.Ctx) error {
	cfg := config.Get()

	return c.JSON(fiber.Map{
		"message": "Email configuration retrieved",
		"data": fiber.Map{
			"provider": cfg.Email.Provider,
			"enabled":  cfg.Email.Provider != "",
			// Don't return sensitive keys
		},
	})
}
