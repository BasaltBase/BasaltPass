package email

import (
	"basaltpass-backend/internal/config"
)

// NewServiceFromConfig creates an email service from the application config
func NewServiceFromConfig(cfg *config.Config) (*Service, error) {
	emailCfg := &Config{
		Provider: Provider(cfg.Email.Provider),
	}

	// SMTP config
	if cfg.Email.Provider == "smtp" {
		emailCfg.SMTP = &SMTPConfig{
			Host:     cfg.Email.SMTP.Host,
			Port:     cfg.Email.SMTP.Port,
			Username: cfg.Email.SMTP.Username,
			Password: cfg.Email.SMTP.Password,
			UseTLS:   cfg.Email.SMTP.UseTLS,
			UseSSL:   cfg.Email.SMTP.UseSSL,
		}
	}

	// AWS SES config
	if cfg.Email.Provider == "aws_ses" {
		emailCfg.AWSSES = &AWSSESConfig{
			Region:           cfg.Email.AWSSES.Region,
			AccessKeyID:      cfg.Email.AWSSES.AccessKeyID,
			SecretAccessKey:  cfg.Email.AWSSES.SecretAccessKey,
			ConfigurationSet: cfg.Email.AWSSES.ConfigurationSet,
		}
	}

	// Brevo config
	if cfg.Email.Provider == "brevo" {
		emailCfg.Brevo = &BrevoConfig{
			APIKey:  cfg.Email.Brevo.APIKey,
			BaseURL: cfg.Email.Brevo.BaseURL,
		}
	}

	// Mailgun config
	if cfg.Email.Provider == "mailgun" {
		emailCfg.Mailgun = &MailgunConfig{
			Domain:  cfg.Email.Mailgun.Domain,
			APIKey:  cfg.Email.Mailgun.APIKey,
			BaseURL: cfg.Email.Mailgun.BaseURL,
		}
	}

	return NewService(emailCfg)
}
