package security

import (
	"fmt"
	"testing"
	"time"

	"basaltpass-backend/internal/model"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupLoginHistoryTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&model.LoginHistory{})
	require.NoError(t, err)

	return db
}

func TestLoginHistoryService_RecordAndList(t *testing.T) {
	db := setupLoginHistoryTestDB(t)
	svc := NewLoginHistoryService(db)

	// 记录一次登录事件，确认写入成功
	err := svc.RecordLoginEvent(1, "127.0.0.1", "TestAgent", "success")
	require.NoError(t, err)

	var count int64
	err = db.Model(&model.LoginHistory{}).Where("user_id = ?", 1).Count(&count).Error
	require.NoError(t, err)
	assert.Equal(t, int64(1), count)

	baseTime := time.Now().Add(-time.Hour)
	for i := 0; i < 14; i++ {
		entry := &model.LoginHistory{
			UserID:    1,
			IP:        fmt.Sprintf("10.0.0.%d", i),
			UserAgent: "Agent",
			Status:    "success",
			CreatedAt: baseTime.Add(time.Duration(i) * time.Minute),
		}
		require.NoError(t, db.Create(entry).Error)
	}

	recordsDesc, total, err := svc.ListLoginHistory(1, 1, 5, "desc")
	require.NoError(t, err)
	assert.Equal(t, int64(15), total)
	require.Len(t, recordsDesc, 5)
	for i := 0; i < len(recordsDesc)-1; i++ {
		assert.True(t, !recordsDesc[i].CreatedAt.Before(recordsDesc[i+1].CreatedAt))
	}

	recordsAsc, _, err := svc.ListLoginHistory(1, 1, 5, "asc")
	require.NoError(t, err)
	require.Len(t, recordsAsc, 5)
	for i := 0; i < len(recordsAsc)-1; i++ {
		assert.True(t, !recordsAsc[i].CreatedAt.After(recordsAsc[i+1].CreatedAt))
	}

	secondPage, _, err := svc.ListLoginHistory(1, 2, 5, "desc")
	require.NoError(t, err)
	require.Len(t, secondPage, 5)
}
