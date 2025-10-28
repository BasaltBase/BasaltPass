package model

import "time"

// TenantUsageMetric stores aggregated usage information for a tenant per billing period.
type TenantUsageMetric struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	TenantID     uint       `gorm:"not null;uniqueIndex:idx_tenant_usage_period" json:"tenant_id"`
	PeriodStart  time.Time  `gorm:"not null;uniqueIndex:idx_tenant_usage_period" json:"period_start"`
	StorageUsed  int64      `gorm:"not null;default:0" json:"storage_used"`   // Storage usage in MB
	APICallCount int64      `gorm:"not null;default:0" json:"api_call_count"` // API calls within the period
	LastActiveAt *time.Time `json:"last_active_at"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
}

// TableName returns custom table name.
func (TenantUsageMetric) TableName() string {
	return "tenant_usage_metrics"
}
