package settings

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"

	"gopkg.in/yaml.v3"
)

// SettingItem represents a single configurable setting.
type SettingItem struct {
	Key         string      `yaml:"-" json:"key"`
	Value       interface{} `yaml:"value" json:"value"`
	Category    string      `yaml:"category" json:"category"`
	Description string      `yaml:"description" json:"description"`
}

type fileData struct {
	Settings map[string]SettingItem `yaml:"settings"`
}

var (
	mu       sync.RWMutex
	cache    map[string]SettingItem
	loaded   bool
	filePath string
)

// getSettingsFilePath returns the path to settings file.
// BASALTPASS_SETTINGS_FILE can override; otherwise defaults to ./config/settings.yaml
func getSettingsFilePath() string {
	if filePath != "" {
		return filePath
	}
	if p := os.Getenv("BASALTPASS_SETTINGS_FILE"); strings.TrimSpace(p) != "" {
		filePath = p
		return filePath
	}
	filePath = filepath.Join("config", "settings.yaml")
	return filePath
}

// ensureDir ensures the directory for the given file exists.
func ensureDir(fp string) error {
	dir := filepath.Dir(fp)
	return os.MkdirAll(dir, 0o755)
}

// defaultItems returns built-in defaults (replacing former DB seed defaults).
func defaultItems() map[string]SettingItem {
	return map[string]SettingItem{
		// General
		"general.site_name":   {Value: "BasaltPass", Category: "general", Description: "系统名称"},
		"general.site_url":    {Value: "http://localhost:8080", Category: "general", Description: "站点 URL（用于邮件、回调等绝对链接）"},
		"general.timezone":    {Value: "Asia/Shanghai", Category: "general", Description: "默认时区"},
		"general.locale":      {Value: "zh-CN", Category: "general", Description: "默认语言/区域"},
		"general.theme":       {Value: "light", Category: "general", Description: "默认主题（light/dark/system）"},
		"general.date_format": {Value: "YYYY-MM-DD", Category: "general", Description: "日期格式"},
		"general.time_format": {Value: "HH:mm:ss", Category: "general", Description: "时间格式"},

		// Cache (Redis)
		"cache.redis.enabled":  {Value: false, Category: "cache", Description: "是否启用 Redis 缓存"},
		"cache.redis.addr":     {Value: "127.0.0.1:6379", Category: "cache", Description: "Redis 地址"},
		"cache.redis.password": {Value: "", Category: "cache", Description: "Redis 密码"},
		"cache.redis.db":       {Value: 0, Category: "cache", Description: "Redis 数据库索引"},

		// Auth
		"auth.enable_register":                   {Value: true, Category: "auth", Description: "允许新用户注册"},
		"auth.require_email_verification":        {Value: false, Category: "auth", Description: "注册后是否要求邮箱验证"},
		"auth.password_policy.min_length":        {Value: 8, Category: "auth", Description: "密码最小长度"},
		"auth.password_policy.require_numbers":   {Value: true, Category: "auth", Description: "密码需包含数字"},
		"auth.password_policy.require_uppercase": {Value: false, Category: "auth", Description: "密码需包含大写字母"},
		"auth.password_policy.require_special":   {Value: false, Category: "auth", Description: "密码需包含特殊字符"},

		// Security
		"security.enforce_2fa":                    {Value: false, Category: "security", Description: "是否强制启用 2FA"},
		"security.allowed_ips":                    {Value: []string{}, Category: "security", Description: "允许访问的 IP 列表（留空表示不限制）"},
		"security.csp":                            {Value: "default-src 'self'", Category: "security", Description: "Content Security Policy"},
		"security.rate_limit.enabled":             {Value: true, Category: "security", Description: "是否启用速率限制"},
		"security.rate_limit.requests_per_minute": {Value: 120, Category: "security", Description: "每分钟请求上限"},
		"security.account_lockout.enabled":        {Value: true, Category: "security", Description: "是否启用登录失败锁定"},
		"security.account_lockout.max_attempts":   {Value: 5, Category: "security", Description: "锁定前允许的最大失败次数"},
		"security.account_lockout.window_minutes": {Value: 15, Category: "security", Description: "统计失败次数的时间窗口（分钟）"},

		// CORS
		"cors.allow_origins":     {Value: []string{"http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"}, Category: "cors", Description: "允许的跨域来源列表"},
		"cors.allow_methods":     {Value: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"}, Category: "cors", Description: "允许的方法"},
		"cors.allow_headers":     {Value: []string{"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With", "X-Tenant-ID"}, Category: "cors", Description: "允许的请求头"},
		"cors.allow_credentials": {Value: true, Category: "cors", Description: "是否允许携带凭据"},
		"cors.expose_headers":    {Value: []string{"Authorization", "Content-Length"}, Category: "cors", Description: "暴露给前端的响应头"},
		"cors.max_age_seconds":   {Value: 86400, Category: "cors", Description: "预检请求缓存秒数"},
		"cors.strict_mode":       {Value: false, Category: "cors", Description: "严格模式（仅允许白名单域名）"},

		// Billing
		"billing.currency_default": {Value: "CNY", Category: "billing", Description: "默认货币"},
		"billing.tax_rate":         {Value: 0.0, Category: "billing", Description: "默认税率（0-1）"},
		"billing.invoice_prefix":   {Value: "INV", Category: "billing", Description: "发票编号前缀"},

		// OAuth
		"oauth.allowed_redirect_hosts": {Value: []string{"localhost"}, Category: "oauth", Description: "允许的 OAuth 回调主机名"},
		"oauth.pkce_required":          {Value: true, Category: "oauth", Description: "是否要求 PKCE"},
		"oauth.enable_refresh_tokens":  {Value: true, Category: "oauth", Description: "是否启用刷新令牌"},
		"oauth.allowed_scopes": {Value: []string{
			"openid",
			"profile",
			"email",
			"offline_access",
			// S2S / third-party app scopes
			"s2s.read",
			"s2s.user.read",
			"s2s.user.write",
			"s2s.rbac.read",
			"s2s.wallet.read",
			"s2s.messages.read",
			"s2s.products.read",
		}, Category: "oauth", Description: "允许的 OAuth Scope 列表"},

		// SMTP/Email
		"smtp.enabled":      {Value: false, Category: "smtp", Description: "是否开启邮件发送"},
		"smtp.host":         {Value: "smtp.example.com", Category: "smtp", Description: "SMTP 服务器"},
		"smtp.port":         {Value: 587, Category: "smtp", Description: "SMTP 端口"},
		"smtp.username":     {Value: "", Category: "smtp", Description: "SMTP 用户名"},
		"smtp.password":     {Value: "", Category: "smtp", Description: "SMTP 密码"},
		"smtp.from":         {Value: "no-reply@example.com", Category: "smtp", Description: "发件人邮箱"},
		"email.from_suffix": {Value: "example.com", Category: "email", Description: "发件人邮箱后缀（用于 no-reply@<suffix>）"},

		// Logging
		"logging.level":                  {Value: "info", Category: "logging", Description: "日志级别（debug/info/warn/error）"},
		"logging.format":                 {Value: "text", Category: "logging", Description: "日志格式（text/json）"},
		"logging.enable_http_access_log": {Value: true, Category: "logging", Description: "是否记录 HTTP 访问日志"},
		"logging.retention_days":         {Value: 14, Category: "logging", Description: "应用日志保留天数"},

		// Session
		"session.cookie_name":     {Value: "basaltpass_sid", Category: "session", Description: "会话 Cookie 名称"},
		"session.secure":          {Value: false, Category: "session", Description: "Cookie 仅通过 HTTPS 发送"},
		"session.max_age_seconds": {Value: 86400, Category: "session", Description: "会话有效期（秒）"},
		"session.same_site":       {Value: "Lax", Category: "session", Description: "Cookie SameSite 策略（Lax/Strict/None）"},

		// UI/Brand
		"ui.brand_logo_url":    {Value: "", Category: "ui", Description: "品牌 Logo URL"},
		"ui.brand_favicon_url": {Value: "", Category: "ui", Description: "Favicon URL"},
		"ui.primary_color":     {Value: "#4f46e5", Category: "ui", Description: "品牌主色（十六进制）"},
		"ui.accent_color":      {Value: "#22c55e", Category: "ui", Description: "强调色（十六进制）"},

		// Uploads
		"uploads.max_size_mb":          {Value: 10, Category: "uploads", Description: "最大上传大小（MB）"},
		"uploads.allowed_types":        {Value: []string{"image/png", "image/jpeg", "application/pdf"}, Category: "uploads", Description: "允许的 MIME 类型"},
		"uploads.storage":              {Value: "local", Category: "uploads", Description: "文件存储类型（local/s3/azure/gcs）"},
		"storage.s3.enabled":           {Value: false, Category: "storage", Description: "是否启用 S3 兼容存储"},
		"storage.s3.endpoint":          {Value: "", Category: "storage", Description: "S3 Endpoint"},
		"storage.s3.bucket":            {Value: "", Category: "storage", Description: "S3 Bucket"},
		"storage.s3.region":            {Value: "", Category: "storage", Description: "S3 区域"},
		"storage.s3.access_key_id":     {Value: "", Category: "storage", Description: "S3 Access Key ID"},
		"storage.s3.secret_access_key": {Value: "", Category: "storage", Description: "S3 Secret Access Key"},

		// Notifications
		"notifications.email_enabled": {Value: false, Category: "notifications", Description: "是否启用邮件通知"},
		"notifications.push_enabled":  {Value: false, Category: "notifications", Description: "是否启用推送通知（WebPush/FCM 等）"},
		"webhooks.timeout_seconds":    {Value: 5, Category: "webhooks", Description: "Webhook 调用超时时间（秒）"},
		"webhooks.max_retries":        {Value: 3, Category: "webhooks", Description: "失败重试次数"},
		"webhooks.signing_secret":     {Value: "", Category: "webhooks", Description: "Webhook 签名密钥"},

		// JWT
		"jwt.issuer":              {Value: "basaltpass", Category: "jwt", Description: "JWT Issuer"},
		"jwt.exp_minutes":         {Value: 60, Category: "jwt", Description: "访问令牌过期分钟数"},
		"jwt.refresh_exp_minutes": {Value: 60 * 24 * 7, Category: "jwt", Description: "刷新令牌过期分钟数"},
		"jwt.algorithm":           {Value: "HS256", Category: "jwt", Description: "JWT 签名算法（HS256/RS256/ES256）"},
		"jwt.audience":            {Value: "", Category: "jwt", Description: "JWT 受众（aud）"},

		// Maintenance & Features
		"maintenance.enabled":               {Value: false, Category: "maintenance", Description: "维护模式：启用后仅管理员可访问"},
		"maintenance.message":               {Value: "系统维护中，请稍后访问。", Category: "maintenance", Description: "维护模式提示信息"},
		"features.registration_invite_only": {Value: false, Category: "features", Description: "仅限邀请注册"},
		"features.beta_features":            {Value: []string{}, Category: "features", Description: "开启的 Beta 功能列表"},

		// Analytics
		"analytics.enabled":     {Value: false, Category: "analytics", Description: "是否启用统计分析"},
		"analytics.provider":    {Value: "none", Category: "analytics", Description: "统计服务提供方（none/umami/ga4/plausible）"},
		"analytics.tracking_id": {Value: "", Category: "analytics", Description: "追踪 ID（如 GA4 Measurement ID）"},

		// Captcha
		"captcha.enabled":    {Value: false, Category: "captcha", Description: "是否启用验证码"},
		"captcha.provider":   {Value: "none", Category: "captcha", Description: "验证码提供方（none/recaptcha/hcaptcha）"},
		"captcha.site_key":   {Value: "", Category: "captcha", Description: "Captcha Site Key"},
		"captcha.secret_key": {Value: "", Category: "captcha", Description: "Captcha Secret Key"},

		// Billing (Stripe)
		"billing.stripe.enabled":        {Value: false, Category: "billing", Description: "是否启用 Stripe"},
		"billing.stripe.public_key":     {Value: "", Category: "billing", Description: "Stripe 公钥"},
		"billing.stripe.secret_key":     {Value: "", Category: "billing", Description: "Stripe 私钥"},
		"billing.stripe.webhook_secret": {Value: "", Category: "billing", Description: "Stripe Webhook 签名密钥"},

		// Audit & Pagination
		"audit.retention_days":         {Value: 90, Category: "audit", Description: "审计日志保留天数"},
		"pagination.default_page_size": {Value: 20, Category: "pagination", Description: "默认分页大小"},
		"pagination.max_page_size":     {Value: 100, Category: "pagination", Description: "最大分页大小"},
	}
}

// Reload loads settings from the file into in-memory cache.
// If the settings file does not exist, create it with defaults.
func Reload() error {
	fp := getSettingsFilePath()
	if err := ensureDir(fp); err != nil {
		return err
	}
	data := fileData{Settings: map[string]SettingItem{}}
	b, err := os.ReadFile(fp)
	if err != nil {
		if errors.Is(err, os.ErrNotExist) {
			// initialize with defaults
			data.Settings = defaultItems()
			if err := writeFileData(fp, &data); err != nil {
				return err
			}
			setCache(data.Settings)
			loaded = true
			return nil
		}
		return err
	}
	if len(b) > 0 {
		if err := yaml.Unmarshal(b, &data); err != nil {
			return fmt.Errorf("failed to parse settings file: %w", err)
		}
	}
	// Merge defaults for any missing keys so new settings appear automatically
	defaults := defaultItems()
	if len(data.Settings) == 0 {
		data.Settings = defaults
		if err := writeFileData(fp, &data); err != nil {
			return err
		}
	} else {
		changed := false
		// 1) add missing keys entirely
		for k, v := range defaults {
			if _, ok := data.Settings[k]; !ok {
				data.Settings[k] = v
				changed = true
			}
		}
		// 2) backfill missing metadata (category/description) for existing keys
		for k, it := range data.Settings {
			if def, ok := defaults[k]; ok {
				updated := false
				if strings.TrimSpace(it.Category) == "" && strings.TrimSpace(def.Category) != "" {
					it.Category = def.Category
					updated = true
				}
				if strings.TrimSpace(it.Description) == "" && strings.TrimSpace(def.Description) != "" {
					it.Description = def.Description
					updated = true
				}
				if updated {
					data.Settings[k] = it
					changed = true
				}
			}
		}
		if changed {
			if err := writeFileData(fp, &data); err != nil {
				return err
			}
		}
	}
	setCache(data.Settings)
	loaded = true
	return nil
}

func writeFileData(fp string, d *fileData) error {
	// Sort keys for stable output
	keys := make([]string, 0, len(d.Settings))
	for k := range d.Settings {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	ordered := make(map[string]SettingItem, len(d.Settings))
	for _, k := range keys {
		it := d.Settings[k]
		it.Key = "" // ensure not serialized
		ordered[k] = it
	}
	out := fileData{Settings: ordered}
	b, err := yaml.Marshal(&out)
	if err != nil {
		return err
	}
	if err := os.WriteFile(fp, b, 0o644); err != nil {
		return err
	}
	return nil
}

func setCache(m map[string]SettingItem) {
	mu.Lock()
	cache = make(map[string]SettingItem, len(m))
	for k, v := range m {
		v.Key = k
		cache[k] = v
	}
	mu.Unlock()
}

// List returns all settings, optionally filtered by category.
func List(category string) []SettingItem {
	mu.RLock()
	defer mu.RUnlock()
	res := make([]SettingItem, 0, len(cache))
	for k, v := range cache {
		if category == "" || strings.EqualFold(v.Category, category) {
			v.Key = k
			res = append(res, v)
		}
	}
	sort.Slice(res, func(i, j int) bool {
		if res[i].Category == res[j].Category {
			return res[i].Key < res[j].Key
		}
		return res[i].Category < res[j].Category
	})
	return res
}

// GetItem returns a full SettingItem if present.
func GetItem(key string) (SettingItem, bool) {
	mu.RLock()
	defer mu.RUnlock()
	it, ok := cache[key]
	if ok {
		it.Key = key
	}
	return it, ok
}

// Get returns a setting value from cache, or defaultVal if not found.
func Get(key string, defaultVal interface{}) interface{} {
	it, ok := GetItem(key)
	if !ok || it.Value == nil {
		return defaultVal
	}
	return it.Value
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
		case int64:
			return int(t)
		case float64: // YAML numbers may decode to float64
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

// Upsert writes a setting to the file and updates cache accordingly.
func Upsert(key string, value interface{}, category, description string) error {
	if strings.TrimSpace(key) == "" {
		return fmt.Errorf("key is required")
	}
	// ensure loaded
	if !loaded {
		if err := Reload(); err != nil {
			return err
		}
	}
	fp := getSettingsFilePath()
	mu.Lock()
	// update cache first
	if cache == nil {
		cache = make(map[string]SettingItem)
	}
	it := cache[key]
	it.Key = key
	it.Value = value
	if category != "" {
		it.Category = category
	}
	if description != "" {
		it.Description = description
	}
	cache[key] = it
	// persist to file
	data := fileData{Settings: map[string]SettingItem{}}
	for k, v := range cache {
		v.Key = ""
		data.Settings[k] = v
	}
	mu.Unlock()
	if err := ensureDir(fp); err != nil {
		return err
	}
	if err := writeFileData(fp, &data); err != nil {
		return err
	}
	return nil
}
