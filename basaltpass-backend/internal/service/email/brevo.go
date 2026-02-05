package email

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// BrevoSender implements the Sender interface for Brevo (Sendinblue)
type BrevoSender struct {
	config     *BrevoConfig
	httpClient *http.Client
	baseURL    string
}

// NewBrevoSender creates a new Brevo sender
func NewBrevoSender(config *BrevoConfig) (*BrevoSender, error) {
	if config == nil {
		return nil, fmt.Errorf("Brevo config is required")
	}
	if config.APIKey == "" {
		return nil, fmt.Errorf("Brevo API key is required")
	}

	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://api.brevo.com/v3"
	}

	return &BrevoSender{
		config:     config,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    baseURL,
	}, nil
}

// brevoEmailRequest represents the Brevo API email request
type brevoEmailRequest struct {
	Sender      brevoContact      `json:"sender"`
	To          []brevoContact    `json:"to"`
	Cc          []brevoContact    `json:"cc,omitempty"`
	Bcc         []brevoContact    `json:"bcc,omitempty"`
	Subject     string            `json:"subject"`
	HTMLContent string            `json:"htmlContent,omitempty"`
	TextContent string            `json:"textContent,omitempty"`
	ReplyTo     *brevoContact     `json:"replyTo,omitempty"`
	Headers     map[string]string `json:"headers,omitempty"`
	Attachment  []brevoAttachment `json:"attachment,omitempty"`
}

type brevoContact struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type brevoAttachment struct {
	Content string `json:"content"` // Base64 encoded
	Name    string `json:"name"`
}

type brevoEmailResponse struct {
	MessageID string `json:"messageId"`
}

// Send sends an email via Brevo
func (s *BrevoSender) Send(ctx context.Context, msg *Message) (*SendResult, error) {
	if err := validateMessage(msg); err != nil {
		return nil, fmt.Errorf("invalid message: %w", err)
	}

	// Build request
	req := brevoEmailRequest{
		Sender: brevoContact{
			Email: msg.From,
			Name:  msg.FromName,
		},
		Subject:     msg.Subject,
		HTMLContent: msg.HTMLBody,
		TextContent: msg.TextBody,
		Headers:     msg.Headers,
	}

	// Add recipients
	for _, to := range msg.To {
		req.To = append(req.To, brevoContact{Email: to})
	}
	for _, cc := range msg.Cc {
		req.Cc = append(req.Cc, brevoContact{Email: cc})
	}
	for _, bcc := range msg.Bcc {
		req.Bcc = append(req.Bcc, brevoContact{Email: bcc})
	}

	// Add reply-to
	if msg.ReplyTo != "" {
		req.ReplyTo = &brevoContact{Email: msg.ReplyTo}
	}

	// Add attachments
	for _, att := range msg.Attachments {
		req.Attachment = append(req.Attachment, brevoAttachment{
			Content: base64.StdEncoding.EncodeToString(att.Data),
			Name:    att.Filename,
		})
	}

	// Marshal request
	jsonData, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Create HTTP request
	httpReq, err := http.NewRequestWithContext(ctx, "POST", s.baseURL+"/smtp/email", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("api-key", s.config.APIKey)
	httpReq.Header.Set("Accept", "application/json")

	// Send request
	resp, err := s.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to Brevo: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Brevo API error (status %d): %s", resp.StatusCode, string(body))
	}

	// Parse response
	var brevoResp brevoEmailResponse
	if err := json.Unmarshal(body, &brevoResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	return &SendResult{
		MessageID: brevoResp.MessageID,
		Provider:  ProviderBrevo,
		SentAt:    time.Now(),
	}, nil
}

// Verify checks if the Brevo API is accessible
func (s *BrevoSender) Verify(ctx context.Context) error {
	// Test with account endpoint
	req, err := http.NewRequestWithContext(ctx, "GET", s.baseURL+"/account", nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("api-key", s.config.APIKey)
	req.Header.Set("Accept", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to verify Brevo connection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Brevo verification failed (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// Provider returns the provider type
func (s *BrevoSender) Provider() Provider {
	return ProviderBrevo
}
