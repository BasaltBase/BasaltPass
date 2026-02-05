package email

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net"
	"net/smtp"
	"strings"
	"time"

	"gopkg.in/gomail.v2"
)

// SMTPSender implements the Sender interface for SMTP
type SMTPSender struct {
	config *SMTPConfig
}

// NewSMTPSender creates a new SMTP sender
func NewSMTPSender(config *SMTPConfig) (*SMTPSender, error) {
	if config == nil {
		return nil, fmt.Errorf("SMTP config is required")
	}
	if config.Host == "" {
		return nil, fmt.Errorf("SMTP host is required")
	}
	if config.Port == 0 {
		config.Port = 587 // Default to submission port
	}

	return &SMTPSender{config: config}, nil
}

// Send sends an email via SMTP
func (s *SMTPSender) Send(ctx context.Context, msg *Message) (*SendResult, error) {
	if err := validateMessage(msg); err != nil {
		return nil, fmt.Errorf("invalid message: %w", err)
	}

	m := gomail.NewMessage()

	// Set sender
	if msg.FromName != "" {
		m.SetHeader("From", m.FormatAddress(msg.From, msg.FromName))
	} else {
		m.SetHeader("From", msg.From)
	}

	// Set recipients
	m.SetHeader("To", msg.To...)
	if len(msg.Cc) > 0 {
		m.SetHeader("Cc", msg.Cc...)
	}
	if len(msg.Bcc) > 0 {
		m.SetHeader("Bcc", msg.Bcc...)
	}

	// Set subject
	m.SetHeader("Subject", msg.Subject)

	// Set reply-to
	if msg.ReplyTo != "" {
		m.SetHeader("Reply-To", msg.ReplyTo)
	}

	// Set custom headers
	for key, value := range msg.Headers {
		m.SetHeader(key, value)
	}

	// Set body
	if msg.HTMLBody != "" {
		m.SetBody("text/html", msg.HTMLBody)
		if msg.TextBody != "" {
			m.AddAlternative("text/plain", msg.TextBody)
		}
	} else {
		m.SetBody("text/plain", msg.TextBody)
	}

	// Add attachments
	for _, att := range msg.Attachments {
		m.Attach(att.Filename, gomail.SetCopyFunc(func(w io.Writer) error {
			_, err := w.Write(att.Data)
			return err
		}))
	}

	// Create dialer
	d := gomail.NewDialer(s.config.Host, s.config.Port, s.config.Username, s.config.Password)

	// Configure TLS
	if s.config.UseSSL {
		d.SSL = true
	} else if s.config.UseTLS {
		d.TLSConfig = &tls.Config{
			ServerName: s.config.Host,
			MinVersion: tls.VersionTLS12,
		}
	} else {
		// Disable TLS entirely for local/testing
		d.TLSConfig = &tls.Config{
			InsecureSkipVerify: true,
		}
	}

	// Send the email
	if err := d.DialAndSend(m); err != nil {
		return nil, fmt.Errorf("failed to send email via SMTP: %w", err)
	}

	return &SendResult{
		MessageID: generateMessageID(msg),
		Provider:  ProviderSMTP,
		SentAt:    time.Now(),
	}, nil
}

// Verify checks if the SMTP connection can be established
func (s *SMTPSender) Verify(ctx context.Context) error {
	addr := fmt.Sprintf("%s:%d", s.config.Host, s.config.Port)

	// Test connection
	conn, err := net.DialTimeout("tcp", addr, 10*time.Second)
	if err != nil {
		return fmt.Errorf("cannot connect to SMTP server: %w", err)
	}
	defer conn.Close()

	// If authentication is required, test it
	if s.config.Username != "" && s.config.Password != "" {
		client, err := smtp.Dial(addr)
		if err != nil {
			return fmt.Errorf("failed to create SMTP client: %w", err)
		}
		defer client.Close()

		// Start TLS if required
		if s.config.UseTLS {
			tlsConfig := &tls.Config{
				ServerName: s.config.Host,
				MinVersion: tls.VersionTLS12,
			}
			if err := client.StartTLS(tlsConfig); err != nil {
				return fmt.Errorf("failed to start TLS: %w", err)
			}
		}

		// Test authentication
		auth := smtp.PlainAuth("", s.config.Username, s.config.Password, s.config.Host)
		if err := client.Auth(auth); err != nil {
			return fmt.Errorf("SMTP authentication failed: %w", err)
		}
	}

	return nil
}

// Provider returns the provider type
func (s *SMTPSender) Provider() Provider {
	return ProviderSMTP
}

// validateMessage checks if the message has all required fields
func validateMessage(msg *Message) error {
	if msg == nil {
		return fmt.Errorf("message is nil")
	}
	if msg.From == "" {
		return fmt.Errorf("from address is required")
	}
	if len(msg.To) == 0 {
		return fmt.Errorf("at least one recipient is required")
	}
	if msg.Subject == "" {
		return fmt.Errorf("subject is required")
	}
	if msg.TextBody == "" && msg.HTMLBody == "" {
		return fmt.Errorf("message body is required")
	}
	return nil
}

// generateMessageID creates a unique message ID
func generateMessageID(msg *Message) string {
	timestamp := time.Now().UnixNano()
	domain := "basaltpass.local"

	if msg.From != "" {
		parts := strings.Split(msg.From, "@")
		if len(parts) == 2 {
			domain = parts[1]
		}
	}

	return fmt.Sprintf("<%d@%s>", timestamp, domain)
}
