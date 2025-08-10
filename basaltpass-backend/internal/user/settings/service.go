package settings

import (
	"encoding/json"
	"fmt"
	"sync"

	"basaltpass-backend/internal/common"
	"basaltpass-backend/internal/model"
)

var (
	mu    sync.RWMutex
	cache map[string]interface{}
)

// Reload loads all settings from DB into in-memory cache.
func Reload() error {
	db := common.DB()
	var items []model.SystemSetting
	if err := db.Find(&items).Error; err != nil {
		return err
	}
	m := make(map[string]interface{}, len(items))
	for _, it := range items {
		var v interface{}
		if it.Value != "" {
			_ = json.Unmarshal([]byte(it.Value), &v)
		}
		m[it.Key] = v
	}
	mu.Lock()
	cache = m
	mu.Unlock()
	return nil
}

// Get returns a setting value from cache, or defaultVal if not found.
func Get(key string, defaultVal interface{}) interface{} {
	mu.RLock()
	v, ok := cache[key]
	mu.RUnlock()
	if !ok || v == nil {
		return defaultVal
	}
	return v
}

func GetString(key, def string) string {
	if v := Get(key, def); v != nil {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return def
}

func GetBool(key string, def bool) bool {
	if v := Get(key, def); v != nil {
		if b, ok := v.(bool); ok {
			return b
		}
	}
	return def
}

func GetInt(key string, def int) int {
	if v := Get(key, def); v != nil {
		switch t := v.(type) {
		case int:
			return t
		case float64: // JSON numbers decode to float64
			return int(t)
		}
	}
	return def
}

func GetStringSlice(key string, def []string) []string {
	if v := Get(key, def); v != nil {
		if arr, ok := v.([]interface{}); ok {
			out := make([]string, 0, len(arr))
			for _, x := range arr {
				if s, ok := x.(string); ok {
					out = append(out, s)
				}
			}
			return out
		}
		if arr, ok := v.([]string); ok {
			return arr
		}
	}
	return def
}

// Upsert stores a setting in DB and updates cache accordingly.
func Upsert(key string, value interface{}, category, description string) error {
	if key == "" {
		return fmt.Errorf("key is required")
	}
	b, _ := json.Marshal(value)
	db := common.DB()
	var existing model.SystemSetting
	if err := db.Where("key = ?", key).First(&existing).Error; err == nil {
		existing.Value = string(b)
		existing.Category = category
		existing.Description = description
		if err := db.Save(&existing).Error; err != nil {
			return err
		}
	} else {
		if err := db.Create(&model.SystemSetting{Key: key, Value: string(b), Category: category, Description: description}).Error; err != nil {
			return err
		}
	}
	mu.Lock()
	if cache == nil {
		cache = make(map[string]interface{})
	}
	cache[key] = value
	mu.Unlock()
	return nil
}
