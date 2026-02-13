package model

import "gorm.io/gorm"

// Team represents a team in the system
type Team struct {
	gorm.Model
	TenantID    uint   `gorm:"index;not null;default:0"`
	Name        string `gorm:"size:100;not null"`
	Description string `gorm:"size:500"`
	AvatarURL   string `gorm:"size:255"`
	IsActive    bool   `gorm:"default:true"`

	// 团队成员关联
	Members []TeamMember `gorm:"foreignKey:TeamID"`

	// 团队钱包（可选，未来扩展）
	Wallets []Wallet `gorm:"foreignKey:TeamID"`
}

// TeamMember represents a user's membership in a team
type TeamMember struct {
	gorm.Model
	TeamID   uint     `gorm:"not null"`
	UserID   uint     `gorm:"not null"`
	Role     TeamRole `gorm:"type:varchar(20);not null;default:'member'"`
	Status   string   `gorm:"type:varchar(20);not null;default:'active'"`
	JoinedAt int64    `gorm:"autoCreateTime"`

	// 关联
	Team Team `gorm:"foreignKey:TeamID"`
	User User `gorm:"foreignKey:UserID"`
}

// TeamRole defines the role of a team member
type TeamRole string

const (
	TeamRoleOwner  TeamRole = "owner"  // 所有者
	TeamRoleAdmin  TeamRole = "tenant" // 管理员
	TeamRoleMember TeamRole = "member" // 普通成员
)

// IsValid checks if the team role is valid
func (r TeamRole) IsValid() bool {
	switch r {
	case TeamRoleOwner, TeamRoleAdmin, TeamRoleMember:
		return true
	default:
		return false
	}
}

// CanManageMembers 检查该角色是否有权限管理团队成员
func (r TeamRole) CanManageMembers() bool {
	return r == TeamRoleOwner || r == TeamRoleAdmin
}

// CanManageTeam 检查该角色是否有权限管理团队设置
func (r TeamRole) CanManageTeam() bool {
	return r == TeamRoleOwner || r == TeamRoleAdmin
}

// IsOwner checks if the role is owner
func (r TeamRole) IsOwner() bool {
	return r == TeamRoleOwner
}
