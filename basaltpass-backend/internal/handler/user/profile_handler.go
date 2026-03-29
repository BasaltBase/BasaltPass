package user

import (
	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

func serializeGender(gender *model.Gender) fiber.Map {
	if gender == nil {
		return nil
	}

	return fiber.Map{
		"id":         gender.ID,
		"code":       gender.Code,
		"name":       gender.Name,
		"name_cn":    gender.NameCN,
		"sort_order": gender.SortOrder,
		"is_active":  gender.IsActive,
		"created_at": gender.CreatedAt,
		"updated_at": gender.UpdatedAt,
	}
}

func serializeLanguage(language *model.Language) fiber.Map {
	if language == nil {
		return nil
	}

	return fiber.Map{
		"id":         language.ID,
		"code":       language.Code,
		"name":       language.Name,
		"name_local": language.NameLocal,
		"sort_order": language.SortOrder,
		"is_active":  language.IsActive,
		"created_at": language.CreatedAt,
		"updated_at": language.UpdatedAt,
	}
}

func serializeCurrency(currency *model.Currency) fiber.Map {
	if currency == nil {
		return nil
	}

	return fiber.Map{
		"id":             currency.ID,
		"code":           currency.Code,
		"name":           currency.Name,
		"name_cn":        currency.NameCN,
		"symbol":         currency.Symbol,
		"decimal_places": currency.DecimalPlaces,
		"type":           currency.Type,
		"is_active":      currency.IsActive,
		"sort_order":     currency.SortOrder,
		"description":    currency.Description,
		"icon_url":       currency.IconURL,
		"created_at":     currency.CreatedAt,
		"updated_at":     currency.UpdatedAt,
	}
}

func buildUserProfileResponse(profile model.UserProfile) fiber.Map {
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
		"gender":      serializeGender(profile.Gender),
		"language":    serializeLanguage(profile.Language),
		"currency":    serializeCurrency(profile.Currency),
		"created_at":  profile.CreatedAt,
		"updated_at":  profile.UpdatedAt,
	}

	if profile.BirthDate != nil {
		response["birth_date"] = profile.BirthDate.Format("2006-01-02")
	} else {
		response["birth_date"] = nil
	}

	return response
}

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

	return c.JSON(fiber.Map{
		"profile": buildUserProfileResponse(profile),
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
		updates["gender_id"] = *req.GenderID
	}
	if req.LanguageID != nil {
		updates["language_id"] = *req.LanguageID
	}
	if req.CurrencyID != nil {
		updates["currency_id"] = *req.CurrencyID
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
		"profile": buildUserProfileResponse(profile),
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

	items := make([]fiber.Map, 0, len(genders))
	for _, gender := range genders {
		genderCopy := gender
		items = append(items, serializeGender(&genderCopy))
	}

	return c.JSON(fiber.Map{
		"genders": items,
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

	items := make([]fiber.Map, 0, len(languages))
	for _, language := range languages {
		languageCopy := language
		items = append(items, serializeLanguage(&languageCopy))
	}

	return c.JSON(fiber.Map{
		"languages": items,
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

	items := make([]fiber.Map, 0, len(currencies))
	for _, currency := range currencies {
		currencyCopy := currency
		items = append(items, serializeCurrency(&currencyCopy))
	}

	return c.JSON(fiber.Map{
		"currencies": items,
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
