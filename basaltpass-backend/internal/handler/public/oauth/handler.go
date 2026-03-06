package oauth

import (
	"basaltpass-backend/internal/service/auth"
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/config"
	security "basaltpass-backend/internal/handler/user/security"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// OAuth service placeholder - can be extended later

const (
	oauthStateCookiePrefix = "oauth_state_"
	oauthStateTTLSeconds   = 300
)

func oauthStateCookieName(provider string) string {
	return oauthStateCookiePrefix + provider
}

func generateOAuthState() (string, error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(raw), nil
}

func setOAuthStateCookie(c *fiber.Ctx, provider, state string) {
	c.Cookie(&fiber.Cookie{
		Name:     oauthStateCookieName(provider),
		Value:    state,
		HTTPOnly: true,
		Secure:   config.IsProduction(),
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   oauthStateTTLSeconds,
	})
}

func clearOAuthStateCookie(c *fiber.Ctx, provider string) {
	c.Cookie(&fiber.Cookie{
		Name:     oauthStateCookieName(provider),
		Value:    "",
		HTTPOnly: true,
		Secure:   config.IsProduction(),
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   -1,
	})
}

func setOAuthSessionCookie(c *fiber.Ctx, name, value string, maxAge int) {
	c.Cookie(&fiber.Cookie{
		Name:     name,
		Value:    value,
		HTTPOnly: true,
		Secure:   config.IsProduction(),
		SameSite: "Lax",
		Path:     "/",
		MaxAge:   maxAge,
	})
}

func setOAuthSessionCookies(c *fiber.Ctx, accessToken, refreshToken string) {
	setOAuthSessionCookie(c, "access_token", accessToken, 15*60)
	setOAuthSessionCookie(c, "refresh_token", refreshToken, 7*24*60*60)
}

func validateOAuthState(c *fiber.Ctx, provider string) bool {
	queryState := strings.TrimSpace(c.Query("state"))
	cookieState := strings.TrimSpace(c.Cookies(oauthStateCookieName(provider)))
	// One-time use: clear even on mismatch to avoid replay.
	clearOAuthStateCookie(c, provider)
	return queryState != "" && cookieState != "" && queryState == cookieState
}

// LoginHandler redirects user to provider auth URL.
func LoginHandler(c *fiber.Ctx) error {
	providerName := c.Params("provider")
	p := Get(providerName)
	if p == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "provider not found"})
	}
	state, err := generateOAuthState()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to initialize oauth state"})
	}
	setOAuthStateCookie(c, providerName, state)
	url := p.Config.AuthCodeURL(state)
	return c.Redirect(url, http.StatusTemporaryRedirect)
}

// CallbackHandler handles OAuth callback.
func CallbackHandler(c *fiber.Ctx) error {
	providerName := c.Params("provider")
	p := Get(providerName)
	if p == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "provider not found"})
	}
	if !validateOAuthState(c, providerName) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid state"})
	}
	code := c.Query("code")
	if code == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing code"})
	}
	token, err := p.Config.Exchange(context.Background(), code)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	// Prefer provider user id when available.
	providerID := ""
	if providerIDRaw := token.Extra("id"); providerIDRaw != nil {
		providerIDStr, ok := providerIDRaw.(string)
		if !ok {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid provider identity format"})
		}
		providerID = strings.TrimSpace(providerIDStr)
	}
	if providerID == "" {
		providerID = strings.TrimSpace(token.AccessToken)
	}
	if providerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing provider identity"})
	}

	var oa model.OAuthAccount
	db := common.DB()
	if err := db.Where("provider = ? AND provider_id = ?", providerName, providerID).First(&oa).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to query oauth account"})
		}

		defaultTenantID, tenantErr := ensureDefaultTenant(db)
		if tenantErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to resolve default tenant"})
		}

		createErr := db.Transaction(func(tx *gorm.DB) error {
			user := model.User{
				TenantID: defaultTenantID,
				Nickname: providerName + "_user",
			}
			if err := tx.Create(&user).Error; err != nil {
				return err
			}

			tenantUser := model.TenantUser{
				UserID:   user.ID,
				TenantID: defaultTenantID,
				Role:     model.TenantRoleMember,
			}
			if err := tx.Create(&tenantUser).Error; err != nil {
				return err
			}

			oa = model.OAuthAccount{
				UserID:     user.ID,
				Provider:   providerName,
				ProviderID: providerID,
			}
			if err := tx.Create(&oa).Error; err != nil {
				return err
			}
			return nil
		})
		if createErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create oauth account"})
		}
	}
	// generate tokens
	tokens, err := auth.GenerateTokenPair(oa.UserID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate tokens"})
	}
	// Set secure HTTP-only session cookies; do not expose tokens via URL.
	setOAuthSessionCookies(c, tokens.AccessToken, tokens.RefreshToken)

	// 记录登录成功
	if err := security.RecordLoginSuccess(oa.UserID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}

	redirectURL := os.Getenv("OAUTH_SUCCESS_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173/oauth-success"
	}
	return c.Redirect(redirectURL, http.StatusTemporaryRedirect)
}

func ensureDefaultTenant(db *gorm.DB) (uint, error) {
	var defaultTenant model.Tenant
	if err := db.Where("code = ?", "default").First(&defaultTenant).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return 0, err
		}
		defaultTenant = model.Tenant{
			Name:        "BasaltPass",
			Code:        "default",
			Description: "BasaltPass system default tenant",
			Status:      model.TenantStatusActive,
			Plan:        model.TenantPlanFree,
		}
		if err := db.Create(&defaultTenant).Error; err != nil {
			return 0, err
		}
	}
	return defaultTenant.ID, nil
}
