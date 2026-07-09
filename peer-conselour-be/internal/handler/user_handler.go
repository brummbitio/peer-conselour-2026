package handler

import (
	"net/http"
	"strconv"
	"time"

	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/repository"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type UserHandler struct {
	userRepo   *repository.UserRepository
	ticketRepo *repository.TicketRepository
}

func NewUserHandler(userRepo *repository.UserRepository, ticketRepo *repository.TicketRepository) *UserHandler {
	return &UserHandler{
		userRepo:   userRepo,
		ticketRepo: ticketRepo,
	}
}

// AdminGetAllStudents mengambil daftar profil mahasiswa untuk tab kemahasiswaan
func (h *UserHandler) AdminGetAllStudents(c *gin.Context) {
	search := c.Query("search")

	students, err := h.userRepo.FindAllStudents(search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar mahasiswa"})
		return
	}

	c.JSON(http.StatusOK, students)
}

// AdminGetStudentDetail mengambil profil detail mahasiswa beserta riwayat tiket konselingnya
func (h *UserHandler) AdminGetStudentDetail(c *gin.Context) {
	studentIDStr := c.Param("id")
	studentIDVal, err := strconv.ParseUint(studentIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID mahasiswa tidak valid"})
		return
	}
	studentID := uint(studentIDVal)

	// Fetch detail profil
	student, err := h.userRepo.FindByID(studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Mahasiswa tidak ditemukan"})
		return
	}

	// Fetch riwayat tiket konseling milik mahasiswa tersebut
	tickets, err := h.ticketRepo.FindAll(&studentID, nil, "", "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil riwayat tiket"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"profile": student,
		"tickets": tickets,
	})
}

// AdminGetAllAdmins mengambil daftar admin/peer counselor
func (h *UserHandler) AdminGetAllAdmins(c *gin.Context) {
	search := c.Query("search")

	admins, err := h.userRepo.FindAllAdmins(search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar admin"})
		return
	}

	c.JSON(http.StatusOK, admins)
}

type CreateAdminRequest struct {
	Email    string `json:"email" binding:"required"`
	FullName string `json:"full_name" binding:"required"`
	Password string `json:"password" binding:"required"`
	Role     string `json:"role"` // "admin" atau "superadmin"
}

// AdminCreateAdmin membuat akun admin/staff baru (khusus superadmin)
func (h *UserHandler) AdminCreateAdmin(c *gin.Context) {
	var req CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengolah password"})
		return
	}
	passStr := string(hashedPassword)

	role := model.RoleAdmin
	if req.Role == string(model.RoleSuperAdmin) {
		role = model.RoleSuperAdmin
	}

	newAdmin := &model.User{
		Email:        req.Email,
		FullName:     req.FullName,
		PasswordHash: &passStr,
		Role:         role,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	err = h.userRepo.Create(newAdmin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat akun admin baru"})
		return
	}

	c.JSON(http.StatusCreated, newAdmin)
}

type UpdateAdminRequest struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Role     string `json:"role"` // "admin" atau "superadmin"
}

// AdminUpdateAdmin mengupdate profil admin/staff
func (h *UserHandler) AdminUpdateAdmin(c *gin.Context) {
	adminIDStr := c.Param("id")
	adminIDVal, err := strconv.ParseUint(adminIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID admin tidak valid"})
		return
	}
	adminID := uint(adminIDVal)

	var req UpdateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format request tidak valid"})
		return
	}

	admin, err := h.userRepo.FindByID(adminID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Admin tidak ditemukan"})
		return
	}

	if req.FullName != "" {
		admin.FullName = req.FullName
	}
	if req.Email != "" {
		admin.Email = req.Email
	}
	if req.Role != "" {
		admin.Role = model.UserRole(req.Role)
	}

	admin.UpdatedAt = time.Now()
	err = h.userRepo.Update(admin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengupdate profil admin"})
		return
	}

	c.JSON(http.StatusOK, admin)
}

type ResetPasswordRequest struct {
	Password string `json:"password" binding:"required"`
}

// AdminResetPassword mereset password akun lokal admin/staff (khusus superadmin)
func (h *UserHandler) AdminResetPassword(c *gin.Context) {
	adminIDStr := c.Param("id")
	adminIDVal, err := strconv.ParseUint(adminIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID admin tidak valid"})
		return
	}
	adminID := uint(adminIDVal)

	var req ResetPasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Password tidak boleh kosong"})
		return
	}

	admin, err := h.userRepo.FindByID(adminID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Admin tidak ditemukan"})
		return
	}

	// Hash password baru
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memproses password baru"})
		return
	}
	passStr := string(hashedPassword)
	admin.PasswordHash = &passStr
	admin.UpdatedAt = time.Now()

	err = h.userRepo.Update(admin)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mereset password"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password berhasil direset"})
}
