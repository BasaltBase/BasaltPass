package auth

import "testing"

func TestGenerateTokenPair(t *testing.T) {
	p, err := GenerateTokenPair(1)
	if err != nil || p.AccessToken == "" || p.RefreshToken == "" {
		t.Fatalf("token pair invalid %v", err)
	}
}
