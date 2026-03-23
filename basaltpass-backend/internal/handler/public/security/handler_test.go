package security

import (
	"bytes"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"net/url"
	"testing"

	securityservice "basaltpass-backend/internal/service/security"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

type stubSecurityService struct {
	confirmedToken string
	cancelledToken string
}

func (s *stubSecurityService) ConfirmEmailChange(token string) error {
	if token == "bad-token" {
		return errors.New("无效的验证链接")
	}
	s.confirmedToken = token
	return nil
}

func (s *stubSecurityService) CancelEmailChange(token string) error {
	if token == "bad-token" {
		return errors.New("无效的取消链接")
	}
	s.cancelledToken = token
	return nil
}

func (s *stubSecurityService) StartPasswordReset(_ *securityservice.PasswordResetRequest, _, _ string) error {
	return nil
}

func (s *stubSecurityService) ConfirmPasswordReset(_ *securityservice.PasswordResetConfirmRequest, _, _ string) error {
	return nil
}

func setupPublicSecurityHandlerTest() (*fiber.App, *stubSecurityService) {
	svc := &stubSecurityService{}
	handler := NewPublicSecurityHandlerWithService(svc)
	app := fiber.New()
	app.Post("/email/confirm", handler.ConfirmEmailChangeHandler)
	app.Post("/email/cancel", handler.CancelEmailChangeHandler)
	return app, svc
}

func TestConfirmEmailChangeHandler_DisablesQueryTokenAndAcceptsJSONBody(t *testing.T) {
	app, svc := setupPublicSecurityHandlerTest()

	queryReq := httptest.NewRequest(fiber.MethodPost, "/email/confirm?token=query-token", nil)
	queryResp, err := app.Test(queryReq)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, queryResp.StatusCode)
	assert.Empty(t, svc.confirmedToken)

	body, err := json.Marshal(map[string]string{"token": "json-token"})
	require.NoError(t, err)
	jsonReq := httptest.NewRequest(fiber.MethodPost, "/email/confirm", bytes.NewReader(body))
	jsonReq.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationJSON)
	jsonResp, err := app.Test(jsonReq)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, jsonResp.StatusCode)
	assert.Equal(t, "json-token", svc.confirmedToken)
}

func TestCancelEmailChangeHandler_DisablesQueryTokenAndAcceptsFormBody(t *testing.T) {
	app, svc := setupPublicSecurityHandlerTest()

	queryReq := httptest.NewRequest(fiber.MethodPost, "/email/cancel?token=query-token", nil)
	queryResp, err := app.Test(queryReq)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusBadRequest, queryResp.StatusCode)
	assert.Empty(t, svc.cancelledToken)

	form := url.Values{}
	form.Set("token", "form-token")
	formReq := httptest.NewRequest(fiber.MethodPost, "/email/cancel", bytes.NewBufferString(form.Encode()))
	formReq.Header.Set(fiber.HeaderContentType, fiber.MIMEApplicationForm)
	formResp, err := app.Test(formReq)
	require.NoError(t, err)
	assert.Equal(t, fiber.StatusOK, formResp.StatusCode)
	assert.Equal(t, "form-token", svc.cancelledToken)
}
