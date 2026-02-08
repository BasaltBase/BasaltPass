package config

import (
	"fmt"
	"log"
	"os"
	"strings"

	"github.com/spf13/viper"
	gotenv "github.com/subosito/gotenv"
)

// Config holds application configuration loaded from file and environment.
type Config struct {
	// Env indicates current environment: develop, staging, production
	Env    string `mapstructure:"env"`
	Server struct {
		// Address in host:port or :port format, e.g. ":8080"
		Address string `mapstructure:"address"`
	} `mapstructure:"server"`

	Database struct {
		// Driver such as "sqlite" (default)
		Driver string `mapstructure:"driver"`
		// DSN is used directly when set. For sqlite you can also use Path.
		DSN string `mapstructure:"dsn"`
		// Path is the sqlite file path, e.g. "basaltpass.db"
		Path string `mapstructure:"path"`
	} `mapstructure:"database"`

	CORS struct {
		AllowOrigins     []string `mapstructure:"allow_origins"`
		AllowMethods     []string `mapstructure:"allow_methods"`
		AllowHeaders     []string `mapstructure:"allow_headers"`
		AllowCredentials bool     `mapstructure:"allow_credentials"`
		ExposeHeaders    []string `mapstructure:"expose_headers"`
		MaxAgeSeconds    int      `mapstructure:"max_age_seconds"`
	} `mapstructure:"cors"`

	Email struct {
		Provider string `mapstructure:"provider"`
		SMTP     struct {
			Host     string `mapstructure:"host"`
			Port     int    `mapstructure:"port"`
			Username string `mapstructure:"username"`
			Password string `mapstructure:"password"`
			UseTLS   bool   `mapstructure:"use_tls"`
			UseSSL   bool   `mapstructure:"use_ssl"`
		} `mapstructure:"smtp"`
		AWSSES struct {
			Region           string `mapstructure:"region"`
			AccessKeyID      string `mapstructure:"access_key_id"`
			SecretAccessKey  string `mapstructure:"secret_access_key"`
			ConfigurationSet string `mapstructure:"configuration_set"`
		} `mapstructure:"aws_ses"`
		Brevo struct {
			APIKey  string `mapstructure:"api_key"`
			BaseURL string `mapstructure:"base_url"`
		} `mapstructure:"brevo"`
		Mailgun struct {
			Domain  string `mapstructure:"domain"`
			APIKey  string `mapstructure:"api_key"`
			BaseURL string `mapstructure:"base_url"`
		} `mapstructure:"mailgun"`
	} `mapstructure:"email"`

	Seeding struct {
		// Enabled controls whether to auto-inject demo data on first run (empty DB)
		Enabled bool `mapstructure:"enabled"`
	} `mapstructure:"seeding"`

	S2S struct {
		// AllowQueryCredentials controls whether client_id/client_secret may be passed via query string.
		// Strongly recommended to disable in production.
		AllowQueryCredentials bool `mapstructure:"allow_query_credentials"`
		RateLimit             struct {
			Enabled           bool `mapstructure:"enabled"`
			RequestsPerMinute int  `mapstructure:"requests_per_minute"`
		} `mapstructure:"rate_limit"`
		AuditEnabled bool `mapstructure:"audit_enabled"`
	} `mapstructure:"s2s"`

	UI struct {
		// BaseURL is the public URL where the hosted login UI is served.
		// In development, the default is the user console dev server (http://localhost:5173).
		// In production, you can leave it empty when UI and API share the same origin.
		BaseURL string `mapstructure:"base_url"`
	} `mapstructure:"ui"`
}

var cfg Config
var loaded bool

// Load reads configuration from the given optional path (YAML/JSON/TOML),
// applies defaults, and overlays environment variables prefixed with BASALTPASS_.
// If path is empty, it searches common locations (working dir and ./config).
func Load(path string) (*Config, error) {
	if loaded {
		return &cfg, nil
	}

	v := viper.New()

	// 1) Load .env first so that os.Getenv can see values (incl. JWT_SECRET)
	// Priority: BASALTPASS_ENV_FILE > ./.env > ../.env
	if custom := os.Getenv("BASALTPASS_ENV_FILE"); custom != "" {
		if err := gotenv.Load(custom); err == nil {
			log.Printf("loaded env from %s", custom)
		} else {
			log.Printf("env file not found at %s (skip): %v", custom, err)
		}
	} else {
		// try common locations relative to the backend working directory
		tried := []string{".env", "../.env"}
		for _, f := range tried {
			if err := gotenv.Load(f); err == nil {
				log.Printf("loaded env from %s", f)
				break
			}
		}
	}

	// Defaults
	v.SetDefault("env", "develop")
	v.SetDefault("server.address", ":8080")
	v.SetDefault("seeding.enabled", false)
	v.SetDefault("database.driver", "sqlite")
	v.SetDefault("database.path", "basaltpass.db")
	v.SetDefault("database.dsn", "") // 显式设置默认值，以确保 Viper 能从环境变量 BASALTPASS_DATABASE_DSN Unmarshal
	v.SetDefault("cors.allow_origins", []string{
		"http://localhost:5173",
		"http://127.0.0.1:5173",
		"http://localhost:3000",
	})
	v.SetDefault("cors.allow_methods", []string{"GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"})
	v.SetDefault("cors.allow_headers", []string{
		"Origin", "Content-Type", "Accept", "Authorization", "X-Requested-With",
		"Access-Control-Request-Method", "Access-Control-Request-Headers", "X-Tenant-ID",
	})
	v.SetDefault("cors.allow_credentials", true)
	v.SetDefault("cors.expose_headers", []string{
		"Authorization", "Content-Length", "Access-Control-Allow-Origin", "Access-Control-Allow-Headers",
		"Cache-Control", "Content-Language", "Content-Type", "Expires", "Last-Modified", "Pragma",
	})
	v.SetDefault("cors.max_age_seconds", 86400)

	// S2S defaults
	v.SetDefault("s2s.allow_query_credentials", false)
	v.SetDefault("s2s.rate_limit.enabled", true)
	v.SetDefault("s2s.rate_limit.requests_per_minute", 600)
	v.SetDefault("s2s.audit_enabled", true)

	// UI defaults
	// When UI and API are served separately (dev), use the dev server port.
	// When UI is served by the same origin as the API, leaving this empty keeps redirects relative.
	if strings.EqualFold(v.GetString("env"), "develop") {
		v.SetDefault("ui.base_url", "http://localhost:5173")
	} else {
		v.SetDefault("ui.base_url", "")
	}

	// Email defaults
	v.SetDefault("email.provider", "smtp")
	v.SetDefault("email.smtp.port", 587)
	v.SetDefault("email.smtp.use_tls", true)
	v.SetDefault("email.smtp.use_ssl", false)

	// Environment variables
	v.SetEnvPrefix("basaltpass")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_", "-", "_"))
	v.AutomaticEnv()

	// Config file discovery
	if path != "" {
		v.SetConfigFile(path)
	} else {
		v.SetConfigName("config")
		v.AddConfigPath(".")
		v.AddConfigPath("./config")
		v.AddConfigPath("../config")
	}

	// Read config file if available; it's optional.
	if err := v.ReadInConfig(); err != nil {
		// Only warn when file not found; other errors should bubble up
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Printf("config file not found, using defaults and env vars")
		} else {
			return nil, fmt.Errorf("failed to read config: %w", err)
		}
	} else {
		log.Printf("loaded config from %s", v.ConfigFileUsed())
	}

	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("failed to unmarshal config: %w", err)
	}

	loaded = true
	return &cfg, nil
}

// Get returns the loaded configuration. Call Load first in main().
func Get() *Config {
	if !loaded {
		log.Printf("config not explicitly loaded; using defaults+env")
		// Best-effort implicit load with defaults/env, ignoring file errors
		if _, err := Load(""); err != nil {
			log.Printf("implicit config load error: %v", err)
		}
	}
	return &cfg
}

// IsDevelop returns true when env is "develop" (default)
func IsDevelop() bool { return strings.EqualFold(Get().Env, "develop") }

// IsStaging returns true when env is "staging"
func IsStaging() bool { return strings.EqualFold(Get().Env, "staging") }

// IsProduction returns true when env is "production" or "prod"
func IsProduction() bool {
	e := strings.ToLower(Get().Env)
	return e == "production" || e == "prod"
}
