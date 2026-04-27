package middleware

import (
	"os"
	"testing"
)

func TestMain(m *testing.M) {
	if os.Getenv("JWT_SECRET") == "" {
		_ = os.Setenv("JWT_SECRET", "test-secret-for-unit-tests")
	}
	os.Exit(m.Run())
}
