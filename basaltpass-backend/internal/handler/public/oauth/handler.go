package oauth

import (
	"basaltpass-backend/internal/service/auth"
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"strings"

	"basaltpass-backend/internal/common"
	security "basaltpass-backend/internal/handler/user/security"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// OAuth service placeholder - can be extended later

// LoginHandler redirects user to provider auth URL.
func LoginHandler(c *fiber.Ctx) error {
	providerName := c.Params("provider")
	p := Get(providerName)
	if p == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "provider not found"})
	}
	state := "xyz" // TODO: generate and store in session
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
	// set refresh cookie
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: tokens.RefreshToken, HTTPOnly: true, Path: "/", MaxAge: 7 * 24 * 60 * 60})

	// 记录登录成功
	if err := security.RecordLoginSuccess(oa.UserID, c.IP(), c.Get("User-Agent")); err != nil {
		log.Printf("failed to record login history: %v", err)
	}

	redirectURL := os.Getenv("OAUTH_SUCCESS_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173/oauth-success"
	}
	redirectURL = redirectURL + "?token=" + tokens.AccessToken
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
