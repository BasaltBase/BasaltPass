package settings

import (
	"encoding/json"
	"net/http"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
	settingssvc "basaltpass-backend/internal/settings"

	"github.com/gofiber/fiber/v2"
)

type SettingDTO struct {
	Key         string      `json:"key"`
	Value       interface{} `json:"value"`
	Category    string      `json:"category"`
	Description string      `json:"description"`
}

// List all settings optionally filtered by category
func ListSettingsHandler(c *fiber.Ctx) error {
	category := c.Query("category")

	var settings []model.SystemSetting
	db := common.DB()
	q := db
	if category != "" {
		q = q.Where("category = ?", category)
	}
	if err := q.Order("category,key").Find(&settings).Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	res := make([]SettingDTO, 0, len(settings))
	for _, s := range settings {
		var v interface{}
		_ = json.Unmarshal([]byte(s.Value), &v)
		res = append(res, SettingDTO{
			Key:         s.Key,
			Value:       v,
			Category:    s.Category,
			Description: s.Description,
		})
	}
	return c.JSON(res)
}

// Get setting by key
func GetSettingHandler(c *fiber.Ctx) error {
	key := c.Params("key")
	var s model.SystemSetting
	if err := common.DB().Where("key = ?", key).First(&s).Error; err != nil {
		return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "not found"})
	}
	var v interface{}
	_ = json.Unmarshal([]byte(s.Value), &v)
	return c.JSON(SettingDTO{Key: s.Key, Value: v, Category: s.Category, Description: s.Description})
}

// Upsert a single setting
func UpsertSettingHandler(c *fiber.Ctx) error {
	var dto SettingDTO
	if err := c.BodyParser(&dto); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if dto.Key == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "key required"})
	}
	if err := settingssvc.Upsert(dto.Key, dto.Value, dto.Category, dto.Description); err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// Bulk update settings
func BulkUpdateSettingsHandler(c *fiber.Ctx) error {
	var items []SettingDTO
	if err := c.BodyParser(&items); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	tx := common.DB().Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()
	for _, dto := range items {
		if dto.Key == "" {
			continue
		}
		b, _ := json.Marshal(dto.Value)
		var existing model.SystemSetting
		if err := tx.Where("key = ?", dto.Key).First(&existing).Error; err == nil {
			existing.Value = string(b)
			existing.Category = dto.Category
			existing.Description = dto.Description
			if err := tx.Save(&existing).Error; err != nil {
				tx.Rollback()
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
			}
		} else {
			s := model.SystemSetting{Key: dto.Key, Value: string(b), Category: dto.Category, Description: dto.Description}
			if err := tx.Create(&s).Error; err != nil {
				tx.Rollback()
				return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
			}
		}
	}
	if err := tx.Commit().Error; err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	// reload cache after bulk updates
	_ = settingssvc.Reload()
	return c.JSON(fiber.Map{"ok": true})
}
