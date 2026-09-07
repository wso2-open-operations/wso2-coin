// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

// Package config loads and validates runtime configuration from the environment.
package config

import (
	"encoding/base64"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

const (
	encryptionKeySize = 32
	defaultPort       = ":8081"
)

// Config is the fully resolved, validated service configuration.
type Config struct {
	Port              string
	CORSAllowedOrigin string
	JWT               JWTConfig
	DB                DBConfig
	EncryptionKey     []byte
}

// JWTConfig controls how the caller's token is verified. When JWKSURL is set the
// token's signature, expiry and (if configured) issuer/audience are validated
// against the JWKS. When JWKSURL is empty the service refuses to start unless
// AllowInsecure is explicitly enabled (local development only), in which case
// tokens are decoded but not verified.
type JWTConfig struct {
	JWKSURL       string
	Issuer        string
	Audience      string
	AllowInsecure bool
}

// DBConfig holds the MySQL connection settings.
type DBConfig struct {
	Host                  string
	Port                  string
	User                  string
	Password              string
	Name                  string
	TLSMode               string
	MaxOpenConns          int
	MaxIdleConns          int
	ConnMaxLifetimeSecond int
	ConnectTimeoutSecond  int
}

// DSN returns the MySQL data source name. TLSMode maps to go-sql-driver's tls
// parameter: "true" verifies the server certificate and hostname (recommended for
// managed databases), "preferred" uses TLS opportunistically without verification,
// "skip-verify" encrypts without verification, "false" disables TLS.
func (d DBConfig) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&timeout=%ds&tls=%s",
		d.User, d.Password, d.Host, d.Port, d.Name, d.ConnectTimeoutSecond, d.TLSMode)
}

// Load reads configuration from the environment and fails on missing required values.
// A local .env file, when present, seeds any unset variables.
func Load() (Config, error) {
	_ = godotenv.Load()

	dbUser, err := mustEnv("DB_USER")
	if err != nil {
		return Config{}, err
	}
	dbName, err := mustEnv("DB_NAME")
	if err != nil {
		return Config{}, err
	}
	key, err := loadEncryptionKey()
	if err != nil {
		return Config{}, err
	}

	return Config{
		Port:              listenAddr(os.Getenv("PORT")),
		CORSAllowedOrigin: os.Getenv("CORS_ALLOWED_ORIGIN"),
		JWT: JWTConfig{
			JWKSURL:       os.Getenv("JWT_JWKS_URL"),
			Issuer:        os.Getenv("JWT_ISSUER"),
			Audience:      os.Getenv("JWT_AUDIENCE"),
			AllowInsecure: envBool("JWT_ALLOW_INSECURE", false),
		},
		DB: DBConfig{
			Host:                  envOrDefault("DB_HOST", "localhost"),
			Port:                  envOrDefault("DB_PORT", "3306"),
			User:                  dbUser,
			Password:              os.Getenv("DB_PASSWORD"),
			Name:                  dbName,
			TLSMode:               envOrDefault("DB_TLS", "preferred"),
			MaxOpenConns:          envIntOrDefault("DB_MAX_OPEN_CONNECTIONS", 25),
			MaxIdleConns:          envIntOrDefault("DB_MAX_IDLE_CONNECTIONS", 25),
			ConnMaxLifetimeSecond: envIntOrDefault("DB_CONN_MAX_LIFETIME_SECONDS", 300),
			ConnectTimeoutSecond:  envIntOrDefault("DB_CONNECT_TIMEOUT_SECONDS", 10),
		},
		EncryptionKey: key,
	}, nil
}

// listenAddr normalizes a configured port into an address the HTTP server can bind.
// A bare port number (e.g. "8080") becomes ":8080"; an empty value falls back to the
// service default.
func listenAddr(port string) string {
	port = strings.TrimSpace(port)
	if port == "" {
		return defaultPort
	}
	if strings.HasPrefix(port, ":") {
		return port
	}
	return ":" + port
}

func loadEncryptionKey() ([]byte, error) {
	raw, err := mustEnv("ENCRYPTION_KEY")
	if err != nil {
		return nil, err
	}
	key, err := base64.StdEncoding.DecodeString(raw)
	if err != nil {
		return nil, fmt.Errorf("ENCRYPTION_KEY must be base64: %w", err)
	}
	if len(key) != encryptionKeySize {
		return nil, fmt.Errorf("ENCRYPTION_KEY must decode to %d bytes, got %d", encryptionKeySize, len(key))
	}
	return key, nil
}

func mustEnv(key string) (string, error) {
	v := os.Getenv(key)
	if v == "" {
		return "", fmt.Errorf("required environment variable is not set: %s", key)
	}
	return v, nil
}

func envOrDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func envIntOrDefault(key string, def int) int {
	v := os.Getenv(key)
	if v == "" {
		return def
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return def
	}
	return n
}

func envBool(key string, def bool) bool {
	switch os.Getenv(key) {
	case "true":
		return true
	case "false":
		return false
	default:
		return def
	}
}
