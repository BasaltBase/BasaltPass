package oauth

import (
	"encoding/base64"
	"testing"
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
