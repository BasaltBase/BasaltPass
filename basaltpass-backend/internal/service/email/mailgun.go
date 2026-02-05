package email

import (
	"bytes"
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"strings"
	"time"
)

// MailgunSender implements the Sender interface for Mailgun
type MailgunSender struct {
	config     *MailgunConfig
	httpClient *http.Client
	baseURL    string
}

// NewMailgunSender creates a new Mailgun sender
func NewMailgunSender(config *MailgunConfig) (*MailgunSender, error) {
	if config == nil {
		return nil, fmt.Errorf("Mailgun config is required")
	}
	if config.Domain == "" {
		return nil, fmt.Errorf("Mailgun domain is required")
	}
	if config.APIKey == "" {
		return nil, fmt.Errorf("Mailgun API key is required")
	}

	baseURL := config.BaseURL
	if baseURL == "" {
		baseURL = "https://api.mailgun.net/v3"
	}

	return &MailgunSender{
		config:     config,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		baseURL:    baseURL,
	}, nil
}

// mailgunResponse represents the Mailgun API response
type mailgunResponse struct {
	ID      string `json:"id"`
	Message string `json:"message"`
}

// Send sends an email via Mailgun
func (s *MailgunSender) Send(ctx context.Context, msg *Message) (*SendResult, error) {
	if err := validateMessage(msg); err != nil {
		return nil, fmt.Errorf("invalid message: %w", err)
	}

	// Create multipart form data
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	// Add from
	from := msg.From
	if msg.FromName != "" {
		from = fmt.Sprintf("%s <%s>", msg.FromName, msg.From)
	}
	writer.WriteField("from", from)

	// Add to recipients
	for _, to := range msg.To {
		writer.WriteField("to", to)
	}

	// Add cc recipients
	for _, cc := range msg.Cc {
		writer.WriteField("cc", cc)
	}

	// Add bcc recipients
	for _, bcc := range msg.Bcc {
		writer.WriteField("bcc", bcc)
	}

	// Add subject
	writer.WriteField("subject", msg.Subject)

	// Add body
	if msg.TextBody != "" {
		writer.WriteField("text", msg.TextBody)
	}
	if msg.HTMLBody != "" {
		writer.WriteField("html", msg.HTMLBody)
	}

	// Add reply-to
	if msg.ReplyTo != "" {
		writer.WriteField("h:Reply-To", msg.ReplyTo)
	}

	// Add custom headers
	for key, value := range msg.Headers {
		writer.WriteField("h:"+key, value)
	}

	// Add attachments
	for _, att := range msg.Attachments {
		part, err := writer.CreateFormFile("attachment", att.Filename)
		if err != nil {
			return nil, fmt.Errorf("failed to create attachment field: %w", err)
		}
		if _, err := part.Write(att.Data); err != nil {
			return nil, fmt.Errorf("failed to write attachment data: %w", err)
		}
	}

	if err := writer.Close(); err != nil {
		return nil, fmt.Errorf("failed to close multipart writer: %w", err)
	}

	// Create HTTP request
	url := fmt.Sprintf("%s/%s/messages", s.baseURL, s.config.Domain)
	req, err := http.NewRequestWithContext(ctx, "POST", url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.SetBasicAuth("api", s.config.APIKey)

	// Send request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request to Mailgun: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check status code
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Mailgun API error (status %d): %s", resp.StatusCode, string(respBody))
	}

	// Extract message ID from response
	// Mailgun returns: {"id": "<20230101120000.1.ABCDEF@domain.com>", "message": "Queued. Thank you."}
	messageID := extractMailgunMessageID(string(respBody))

	return &SendResult{
		MessageID: messageID,
		Provider:  ProviderMailgun,
		SentAt:    time.Now(),
	}, nil
}

// Verify checks if the Mailgun API is accessible
func (s *MailgunSender) Verify(ctx context.Context) error {
	// Test with domain info endpoint
	url := fmt.Sprintf("%s/domains/%s", s.baseURL, s.config.Domain)
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.SetBasicAuth("api", s.config.APIKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to verify Mailgun connection: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("Mailgun verification failed (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}

// Provider returns the provider type
func (s *MailgunSender) Provider() Provider {
	return ProviderMailgun
}

// extractMailgunMessageID extracts the message ID from Mailgun response
func extractMailgunMessageID(response string) string {
	// Simple extraction - in production, use proper JSON parsing
	start := strings.Index(response, `"id":"`)
	if start == -1 {
		return ""
	}
	start += 6 // Length of `"id":"`

	end := strings.Index(response[start:], `"`)
	if end == -1 {
		return ""
	}

	return response[start : start+end]
}

// encodeBase64 encodes data to base64 string
func encodeBase64(data []byte) string {
	return base64.StdEncoding.EncodeToString(data)
}
