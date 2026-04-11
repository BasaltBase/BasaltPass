package utils

import "testing"

func TestEmailValidator_Validate(t *testing.T) {
	ev := NewEmailValidator()

	tests := []struct {
		name    string
		email   string
		wantErr bool
	}{
		{"valid simple email", "user@example.com", false},
		{"valid uppercase email", "User.Name+tag@Example.COM", false},
		{"valid subdomain email", "a.b@sub.example.co.uk", false},
		{"invalid empty", "", true},
		{"invalid missing at", "user.example.com", true},
		{"invalid missing local", "@example.com", true},
		{"invalid missing domain", "user@", true},
		{"invalid display name format", "User <user@example.com>", true},
		{"invalid domain without dot", "user@localhost", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ev.Validate(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("Validate() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestEmailValidator_Normalize(t *testing.T) {
	ev := NewEmailValidator()

	tests := []struct {
		name     string
		email    string
		expected string
		wantErr  bool
	}{
		{"normalize uppercase and spaces", "  User.Name+tag@Example.COM  ", "user.name+tag@example.com", false},
		{"normalize normal", "user@example.com", "user@example.com", false},
		{"invalid", "user.example.com", "", true},
		{"empty", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ev.Normalize(tt.email)
			if (err != nil) != tt.wantErr {
				t.Errorf("Normalize() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.expected {
				t.Errorf("Normalize() = %v, expected %v", got, tt.expected)
			}
		})
	}
}
