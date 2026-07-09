package repository

import (
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

type StatusCount struct {
	Status string `json:"status"`
	Count  int64  `json:"count"`
}

func (r *TicketRepository) GetDashboardStats() (map[string]interface{}, error) {
	var statusCounts []StatusCount
	err := r.db.Model(&model.Ticket{}).Select("status, count(*) as count").Group("status").Scan(&statusCounts).Error
	if err != nil {
		return nil, err
	}

	var categoryCounts []CategoryCount
	err = r.db.Model(&model.Ticket{}).Select("category, count(*) as count").Group("category").Scan(&categoryCounts).Error
	if err != nil {
		return nil, err
	}

	var totalCount int64
	err = r.db.Model(&model.Ticket{}).Count(&totalCount).Error
	if err != nil {
		return nil, err
	}

	// Format data agar mudah dibaca oleh frontend
	stats := map[string]interface{}{
		"total_tickets":   totalCount,
		"status_counts":   statusCounts,
		"category_counts": categoryCounts,
	}

	return stats, nil
}
