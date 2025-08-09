package config

import (
	"fmt"
	"log"
	"strings"

	"github.com/spf13/viper"
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

	// Defaults
	v.SetDefault("env", "develop")
	v.SetDefault("server.address", ":8080")
	v.SetDefault("database.driver", "sqlite")
	v.SetDefault("database.path", "basaltpass.db")
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
