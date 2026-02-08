package user

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// GetUserProfileHandler 获取用户详细资料
// GET /api/v1/user/profile-detail
func GetUserProfileHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var profile model.UserProfile
	db := common.DB()

	// 预加载关联数据
	err := db.Preload("Gender").Preload("Language").Preload("Currency").
		Where("user_id = ?", userID).First(&profile).Error

	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// 如果用户资料不存在，创建默认资料
			profile = model.UserProfile{
				UserID:   userID,
				Timezone: "UTC",
			}
			if err := db.Create(&profile).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to create user profile",
				})
			}
			// 重新加载以获取关联数据
			db.Preload("Gender").Preload("Language").Preload("Currency").
				Where("user_id = ?", userID).First(&profile)
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get user profile",
			})
		}
	}

	// 格式化响应数据
	response := fiber.Map{
		"id":          profile.ID,
		"user_id":     profile.UserID,
		"gender_id":   profile.GenderID,
		"language_id": profile.LanguageID,
		"currency_id": profile.CurrencyID,
		"timezone":    profile.Timezone,
		"bio":         profile.Bio,
		"location":    profile.Location,
		"website":     profile.Website,
		"company":     profile.Company,
		"job_title":   profile.JobTitle,
		"gender":      profile.Gender,
		"language":    profile.Language,
		"currency":    profile.Currency,
		"created_at":  profile.CreatedAt,
		"updated_at":  profile.UpdatedAt,
	}

	// 格式化 birth_date 为 YYYY-MM-DD
	if profile.BirthDate != nil {
		response["birth_date"] = profile.BirthDate.Format("2006-01-02")
	} else {
		response["birth_date"] = nil
	}

	return c.JSON(fiber.Map{
		"profile": response,
	})
}

// UpdateUserProfileHandler 更新用户详细资料
// PUT /api/v1/user/profile-detail
func UpdateUserProfileHandler(c *fiber.Ctx) error {
	userID := c.Locals("userID").(uint)

	var req struct {
		GenderID   *uint   `json:"gender_id"`
		LanguageID *uint   `json:"language_id"`
		CurrencyID *uint   `json:"currency_id"`
		Timezone   *string `json:"timezone"`
		BirthDate  *string `json:"birth_date"` // YYYY-MM-DD 格式
		Bio        *string `json:"bio"`
		Location   *string `json:"location"`
		Website    *string `json:"website"`
		Company    *string `json:"company"`
		JobTitle   *string `json:"job_title"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	db := common.DB()
	var profile model.UserProfile

	// 查找或创建用户资料
	err := db.Where("user_id = ?", userID).First(&profile).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			profile = model.UserProfile{UserID: userID}
			if err := db.Create(&profile).Error; err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
					"error": "Failed to create user profile",
				})
			}
		} else {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"error": "Failed to get user profile",
			})
		}
	}

	// 更新字段
	updates := make(map[string]interface{})

	if req.GenderID != nil {
		updates["gender_id"] = req.GenderID
	}
	if req.LanguageID != nil {
		updates["language_id"] = req.LanguageID
	}
	if req.CurrencyID != nil {
		updates["currency_id"] = req.CurrencyID
	}
	if req.Timezone != nil {
		updates["timezone"] = *req.Timezone
	}
	if req.BirthDate != nil {
		if *req.BirthDate == "" {
			updates["birth_date"] = nil
		} else {
			birthDate, err := time.Parse("2006-01-02", *req.BirthDate)
			if err != nil {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
					"error": "Invalid birth date format, use YYYY-MM-DD",
				})
			}
			updates["birth_date"] = birthDate
		}
	}
	if req.Bio != nil {
		updates["bio"] = *req.Bio
	}
	if req.Location != nil {
		updates["location"] = *req.Location
	}
	if req.Website != nil {
		updates["website"] = *req.Website
	}
	if req.Company != nil {
		updates["company"] = *req.Company
	}
	if req.JobTitle != nil {
		updates["job_title"] = *req.JobTitle
	}

	if err := db.Model(&profile).Updates(updates).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to update user profile",
		})
	}

	// 重新加载资料以获取关联数据
	db.Preload("Gender").Preload("Language").Preload("Currency").
		Where("user_id = ?", userID).First(&profile)

	return c.JSON(fiber.Map{
		"profile": profile,
		"message": "Profile updated successfully",
	})
}

// GetGendersHandler 获取性别列表
// GET /api/v1/user/genders
func GetGendersHandler(c *fiber.Ctx) error {
	var genders []model.Gender
	if err := common.DB().Where("is_active = ?", true).Order("sort_order").Find(&genders).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get genders",
		})
	}

	return c.JSON(fiber.Map{
		"genders": genders,
	})
}

// GetLanguagesHandler 获取语言列表
// GET /api/v1/user/languages
func GetLanguagesHandler(c *fiber.Ctx) error {
	var languages []model.Language
	if err := common.DB().Where("is_active = ?", true).Order("sort_order").Find(&languages).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get languages",
		})
	}

	return c.JSON(fiber.Map{
		"languages": languages,
	})
}

// GetCurrenciesHandler 获取货币列表
// GET /api/v1/user/currencies
func GetCurrenciesHandler(c *fiber.Ctx) error {
	var currencies []model.Currency

	// 可选：只返回法币
	onlyFiat := c.Query("only_fiat", "false")
	query := common.DB().Where("is_active = ?", true)

	if onlyFiat == "true" {
		query = query.Where("type = ?", "fiat")
	}

	if err := query.Order("sort_order, code").Find(&currencies).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to get currencies",
		})
	}

	return c.JSON(fiber.Map{
		"currencies": currencies,
	})
}

// GetTimezonesHandler 获取时区列表
// GET /api/v1/user/timezones
func GetTimezonesHandler(c *fiber.Ctx) error {
	// 返回常用时区列表
	timezones := []map[string]string{
		{"value": "UTC", "label": "UTC (Coordinated Universal Time)", "offset": "+00:00"},
		{"value": "America/New_York", "label": "Eastern Time (US & Canada)", "offset": "-05:00"},
		{"value": "America/Chicago", "label": "Central Time (US & Canada)", "offset": "-06:00"},
		{"value": "America/Denver", "label": "Mountain Time (US & Canada)", "offset": "-07:00"},
		{"value": "America/Los_Angeles", "label": "Pacific Time (US & Canada)", "offset": "-08:00"},
		{"value": "America/Anchorage", "label": "Alaska", "offset": "-09:00"},
		{"value": "Pacific/Honolulu", "label": "Hawaii", "offset": "-10:00"},
		{"value": "Asia/Shanghai", "label": "China Standard Time (Beijing, Shanghai)", "offset": "+08:00"},
		{"value": "Asia/Tokyo", "label": "Japan Standard Time (Tokyo)", "offset": "+09:00"},
		{"value": "Asia/Seoul", "label": "Korea Standard Time (Seoul)", "offset": "+09:00"},
		{"value": "Asia/Hong_Kong", "label": "Hong Kong Time", "offset": "+08:00"},
		{"value": "Asia/Taipei", "label": "Taipei Time", "offset": "+08:00"},
		{"value": "Asia/Singapore", "label": "Singapore Time", "offset": "+08:00"},
		{"value": "Asia/Bangkok", "label": "Indochina Time (Bangkok)", "offset": "+07:00"},
		{"value": "Asia/Dubai", "label": "Gulf Standard Time (Dubai)", "offset": "+04:00"},
		{"value": "Europe/London", "label": "Greenwich Mean Time (London)", "offset": "+00:00"},
		{"value": "Europe/Paris", "label": "Central European Time (Paris)", "offset": "+01:00"},
		{"value": "Europe/Berlin", "label": "Central European Time (Berlin)", "offset": "+01:00"},
		{"value": "Europe/Rome", "label": "Central European Time (Rome)", "offset": "+01:00"},
		{"value": "Europe/Madrid", "label": "Central European Time (Madrid)", "offset": "+01:00"},
		{"value": "Europe/Moscow", "label": "Moscow Standard Time", "offset": "+03:00"},
		{"value": "Australia/Sydney", "label": "Australian Eastern Time (Sydney)", "offset": "+10:00"},
		{"value": "Australia/Melbourne", "label": "Australian Eastern Time (Melbourne)", "offset": "+10:00"},
		{"value": "Pacific/Auckland", "label": "New Zealand Standard Time (Auckland)", "offset": "+12:00"},
	}

	return c.JSON(fiber.Map{
		"timezones": timezones,
	})
}
