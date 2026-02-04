package model

import "gorm.io/gorm"

// ProductCategory 产品分类（租户维度）
type ProductCategory struct {
	gorm.Model
	TenantID     uint64 `gorm:"not null;index;uniqueIndex:idx_product_categories_tenant_slug"`
	Name         string `gorm:"size:64;not null"`
	Slug         string `gorm:"size:64;not null;uniqueIndex:idx_product_categories_tenant_slug"`
	Description  string `gorm:"type:text"`
	IsActive     bool   `gorm:"not null;default:true"`
	DisplayOrder int    `gorm:"not null;default:0"`
	Metadata     JSONB  `gorm:"type:json"`
}

// TableName 指定表名
func (ProductCategory) TableName() string {
	return "market_product_categories"
}

// ProductTag 产品标签（租户维度）
type ProductTag struct {
	gorm.Model
	TenantID uint64 `gorm:"not null;index;uniqueIndex:idx_product_tags_tenant_slug"`
	Name     string `gorm:"size:64;not null"`
	Slug     string `gorm:"size:64;not null;uniqueIndex:idx_product_tags_tenant_slug"`
	Color    string `gorm:"size:16"`
	Metadata JSONB  `gorm:"type:json"`
}

// TableName 指定表名
func (ProductTag) TableName() string {
	return "market_product_tags"
}
