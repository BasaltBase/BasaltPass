package model

import (
	"strings"
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

func newUserUUIDTestDB(t *testing.T) *gorm.DB {
	t.Helper()

	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open sqlite failed: %v", err)
	}
	if err := db.AutoMigrate(&User{}); err != nil {
		t.Fatalf("auto migrate user failed: %v", err)
	}
	return db
}

func TestUserUUIDGeneratedOnCreate(t *testing.T) {
	db := newUserUUIDTestDB(t)

	u := User{Email: "uuid-gen@example.com", PasswordHash: "x"}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}

	if strings.TrimSpace(u.UserUUID) == "" {
		t.Fatal("expected non-empty user_uuid after create")
	}
	if _, err := uuid.Parse(u.UserUUID); err != nil {
		t.Fatalf("expected valid uuid format, got %q: %v", u.UserUUID, err)
	}
}

func TestUserUUIDIsCreateOnly(t *testing.T) {
	db := newUserUUIDTestDB(t)

	u := User{Email: "uuid-immutable@example.com", PasswordHash: "x"}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user failed: %v", err)
	}
	originalUUID := u.UserUUID

	if err := db.Model(&User{}).Where("id = ?", u.ID).Updates(map[string]interface{}{
		"user_uuid": "manually-overridden",
		"nickname":  "updated-nickname",
	}).Error; err != nil {
		t.Fatalf("update user failed: %v", err)
	}

	var loaded User
	if err := db.First(&loaded, u.ID).Error; err != nil {
		t.Fatalf("reload user failed: %v", err)
	}

	if loaded.Nickname != "updated-nickname" {
		t.Fatalf("expected nickname to be updated, got %q", loaded.Nickname)
	}
	if loaded.UserUUID != originalUUID {
		t.Fatalf("expected user_uuid to remain immutable, got %q want %q", loaded.UserUUID, originalUUID)
	}
}
