package middleware

import (
	"net/http"
	"strings"

	"peer-conselour-be/pkg/jwt"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header diperlukan"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Format Authorization header harus Bearer <token>"})
			c.Abort()
			return
		}

		tokenString := parts[1]
		claims, err := jwt.ValidateToken(tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token tidak valid atau kedaluwarsa"})
			c.Abort()
			return
		}

		// Simpan data user ke context Gin agar bisa dibaca di handler berikutnya
		c.Set("userID", claims.UserID)
		c.Set("role", claims.Role)

		c.Next()
	}
}

// AdminOnly membatasi endpoint hanya untuk role admin atau superadmin
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || (role != "admin" && role != "superadmin") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Hanya untuk admin/staff"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// SuperAdminOnly membatasi endpoint hanya untuk role superadmin
func SuperAdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role != "superadmin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Hanya untuk superadmin"})
			c.Abort()
			return
		}
		c.Next()
	}
}
