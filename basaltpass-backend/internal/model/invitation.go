package model

import (
	"time"

	"gorm.io/gorm"
)

// Invitation 团队邀请
// status: pending / accepted / rejected / revoked

type Invitation struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	TeamID    uint           `gorm:"index;not null" json:"team_id"`
	Team      Team           `json:"team"`
	InviterID uint           `gorm:"index;not null" json:"inviter_id"`
	Inviter   User           `json:"inviter"`
	InviteeID uint           `gorm:"index;not null" json:"invitee_id"`
	Invitee   User           `json:"invitee"`
	Status    string         `gorm:"size:16;not null;default:'pending'" json:"status"`
	Remark    string         `gorm:"size:255" json:"remark"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
