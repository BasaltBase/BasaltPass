package email

import (
	"context"
	"time"
)

// Provider represents the type of email service provider
type Provider string

const (
	ProviderSMTP    Provider = "smtp"
	ProviderAWSSES  Provider = "aws_ses"
	ProviderBrevo   Provider = "brevo"
	ProviderMailgun Provider = "mailgun"
)

// Message represents an email message to be sent
type Message struct {
	From        string            // Sender email address
	FromName    string            // Sender display name (optional)
	To          []string          // Recipient email addresses
	Cc          []string          // CC recipients (optional)
	Bcc         []string          // BCC recipients (optional)
	Subject     string            // Email subject
	TextBody    string            // Plain text body
	HTMLBody    string            // HTML body (optional)
	ReplyTo     string            // Reply-To address (optional)
	Headers     map[string]string // Additional headers (optional)
	Attachments []Attachment      // File attachments (optional)
}

// Attachment represents an email attachment
type Attachment struct {
	Filename    string // Name of the file
	ContentType string // MIME type
	Data        []byte // File content
}

// SendResult contains information about the sent email
type SendResult struct {
	MessageID string    // Unique identifier for the sent message
	Provider  Provider  // Provider used to send the email
	SentAt    time.Time // Timestamp when the email was sent
	Error     error     // Any error that occurred
}

// Sender is the interface that all email providers must implement
type Sender interface {
	// Send sends an email message
	Send(ctx context.Context, msg *Message) (*SendResult, error)

	// Verify verifies the connection and credentials
	Verify(ctx context.Context) error

	// Provider returns the provider type
	Provider() Provider
}

// Config represents the configuration for email service
type Config struct {
	Provider Provider       `mapstructure:"provider" yaml:"provider" json:"provider"`
	SMTP     *SMTPConfig    `mapstructure:"smtp" yaml:"smtp" json:"smtp"`
	AWSSES   *AWSSESConfig  `mapstructure:"aws_ses" yaml:"aws_ses" json:"aws_ses"`
	Brevo    *BrevoConfig   `mapstructure:"brevo" yaml:"brevo" json:"brevo"`
	Mailgun  *MailgunConfig `mapstructure:"mailgun" yaml:"mailgun" json:"mailgun"`
}

// SMTPConfig represents SMTP server configuration
type SMTPConfig struct {
	Host     string `mapstructure:"host" yaml:"host" json:"host"`
	Port     int    `mapstructure:"port" yaml:"port" json:"port"`
	Username string `mapstructure:"username" yaml:"username" json:"username"`
	Password string `mapstructure:"password" yaml:"password" json:"password"`
	UseTLS   bool   `mapstructure:"use_tls" yaml:"use_tls" json:"use_tls"`
	UseSSL   bool   `mapstructure:"use_ssl" yaml:"use_ssl" json:"use_ssl"`
}

// AWSSESConfig represents AWS SES configuration
type AWSSESConfig struct {
	Region           string `mapstructure:"region" yaml:"region" json:"region"`
	AccessKeyID      string `mapstructure:"access_key_id" yaml:"access_key_id" json:"access_key_id"`
	SecretAccessKey  string `mapstructure:"secret_access_key" yaml:"secret_access_key" json:"secret_access_key"`
	ConfigurationSet string `mapstructure:"configuration_set" yaml:"configuration_set" json:"configuration_set"` // Optional
}

// BrevoConfig represents Brevo (Sendinblue) configuration
type BrevoConfig struct {
	APIKey string `mapstructure:"api_key" yaml:"api_key" json:"api_key"`
	// BaseURL can be customized if needed (default: https://api.brevo.com/v3)
	BaseURL string `mapstructure:"base_url" yaml:"base_url" json:"base_url"`
}

// MailgunConfig represents Mailgun configuration
type MailgunConfig struct {
	Domain string `mapstructure:"domain" yaml:"domain" json:"domain"`
	APIKey string `mapstructure:"api_key" yaml:"api_key" json:"api_key"`
	// BaseURL can be EU or US (default: https://api.mailgun.net)
	BaseURL string `mapstructure:"base_url" yaml:"base_url" json:"base_url"`
}
