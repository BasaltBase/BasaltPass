package email

import (
	settingssvc "basaltpass-backend/internal/service/settings"
	"strings"
)

const (
	defaultFromPrefix = "no-reply"
	defaultFromSuffix = "example.com"
)

// DefaultFromAddress returns a default sender email address based on settings.
// It uses email.from_suffix (or a full email address if provided there).
func DefaultFromAddress() string {
	suffix := strings.TrimSpace(settingssvc.GetString("email.from_suffix", defaultFromSuffix))
	if suffix == "" {
		suffix = defaultFromSuffix
	}
	// Allow full address override in case suffix contains '@'
	if strings.Contains(suffix, "@") {
		return suffix
	}
	return defaultFromPrefix + "@" + suffix
}

// ApplyDefaultSender fills missing sender fields using global settings.
func ApplyDefaultSender(msg *Message) {
	if msg == nil {
		return
	}
	if strings.TrimSpace(msg.From) == "" {
		msg.From = DefaultFromAddress()
	}
	if strings.TrimSpace(msg.FromName) == "" {
		msg.FromName = settingssvc.GetString("general.site_name", "BasaltPass")
	}
}
