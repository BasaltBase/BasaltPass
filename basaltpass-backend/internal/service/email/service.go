package email

import (
	"context"
	"fmt"
)

// Service provides email sending functionality
type Service struct {
	sender     Sender
	config     *Config
	logService *LoggingService
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
		sender:     sender,
		config:     config,
		logService: NewLoggingService(),
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

// SendWithLogging sends an email and logs the operation
func (s *Service) SendWithLogging(ctx context.Context, msg *Message, userID *uint, emailContext string) (*SendResult, error) {
	ApplyDefaultSender(msg)
	// Log the email send attempt
	emailLog, err := s.logService.LogEmailSend(ctx, msg, s.sender.Provider(), userID, emailContext)
	if err != nil {
		return nil, fmt.Errorf("failed to log email send: %w", err)
	}

	// Send the email
	result, sendErr := s.sender.Send(ctx, msg)

	// Update the log with the result
	if updateErr := s.logService.UpdateEmailSendStatus(ctx, emailLog.ID, result, sendErr); updateErr != nil {
		// Don't fail the send operation if logging fails, but log the error
		fmt.Printf("Warning: failed to update email log: %v\n", updateErr)
	}

	return result, sendErr
}

// GetLoggingService returns the logging service
func (s *Service) GetLoggingService() *LoggingService {
	return s.logService
}
