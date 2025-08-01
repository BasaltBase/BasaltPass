package aduit

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"encoding/json"
)

// AuditData represents additional audit information
type AuditData struct {
	ResourceType string `json:"resource_type,omitempty"`
	ResourceID   string `json:"resource_id,omitempty"`
	UserAgent    string `json:"user_agent,omitempty"`
	Details      string `json:"details,omitempty"`
}

// LogAudit logs an audit entry for sensitive operations
func LogAudit(userID uint, action, resourceType, resourceID, ip, userAgent string) {
	data := AuditData{
		ResourceType: resourceType,
		ResourceID:   resourceID,
		UserAgent:    userAgent,
	}

	dataJSON, _ := json.Marshal(data)

	auditLog := model.AuditLog{
		UserID: userID,
		Action: action,
		IP:     ip,
		Data:   string(dataJSON),
	}

	common.DB().Create(&auditLog)
}
