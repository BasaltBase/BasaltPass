package model

import (
	"gorm.io/gorm"
)

// EmailSendStatus represents the status of an email send operation
type EmailSendStatus string

const (
	EmailStatusPending EmailSendStatus = "pending"
	EmailStatusSent    EmailSendStatus = "sent"
	EmailStatusFailed  EmailSendStatus = "failed"
)

// EmailLog represents a record of email send operations in the system
type EmailLog struct {
	gorm.Model

	// Sender information
	FromAddress string `gorm:"size:255;not null" json:"from_address"`
	FromName    string `gorm:"size:255" json:"from_name"`

	// Recipient information
	ToAddress    string `gorm:"size:255;not null" json:"to_address"`
	CCAddresses  string `gorm:"size:1000" json:"cc_addresses"`  // JSON array of CC addresses
	BCCAddresses string `gorm:"size:1000" json:"bcc_addresses"` // JSON array of BCC addresses

	// Email content
	Subject  string `gorm:"size:500;not null" json:"subject"`
	TextBody string `gorm:"type:text" json:"text_body"`
	HTMLBody string `gorm:"type:text" json:"html_body"`
	IsHTML   bool   `gorm:"default:false" json:"is_html"`

	// Send metadata
	Provider     string          `gorm:"size:50" json:"provider"` // smtp, ses, brevo, mailgun
	Status       EmailSendStatus `gorm:"size:20;default:pending" json:"status"`
	ErrorMessage string          `gorm:"type:text" json:"error_message,omitempty"`

	// System context
	SentByUserID *uint  `gorm:"index" json:"sent_by_user_id,omitempty"` // User who triggered the send (nullable for system emails)
	Context      string `gorm:"size:100" json:"context"`                // e.g., "test", "notification", "password_reset"

	// Response metadata
	MessageID    string `gorm:"size:255" json:"message_id,omitempty"`     // Provider's message ID
	ResponseData string `gorm:"type:text" json:"response_data,omitempty"` // JSON response from provider
}

// TableName specifies the table name for EmailLog
func (EmailLog) TableName() string {
	return "email_logs"
}
