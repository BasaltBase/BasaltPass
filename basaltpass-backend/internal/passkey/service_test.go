package passkey

import (
	"encoding/json"
	"testing"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"

	"gorm.io/gorm"
)

func resetPasskeyTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db := common.DB()
	if err := db.AutoMigrate(&model.User{}, &model.Passkey{}, &model.AuditLog{}); err != nil {
		t.Fatalf("failed to migrate: %v", err)
	}

	tables := []interface{}{&model.AuditLog{}, &model.Passkey{}, &model.User{}}
	for _, table := range tables {
		if err := db.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(table).Error; err != nil {
			t.Fatalf("failed to clean table: %v", err)
		}
	}

	return db
}

func TestGenerateTokensForUserCreatesAuditLogWithContext(t *testing.T) {
	db := resetPasskeyTestDB(t)

	svc := Service{}
	ctx := &RequestContext{
		IP:        "203.0.113.10",
		UserAgent: "TestAgent/1.0",
	}

	tokens, err := svc.GenerateTokensForUser(42, ctx)
	if err != nil {
		t.Fatalf("GenerateTokensForUser returned error: %v", err)
	}
	if tokens.AccessToken == "" || tokens.RefreshToken == "" {
		t.Fatalf("expected non-empty tokens")
	}

	var log model.AuditLog
	if err := db.Order("id desc").First(&log).Error; err != nil {
		t.Fatalf("failed to fetch audit log: %v", err)
	}

	if log.IP != ctx.IP {
		t.Fatalf("expected IP %s, got %s", ctx.IP, log.IP)
	}

	if log.UserAgent != ctx.UserAgent {
		t.Fatalf("expected UserAgent %s, got %s", ctx.UserAgent, log.UserAgent)
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(log.Data), &data); err != nil {
		t.Fatalf("failed to unmarshal audit data: %v", err)
	}

	if data["event"] != "User logged in using Passkey" {
		t.Fatalf("unexpected audit event: %v", data["event"])
	}
}

func TestDeletePasskeyCreatesAuditLogWithContext(t *testing.T) {
	db := resetPasskeyTestDB(t)

	user := &model.User{Email: "passkey-user@example.com"}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	passkey := &model.Passkey{
		UserID:       user.ID,
		CredentialID: "test-credential",
		PublicKey:    []byte("public-key"),
		Name:         "My Passkey",
	}
	if err := db.Create(passkey).Error; err != nil {
		t.Fatalf("failed to create passkey: %v", err)
	}

	svc := Service{}
	ctx := &RequestContext{
		IP:        "198.51.100.2",
		UserAgent: "DeleteAgent/2.0",
		Data: map[string]interface{}{
			"reason": "user request",
		},
	}

	if err := svc.DeletePasskey(user.ID, passkey.ID, ctx); err != nil {
		t.Fatalf("DeletePasskey returned error: %v", err)
	}

	var log model.AuditLog
	if err := db.Order("id desc").First(&log).Error; err != nil {
		t.Fatalf("failed to fetch audit log: %v", err)
	}

	if log.IP != ctx.IP {
		t.Fatalf("expected IP %s, got %s", ctx.IP, log.IP)
	}

	if log.UserAgent != ctx.UserAgent {
		t.Fatalf("expected UserAgent %s, got %s", ctx.UserAgent, log.UserAgent)
	}

	var data map[string]interface{}
	if err := json.Unmarshal([]byte(log.Data), &data); err != nil {
		t.Fatalf("failed to unmarshal audit data: %v", err)
	}

	if data["event"] != "User deleted a Passkey" {
		t.Fatalf("unexpected audit event: %v", data["event"])
	}

	if data["passkey_name"] != passkey.Name {
		t.Fatalf("unexpected passkey name: %v", data["passkey_name"])
	}

	if data["reason"] != ctx.Data["reason"] {
		t.Fatalf("expected reason %v, got %v", ctx.Data["reason"], data["reason"])
	}
}
