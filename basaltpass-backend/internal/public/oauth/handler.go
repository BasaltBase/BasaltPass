package oauth

import (
	"basaltpass-backend/internal/public/auth"
	"context"
	"net/http"
	"os"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
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
	// For demo purposes use token.AccessToken as unique providerID
	providerID := token.Extra("id").(string)
	if providerID == "" {
		providerID = token.AccessToken
	}

	var oa model.OAuthAccount
	db := common.DB()
	if err := db.Where("provider = ? AND provider_id = ?", providerName, providerID).First(&oa).Error; err != nil {
		// create new user and oauth account
		user := model.User{Nickname: providerName + "_user"}
		db.Create(&user)
		oa = model.OAuthAccount{UserID: user.ID, Provider: providerName, ProviderID: providerID}
		db.Create(&oa)
	}
	// generate tokens
	tokens, _ := auth.GenerateTokenPair(oa.UserID)
	// set refresh cookie
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: tokens.RefreshToken, HTTPOnly: true, Path: "/", MaxAge: 7 * 24 * 60 * 60})

	redirectURL := os.Getenv("OAUTH_SUCCESS_URL")
	if redirectURL == "" {
		redirectURL = "http://localhost:5173/oauth-success"
	}
	redirectURL = redirectURL + "?token=" + tokens.AccessToken
	return c.Redirect(redirectURL, http.StatusTemporaryRedirect)
}
