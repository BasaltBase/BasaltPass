package user

import (
	"encoding/json"
	"testing"
	"time"

	"basaltpass-backend/internal/model"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupAdminUserTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(
		&model.User{},
		&model.AuditLog{},
		&model.LoginLog{},
		&model.AppUser{},
		&model.TeamMember{},
		&model.Subscription{},
	); err != nil {
		t.Fatalf("failed to migrate test schema: %v", err)
	}

	return db
}

func TestBuildAdminUserOrderClause(t *testing.T) {
	tests := []struct {
		name      string
		sortBy    string
		sortOrder string
		want      string
	}{
		{
			name:      "valid field and order",
			sortBy:    "email",
			sortOrder: "asc",
			want:      "email ASC",
		},
		{
			name:      "invalid field falls back to created_at",
			sortBy:    "created_at; DROP TABLE users;--",
			sortOrder: "desc",
			want:      "created_at DESC",
		},
		{
			name:      "invalid order falls back to DESC",
			sortBy:    "email",
			sortOrder: "desc; SELECT pg_sleep(1);--",
			want:      "email DESC",
		},
		{
			name:      "last_login alias stays supported",
			sortBy:    "last_login",
			sortOrder: "asc",
			want:      "created_at ASC",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := buildAdminUserOrderClause(tt.sortBy, tt.sortOrder)
			if got != tt.want {
				t.Fatalf("buildAdminUserOrderClause() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestBanUserCreatesAuditLog(t *testing.T) {
	db := setupAdminUserTestDB(t)
	svc := NewAdminUserService(db)

	operator := model.User{Email: "admin@example.com", Phone: "+10000000001", PasswordHash: "hash"}
	target := model.User{Email: "user@example.com", Phone: "+10000000002", PasswordHash: "hash"}

	if err := db.Create(&operator).Error; err != nil {
		t.Fatalf("failed to seed operator: %v", err)
	}
	if err := db.Create(&target).Error; err != nil {
		t.Fatalf("failed to seed target user: %v", err)
	}

	reason := "spam activity"
	comment := "violation of terms"

	if err := svc.BanUser(target.ID, BanUserRequest{Banned: true, Reason: reason, Comment: comment}, operator.ID); err != nil {
		t.Fatalf("ban user failed: %v", err)
	}

	var updated model.User
	if err := db.First(&updated, target.ID).Error; err != nil {
		t.Fatalf("failed to reload user: %v", err)
	}
	if !updated.Banned {
		t.Fatalf("expected user to be banned")
	}

	var logs []model.AuditLog
	if err := db.Order("id asc").Find(&logs).Error; err != nil {
		t.Fatalf("failed to load audit logs: %v", err)
	}

	if len(logs) != 1 {
		t.Fatalf("expected 1 audit log, got %d", len(logs))
	}
	if logs[0].UserID != operator.ID {
		t.Fatalf("expected audit log user id %d, got %d", operator.ID, logs[0].UserID)
	}
	if logs[0].Action != "admin_ban_user" {
		t.Fatalf("unexpected audit action: %s", logs[0].Action)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(logs[0].Data), &payload); err != nil {
		t.Fatalf("failed to unmarshal audit payload: %v", err)
	}
	if banned, ok := payload["banned"].(bool); !ok || !banned {
		t.Fatalf("expected banned=true in audit payload, got %#v", payload["banned"])
	}
	if rid, ok := payload["target_user_id"].(float64); !ok || uint(rid) != target.ID {
		t.Fatalf("expected target user id %d, got %#v", target.ID, payload["target_user_id"])
	}
	if payload["reason"] != reason {
		t.Fatalf("expected reason %q, got %#v", reason, payload["reason"])
	}
	if payload["comment"] != comment {
		t.Fatalf("expected comment %q, got %#v", comment, payload["comment"])
	}

	if err := svc.BanUser(target.ID, BanUserRequest{Banned: false, Comment: "appeal accepted"}, operator.ID); err != nil {
		t.Fatalf("unban user failed: %v", err)
	}

	if err := db.Order("id asc").Find(&logs).Error; err != nil {
		t.Fatalf("failed to reload audit logs: %v", err)
	}
	if len(logs) != 2 {
		t.Fatalf("expected 2 audit logs, got %d", len(logs))
	}
	last := logs[1]
	if last.Action != "admin_unban_user" {
		t.Fatalf("unexpected unban action: %s", last.Action)
	}
	if last.UserID != operator.ID {
		t.Fatalf("unexpected operator id on unban log: %d", last.UserID)
	}
	var unbanPayload map[string]interface{}
	if err := json.Unmarshal([]byte(last.Data), &unbanPayload); err != nil {
		t.Fatalf("failed to unmarshal unban payload: %v", err)
	}
	if banned, ok := unbanPayload["banned"].(bool); !ok || banned {
		t.Fatalf("expected banned=false in unban payload, got %#v", unbanPayload["banned"])
	}
}

func TestGetUserActivityStatsAggregatesSubscriptionsAndLogins(t *testing.T) {
	db := setupAdminUserTestDB(t)
	svc := NewAdminUserService(db)

	user := model.User{Email: "stats@example.com", Phone: "+10000000003", PasswordHash: "hash"}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to create user: %v", err)
	}

	now := time.Now().UTC()
	for i := 0; i < 2; i++ {
		sub := model.Subscription{
			UserID:             user.ID,
			Status:             model.SubscriptionStatusActive,
			CurrentPriceID:     uint(i + 1),
			StartAt:            now,
			CurrentPeriodStart: now,
			CurrentPeriodEnd:   now.Add(24 * time.Hour),
		}
		if err := db.Create(&sub).Error; err != nil {
			t.Fatalf("failed to create subscription: %v", err)
		}
	}

	loginTimes := []time.Time{now.Add(-48 * time.Hour), now.Add(-24 * time.Hour), now.Add(2 * time.Hour)}
	for _, ts := range loginTimes {
		if err := db.Create(&model.LoginLog{UserID: user.ID, LoggedAt: ts, Success: true}).Error; err != nil {
			t.Fatalf("failed to create login log: %v", err)
		}
	}
	// Additional login for another user to ensure filtering works
	otherUser := model.User{Email: "other@example.com", Phone: "+10000000004", PasswordHash: "hash"}
	if err := db.Create(&otherUser).Error; err != nil {
		t.Fatalf("failed to create other user: %v", err)
	}
	if err := db.Create(&model.LoginLog{UserID: otherUser.ID, LoggedAt: now.Add(3 * time.Hour), Success: true}).Error; err != nil {
		t.Fatalf("failed to create other login log: %v", err)
	}

	stats, err := svc.getUserActivityStats(user.ID)
	if err != nil {
		t.Fatalf("getUserActivityStats failed: %v", err)
	}

	if stats.SubscriptionsCount != 2 {
		t.Fatalf("expected 2 subscriptions, got %d", stats.SubscriptionsCount)
	}
	if stats.TotalLogins != int64(len(loginTimes)) {
		t.Fatalf("expected %d logins, got %d", len(loginTimes), stats.TotalLogins)
	}
	if stats.LastLoginAt == nil {
		t.Fatalf("expected last login timestamp to be set")
	}
	if !stats.LastLoginAt.Equal(loginTimes[len(loginTimes)-1]) {
		t.Fatalf("unexpected last login time: %v (expected %v)", stats.LastLoginAt, loginTimes[len(loginTimes)-1])
	}
}
