package oauth

import (
	"encoding/base64"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"basaltpass-backend/internal/common"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

func TestParseBasicAuthCredentials_Valid(t *testing.T) {
	header := "Basic " + base64.StdEncoding.EncodeToString([]byte("client_1:secret_1"))

	clientID, clientSecret, ok := parseBasicAuthCredentials(header)
	if !ok {
		t.Fatalf("expected credentials to parse successfully")
	}
	if clientID != "client_1" {
		t.Fatalf("expected client_id client_1, got %q", clientID)
	}
	if clientSecret != "secret_1" {
		t.Fatalf("expected client_secret secret_1, got %q", clientSecret)
	}
}

func TestParseBasicAuthCredentials_AllowsColonInSecret(t *testing.T) {
	header := "Basic " + base64.StdEncoding.EncodeToString([]byte("client_2:secret:with:colon"))

	clientID, clientSecret, ok := parseBasicAuthCredentials(header)
	if !ok {
		t.Fatalf("expected credentials to parse successfully")
	}
	if clientID != "client_2" {
		t.Fatalf("expected client_id client_2, got %q", clientID)
	}
	if clientSecret != "secret:with:colon" {
		t.Fatalf("expected full secret with colons, got %q", clientSecret)
	}
}

func TestParseBasicAuthCredentials_Invalid(t *testing.T) {
	invalidHeaders := []string{
		"",
		"Bearer xxx",
		"Basic invalid-base64",
		"Basic " + base64.StdEncoding.EncodeToString([]byte("missing-colon")),
		"Basic " + base64.StdEncoding.EncodeToString([]byte(":empty-client")),
		"Basic " + base64.StdEncoding.EncodeToString([]byte("client-only:")),
	}

	for _, header := range invalidHeaders {
		clientID, clientSecret, ok := parseBasicAuthCredentials(header)
		if ok {
			t.Fatalf("expected header %q to fail parsing, got client_id=%q secret=%q", header, clientID, clientSecret)
		}
	}
}

func createOAuthJWTForTest(t *testing.T, claims jwt.MapClaims) string {
	t.Helper()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(common.MustJWTSecret())
	if err != nil {
		t.Fatalf("failed to sign jwt: %v", err)
	}
	return signed
}

func TestTryUserIDFromAccessTokenCookie_AcceptsAccessCookie(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		uid, ok := tryUserIDFromAccessTokenCookie(c)
		if !ok {
			return c.SendStatus(fiber.StatusUnauthorized)
		}
		return c.JSON(fiber.Map{"userID": uid})
	})

	token := createOAuthJWTForTest(t, jwt.MapClaims{
		"sub": float64(99),
		"typ": "access",
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	})

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "access_token", Value: token})
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusOK {
		t.Fatalf("expected 200, got %d", resp.StatusCode)
	}
}

func TestTryUserIDFromAccessTokenCookie_RejectsRefreshCookie(t *testing.T) {
	app := fiber.New()
	app.Get("/", func(c *fiber.Ctx) error {
		if _, ok := tryUserIDFromAccessTokenCookie(c); ok {
			return c.SendStatus(fiber.StatusOK)
		}
		return c.SendStatus(fiber.StatusUnauthorized)
	})

	token := createOAuthJWTForTest(t, jwt.MapClaims{
		"sub": float64(99),
		"typ": "refresh",
		"exp": time.Now().Add(5 * time.Minute).Unix(),
	})

	req := httptest.NewRequest("GET", "/", nil)
	req.AddCookie(&http.Cookie{Name: "refresh_token", Value: token})
	resp, err := app.Test(req, -1)
	if err != nil {
		t.Fatalf("request failed: %v", err)
	}
	if resp.StatusCode != fiber.StatusUnauthorized {
		t.Fatalf("expected 401 so refresh cookie is not treated as login state, got %d", resp.StatusCode)
	}
}
