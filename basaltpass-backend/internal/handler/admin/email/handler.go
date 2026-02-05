package email

import (
	"basaltpass-backend/internal/config"
	"basaltpass-backend/internal/model"
	"basaltpass-backend/internal/service/email"
	"context"
	"strconv"
	"time"

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

	// If the user specificies a sender in the request (optional feature for future), we could use that.

	if req.IsHTML {
		msg.HTMLBody = req.Body
	} else {
		msg.TextBody = req.Body
	}

	// Get user ID from context if available (for logging purposes)
	var userID *uint
	if uid := c.Locals("userID"); uid != nil {
		if id, ok := uid.(uint); ok {
			userID = &id
		}
	}

	// Send email with logging
	result, err := service.SendWithLogging(context.Background(), msg, userID, "test")
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

// GetEmailLogsHandler returns email sending history
func GetEmailLogsHandler(c *fiber.Ctx) error {
	cfg := config.Get()

	// Create email service to access logging
	service, err := email.NewServiceFromConfig(cfg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize email service: " + err.Error(),
		})
	}

	loggingService := service.GetLoggingService()

	// Parse query parameters
	params := &email.EmailLogQueryParams{
		Page:     1,
		PageSize: 20,
	}

	if page := c.Query("page"); page != "" {
		if p, err := strconv.Atoi(page); err == nil && p > 0 {
			params.Page = p
		}
	}

	if pageSize := c.Query("page_size"); pageSize != "" {
		if ps, err := strconv.Atoi(pageSize); err == nil && ps > 0 && ps <= 100 {
			params.PageSize = ps
		}
	}

	if status := c.Query("status"); status != "" {
		switch status {
		case "pending", "sent", "failed":
			params.Status = model.EmailSendStatus(status)
		}
	}

	if provider := c.Query("provider"); provider != "" {
		params.Provider = provider
	}

	if context := c.Query("context"); context != "" {
		params.Context = context
	}

	if search := c.Query("search"); search != "" {
		params.Search = search
	}

	if sortBy := c.Query("sort_by"); sortBy != "" {
		params.SortBy = sortBy
	}

	if sortDesc := c.Query("sort_desc"); sortDesc == "true" {
		params.SortDesc = true
	}

	// Parse date filters
	if fromDate := c.Query("from_date"); fromDate != "" {
		if parsed, err := time.Parse("2006-01-02", fromDate); err == nil {
			params.FromDate = &parsed
		}
	}

	if toDate := c.Query("to_date"); toDate != "" {
		if parsed, err := time.Parse("2006-01-02", toDate); err == nil {
			// Set to end of day
			endOfDay := parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			params.ToDate = &endOfDay
		}
	}

	// Get email logs
	logs, total, err := loggingService.GetEmailLogs(context.Background(), params)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve email logs: " + err.Error(),
		})
	}

	// Calculate pagination info
	totalPages := (int(total) + params.PageSize - 1) / params.PageSize

	return c.JSON(fiber.Map{
		"data": logs,
		"pagination": fiber.Map{
			"page":        params.Page,
			"page_size":   params.PageSize,
			"total":       total,
			"total_pages": totalPages,
		},
	})
}

// GetEmailStatsHandler returns email sending statistics
func GetEmailStatsHandler(c *fiber.Ctx) error {
	cfg := config.Get()

	// Create email service to access logging
	service, err := email.NewServiceFromConfig(cfg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize email service: " + err.Error(),
		})
	}

	loggingService := service.GetLoggingService()

	// Parse date range (default to last 30 days)
	var fromDate, toDate *time.Time

	if from := c.Query("from_date"); from != "" {
		if parsed, err := time.Parse("2006-01-02", from); err == nil {
			fromDate = &parsed
		}
	} else {
		// Default to 30 days ago
		defaultFrom := time.Now().AddDate(0, 0, -30)
		fromDate = &defaultFrom
	}

	if to := c.Query("to_date"); to != "" {
		if parsed, err := time.Parse("2006-01-02", to); err == nil {
			endOfDay := parsed.Add(23*time.Hour + 59*time.Minute + 59*time.Second)
			toDate = &endOfDay
		}
	} else {
		// Default to now
		now := time.Now()
		toDate = &now
	}

	// Get email statistics
	stats, err := loggingService.GetEmailStats(context.Background(), fromDate, toDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to retrieve email statistics: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"data": stats,
		"date_range": fiber.Map{
			"from": fromDate.Format("2006-01-02"),
			"to":   toDate.Format("2006-01-02"),
		},
	})
}
