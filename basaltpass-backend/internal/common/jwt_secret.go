package common

import (
	"errors"
	"os"
	"strings"
	"sync"
)

var (
	jwtSecretOnce sync.Once
	jwtSecret     []byte
	jwtSecretErr  error
)

// JWTSecret returns the shared JWT secret with a test fallback.
func JWTSecret() ([]byte, error) {
	jwtSecretOnce.Do(func() {
		secret := os.Getenv("JWT_SECRET")
		if secret == "" {
			// Keep test behavior consistent across all packages.
			if os.Getenv("BASALTPASS_DYNO_MODE") == "test" || strings.HasSuffix(os.Args[0], ".test") {
				secret = "test-secret"
			} else {
				jwtSecretErr = errors.New("environment variable JWT_SECRET is required")
				return
			}
		}
		jwtSecret = []byte(secret)
	})

	if jwtSecretErr != nil {
		return nil, jwtSecretErr
	}
	return jwtSecret, nil
}

// MustJWTSecret returns JWTSecret or panics on configuration errors.
func MustJWTSecret() []byte {
	secret, err := JWTSecret()
	if err != nil {
		panic(err.Error())
	}
	return secret
}
