package handler

import (
	"net/http"
	"strconv"
	"time"

	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/repository"

	"github.com/gin-gonic/gin"
)

type ScheduleHandler struct {
	scheduleRepo *repository.ScheduleRepository
}

func NewScheduleHandler(scheduleRepo *repository.ScheduleRepository) *ScheduleHandler {
	return &ScheduleHandler{scheduleRepo: scheduleRepo}
}

type CreateScheduleRequest struct {
	TicketID    *uint   `json:"ticket_id"`
	ClientName  string  `json:"client_name" binding:"required"`
	DateValue   string  `json:"date_value" binding:"required"`   // format: "YYYY-MM-DD"
	TimeValue   string  `json:"time_value" binding:"required"`   // contoh: "09:00"
	HandlerID   uint    `json:"handler_id" binding:"required"`   // Peer counselor yang ditugaskan
	ServiceType string  `json:"service_type" binding:"required"` // "tatap_muka" atau "online"
}

// CreateSchedule membuat jadwal konseling baru
func (h *ScheduleHandler) CreateSchedule(c *gin.Context) {
	var req CreateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	// Parse date string
	parsedDate, err := time.Parse("2006-01-02", req.DateValue)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal harus YYYY-MM-DD"})
		return
	}

	schedule := &model.CounselingSchedule{
		TicketID:    req.TicketID,
		ClientName:  req.ClientName,
		DateValue:   parsedDate,
		TimeValue:   req.TimeValue,
		HandlerID:   &req.HandlerID,
		ServiceType: model.ServiceType(req.ServiceType),
		Status:      model.SchedulePending, // Default: Menunggu konfirmasi klien
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	err = h.scheduleRepo.Create(schedule)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat jadwal konseling"})
		return
	}

	c.JSON(http.StatusCreated, schedule)
}

// GetAllSchedules mengambil daftar jadwal konseling untuk kanban board atau kalender admin
func (h *ScheduleHandler) GetAllSchedules(c *gin.Context) {
	status := c.Query("status")

	var handlerID *uint
	if c.Query("handler_id") != "" {
		hId, _ := strconv.ParseUint(c.Query("handler_id"), 10, 32)
		uHId := uint(hId)
		handlerID = &uHId
	}

	schedules, err := h.scheduleRepo.FindAll(handlerID, status)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar jadwal"})
		return
	}

	c.JSON(http.StatusOK, schedules)
}

type UpdateScheduleRequest struct {
	Status      string `json:"status"`       // pending_confirmation, scheduled, reschedule, cancelled, completed
	DateValue   string `json:"date_value"`   // "YYYY-MM-DD"
	TimeValue   string `json:"time_value"`   // jam
	HandlerID   *uint  `json:"handler_id"`   // ganti konselor
	ServiceType string `json:"service_type"` // tatap_muka / online
}

// UpdateSchedule digunakan untuk update status (termasuk drag and drop kanban) atau reschedule tanggal/waktu
func (h *ScheduleHandler) UpdateSchedule(c *gin.Context) {
	scheduleIDStr := c.Param("id")
	scheduleIDVal, err := strconv.ParseUint(scheduleIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID jadwal tidak valid"})
		return
	}
	scheduleID := uint(scheduleIDVal)

	var req UpdateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format request tidak valid"})
		return
	}

	schedule, err := h.scheduleRepo.FindByID(scheduleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Jadwal tidak ditemukan"})
		return
	}

	// Update Status (Kanban drag and drop)
	if req.Status != "" {
		schedule.Status = model.ScheduleStatus(req.Status)
	}

	// Update Tanggal (Reschedule)
	if req.DateValue != "" {
		parsedDate, err := time.Parse("2006-01-02", req.DateValue)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Format tanggal reschedule harus YYYY-MM-DD"})
			return
		}
		schedule.DateValue = parsedDate
	}

	// Update Jam (Reschedule)
	if req.TimeValue != "" {
		schedule.TimeValue = req.TimeValue
	}

	// Ganti Konselor Penanggung Jawab
	if req.HandlerID != nil {
		schedule.HandlerID = req.HandlerID
	}

	// Ganti Tipe Layanan
	if req.ServiceType != "" {
		schedule.ServiceType = model.ServiceType(req.ServiceType)
	}

	schedule.UpdatedAt = time.Now()
	err = h.scheduleRepo.Update(schedule)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui jadwal konseling"})
		return
	}

	c.JSON(http.StatusOK, schedule)
}
