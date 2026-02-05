package email

import (
	"fmt"
)

// Service provides email sending functionality
type Service struct {
	sender Sender
	config *Config
}

// NewService creates a new email service based on the configuration
func NewService(config *Config) (*Service, error) {
	if config == nil {
		return nil, fmt.Errorf("email config is required")
	}

	sender, err := createSender(config)
	if err != nil {
		return nil, fmt.Errorf("failed to create email sender: %w", err)
	}

	return &Service{
		sender: sender,
		config: config,
	}, nil
}

// createSender creates the appropriate sender based on the provider
func createSender(config *Config) (Sender, error) {
	switch config.Provider {
	case ProviderSMTP:
		if config.SMTP == nil {
			return nil, fmt.Errorf("SMTP config is required for SMTP provider")
		}
		return NewSMTPSender(config.SMTP)

	case ProviderAWSSES:
		if config.AWSSES == nil {
			return nil, fmt.Errorf("AWS SES config is required for AWS SES provider")
		}
		return NewAWSSESSender(config.AWSSES)

	case ProviderBrevo:
		if config.Brevo == nil {
			return nil, fmt.Errorf("Brevo config is required for Brevo provider")
		}
		return NewBrevoSender(config.Brevo)

	case ProviderMailgun:
		if config.Mailgun == nil {
			return nil, fmt.Errorf("Mailgun config is required for Mailgun provider")
		}
		return NewMailgunSender(config.Mailgun)

	default:
		return nil, fmt.Errorf("unsupported email provider: %s", config.Provider)
	}
}

// GetSender returns the underlying sender
func (s *Service) GetSender() Sender {
	return s.sender
}

// GetConfig returns the email configuration
func (s *Service) GetConfig() *Config {
	return s.config
}
