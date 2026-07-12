package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	Port           string
	DBHost         string
	DBPort         string
	DBUser         string
	DBPassword     string
	DBName         string
	DBSSLMode      string
	IAMClientID     string
	IAMClientSecret string
	IAMRedirectURI  string
	IAMURLAuthorize string
	IAMURLToken     string
	IAMURLUserInfo  string
	JWTSecret       string
	JWTExpHours     int
	Env             string
	MinioEndpoint   string
	MinioAccessKey  string
	MinioSecretKey  string
	MinioBucketName string
	MinioUseSSL     bool
	FrontendURL     string
}

var AppConfig *Config

func LoadConfig() {
	// Membaca file .env jika ada
	err := godotenv.Load()
	if err != nil {
		log.Println("Informasi: File .env tidak ditemukan, menggunakan environment variable system.")
	}

	jwtExpHours, _ := strconv.Atoi(getEnv("JWT_EXPIRATION_HOURS", "24"))

	AppConfig = &Config{
		Port:           getEnv("PORT", "8080"),
		DBHost:         getEnv("DB_HOST", "localhost"),
		DBPort:         getEnv("DB_PORT", "5432"),
		DBUser:         getEnv("DB_USER", "postgres"),
		DBPassword:     getEnv("DB_PASSWORD", ""),
		DBName:         getEnv("DB_NAME", "peer_counseling"),
		DBSSLMode:      getEnv("DB_SSLMODE", "disable"),
		IAMClientID:     getEnv("IAM_CLIENT_ID", "konseling"),
		IAMClientSecret: getRequiredEnv("IAM_CLIENT_SECRET"),
		IAMRedirectURI:  getEnv("IAM_REDIRECT_URI", "http://localhost:8080/api/auth/callback"),
		IAMURLAuthorize: getEnv("IAM_URL_AUTHORIZE", "https://iam.ub.ac.id/auth/realms/ub/protocol/openid-connect/auth"),
		IAMURLToken:     getEnv("IAM_URL_ACCESS_TOKEN", "https://iam.ub.ac.id/auth/realms/ub/protocol/openid-connect/token"),
		IAMURLUserInfo:  getEnv("IAM_URL_USERINFO", "https://iam.ub.ac.id/auth/realms/ub/protocol/openid-connect/userinfo"),
		JWTSecret:       getRequiredEnv("JWT_SECRET"),
		JWTExpHours:     jwtExpHours,
		Env:             getEnv("APP_ENV", "production"), // Default to production for safety
		MinioEndpoint:   getEnv("MINIO_ENDPOINT", "localhost:9000"),
		MinioAccessKey:  getEnv("MINIO_ACCESS_KEY", "minioadmin"),
		MinioSecretKey:  getEnv("MINIO_SECRET_KEY", "minioadmin"),
		MinioBucketName: getEnv("MINIO_BUCKET_NAME", "counseling-attachments"),
		MinioUseSSL:     getEnv("MINIO_USE_SSL", "false") == "true",
		FrontendURL:     getEnv("FRONTEND_URL", "http://localhost:3000"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getRequiredEnv(key string) string {
	value, exists := os.LookupEnv(key)
	if !exists || value == "" {
		log.Fatalf("FATAL CONFIG ERROR: Environment variable '%s' is required but not set.", key)
	}
	return value
}
