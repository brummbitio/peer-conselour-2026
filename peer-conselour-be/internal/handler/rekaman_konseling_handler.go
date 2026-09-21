package handler

import (
	"net/http"
	"strconv"
	"time"

	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/repository"

	"github.com/gin-gonic/gin"
)

type RekamanKonselingHandler struct {
	repo     repository.RekamanKonselingRepository
	userRepo *repository.UserRepository
}

func NewRekamanKonselingHandler(repo repository.RekamanKonselingRepository, userRepo *repository.UserRepository) *RekamanKonselingHandler {
	return &RekamanKonselingHandler{repo: repo, userRepo: userRepo}
}

type CreateRekamanDTO struct {
	ClientNIM        string `json:"client_nim" binding:"required"`
	ClientName       string `json:"client_name" binding:"required"`
	SessionDate      string `json:"session_date" binding:"required"`
	DurationMinutes  int    `json:"duration_minutes"`
	ObservationNotes string `json:"observation_notes" binding:"required"`
	InterventionPlan string `json:"intervention_plan"`
	Status           string `json:"status"`
}

type UpdateRekamanDTO struct {
	DurationMinutes  int    `json:"duration_minutes"`
	ObservationNotes string `json:"observation_notes"`
	InterventionPlan string `json:"intervention_plan"`
	Status           string `json:"status"`
}

func (h *RekamanKonselingHandler) Create(c *gin.Context) {
	var req CreateRekamanDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid: " + err.Error()})
		return
	}

	counselorEmail := "admin@ub.ac.id"
	if userIDVal, exists := c.Get("userID"); exists {
		var uid uint
		switch v := userIDVal.(type) {
		case uint:
			uid = v
		case int:
			uid = uint(v)
		case float64:
			uid = uint(v)
		}

		if uid > 0 {
			if u, err := h.userRepo.FindByID(uid); err == nil && u.Email != "" {
				counselorEmail = u.Email
			}
		}
	}

	parsedDate, err := time.Parse("2006-01-02", req.SessionDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}

	previousCount, _ := h.repo.CountByNIM(req.ClientNIM)
	sessionNumber := int(previousCount) + 1

	status := req.Status
	if status == "" {
		status = "Konseling Berjalan"
	}

	record := model.RekamanKonseling{
		ClientNIM:        req.ClientNIM,
		ClientName:       req.ClientName,
		CounselorEmail:   counselorEmail,
		SessionNumber:    sessionNumber,
		SessionDate:      parsedDate,
		DurationMinutes:  req.DurationMinutes,
		ObservationNotes: req.ObservationNotes,
		InterventionPlan: req.InterventionPlan,
		Status:           status,
	}

	if err := h.repo.Create(&record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan rekaman konseling"})
		return
	}

	c.JSON(http.StatusCreated, record)
}

func (h *RekamanKonselingHandler) GetByNIM(c *gin.Context) {
	nim := c.Query("nim")
	if nim == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query param nim wajib diisi"})
		return
	}

	records, err := h.repo.FindByNIM(nim)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil data rekaman"})
		return
	}

	c.JSON(http.StatusOK, records)
}

func (h *RekamanKonselingHandler) Update(c *gin.Context) {
	idVal, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	record, err := h.repo.FindByID(uint(idVal))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Data rekaman tidak ditemukan"})
		return
	}

	var req UpdateRekamanDTO
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.ObservationNotes != "" {
		record.ObservationNotes = req.ObservationNotes
	}
	if req.InterventionPlan != "" {
		record.InterventionPlan = req.InterventionPlan
	}
	if req.Status != "" {
		record.Status = req.Status
	}
	if req.DurationMinutes > 0 {
		record.DurationMinutes = req.DurationMinutes
	}

	if err := h.repo.Update(record); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui rekaman"})
		return
	}

	c.JSON(http.StatusOK, record)
}

func (h *RekamanKonselingHandler) Delete(c *gin.Context) {
	idVal, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tidak valid"})
		return
	}

	if err := h.repo.Delete(uint(idVal)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus rekaman"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Rekaman konseling berhasil dihapus"})
}
