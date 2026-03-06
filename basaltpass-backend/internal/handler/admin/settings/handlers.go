package settings

import (
	settingssvc "basaltpass-backend/internal/service/settings"
	"net/http"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type SettingDTO struct {
	Key         string      `json:"key"`
	Value       interface{} `json:"value"`
	Category    string      `json:"category"`
	Description string      `json:"description"`
}

func isSensitiveSettingKey(key string) bool {
	k := strings.ToLower(strings.TrimSpace(key))
	if k == "" {
		return false
	}
	return strings.Contains(k, "password") ||
		strings.Contains(k, "secret") ||
		strings.Contains(k, "access_key") ||
		strings.Contains(k, "private_key") ||
		strings.Contains(k, "api_key") ||
		strings.Contains(k, "client_secret") ||
		strings.Contains(k, "token")
}

func maskedSettingValue(key string, value interface{}) interface{} {
	if !isSensitiveSettingKey(key) {
		return value
	}
	if value == nil {
		return nil
	}
	if s, ok := value.(string); ok && strings.TrimSpace(s) == "" {
		return ""
	}
	return "******"
}

// List all settings optionally filtered by category
func ListSettingsHandler(c *fiber.Ctx) error {
	category := c.Query("category")
	items := settingssvc.List(category)
	res := make([]SettingDTO, 0, len(items))
	for _, it := range items {
		res = append(res, SettingDTO{
			Key:         it.Key,
			Value:       maskedSettingValue(it.Key, it.Value),
			Category:    it.Category,
			Description: it.Description,
		})
	}
	return c.JSON(res)
}

// Get setting by key
func GetSettingHandler(c *fiber.Ctx) error {
	key := c.Params("key")
	if it, ok := settingssvc.GetItem(key); ok {
		return c.JSON(SettingDTO{
			Key:         it.Key,
			Value:       maskedSettingValue(it.Key, it.Value),
			Category:    it.Category,
			Description: it.Description,
		})
	}
	return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "not found"})
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
	for _, dto := range items {
		if dto.Key == "" {
			continue
		}
		if err := settingssvc.Upsert(dto.Key, dto.Value, dto.Category, dto.Description); err != nil {
			return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
	}
	return c.JSON(fiber.Map{"ok": true})
}
