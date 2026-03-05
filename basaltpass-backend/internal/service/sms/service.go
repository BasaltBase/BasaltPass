// Package sms provides a pluggable SMS sending abstraction.
// The default provider is "log" (development only): it prints the OTP to the
// server log instead of calling a real SMS gateway.  Replace the provider
// implementation or set SMS_PROVIDER to add a real carrier (Twilio, Aliyun
// SMS, etc.) without changing any call sites.
package sms

import (
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
)

// Provider abstracts over different SMS backends.
type Provider interface {
	// Send delivers a plain-text message to the given E.164 phone number.
	Send(to, message string) error
}

// Service wraps a Provider with shared helpers.
type Service struct {
	provider Provider
}

// New creates a Service using the provider selected by the SMS_PROVIDER
// environment variable (defaults to "log" when unset or empty).
//
// Currently supported providers:
//   - "log"  — development stub: logs the message instead of sending SMS
//
// Future providers (Twilio, Aliyun, etc.) can be wired here once their
// configuration keys are added to the application config.
func New() *Service {
	p := strings.ToLower(strings.TrimSpace(os.Getenv("SMS_PROVIDER")))
	if p == "" {
		p = "log"
	}

	var provider Provider
	switch p {
	case "log":
		provider = &logProvider{}
	default:
		// Unrecognised provider — fall back to log in development, hard error
		// in production so mis-configuration is caught early.
		env := strings.ToLower(strings.TrimSpace(os.Getenv("BASALTPASS_ENV")))
		if env == "production" || env == "prod" {
			log.Fatalf("[sms] unknown SMS_PROVIDER=%q in production — aborting", p)
		}
		log.Printf("[sms] unknown SMS_PROVIDER=%q, falling back to log provider", p)
		provider = &logProvider{}
	}

	return &Service{provider: provider}
}

// SendVerificationCode formats and sends a standard OTP message.
func (s *Service) SendVerificationCode(to, code string, ttlMinutes int) error {
	if to == "" {
		return errors.New("phone number is required")
	}
	if code == "" {
		return errors.New("verification code is required")
	}
	msg := fmt.Sprintf(
		"【BasaltPass】您的验证码为 %s，%d 分钟内有效，请勿泄露给他人。",
		code, ttlMinutes,
	)
	return s.provider.Send(to, msg)
}

// logProvider is the development/fallback provider.
// It writes the OTP to the application log instead of a real SMS gateway.
type logProvider struct{}

func (l *logProvider) Send(to, message string) error {
	log.Printf("[sms/log] SMS to %s: %s", to, message)
	return nil
}
