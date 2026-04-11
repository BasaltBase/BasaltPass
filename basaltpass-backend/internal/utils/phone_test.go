package utils

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestPhoneValidator_ValidateE164(t *testing.T) {
	pv := NewPhoneValidator("+86")

	tests := []struct {
		name    string
		phone   string
		wantErr bool
	}{
		{"Valid China mobile", "+8613812345678", false},
		{"Valid US mobile", "+12125551234", false},
		{"Valid UK mobile", "+447911123456", false},
		{"Valid Germany mobile", "+4915123456789", false},
		{"Valid India mobile", "+919876543210", false},
		{"Invalid - no plus", "8613812345678", true},
		{"Invalid - too long", "+861234567890123456", true},
		{"Invalid - too short", "+86138", true},
		{"Invalid - empty", "", true},
		{"Invalid - letters", "+86138abcd5678", true},
		{"Invalid - starts with 0", "+0612345678", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := pv.ValidateE164(tt.phone)
			if tt.wantErr {
				assert.Error(t, err)
			} else {
				assert.NoError(t, err)
			}
		})
	}
}

func TestPhoneValidator_NormalizeToE164(t *testing.T) {
	pv := NewPhoneValidator("+86")
	pvUS := NewPhoneValidator("+1")
	pvGB := NewPhoneValidator("+44")

	tests := []struct {
		name     string
		validator *PhoneValidator
		phone    string
		expected string
		wantErr  bool
	}{
		{"China mobile - 11 digits", pv, "13812345678", "+8613812345678", false},
		{"China mobile - with spaces", pv, "138 1234 5678", "+8613812345678", false},
		{"China mobile - with dashes", pv, "138-1234-5678", "+8613812345678", false},
		{"Already E.164 format", pv, "+8613812345678", "+8613812345678", false},
		{"US national format", pvUS, "(212) 555-1234", "+12125551234", false},
		{"UK national format", pvGB, "07911 123456", "+447911123456", false},
		{"Germany E.164", pv, "+4915123456789", "+4915123456789", false},
		{"India E.164", pv, "+919876543210", "+919876543210", false},
		{"Invalid - too short", pv, "12345", "", true},
		{"Invalid - empty", pv, "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := tt.validator.NormalizeToE164(tt.phone)
			if (err != nil) != tt.wantErr {
				t.Errorf("NormalizeToE164() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if result != tt.expected {
				t.Errorf("NormalizeToE164() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestPhoneValidator_FormatForDisplay(t *testing.T) {
	pv := NewPhoneValidator("+86")

	tests := []struct {
		name     string
		phone    string
		expected string
	}{
		{"China mobile", "+8613812345678", "+86 138 1234 5678"},
		{"US mobile", "+12125551234", "+1 212-555-1234"},
		{"UK mobile", "+447911123456", "+44 7911 123456"},
		{"Other country", "+33123456789", "+33 1 23 45 67 89"},
		{"Invalid format", "invalid", "invalid"},
		{"Empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := pv.FormatForDisplay(tt.phone)
			if result != tt.expected {
				t.Errorf("FormatForDisplay() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestPhoneValidator_GetCountryCode(t *testing.T) {
	pv := NewPhoneValidator("+86")

	tests := []struct {
		name     string
		phone    string
		expected string
	}{
		{"China", "+8613812345678", "+86"},
		{"US", "+12125551234", "+1"},
		{"UK", "+447911123456", "+44"},
		{"Invalid format", "8613812345678", ""},
		{"Empty", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := pv.GetCountryCode(tt.phone)
			if result != tt.expected {
				t.Errorf("GetCountryCode() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestPhoneValidator_IsValidPhoneForCountry(t *testing.T) {
	pv := NewPhoneValidator("+86")

	tests := []struct {
		name        string
		phone       string
		countryCode string
		expected    bool
	}{
		{"Valid China mobile", "+8613812345678", "+86", true},
		{"Valid US mobile", "+12125551234", "+1", true},
		{"Valid UK mobile", "+447911123456", "+44", true},
		{"Valid Germany mobile", "+4915123456789", "+49", true},
		{"Invalid - wrong country", "+8613812345678", "+1", false},
		{"Invalid - wrong format", "+861234567", "+86", false},
		{"Invalid - unknown country code", "+12125551234", "+999", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := pv.IsValidPhoneForCountry(tt.phone, tt.countryCode)
			if result != tt.expected {
				t.Errorf("IsValidPhoneForCountry() = %v, expected %v", result, tt.expected)
			}
		})
	}
}
