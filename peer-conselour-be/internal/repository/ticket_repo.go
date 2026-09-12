package repository

import (
	"time"

	"peer-conselour-be/internal/model"

	"gorm.io/gorm"
)

type TicketRepository struct {
	db *gorm.DB
}

func NewTicketRepository(db *gorm.DB) *TicketRepository {
	return &TicketRepository{db: db}
}

func (r *TicketRepository) FindByID(id uint) (*model.Ticket, error) {
	var ticket model.Ticket
	// Preload Student dan Counselor untuk detail profil lengkap
	err := r.db.Preload("Student").Preload("Counselor").First(&ticket, id).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *TicketRepository) FindAll(studentID *uint, counselorID *uint, status string, search string) ([]model.Ticket, error) {
	var tickets []model.Ticket
	query := r.db.Preload("Student").Preload("Counselor")

	if studentID != nil {
		query = query.Where("student_id = ?", *studentID)
	}

	if counselorID != nil {
		query = query.Where("counselor_id = ?", *counselorID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("title ILIKE ? OR category ILIKE ? OR code ILIKE ?", searchPattern, searchPattern, searchPattern)
	}

	// Tampilkan tiket terbaru di atas
	err := query.Order("created_at DESC").Find(&tickets).Error
	if err != nil {
		return nil, err
	}
	return tickets, nil
}

func (r *TicketRepository) Create(ticket *model.Ticket) error {
	return r.db.Create(ticket).Error
}

func (r *TicketRepository) Update(ticket *model.Ticket) error {
	return r.db.Save(ticket).Error
}

type CategoryCount struct {
	Category string `json:"category"`
	Count    int64  `json:"count"`
}

// TicketOutcomeCounts adalah isi 4 kartu statistik dashboard admin
type TicketOutcomeCounts struct {
	Waiting    int64
	InProgress int64
	Handled    int64
	Unhandled  int64
}

func (r *TicketRepository) GetDashboardStats() (map[string]interface{}, error) {
	var outcome TicketOutcomeCounts
	// Tiket resolved lama (resolution_type NULL) dihitung sebagai tertangani
	err := r.db.Model(&model.Ticket{}).Select(`
		COUNT(*) FILTER (WHERE status = 'open') AS waiting,
		COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
		COUNT(*) FILTER (WHERE status = 'resolved' AND (resolution_type != ? OR resolution_type IS NULL)) AS handled,
		COUNT(*) FILTER (WHERE status = 'resolved' AND resolution_type = ?) AS unhandled`,
		model.ResolutionTidakTertangani, model.ResolutionTidakTertangani,
	).Scan(&outcome).Error
	if err != nil {
		return nil, err
	}

	var categoryCounts []CategoryCount
	err = r.db.Model(&model.Ticket{}).Select("category, count(*) as count").Group("category").Scan(&categoryCounts).Error
	if err != nil {
		return nil, err
	}

	// Format data agar mudah dibaca oleh frontend
	stats := map[string]interface{}{
		"waiting":         outcome.Waiting,
		"in_progress":     outcome.InProgress,
		"handled":         outcome.Handled,
		"unhandled":       outcome.Unhandled,
		"category_counts": categoryCounts,
		"topic_stats":     categoryCounts,
	}

	return stats, nil
}

// FindReminderCandidates mengambil tiket yang boleh dikirimi reminder: sudah dibalas
// konselor di web baru, belum dibalas mahasiswa, dan BUKAN hasil migrasi osTicket
// (disaring lewat tanggal dibuat sekaligus prefix kode tiket web baru).
func (r *TicketRepository) FindReminderCandidates(createdSince time.Time, codePrefix string, maxStep int) ([]model.Ticket, error) {
	var tickets []model.Ticket
	err := r.db.Preload("Student").
		Where("status = ?", model.StatusInProgress).
		Where("last_admin_reply_at IS NOT NULL").
		Where("created_at >= ?", createdSince).
		Where("code LIKE ?", codePrefix+"%").
		Where("reminder_step < ?", maxStep).
		Order("id ASC").
		Find(&tickets).Error
	return tickets, err
}

// ClaimReminderStep menaikkan reminder_step secara atomik (compare-and-set).
// Mengembalikan false bila tiket sudah berubah sejak dibaca worker.
func (r *TicketRepository) ClaimReminderStep(ticketID uint, fromStep int, at time.Time) (bool, error) {
	result := r.db.Model(&model.Ticket{}).
		Where("id = ? AND status = ? AND reminder_step = ?", ticketID, model.StatusInProgress, fromStep).
		UpdateColumns(map[string]interface{}{
			"reminder_step":    fromStep + 1,
			"last_reminder_at": at,
		})
	return result.RowsAffected == 1, result.Error
}

// ReleaseReminderStep membatalkan klaim ketika email gagal terkirim, selama
// step belum diubah oleh proses lain (misalnya direset karena mahasiswa membalas).
func (r *TicketRepository) ReleaseReminderStep(ticketID uint, claimedStep int, previousReminderAt *time.Time) error {
	var previous interface{}
	if previousReminderAt != nil {
		previous = *previousReminderAt
	}
	return r.db.Model(&model.Ticket{}).
		Where("id = ? AND reminder_step = ?", ticketID, claimedStep).
		UpdateColumns(map[string]interface{}{
			"reminder_step":    claimedStep - 1,
			"last_reminder_at": previous,
		}).Error
}
