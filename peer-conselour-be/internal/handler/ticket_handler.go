package handler

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"

	"context"
	"peer-conselour-be/config"
	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/repository"
	"peer-conselour-be/pkg/storage"

	"github.com/gin-gonic/gin"
)

type TicketHandler struct {
	ticketRepo  *repository.TicketRepository
	messageRepo *repository.MessageRepository
	userRepo    *repository.UserRepository
}

func NewTicketHandler(
	ticketRepo *repository.TicketRepository,
	messageRepo *repository.MessageRepository,
	userRepo *repository.UserRepository,
) *TicketHandler {
	return &TicketHandler{
		ticketRepo:  ticketRepo,
		messageRepo: messageRepo,
		userRepo:    userRepo,
	}
}

type CreateTicketRequest struct {
	Title          string `json:"title" binding:"required"`
	Category       string `json:"category" binding:"required"`
	TahapKonseling string `json:"tahap_konseling" binding:"required"` // "Pertama" atau "Lanjutan"
	ServiceType    string `json:"service_type" binding:"required"`
	Detail         string `json:"detail" binding:"required"`
	AttachmentIDs  []uint `json:"attachment_ids"`
}

// CreateTicket digunakan oleh mahasiswa untuk memesan sesi konseling baru (intake)
func (h *TicketHandler) CreateTicket(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	studentID := userIDVal.(uint)

	var req CreateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	// Cek apakah mahasiswa memiliki tiket aktif (status open atau in_progress)
	var activeTicket model.Ticket
	activeCheckErr := config.DB.Where("student_id = ? AND status IN ?", studentID, []model.TicketStatus{model.StatusOpen, model.StatusInProgress}).First(&activeTicket).Error
	if activeCheckErr == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Kamu masih memiliki sesi konseling yang aktif dengan Nomor Tiket %s. Harap selesaikan sesi tersebut terlebih dahulu.", activeTicket.Code),
		})
		return
	}

	// Generate kode tiket unik: UB-CS-YYMMDD-XXX
	rand.Seed(time.Now().UnixNano())
	code := fmt.Sprintf("UB-CS-%s-%03d", time.Now().Format("060102"), rand.Intn(1000))

	ticket := &model.Ticket{
		Code:           code,
		StudentID:      studentID,
		ServiceType:    req.ServiceType,
		Title:          req.Title,
		Category:       req.Category,
		Status:         model.StatusOpen,
		TahapKonseling: &req.TahapKonseling,
		CreatedAt:      time.Now(),
		UpdatedAt:      time.Now(),
	}

	err := h.ticketRepo.Create(ticket)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat sesi konseling"})
		return
	}

	// Ambil profil pengirim untuk sender_name
	sender, err := h.userRepo.FindByID(studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengirim tidak ditemukan"})
		return
	}

	// Simpan detail cerita sebagai pesan pertama di dalam thread
	firstMessage := &model.TicketMessage{
		TicketID:   ticket.ID,
		SenderID:   studentID,
		SenderRole: model.SenderMahasiswa,
		SenderName: sender.FullName,
		Body:       req.Detail,
		CreatedAt:  time.Now(),
	}

	err = h.messageRepo.Create(firstMessage)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pesan detail konseling"})
		return
	}

	// Hubungkan berkas lampiran dengan pesan pertama & tiket
	if len(req.AttachmentIDs) > 0 {
		config.DB.Model(&model.Attachment{}).
			Where("id IN ?", req.AttachmentIDs).
			Updates(map[string]interface{}{
				"message_id": firstMessage.ID,
				"ticket_id":  ticket.ID,
			})
	}

	c.JSON(http.StatusCreated, ticket)
}

// GetMyTickets mengambil daftar tiket milik mahasiswa yang sedang login
func (h *TicketHandler) GetMyTickets(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	studentID := userIDVal.(uint)

	tickets, err := h.ticketRepo.FindAll(&studentID, nil, "", "")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar tiket"})
		return
	}

	c.JSON(http.StatusOK, tickets)
}

// GetTicketDetail mengambil detail tiket beserta chat di dalamnya
func (h *TicketHandler) GetTicketDetail(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uint)
	roleVal, _ := c.Get("role")
	role := roleVal.(string)

	ticketIDStr := c.Param("id")
	ticketIDVal, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tiket tidak valid"})
		return
	}
	ticketID := uint(ticketIDVal)

	// Fetch data tiket
	ticket, err := h.ticketRepo.FindByID(ticketID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tiket tidak ditemukan"})
		return
	}

	// Validasi Hak Akses: Mahasiswa hanya boleh melihat tiket miliknya sendiri
	if role == "student" && ticket.StudentID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda tidak memiliki hak akses untuk tiket ini"})
		return
	}

	// Fetch semua chat untuk tiket ini
	messages, err := h.messageRepo.FindAllByTicketID(ticketID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat riwayat percakapan"})
		return
	}

	// Generate Temporary Presigned GET URLs untuk setiap lampiran pesan
	ctx := context.Background()
	for i := range messages {
		for j := range messages[i].Attachments {
			objectName := messages[i].Attachments[j].MinioObject
			presignedURL, err := storage.GetPresignedURL(ctx, objectName, 15*time.Minute)
			if err == nil {
				messages[i].Attachments[j].URL = presignedURL
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"ticket":   ticket,
		"messages": messages,
	})
}

type ReplyRequest struct {
	Body          string `json:"body" binding:"required"`
	AttachmentIDs []uint `json:"attachment_ids"`
}

// ReplyTicket digunakan mahasiswa atau admin/counselor untuk saling membalas chat
func (h *TicketHandler) ReplyTicket(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	userID := userIDVal.(uint)
	roleVal, _ := c.Get("role")
	role := roleVal.(string)

	ticketIDStr := c.Param("id")
	ticketIDVal, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tiket tidak valid"})
		return
	}
	ticketID := uint(ticketIDVal)

	var req ReplyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Isi pesan tidak boleh kosong"})
		return
	}

	// Cek eksistensi tiket & validasi otorisasi
	ticket, err := h.ticketRepo.FindByID(ticketID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tiket tidak ditemukan"})
		return
	}

	if role == "student" && ticket.StudentID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda tidak memiliki hak akses untuk membalas tiket ini"})
		return
	}

	// Ambil profil pengirim untuk data sender_name
	sender, err := h.userRepo.FindByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pengirim tidak ditemukan"})
		return
	}

	senderRole := model.SenderMahasiswa
	isAdminRoute := strings.HasPrefix(c.FullPath(), "/api/admin")

	if isAdminRoute {
		senderRole = model.SenderAdmin
	} else {
		if userID == ticket.StudentID {
			senderRole = model.SenderMahasiswa
		} else if role == "admin" || role == "superadmin" {
			senderRole = model.SenderAdmin
		}
	}

	message := &model.TicketMessage{
		TicketID:   ticketID,
		SenderID:   userID,
		SenderRole: senderRole,
		SenderName: sender.FullName,
		Body:       req.Body,
		CreatedAt:  time.Now(),
	}

	err = h.messageRepo.Create(message)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirimkan pesan"})
		return
	}

	// Hubungkan berkas lampiran dengan pesan balasan & tiket
	if len(req.AttachmentIDs) > 0 {
		config.DB.Model(&model.Attachment{}).
			Where("id IN ?", req.AttachmentIDs).
			Updates(map[string]interface{}{
				"message_id": message.ID,
				"ticket_id":  ticketID,
			})
		// Muat ulang relasi lampiran di response JSON
		config.DB.Where("message_id = ?", message.ID).Find(&message.Attachments)
		// Generate presigned URL untuk response instan
		ctx := context.Background()
		for j := range message.Attachments {
			objectName := message.Attachments[j].MinioObject
			presignedURL, err := storage.GetPresignedURL(ctx, objectName, 15*time.Minute)
			if err == nil {
				message.Attachments[j].URL = presignedURL
			}
		}
	}

	// Update timestamp update terakhir tiket
	ticket.UpdatedAt = time.Now()
	// Ubah status secara otomatis:
	// 1. Jika dibalas oleh admin, ubah status dari open menjadi in_progress (Sudah Dibalas)
	// 2. Jika dibalas oleh mahasiswa, kembalikan status dari in_progress menjadi open (Menunggu Balasan)
	if senderRole == model.SenderAdmin {
		if ticket.Status == model.StatusOpen {
			ticket.Status = model.StatusInProgress
		}
	} else if senderRole == model.SenderMahasiswa {
		if ticket.Status == model.StatusInProgress {
			ticket.Status = model.StatusOpen
		}
	}
	_ = h.ticketRepo.Update(ticket)

	c.JSON(http.StatusCreated, message)
}

// AdminGetAllTickets mengambil semua tiket konseling (khusus untuk admin/staff dashboard)
func (h *TicketHandler) AdminGetAllTickets(c *gin.Context) {
	status := c.Query("status")
	search := c.Query("search")

	var counselorID *uint
	if c.Query("counselor_id") != "" {
		cId, _ := strconv.ParseUint(c.Query("counselor_id"), 10, 32)
		uCId := uint(cId)
		counselorID = &uCId
	}

	var studentID *uint
	if c.Query("student_id") != "" {
		sId, _ := strconv.ParseUint(c.Query("student_id"), 10, 32)
		uSId := uint(sId)
		studentID = &uSId
	}

	tickets, err := h.ticketRepo.FindAll(studentID, counselorID, status, search)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar tiket"})
		return
	}

	c.JSON(http.StatusOK, tickets)
}

type AdminUpdateTicketRequest struct {
	Status      string  `json:"status"`       // "open", "in_progress", "resolved"
	CounselorID *uint   `json:"counselor_id"` // Ditugaskan ke konselor baru
	Summary     *string `json:"summary"`      // Ringkasan hasil konseling
}

// AdminUpdateTicket digunakan oleh admin/staff untuk mengatur status, merujuk konselor, atau menulis ringkasan
func (h *TicketHandler) AdminUpdateTicket(c *gin.Context) {
	ticketIDStr := c.Param("id")
	ticketIDVal, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tiket tidak valid"})
		return
	}
	ticketID := uint(ticketIDVal)

	var req AdminUpdateTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Format data tidak valid"})
		return
	}

	ticket, err := h.ticketRepo.FindByID(ticketID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tiket tidak ditemukan"})
		return
	}

	// Update status
	if req.Status != "" {
		ticket.Status = model.TicketStatus(req.Status)
		if req.Status == string(model.StatusResolved) {
			now := time.Now()
			ticket.ClosedAt = &now
		} else {
			ticket.ClosedAt = nil
		}
	}

	// Update Counselor/Penanggung Jawab
	if req.CounselorID != nil {
		ticket.CounselorID = req.CounselorID
	}

	// Update Ringkasan Kasus
	if req.Summary != nil {
		ticket.Summary = req.Summary
	}

	ticket.UpdatedAt = time.Now()
	err = h.ticketRepo.Update(ticket)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui tiket"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// StudentResolveTicket digunakan mahasiswa untuk menyelesaikan/menutup tiket mereka sendiri
func (h *TicketHandler) StudentResolveTicket(c *gin.Context) {
	userIDVal, _ := c.Get("userID")
	studentID := userIDVal.(uint)

	ticketIDStr := c.Param("id")
	ticketIDVal, err := strconv.ParseUint(ticketIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tiket tidak valid"})
		return
	}
	ticketID := uint(ticketIDVal)

	ticket, err := h.ticketRepo.FindByID(ticketID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Tiket tidak ditemukan"})
		return
	}

	if ticket.StudentID != studentID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda tidak berwenang atas tiket ini"})
		return
	}

	ticket.Status = model.StatusResolved
	now := time.Now()
	ticket.ClosedAt = &now
	ticket.UpdatedAt = now

	err = h.ticketRepo.Update(ticket)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyelesaikan tiket"})
		return
	}

	c.JSON(http.StatusOK, ticket)
}

// AdminGetStats mengambil ringkasan statistik tiket untuk dashboard admin
func (h *TicketHandler) AdminGetStats(c *gin.Context) {
	stats, err := h.ticketRepo.GetDashboardStats()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memuat statistik dashboard"})
		return
	}

	c.JSON(http.StatusOK, stats)
}
