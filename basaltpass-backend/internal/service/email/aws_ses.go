package email

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/ses"
	"github.com/aws/aws-sdk-go-v2/service/ses/types"
)

// AWSSESSender implements the Sender interface for AWS SES
type AWSSESSender struct {
	config *AWSSESConfig
	client *ses.Client
}

// NewAWSSESSender creates a new AWS SES sender
func NewAWSSESSender(cfg *AWSSESConfig) (*AWSSESSender, error) {
	if cfg == nil {
		return nil, fmt.Errorf("AWS SES config is required")
	}
	if cfg.Region == "" {
		return nil, fmt.Errorf("AWS region is required")
	}
	if cfg.AccessKeyID == "" || cfg.SecretAccessKey == "" {
		return nil, fmt.Errorf("AWS credentials are required")
	}

	// Create AWS config
	awsConfig, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			cfg.AccessKeyID,
			cfg.SecretAccessKey,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	// Create SES client
	client := ses.NewFromConfig(awsConfig)

	return &AWSSESSender{
		config: cfg,
		client: client,
	}, nil
}

// Send sends an email via AWS SES
func (s *AWSSESSender) Send(ctx context.Context, msg *Message) (*SendResult, error) {
	if err := validateMessage(msg); err != nil {
		return nil, fmt.Errorf("invalid message: %w", err)
	}

	// Build destination
	destination := &types.Destination{
		ToAddresses: msg.To,
	}
	if len(msg.Cc) > 0 {
		destination.CcAddresses = msg.Cc
	}
	if len(msg.Bcc) > 0 {
		destination.BccAddresses = msg.Bcc
	}

	// Build message
	sesMsg := &types.Message{
		Subject: &types.Content{
			Data:    aws.String(msg.Subject),
			Charset: aws.String("UTF-8"),
		},
	}

	// Set body
	body := &types.Body{}
	if msg.HTMLBody != "" {
		body.Html = &types.Content{
			Data:    aws.String(msg.HTMLBody),
			Charset: aws.String("UTF-8"),
		}
	}
	if msg.TextBody != "" {
		body.Text = &types.Content{
			Data:    aws.String(msg.TextBody),
			Charset: aws.String("UTF-8"),
		}
	}
	sesMsg.Body = body

	// Build send input
	input := &ses.SendEmailInput{
		Destination: destination,
		Message:     sesMsg,
		Source:      aws.String(formatAddress(msg.From, msg.FromName)),
	}

	// Set reply-to
	if msg.ReplyTo != "" {
		input.ReplyToAddresses = []string{msg.ReplyTo}
	}

	// Set configuration set if provided
	if s.config.ConfigurationSet != "" {
		input.ConfigurationSetName = aws.String(s.config.ConfigurationSet)
	}

	// Handle attachments - SES requires raw email for attachments
	if len(msg.Attachments) > 0 {
		return s.sendRawEmail(ctx, msg)
	}

	// Send email
	output, err := s.client.SendEmail(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to send email via AWS SES: %w", err)
	}

	return &SendResult{
		MessageID: aws.ToString(output.MessageId),
		Provider:  ProviderAWSSES,
		SentAt:    time.Now(),
	}, nil
}

// sendRawEmail sends an email with attachments using raw email format
func (s *AWSSESSender) sendRawEmail(ctx context.Context, msg *Message) (*SendResult, error) {
	// Build raw email message
	rawMessage := buildRawEmail(msg)

	input := &ses.SendRawEmailInput{
		RawMessage: &types.RawMessage{
			Data: []byte(rawMessage),
		},
	}

	// Set configuration set if provided
	if s.config.ConfigurationSet != "" {
		input.ConfigurationSetName = aws.String(s.config.ConfigurationSet)
	}

	// Send raw email
	output, err := s.client.SendRawEmail(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("failed to send raw email via AWS SES: %w", err)
	}

	return &SendResult{
		MessageID: aws.ToString(output.MessageId),
		Provider:  ProviderAWSSES,
		SentAt:    time.Now(),
	}, nil
}

// Verify checks if the AWS SES service is accessible
func (s *AWSSESSender) Verify(ctx context.Context) error {
	// Try to get send quota as a verification method
	_, err := s.client.GetSendQuota(ctx, &ses.GetSendQuotaInput{})
	if err != nil {
		return fmt.Errorf("AWS SES verification failed: %w", err)
	}
	return nil
}

// Provider returns the provider type
func (s *AWSSESSender) Provider() Provider {
	return ProviderAWSSES
}

// buildRawEmail constructs a raw MIME email message
func buildRawEmail(msg *Message) string {
	boundary := fmt.Sprintf("----=_Part_%d", time.Now().UnixNano())

	raw := fmt.Sprintf("From: %s\r\n", formatAddress(msg.From, msg.FromName))
	raw += fmt.Sprintf("To: %s\r\n", joinAddresses(msg.To))

	if len(msg.Cc) > 0 {
		raw += fmt.Sprintf("Cc: %s\r\n", joinAddresses(msg.Cc))
	}

	if msg.ReplyTo != "" {
		raw += fmt.Sprintf("Reply-To: %s\r\n", msg.ReplyTo)
	}

	raw += fmt.Sprintf("Subject: %s\r\n", msg.Subject)
	raw += "MIME-Version: 1.0\r\n"
	raw += fmt.Sprintf("Content-Type: multipart/mixed; boundary=\"%s\"\r\n", boundary)
	raw += "\r\n"

	// Add text/html body
	raw += fmt.Sprintf("--%s\r\n", boundary)
	if msg.HTMLBody != "" {
		raw += "Content-Type: text/html; charset=UTF-8\r\n"
		raw += "Content-Transfer-Encoding: quoted-printable\r\n\r\n"
		raw += msg.HTMLBody + "\r\n"
	} else {
		raw += "Content-Type: text/plain; charset=UTF-8\r\n"
		raw += "Content-Transfer-Encoding: quoted-printable\r\n\r\n"
		raw += msg.TextBody + "\r\n"
	}

	// Add attachments
	for _, att := range msg.Attachments {
		raw += fmt.Sprintf("--%s\r\n", boundary)
		raw += fmt.Sprintf("Content-Type: %s; name=\"%s\"\r\n", att.ContentType, att.Filename)
		raw += "Content-Transfer-Encoding: base64\r\n"
		raw += fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n\r\n", att.Filename)
		raw += base64.StdEncoding.EncodeToString(att.Data) + "\r\n"
	}

	raw += fmt.Sprintf("--%s--\r\n", boundary)

	return raw
}

// formatAddress formats an email address with optional display name
func formatAddress(email, name string) string {
	if name != "" {
		return fmt.Sprintf("%s <%s>", name, email)
	}
	return email
}

// joinAddresses joins multiple email addresses with comma
func joinAddresses(addresses []string) string {
	result := ""
	for i, addr := range addresses {
		if i > 0 {
			result += ", "
		}
		result += addr
	}
	return result
}
