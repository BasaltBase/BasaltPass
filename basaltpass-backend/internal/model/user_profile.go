package model

import (
	"time"

	"gorm.io/gorm"
)

// Gender 性别表
type Gender struct {
	gorm.Model
	Code      string `gorm:"size:16;uniqueIndex;not null" json:"code"` // 性别代码：male, female, other, prefer_not_to_say
	Name      string `gorm:"size:32;not null" json:"name"`             // 英文名称
	NameCN    string `gorm:"size:32" json:"name_cn"`                   // 中文名称
	SortOrder int    `gorm:"default:0" json:"sort_order"`              // 排序顺序
	IsActive  bool   `gorm:"default:true" json:"is_active"`            // 是否启用
}

// Language 语言表
type Language struct {
	gorm.Model
	Code      string `gorm:"size:16;uniqueIndex;not null" json:"code"` // 语言代码：en, zh-CN, ja, es 等
	Name      string `gorm:"size:64;not null" json:"name"`             // 语言名称（英文）
	NameLocal string `gorm:"size:64" json:"name_local"`                // 本地化名称
	IsActive  bool   `gorm:"default:true" json:"is_active"`            // 是否启用
	SortOrder int    `gorm:"default:0" json:"sort_order"`              // 排序顺序
}

// UserProfile 用户资料表
type UserProfile struct {
	gorm.Model
	UserID     uint       `gorm:"uniqueIndex;not null" json:"user_id"`   // 用户ID
	GenderID   *uint      `gorm:"index" json:"gender_id"`                // 性别ID
	LanguageID *uint      `gorm:"index" json:"language_id"`              // 语言ID
	CurrencyID *uint      `gorm:"index" json:"currency_id"`              // 主要货币ID
	Timezone   string     `gorm:"size:64;default:'UTC'" json:"timezone"` // 时区，如 UTC, Asia/Shanghai
	BirthDate  *time.Time `json:"birth_date"`                            // 出生日期
	Bio        string     `gorm:"type:text" json:"bio"`                  // 个人简介
	Location   string     `gorm:"size:128" json:"location"`              // 位置
	Website    string     `gorm:"size:255" json:"website"`               // 个人网站
	Company    string     `gorm:"size:128" json:"company"`               // 公司
	JobTitle   string     `gorm:"size:128" json:"job_title"`             // 职位

	// 关联
	User     User      `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"-"`
	Gender   *Gender   `gorm:"foreignKey:GenderID" json:"gender,omitempty"`
	Language *Language `gorm:"foreignKey:LanguageID" json:"language,omitempty"`
	Currency *Currency `gorm:"foreignKey:CurrencyID" json:"currency,omitempty"`
}

// TableName returns the table name for UserProfile model
func (UserProfile) TableName() string {
	return "user_profiles"
}
