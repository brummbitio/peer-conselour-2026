package handler

import (
	cryptoRand "crypto/rand"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"peer-conselour-be/config"
	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/repository"
	"peer-conselour-be/pkg/jwt"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	userRepo *repository.UserRepository
}

func NewAuthHandler(userRepo *repository.UserRepository) *AuthHandler {
	return &AuthHandler{userRepo: userRepo}
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Login menangani login lokal (alumni & admin) dengan email + password
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format request tidak valid"})
		return
	}

	// Cari user berdasarkan email
	user, err := h.userRepo.FindByEmail(req.Email)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	// Cek password hash
	if user.PasswordHash == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Akun ini didesain menggunakan SSO UB. Silakan login lewat tombol SSO UB."})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Email atau password salah"})
		return
	}

	// Generate JWT Token
	token, err := jwt.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat session"})
		return
	}

	// Set session cookie
	cookieDomain := ""
	if config.AppConfig.Env == "production" {
		cookieDomain = ".ub.ac.id"
	}
	c.SetCookie("token", token, 3600*config.AppConfig.JWTExpHours, "/", cookieDomain, true, true)

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user":  user,
	})
}

// Logout menghapus session cookie dari browser client
func (h *AuthHandler) Logout(c *gin.Context) {
	cookieDomain := ""
	if config.AppConfig.Env == "production" {
		cookieDomain = ".ub.ac.id"
	}
	// Set MaxAge ke -1 untuk menghapus cookie
	c.SetCookie("token", "", -1, "/", cookieDomain, true, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logout berhasil"})
}

// SSOLogin mengarahkan browser ke halaman login SSO IAM UB
func (h *AuthHandler) SSOLogin(c *gin.Context) {
	// Generate random state untuk mencegah CSRF
	stateBytes := make([]byte, 16)
	if _, err := cryptoRand.Read(stateBytes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai SSO login"})
		return
	}
	state := hex.EncodeToString(stateBytes)

	// Simpan state di secure cookie (berlaku 5 menit)
	c.SetCookie("oauth_state", state, 300, "/api/auth", "", true, true)

	authURL := fmt.Sprintf(
		"%s?client_id=%s&redirect_uri=%s&response_type=code&scope=openid+profile+email&state=%s",
		config.AppConfig.IAMURLAuthorize,
		url.QueryEscape(config.AppConfig.IAMClientID),
		url.QueryEscape(config.AppConfig.IAMRedirectURI),
		state,
	)

	c.Redirect(http.StatusFound, authURL)
}

type IAMTokenResponse struct {
	AccessToken string `json:"access_token"`
	IDToken     string `json:"id_token"`
	TokenType   string `json:"token_type"`
}

type IAMUserInfo struct {
	PreferredUsername string `json:"preferred_username"` // NIM mahasiswa / NIP staff
	Name              string `json:"name"`
	GivenName         string `json:"given_name"`
	FamilyName        string `json:"family_name"`
	Email             string `json:"email"`
	Sub               string `json:"sub"`
	NoHP              string `json:"no_hp"`
	Alamat            string `json:"alamat"`
	Kelamin           string `json:"kelamin"`
	Fakultas          string `json:"fakultas"`
	Prodi             string `json:"prodi"`
}

// SSOCallback memproses data setelah login sukses dari IAM UB
func (h *AuthHandler) SSOCallback(c *gin.Context) {
	// Validasi state parameter untuk mencegah CSRF
	state := c.Query("state")
	cookieState, err := c.Cookie("oauth_state")
	if err != nil || state == "" || state != cookieState {
		c.JSON(http.StatusBadRequest, gin.H{"error": "State OAuth tidak valid atau telah kedaluwarsa"})
		return
	}

	// Bersihkan cookie state setelah digunakan
	c.SetCookie("oauth_state", "", -1, "/api/auth", "", true, true)

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization code tidak ditemukan"})
		return
	}

	// 1. Tukar Authorization Code dengan Access Token
	tokenData, err := h.exchangeCodeForToken(code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menukar token IAM UB"})
		return
	}

	// 2. Ambil profil user dari UserInfo IAM UB
	userInfo, err := h.getUserInfo(tokenData.AccessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil profil IAM UB"})
		return
	}

	// Resolve FullName dari given_name + family_name jika name kosong
	resolvedName := userInfo.Name
	if resolvedName == "" {
		if userInfo.GivenName != "" || userInfo.FamilyName != "" {
			resolvedName = strings.TrimSpace(userInfo.GivenName + " " + userInfo.FamilyName)
		}
	}
	if resolvedName == "" {
		resolvedName = "User SSO UB"
	}

	// 3. Pencocokan Ganda (Dual-Lookup): NIM -> Email
	var user *model.User
	nim := userInfo.PreferredUsername

	// Cek berdasarkan NIM dulu jika NIM valid (berisi angka)
	if nim != "" && !strings.Contains(nim, "@") {
		user, _ = h.userRepo.FindByNIM(nim)
	}

	// Cek berdasarkan Email jika NIM tidak ditemukan/tidak cocok
	if user == nil {
		user, _ = h.userRepo.FindByEmail(userInfo.Email)
	}

	// 4. Proses Pendaftaran Otomatis (Auto-Provisioning) jika user tidak ditemukan
	if user == nil {
		var gender string
		if userInfo.Kelamin == "L" {
			gender = "Laki-laki"
		} else if userInfo.Kelamin == "P" {
			gender = "Perempuan"
		}

		var address string
		if userInfo.Alamat != "-" {
			address = userInfo.Alamat
		}

		newUser := &model.User{
			NIM:        &nim,
			Email:      userInfo.Email,
			FullName:   resolvedName,
			Role:       model.RoleStudent, // Default role pendaftar SSO baru
			Gender:     &gender,
			Faculty:    &userInfo.Fakultas,
			Department: &userInfo.Prodi,
			Phone:      &userInfo.NoHP,
			Address:    &address,
			CreatedAt:  time.Now(),
			UpdatedAt:  time.Now(),
		}
		// Buatkan password random agar akun lokal tidak bisa diakses sembarangan
		randomPass, _ := bcrypt.GenerateFromPassword([]byte(time.Now().String()), bcrypt.DefaultCost)
		passStr := string(randomPass)
		newUser.PasswordHash = &passStr

		err = h.userRepo.Create(newUser)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan akun mahasiswa baru"})
			return
		}
		user = newUser
	} else {
		// Update details secara paksa agar selalu sinkron dengan data resmi IAM UB (Source of Truth)
		updated := false
		if (user.NIM == nil || *user.NIM != nim) && nim != "" && !strings.Contains(nim, "@") {
			user.NIM = &nim
			updated = true
		}
		if user.FullName != resolvedName && resolvedName != "" {
			user.FullName = resolvedName
			updated = true
		}
		if user.Email != userInfo.Email && userInfo.Email != "" {
			user.Email = userInfo.Email
			updated = true
		}
		if userInfo.Kelamin != "" {
			var gender string
			if userInfo.Kelamin == "L" {
				gender = "Laki-laki"
			} else if userInfo.Kelamin == "P" {
				gender = "Perempuan"
			}
			if gender != "" && (user.Gender == nil || *user.Gender != gender) {
				user.Gender = &gender
				updated = true
			}
		}
		if userInfo.Fakultas != "" && (user.Faculty == nil || *user.Faculty != userInfo.Fakultas) {
			user.Faculty = &userInfo.Fakultas
			updated = true
		}
		if userInfo.Prodi != "" && (user.Department == nil || *user.Department != userInfo.Prodi) {
			user.Department = &userInfo.Prodi
			updated = true
		}
		if userInfo.NoHP != "" && (user.Phone == nil || *user.Phone != userInfo.NoHP) {
			user.Phone = &userInfo.NoHP
			updated = true
		}
		if userInfo.Alamat != "" && userInfo.Alamat != "-" && (user.Address == nil || *user.Address != userInfo.Alamat) {
			user.Address = &userInfo.Alamat
			updated = true
		}
		if updated {
			errUpdate := h.userRepo.Update(user)
			if errUpdate != nil {
				// Don't print private DB error details to standard output, log generic sync failure
				log.Println("Sinkronisasi data user gagal")
			}
		}
	}

	// 5. Generate JWT Token Internal Kita
	token, err := jwt.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat session internal"})
		return
	}

	// Set session cookie
	cookieDomain := ""
	if config.AppConfig.Env == "production" {
		cookieDomain = ".ub.ac.id"
	}
	c.SetCookie("token", token, 3600*config.AppConfig.JWTExpHours, "/", cookieDomain, true, true)

	// 6. Redirect kembali ke Frontend (Next.js) tanpa memaparkan token di URL
	frontendRedirectURL := fmt.Sprintf("%s/?sso=success", config.AppConfig.FrontendURL)
	c.Redirect(http.StatusFound, frontendRedirectURL)
}

func (h *AuthHandler) exchangeCodeForToken(code string) (*IAMTokenResponse, error) {
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", config.AppConfig.IAMRedirectURI)
	data.Set("client_id", config.AppConfig.IAMClientID)
	data.Set("client_secret", config.AppConfig.IAMClientSecret)

	req, err := http.NewRequest("POST", config.AppConfig.IAMURLToken, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("server IAM UB merespons status %d", resp.StatusCode)
	}

	var tokenResponse IAMTokenResponse
	if err := json.Unmarshal(bodyBytes, &tokenResponse); err != nil {
		return nil, err
	}

	return &tokenResponse, nil
}

func (h *AuthHandler) getUserInfo(accessToken string) (*IAMUserInfo, error) {
	req, err := http.NewRequest("GET", config.AppConfig.IAMURLUserInfo, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("server IAM UB merespons status %d", resp.StatusCode)
	}

	var userInfo IAMUserInfo
	if err := json.Unmarshal(bodyBytes, &userInfo); err != nil {
		return nil, err
	}

	return &userInfo, nil
}

// GetMe mengambil informasi akun pengguna yang sedang login berdasarkan token JWT
func (h *AuthHandler) GetMe(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak ditemukan"})
		return
	}

	user, err := h.userRepo.FindByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	c.JSON(http.StatusOK, user)
}

type UpdateProfileRequest struct {
	FullName   string `json:"full_name"`
	Gender     string `json:"gender"`
	Faculty    string `json:"faculty"`
	Department string `json:"department"`
	Phone      string `json:"phone"`
}

// UpdateProfile mengupdate data profil pengguna yang sedang login
func (h *AuthHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak ditemukan"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format request tidak valid"})
		return
	}

	user, err := h.userRepo.FindByID(userID.(uint))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan"})
		return
	}

	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Gender != "" {
		user.Gender = &req.Gender
	}
	if req.Faculty != "" {
		user.Faculty = &req.Faculty
	}
	if req.Department != "" {
		user.Department = &req.Department
	}
	if req.Phone != "" {
		user.Phone = &req.Phone
	}

	user.UpdatedAt = time.Now()
	err = h.userRepo.Update(user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate profil"})
		return
	}

	c.JSON(http.StatusOK, user)
}

// DevLogin adalah endpoint khusus development untuk mem-bypass login SSO UB.
// Rute: GET /api/auth/dev-login?id=30
func (h *AuthHandler) DevLogin(c *gin.Context) {
	// Proteksi Keamanan: bypass ini HANYA boleh aktif di mode development!
	if config.AppConfig.Env != "development" {
		c.JSON(http.StatusForbidden, gin.H{"error": "Dev login hanya diizinkan di lingkungan lokal (development)"})
		return
	}

	idStr := c.Query("id")
	if idStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Parameter id wajib diisi"})
		return
	}

	userIDVal, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID user tidak valid"})
		return
	}
	userID := uint(userIDVal)

	// Cari user dari database
	user, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User tidak ditemukan di database"})
		return
	}

	// Generate JWT Token
	token, err := jwt.GenerateToken(user.ID, string(user.Role))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal men-generate token"})
		return
	}

	frontendRedirectURL := fmt.Sprintf("%s/?token=%s", config.AppConfig.FrontendURL, token)
	c.Redirect(http.StatusFound, frontendRedirectURL)
}
