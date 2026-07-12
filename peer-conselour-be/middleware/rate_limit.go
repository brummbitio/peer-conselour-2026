package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

type IPRateLimiter struct {
	ips   map[string]*limiterInfo
	mu    sync.RWMutex
	rate  rate.Limit
	burst int
}

type limiterInfo struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func NewIPRateLimiter(r rate.Limit, b int) *IPRateLimiter {
	i := &IPRateLimiter{
		ips:   make(map[string]*limiterInfo),
		rate:  r,
		burst: b,
	}

	// Rutinitas pembersihan IP yang sudah lama tidak aktif (setiap 10 menit)
	go i.cleanupVisitor()

	return i
}

func (i *IPRateLimiter) getLimiter(ip string) *rate.Limiter {
	i.mu.Lock()
	defer i.mu.Unlock()

	v, exists := i.ips[ip]
	if !exists {
		limiter := rate.NewLimiter(i.rate, i.burst)
		i.ips[ip] = &limiterInfo{
			limiter:  limiter,
			lastSeen: time.Now(),
		}
		return limiter
	}

	v.lastSeen = time.Now()
	return v.limiter
}

func (i *IPRateLimiter) cleanupVisitor() {
	for {
		time.Sleep(10 * time.Minute)
		i.mu.Lock()
		for ip, v := range i.ips {
			if time.Since(v.lastSeen) > 20*time.Minute {
				delete(i.ips, ip)
			}
		}
		i.mu.Unlock()
	}
}

// RateLimitMiddleware membatasi jumlah request dari IP yang sama.
// r = jumlah request per detik, b = burst limit
func RateLimitMiddleware(r rate.Limit, b int) gin.HandlerFunc {
	limiter := NewIPRateLimiter(r, b)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		lim := limiter.getLimiter(ip)

		if !lim.Allow() {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "Terlalu banyak permintaan (Rate limit exceeded). Silakan coba beberapa saat lagi.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
