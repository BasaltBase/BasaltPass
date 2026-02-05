package utils

import (
	"testing"
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
		{"Valid UK mobile", "+447700123456", false},
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
			if (err != nil) != tt.wantErr {
				t.Errorf("ValidateE164() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestPhoneValidator_NormalizeToE164(t *testing.T) {
	pv := NewPhoneValidator("+86")
	
	tests := []struct {
		name     string
		phone    string
		expected string
		wantErr  bool
	}{
		{"China mobile - 11 digits", "13812345678", "+8613812345678", false},
		{"China mobile - with spaces", "138 1234 5678", "+8613812345678", false},
		{"China mobile - with dashes", "138-1234-5678", "+8613812345678", false},
		{"China mobile - with leading 0", "013812345678", "+8613812345678", false},
		{"Already E.164 format", "+8613812345678", "+8613812345678", false},
		{"US mobile", "2125551234", "+12125551234", false},
		{"UK mobile", "7700123456", "+447700123456", false},
		{"Invalid - too short", "12345", "", true},
		{"Invalid - too long", "123456789012", "", true},
		{"Empty phone", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := pv.NormalizeToE164(tt.phone)
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
		{"US mobile", "+12125551234", "+1 (212) 555-1234"},
		{"UK mobile", "+447700123456", "+44 7700 123 456"},
		{"Other country", "+33123456789", "+33 123456789"},
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
		{"UK", "+447700123456", "+44"},
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

func TestPhoneValidator_isChinaMobileNumber(t *testing.T) {
	pv := NewPhoneValidator("+86")
	
	tests := []struct {
		name     string
		phone    string
		expected bool
	}{
		{"Valid China mobile - 13x", "13812345678", true},
		{"Valid China mobile - 15x", "15912345678", true},
		{"Valid China mobile - 18x", "18812345678", true},
		{"Invalid - wrong length", "138123456789", false},
		{"Invalid - not start with 1", "23812345678", false},
		{"Invalid - second digit", "11812345678", false},
		{"Invalid - second digit 0", "10812345678", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := pv.isChinaMobileNumber(tt.phone)
			if result != tt.expected {
				t.Errorf("isChinaMobileNumber() = %v, expected %v", result, tt.expected)
			}
		})
	}
}

func TestPhoneValidator_isNorthAmericaMobileNumber(t *testing.T) {
	pv := NewPhoneValidator("+86")
	
	tests := []struct {
		name     string
		phone    string
		expected bool
	}{
		{"Valid US mobile", "2125551234", true},
		{"Valid Canadian mobile", "4165551234", true},
		{"Invalid - starts with 0", "0125551234", false},
		{"Invalid - starts with 1", "1125551234", false},
		{"Invalid - wrong length", "21255512345", false},
		{"Invalid - too short", "212555123", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := pv.isNorthAmericaMobileNumber(tt.phone)
			if result != tt.expected {
				t.Errorf("isNorthAmericaMobileNumber() = %v, expected %v", result, tt.expected)
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
		{"Valid UK mobile", "+447700123456", "+44", true},
		{"Invalid - wrong country", "+8613812345678", "+1", false},
		{"Invalid - wrong format", "+861234567", "+86", false},
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