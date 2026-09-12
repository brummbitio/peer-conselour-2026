package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Whitelist origin spesifik demi keamanan
		allowedOrigins := map[string]bool{
			"http://localhost:3000":          true,
			"http://localhost:8080":          true,
			"http://127.0.0.1:3000":          true,
			"http://127.0.0.1:8080":          true,
			"http://localhost":               true,
			"http://127.0.0.1":               true,
			"https://dev-konseling.ub.ac.id": true,
			"https://konseling.ub.ac.id":     true,
		}
		origin := c.GetHeader("Origin")
		if allowedOrigins[origin] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		} else if origin != "" && (origin == "null" || origin == "http://localhost" || origin == "http://127.0.0.1") {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}
		
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
