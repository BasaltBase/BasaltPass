package email

// SendTestEmailRequest represents the request body for sending a test email
type SendTestEmailRequest struct {
	From    string `json:"from"` // Optional: override sender
	To      string `json:"to" validate:"required,email"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
	IsHTML  bool   `json:"is_html"`
}

// EmailConfigResponse represents the email configuration status
type EmailConfigResponse struct {
	Provider string `json:"provider"`
	Enabled  bool   `json:"enabled"`
}
