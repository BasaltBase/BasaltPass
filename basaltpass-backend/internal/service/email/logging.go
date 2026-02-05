package email

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"context"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"gorm.io/gorm"
)

// LoggingService handles email send logging
type LoggingService struct {
	db *gorm.DB
}

// NewLoggingService creates a new email logging service
func NewLoggingService() *LoggingService {
	return &LoggingService{
		db: common.DB(),
	}
}

// LogEmailSend records an email send attempt
func (s *LoggingService) LogEmailSend(ctx context.Context, msg *Message, provider Provider, userID *uint, context string) (*model.EmailLog, error) {
	// Prepare CC and BCC addresses as JSON
	var ccJSON, bccJSON string
	if len(msg.Cc) > 0 {
		ccBytes, _ := json.Marshal(msg.Cc)
		ccJSON = string(ccBytes)
	}
	if len(msg.Bcc) > 0 {
		bccBytes, _ := json.Marshal(msg.Bcc)
		bccJSON = string(bccBytes)
	}

	// Determine primary recipient
	toAddress := ""
	if len(msg.To) > 0 {
		toAddress = msg.To[0] // Use the first recipient
	}

	emailLog := &model.EmailLog{
		FromAddress:  msg.From,
		FromName:     msg.FromName,
		ToAddress:    toAddress,
		CCAddresses:  ccJSON,
		BCCAddresses: bccJSON,
		Subject:      msg.Subject,
		TextBody:     msg.TextBody,
		HTMLBody:     msg.HTMLBody,
		IsHTML:       msg.HTMLBody != "",
		Provider:     string(provider),
		Status:       model.EmailStatusPending,
		SentByUserID: userID,
		Context:      context,
	}

	err := s.db.WithContext(ctx).Create(emailLog).Error
	return emailLog, err
}

// UpdateEmailSendStatus updates the status of an email send operation
func (s *LoggingService) UpdateEmailSendStatus(ctx context.Context, logID uint, result *SendResult, err error) error {
	updates := make(map[string]interface{})

	if err != nil {
		updates["status"] = model.EmailStatusFailed
		updates["error_message"] = err.Error()
	} else {
		updates["status"] = model.EmailStatusSent
		if result.MessageID != "" {
			updates["message_id"] = result.MessageID
		}

		// Store additional response data if available
		if result.Provider != "" {
			responseData := map[string]interface{}{
				"provider":   string(result.Provider),
				"message_id": result.MessageID,
				"sent_at":    result.SentAt,
			}
			if responseBytes, marshalErr := json.Marshal(responseData); marshalErr == nil {
				updates["response_data"] = string(responseBytes)
			}
		}
	}

	return s.db.WithContext(ctx).Model(&model.EmailLog{}).Where("id = ?", logID).Updates(updates).Error
}

// GetEmailLogs retrieves email logs with pagination and filtering
func (s *LoggingService) GetEmailLogs(ctx context.Context, params *EmailLogQueryParams) ([]*model.EmailLog, int64, error) {
	query := s.db.WithContext(ctx).Model(&model.EmailLog{})

	// Apply filters
	if params.Status != "" {
		query = query.Where("status = ?", params.Status)
	}
	if params.Provider != "" {
		query = query.Where("provider = ?", params.Provider)
	}
	if params.Context != "" {
		query = query.Where("context = ?", params.Context)
	}
	if params.UserID != nil {
		query = query.Where("sent_by_user_id = ?", *params.UserID)
	}
	if params.FromDate != nil {
		query = query.Where("created_at >= ?", *params.FromDate)
	}
	if params.ToDate != nil {
		query = query.Where("created_at <= ?", *params.ToDate)
	}
	if params.Search != "" {
		searchTerm := fmt.Sprintf("%%%s%%", strings.ToLower(params.Search))
		query = query.Where("LOWER(subject) LIKE ? OR LOWER(to_address) LIKE ? OR LOWER(from_address) LIKE ?",
			searchTerm, searchTerm, searchTerm)
	}

	// Get total count
	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (params.Page - 1) * params.PageSize
	query = query.Offset(offset).Limit(params.PageSize)

	// Apply ordering
	orderBy := "created_at DESC"
	if params.SortBy != "" {
		direction := "ASC"
		if params.SortDesc {
			direction = "DESC"
		}
		orderBy = fmt.Sprintf("%s %s", params.SortBy, direction)
	}
	query = query.Order(orderBy)

	var logs []*model.EmailLog
	err := query.Find(&logs).Error
	return logs, total, err
}

// GetEmailLogByID retrieves a specific email log by ID
func (s *LoggingService) GetEmailLogByID(ctx context.Context, id uint) (*model.EmailLog, error) {
	var log model.EmailLog
	err := s.db.WithContext(ctx).First(&log, id).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetEmailStats retrieves email sending statistics
func (s *LoggingService) GetEmailStats(ctx context.Context, fromDate, toDate *time.Time) (*EmailStats, error) {
	query := s.db.WithContext(ctx).Model(&model.EmailLog{})

	if fromDate != nil {
		query = query.Where("created_at >= ?", *fromDate)
	}
	if toDate != nil {
		query = query.Where("created_at <= ?", *toDate)
	}

	stats := &EmailStats{}

	// Total emails
	if err := query.Count(&stats.TotalEmails).Error; err != nil {
		return nil, err
	}

	// Status breakdown
	var statusCounts []struct {
		Status string
		Count  int64
	}
	if err := query.Select("status, COUNT(*) as count").Group("status").Scan(&statusCounts).Error; err != nil {
		return nil, err
	}

	for _, sc := range statusCounts {
		switch model.EmailSendStatus(sc.Status) {
		case model.EmailStatusSent:
			stats.SentEmails = sc.Count
		case model.EmailStatusFailed:
			stats.FailedEmails = sc.Count
		case model.EmailStatusPending:
			stats.PendingEmails = sc.Count
		}
	}

	// Provider breakdown
	var providerCounts []struct {
		Provider string
		Count    int64
	}
	if err := query.Select("provider, COUNT(*) as count").Group("provider").Scan(&providerCounts).Error; err != nil {
		return nil, err
	}

	stats.ProviderStats = make(map[string]int64)
	for _, pc := range providerCounts {
		stats.ProviderStats[pc.Provider] = pc.Count
	}

	return stats, nil
}

// EmailLogQueryParams represents query parameters for email logs
type EmailLogQueryParams struct {
	Page     int                   `json:"page" query:"page"`
	PageSize int                   `json:"page_size" query:"page_size"`
	Status   model.EmailSendStatus `json:"status" query:"status"`
	Provider string                `json:"provider" query:"provider"`
	Context  string                `json:"context" query:"context"`
	UserID   *uint                 `json:"user_id" query:"user_id"`
	FromDate *time.Time            `json:"from_date" query:"from_date"`
	ToDate   *time.Time            `json:"to_date" query:"to_date"`
	Search   string                `json:"search" query:"search"`
	SortBy   string                `json:"sort_by" query:"sort_by"`
	SortDesc bool                  `json:"sort_desc" query:"sort_desc"`
}

// EmailStats represents email sending statistics
type EmailStats struct {
	TotalEmails   int64            `json:"total_emails"`
	SentEmails    int64            `json:"sent_emails"`
	FailedEmails  int64            `json:"failed_emails"`
	PendingEmails int64            `json:"pending_emails"`
	ProviderStats map[string]int64 `json:"provider_stats"`
}
