package handler

import (
	"fmt"
	"math/rand"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"

	"context"
	"peer-conselour-be/config"
	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/notification"
	"peer-conselour-be/internal/repository"
	"peer-conselour-be/pkg/email"
	"peer-conselour-be/pkg/storage"

	"github.com/gin-gonic/gin"
)

type TicketHandler struct {
	ticketRepo  *repository.TicketRepository
	messageRepo *repository.MessageRepository
	userRepo    *repository.UserRepository
	notifier    *notification.TicketNotifier
}

func NewTicketHandler(
	ticketRepo *repository.TicketRepository,
	messageRepo *repository.MessageRepository,
	userRepo *repository.UserRepository,
	notifier *notification.TicketNotifier,
) *TicketHandler {
	return &TicketHandler{
		ticketRepo:  ticketRepo,
		messageRepo: messageRepo,
		userRepo:    userRepo,
		notifier:    notifier,
	}
}

type CreateTicketRequest struct {
	Title              string `json:"title" binding:"required"`
	Category           string `json:"category" binding:"required"`
	TahapKonseling     string `json:"tahap_konseling" binding:"required"` // "Pertama" atau "Lanjutan"
	ServiceType        string `json:"service_type" binding:"required"`
	Detail             string `json:"detail" binding:"required"`
	HasPsychologistExp *bool  `json:"has_psychologist_exp"` // Optional; nil when the client omits it
	AttachmentIDs      []uint `json:"attachment_ids"`
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
	code := fmt.Sprintf("%s%s-%03d", model.TicketCodePrefix, time.Now().Format("060102"), rand.Intn(1000))

	ticket := &model.Ticket{
		Code:               code,
		StudentID:          studentID,
		ServiceType:        req.ServiceType,
		Title:              req.Title,
		Category:           req.Category,
		Status:             model.StatusOpen,
		TahapKonseling:     &req.TahapKonseling,
		HasPsychologistExp: req.HasPsychologistExp,
		CreatedAt:          time.Now(),
		UpdatedAt:          time.Now(),
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
		var count int64
		config.DB.Model(&model.Attachment{}).
			Where("id IN ? AND uploader_id = ?", req.AttachmentIDs, studentID).
			Count(&count)
		if count != int64(len(req.AttachmentIDs)) {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda tidak memiliki hak akses atas file lampiran yang dikirim"})
			return
		}

		config.DB.Model(&model.Attachment{}).
			Where("id IN ?", req.AttachmentIDs).
			Updates(map[string]interface{}{
				"message_id": firstMessage.ID,
				"ticket_id":  ticket.ID,
			})
	}

	// EMAIL 1: tanda terima pengajuan. Salinan dipakai supaya response JSON tidak ikut memuat profil.
	notifyTicket := *ticket
	notifyTicket.Student = *sender
	h.notifier.SendAsync(email.KindTicketCreated, &notifyTicket)

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

	for i := range tickets {
		redactResolutionForStudent(&tickets[i])
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

	if role == "student" {
		redactResolutionForStudent(ticket)
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

	// Dicek sebelum pesan disimpan: EMAIL 2 hanya untuk balasan konselor yang pertama
	isFirstCounselorReply := false
	if senderRole == model.SenderAdmin {
		adminReplies, countErr := h.messageRepo.CountByTicketAndRole(ticketID, model.SenderAdmin)
		isFirstCounselorReply = countErr == nil && adminReplies == 0
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
		if role == "student" {
			var count int64
			config.DB.Model(&model.Attachment{}).
				Where("id IN ? AND uploader_id = ?", req.AttachmentIDs, userID).
				Count(&count)
			if count != int64(len(req.AttachmentIDs)) {
				c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda tidak memiliki hak akses atas file lampiran yang dikirim"})
				return
			}
		}

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
	now := time.Now()
	ticket.UpdatedAt = now
	// Ubah status secara otomatis:
	// 1. Jika dibalas oleh admin, ubah status dari open menjadi in_progress (Sudah Dibalas)
	// 2. Jika dibalas oleh mahasiswa, kembalikan status dari in_progress menjadi open (Menunggu Balasan)
	if senderRole == model.SenderAdmin {
		// Titik acuan reminder H+1..H+7 (hanya terisi dari balasan nyata di web baru)
		ticket.LastAdminReplyAt = &now
		if ticket.Status == model.StatusOpen {
			ticket.Status = model.StatusInProgress
		}
	} else if senderRole == model.SenderMahasiswa {
		// Balasan mahasiswa mematikan siklus reminder yang sedang berjalan
		ticket.LastStudentReplyAt = &now
		ticket.ReminderStep = 0
		if ticket.Status == model.StatusInProgress {
			ticket.Status = model.StatusOpen
		}
	}
	_ = h.ticketRepo.Update(ticket)

	if isFirstCounselorReply {
		h.notifier.SendAsync(email.KindFirstCounselorReply, ticket)
	}

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
	Status           string  `json:"status"`            // "open", "in_progress", "resolved"
	CounselorID      *uint   `json:"counselor_id"`      // Ditugaskan ke konselor baru
	Summary          *string `json:"summary"`           // Ringkasan hasil konseling
	ResolutionType   string  `json:"resolution_type"`   // Wajib saat status "resolved": "tertangani" | "tidak_tertangani"
	ResolutionReason string  `json:"resolution_reason"` // Wajib bila "tidak_tertangani"
	ResolutionNotes  string  `json:"resolution_notes"`  // Wajib bila alasan "lainnya"
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

	wasResolved := ticket.Status == model.StatusResolved

	// Update status
	if req.Status != "" {
		switch model.TicketStatus(req.Status) {
		case model.StatusResolved:
			resolution, errMsg := parseAdminResolution(req)
			if errMsg != "" {
				c.JSON(http.StatusBadRequest, gin.H{"error": errMsg})
				return
			}
			ticket.Status = model.StatusResolved
			ticket.ResolutionType = &resolution.Type
			ticket.ResolutionReason = resolution.Reason
			ticket.ResolutionNotes = resolution.Notes
			if !wasResolved || ticket.ClosedAt == nil {
				now := time.Now()
				ticket.ClosedAt = &now
			}
			// Tiket selesai menghentikan siklus reminder secara permanen
			ticket.ReminderStep = 0
		case model.StatusOpen, model.StatusInProgress:
			ticket.Status = model.TicketStatus(req.Status)
			ticket.ClosedAt = nil
			// Tiket dibuka kembali: hasil penanganan sebelumnya tidak berlaku lagi
			ticket.ResolutionType = nil
			ticket.ResolutionReason = nil
			ticket.ResolutionNotes = nil
			ticket.ReminderStep = 0
		default:
			c.JSON(http.StatusBadRequest, gin.H{"error": "Status tiket tidak valid"})
			return
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

	// EMAIL 7 hanya saat tiket berpindah menjadi selesai, bukan saat disimpan ulang
	if !wasResolved && ticket.Status == model.StatusResolved {
		h.notifier.SendAsync(email.KindSessionClosed, ticket)
	}

	c.JSON(http.StatusOK, ticket)
}

type ticketResolution struct {
	Type   string
	Reason *string
	Notes  *string
}

const maxResolutionNotesLength = 2000

// parseAdminResolution memvalidasi hasil penanganan dari modal "Selesaikan Sesi Konseling".
// Mengembalikan pesan error yang siap ditampilkan bila input tidak lengkap.
func parseAdminResolution(req AdminUpdateTicketRequest) (ticketResolution, string) {
	notes := strings.TrimSpace(req.ResolutionNotes)
	if utf8.RuneCountInString(notes) > maxResolutionNotesLength {
		return ticketResolution{}, fmt.Sprintf("Catatan admin maksimal %d karakter", maxResolutionNotesLength)
	}

	resolution := ticketResolution{Type: req.ResolutionType}
	if notes != "" {
		resolution.Notes = &notes
	}

	switch req.ResolutionType {
	case model.ResolutionTertangani:
		return resolution, ""
	case model.ResolutionTidakTertangani:
		switch req.ResolutionReason {
		case model.ReasonKlienTidakMembalas, model.ReasonKlienTidakDatang:
		case model.ReasonLainnya:
			if notes == "" {
				return ticketResolution{}, "Catatan penjelas wajib diisi untuk alasan Lainnya"
			}
		default:
			return ticketResolution{}, "Pilih alasan sesi tidak tertangani"
		}
		reason := req.ResolutionReason
		resolution.Reason = &reason
		return resolution, ""
	default:
		return ticketResolution{}, "Pilih hasil penanganan: Selesai Tertangani atau Selesai Tidak Tertangani"
	}
}

// redactResolutionForStudent menyembunyikan penilaian internal konselor (tertangani/tidak,
// alasan, catatan) dari response mahasiswa agar tidak menimbulkan rasa terhakimi.
func redactResolutionForStudent(ticket *model.Ticket) {
	ticket.ResolutionType = nil
	ticket.ResolutionReason = nil
	ticket.ResolutionNotes = nil
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

	// Tiket yang sudah ditutup admin tidak ditimpa hasil penanganannya
	if ticket.Status == model.StatusResolved {
		redactResolutionForStudent(ticket)
		c.JSON(http.StatusOK, ticket)
		return
	}

	resolutionType := model.ResolutionSelesaiMandiri
	ticket.Status = model.StatusResolved
	ticket.ResolutionType = &resolutionType
	ticket.ResolutionReason = nil
	ticket.ResolutionNotes = nil
	ticket.ReminderStep = 0
	now := time.Now()
	ticket.ClosedAt = &now
	ticket.UpdatedAt = now

	err = h.ticketRepo.Update(ticket)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyelesaikan tiket"})
		return
	}

	h.notifier.SendAsync(email.KindSessionClosed, ticket)

	redactResolutionForStudent(ticket)
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

type UpdateMessageRequest struct {
	Body string `json:"body" binding:"required"`
}

// resolveOwnedMessage memvalidasi parameter :id (tiket) dan :messageId, memastikan
// pesan berada pada tiket tersebut, sekaligus memastikan pesan tersebut milik user
// yang sedang login. Berlaku sama untuk mahasiswa maupun admin: siapapun hanya boleh
// mengubah/menghapus pesan yang dikirimnya sendiri.
func (h *TicketHandler) resolveOwnedMessage(c *gin.Context) (*model.TicketMessage, bool) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi tidak valid"})
		return nil, false
	}
	currentUserID := userIDVal.(uint)

	ticketIDVal, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID tiket tidak valid"})
		return nil, false
	}
	ticketID := uint(ticketIDVal)

	messageIDVal, err := strconv.ParseUint(c.Param("messageId"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID pesan tidak valid"})
		return nil, false
	}
	messageID := uint(messageIDVal)

	message, err := h.messageRepo.FindByID(messageID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pesan tidak ditemukan"})
		return nil, false
	}

	if message.TicketID != ticketID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Pesan tidak berada pada tiket ini"})
		return nil, false
	}

	if message.SenderID != currentUserID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Anda hanya dapat mengubah/menghapus pesan milik Anda sendiri"})
		return nil, false
	}

	return message, true
}

// UpdateMessage digunakan mahasiswa maupun admin untuk menyunting isi pesan miliknya sendiri
func (h *TicketHandler) UpdateMessage(c *gin.Context) {
	message, ok := h.resolveOwnedMessage(c)
	if !ok {
		return
	}

	var req UpdateMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Isi pesan tidak boleh kosong"})
		return
	}

	if strings.TrimSpace(req.Body) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Isi pesan tidak boleh kosong"})
		return
	}

	message.Body = req.Body
	// Tandai waktu penyuntingan agar frontend dapat menampilkan label "(diedit)"
	editedAt := time.Now()
	message.EditedAt = &editedAt
	if err := h.messageRepo.Update(message); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memperbarui pesan"})
		return
	}

	// Regenerasi presigned URL supaya lampiran pada response tetap dapat diakses frontend
	ctx := context.Background()
	for i := range message.Attachments {
		presignedURL, err := storage.GetPresignedURL(ctx, message.Attachments[i].MinioObject, 15*time.Minute)
		if err == nil {
			message.Attachments[i].URL = presignedURL
		}
	}

	c.JSON(http.StatusOK, message)
}

// DeleteMessage digunakan mahasiswa maupun admin untuk menghapus pesan miliknya sendiri
func (h *TicketHandler) DeleteMessage(c *gin.Context) {
	message, ok := h.resolveOwnedMessage(c)
	if !ok {
		return
	}

	// Pesan pertama berisi keluhan/cerita awal intake konseling sehingga wajib dipertahankan
	firstMessage, err := h.messageRepo.FindFirstByTicketID(message.TicketID)
	if err == nil && firstMessage.ID == message.ID {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Pesan pertama tiket tidak dapat dihapus untuk menjaga riwayat intake konseling.",
		})
		return
	}

	if err := h.messageRepo.Delete(message.ID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pesan"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pesan berhasil dihapus"})
}
