package migration

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"log"
)

// InitGendersAndLanguages 初始化性别和语言数据
func InitGendersAndLanguages() {
	db := common.DB()

	// 初始化性别数据
	genders := []model.Gender{
		{Code: "male", Name: "Male", NameCN: "男", SortOrder: 1, IsActive: true},
		{Code: "female", Name: "Female", NameCN: "女", SortOrder: 2, IsActive: true},
		{Code: "other", Name: "Other", NameCN: "其他", SortOrder: 3, IsActive: true},
		{Code: "prefer_not_to_say", Name: "Prefer not to say", NameCN: "不愿透露", SortOrder: 4, IsActive: true},
	}

	for _, gender := range genders {
		var existing model.Gender
		if err := db.Where("code = ?", gender.Code).First(&existing).Error; err != nil {
			// 不存在，创建
			if err := db.Create(&gender).Error; err != nil {
				log.Printf("[Migration] Failed to create gender %s: %v", gender.Code, err)
			} else {
				log.Printf("[Migration] Created gender: %s", gender.Code)
			}
		}
	}

	// 初始化语言数据
	languages := []model.Language{
		{Code: "en", Name: "English", NameLocal: "English", SortOrder: 1, IsActive: true},
		{Code: "zh-CN", Name: "Simplified Chinese", NameLocal: "简体中文", SortOrder: 2, IsActive: true},
		{Code: "zh-TW", Name: "Traditional Chinese", NameLocal: "繁體中文", SortOrder: 3, IsActive: true},
		{Code: "ja", Name: "Japanese", NameLocal: "日本語", SortOrder: 4, IsActive: true},
		{Code: "ko", Name: "Korean", NameLocal: "한국어", SortOrder: 5, IsActive: true},
		{Code: "es", Name: "Spanish", NameLocal: "Español", SortOrder: 6, IsActive: true},
		{Code: "fr", Name: "French", NameLocal: "Français", SortOrder: 7, IsActive: true},
		{Code: "de", Name: "German", NameLocal: "Deutsch", SortOrder: 8, IsActive: true},
		{Code: "pt", Name: "Portuguese", NameLocal: "Português", SortOrder: 9, IsActive: true},
		{Code: "ru", Name: "Russian", NameLocal: "Русский", SortOrder: 10, IsActive: true},
		{Code: "ar", Name: "Arabic", NameLocal: "العربية", SortOrder: 11, IsActive: true},
		{Code: "hi", Name: "Hindi", NameLocal: "हिन्दी", SortOrder: 12, IsActive: true},
	}

	for _, language := range languages {
		var existing model.Language
		if err := db.Where("code = ?", language.Code).First(&existing).Error; err != nil {
			// 不存在，创建
			if err := db.Create(&language).Error; err != nil {
				log.Printf("[Migration] Failed to create language %s: %v", language.Code, err)
			} else {
				log.Printf("[Migration] Created language: %s", language.Code)
			}
		}
	}

	log.Println("[Migration] Gender and language initialization completed")
}
