package oauth

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"

	"basaltpass-backend/internal/auth"
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

const testIssuerHost = "example.com"

func TestMain(m *testing.M) {
	testDB, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		panic(err)
	}

	common.SetDBForTest(testDB)

	db := common.DB()
	if db != testDB {
		panic("failed to set test database")
	}

	// 重置测试数据库结构
	_ = db.Migrator().DropTable(&model.OAuthClient{}, &model.App{}, &model.TenantAdmin{}, &model.Tenant{}, &model.User{})
	if err := db.AutoMigrate(&model.User{}, &model.Tenant{}, &model.TenantAdmin{}, &model.App{}, &model.OAuthClient{}); err != nil {
		panic(err)
	}

	// 创建默认租户
	defaultTenant := model.Tenant{
		Name:   "BasaltPass",
		Code:   "default",
		Status: model.TenantStatusActive,
		Plan:   model.TenantPlanFree,
	}
	if err := db.Create(&defaultTenant).Error; err != nil {
		panic(err)
	}

	exitCode := m.Run()
	os.Exit(exitCode)
}

func TestOneTapLoginSuccess(t *testing.T) {
	app, user, client, tokens, redirectURI := setupOAuthTestData(t)

	reqBody := OneTapAuthRequest{
		ClientID:    client.ClientID,
		RedirectURI: redirectURI,
		Nonce:       "nonce-value",
		State:       "abc",
	}

	payload, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/oauth/one-tap/login", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body OneTapAuthResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))

	require.True(t, body.Success)
	require.NotEmpty(t, body.IDToken)
	require.Equal(t, reqBody.State, body.State)

	privKey, err := GetPrivateKey()
	require.NoError(t, err)

	token, err := jwt.Parse(body.IDToken, func(token *jwt.Token) (interface{}, error) {
		return &privKey.PublicKey, nil
	})
	require.NoError(t, err)
	require.True(t, token.Valid)

	claims, ok := token.Claims.(jwt.MapClaims)
	require.True(t, ok)
	require.Equal(t, fmt.Sprintf("%d", user.ID), claims["sub"])
	require.Equal(t, client.ClientID, claims["aud"])
	require.Equal(t, reqBody.Nonce, claims["nonce"])
	require.Equal(t, "http://"+testIssuerHost, claims["iss"])
	require.Equal(t, user.Email, claims["email"])
}

func TestOneTapLoginUnauthorized(t *testing.T) {
	app, _, client, _, redirectURI := setupOAuthTestData(t)

	reqBody := OneTapAuthRequest{ClientID: client.ClientID, RedirectURI: redirectURI, State: "s"}
	payload, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/oauth/one-tap/login", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var body OneTapAuthResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.False(t, body.Success)
	require.Equal(t, "login_required", body.Error)
}

func TestOneTapLoginInvalidClient(t *testing.T) {
	app, _, _, tokens, redirectURI := setupOAuthTestData(t)

	reqBody := OneTapAuthRequest{ClientID: "invalid", RedirectURI: redirectURI, State: "s"}
	payload, err := json.Marshal(reqBody)
	require.NoError(t, err)

	req := httptest.NewRequest(http.MethodPost, "/oauth/one-tap/login", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	var body OneTapAuthResponse
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	require.False(t, body.Success)
	require.Equal(t, "invalid_client", body.Error)
}

func TestSilentAuthSuccess(t *testing.T) {
	app, user, client, tokens, redirectURI := setupOAuthTestData(t)

	query := url.Values{}
	query.Set("client_id", client.ClientID)
	query.Set("prompt", "none")
	query.Set("redirect_uri", redirectURI)
	query.Set("state", "xyz")
	query.Set("nonce", "nonce-val")

	req := httptest.NewRequest(http.MethodGet, "/oauth/silent-auth?"+query.Encode(), nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	htmlBytes, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	html := string(htmlBytes)

	idToken := extractTokenFromHTML(html)
	require.NotEmpty(t, idToken)

	privKey, err := GetPrivateKey()
	require.NoError(t, err)

	token, err := jwt.Parse(idToken, func(token *jwt.Token) (interface{}, error) {
		return &privKey.PublicKey, nil
	})
	require.NoError(t, err)
	require.True(t, token.Valid)

	claims, ok := token.Claims.(jwt.MapClaims)
	require.True(t, ok)
	require.Equal(t, fmt.Sprintf("%d", user.ID), claims["sub"])
	require.Equal(t, client.ClientID, claims["aud"])
	require.Equal(t, "nonce-val", claims["nonce"])
	require.Equal(t, "http://"+testIssuerHost, claims["iss"])
}

func TestSilentAuthUnauthorized(t *testing.T) {
	app, _, client, _, redirectURI := setupOAuthTestData(t)

	query := url.Values{}
	query.Set("client_id", client.ClientID)
	query.Set("prompt", "none")
	query.Set("redirect_uri", redirectURI)
	query.Set("state", "xyz")

	req := httptest.NewRequest(http.MethodGet, "/oauth/silent-auth?"+query.Encode(), nil)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	htmlBytes, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Contains(t, string(htmlBytes), "error: 'login_required'")
}

func TestSilentAuthInvalidClient(t *testing.T) {
	app, _, _, tokens, redirectURI := setupOAuthTestData(t)

	query := url.Values{}
	query.Set("client_id", "unknown-client")
	query.Set("prompt", "none")
	query.Set("redirect_uri", redirectURI)
	query.Set("state", "xyz")

	req := httptest.NewRequest(http.MethodGet, "/oauth/silent-auth?"+query.Encode(), nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusUnauthorized, resp.StatusCode)

	htmlBytes, err := io.ReadAll(resp.Body)
	require.NoError(t, err)
	require.Contains(t, string(htmlBytes), "error: 'invalid_client'")
}

func TestCheckSessionAuthenticated(t *testing.T) {
	app, user, _, tokens, _ := setupOAuthTestData(t)

	req := httptest.NewRequest(http.MethodGet, "/oauth/check-session", nil)
	req.Header.Set("Authorization", "Bearer "+tokens.AccessToken)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))

	require.Equal(t, true, body["authenticated"])
	require.EqualValues(t, user.ID, body["user_id"])
}

func TestCheckSessionUnauthenticated(t *testing.T) {
	app, _, _, _, _ := setupOAuthTestData(t)

	req := httptest.NewRequest(http.MethodGet, "/oauth/check-session", nil)
	req.Host = testIssuerHost

	resp, err := app.Test(req, -1)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, fiber.StatusOK, resp.StatusCode)

	var body map[string]interface{}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))

	require.Equal(t, false, body["authenticated"])
	require.Nil(t, body["user_id"])
}

func setupOAuthTestData(t *testing.T) (*fiber.App, *model.User, *model.OAuthClient, auth.TokenPair, string) {
	t.Helper()

	db := common.DB()

	// 清理历史数据，确保测试隔离
	cleanup := []interface{}{&model.OAuthClient{}, &model.App{}, &model.User{}}
	for _, table := range cleanup {
		require.NoError(t, db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(table).Error)
	}

	email := fmt.Sprintf("user-%d@example.com", time.Now().UnixNano())
	phone := fmt.Sprintf("188%09d", time.Now().UnixNano()%1_000_000_000)
	user := &model.User{
		Email:         email,
		Phone:         phone,
		EmailVerified: true,
		Nickname:      "Test User",
	}
	require.NoError(t, db.Create(user).Error)

	var tenant model.Tenant
	require.NoError(t, db.Where("code = ?", "default").First(&tenant).Error)

	appModel := &model.App{
		TenantID: tenant.ID,
		Name:     fmt.Sprintf("Test App %d", time.Now().UnixNano()),
		Status:   model.AppStatusActive,
	}
	require.NoError(t, db.Create(appModel).Error)

	redirectURI := fmt.Sprintf("https://app.example.com/callback/%d", time.Now().UnixNano())

	client := &model.OAuthClient{
		AppID:        appModel.ID,
		ClientID:     fmt.Sprintf("client-%d", time.Now().UnixNano()),
		ClientSecret: "test-secret",
		RedirectURIs: redirectURI,
		IsActive:     true,
		CreatedBy:    user.ID,
	}
	client.HashClientSecret()
	require.NoError(t, db.Create(client).Error)

	tokens, err := auth.GenerateTokenPair(user.ID)
	require.NoError(t, err)

	appInstance := fiber.New(fiber.Config{DisableStartupMessage: true})
	appInstance.Post("/oauth/one-tap/login", OneTapLoginHandler)
	appInstance.Get("/oauth/silent-auth", SilentAuthHandler)
	appInstance.Get("/oauth/check-session", CheckSessionHandler)

	return appInstance, user, client, tokens, redirectURI
}

func extractTokenFromHTML(html string) string {
	marker := "id_token: '"
	start := strings.Index(html, marker)
	if start == -1 {
		return ""
	}
	start += len(marker)
	end := strings.Index(html[start:], "'")
	if end == -1 {
		return ""
	}
	return html[start : start+end]
}
