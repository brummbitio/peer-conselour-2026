package repository

import (
	"peer-conselour-be/internal/model"

	"gorm.io/gorm"
)

type ScheduleRepository struct {
	db *gorm.DB
}

func NewScheduleRepository(db *gorm.DB) *ScheduleRepository {
	return &ScheduleRepository{db: db}
}

func (r *ScheduleRepository) FindByID(id uint) (*model.CounselingSchedule, error) {
	var schedule model.CounselingSchedule
	err := r.db.Preload("Ticket").Preload("Handler").First(&schedule, id).Error
	if err != nil {
		return nil, err
	}
	return &schedule, nil
}

func (r *ScheduleRepository) FindAll(handlerID *uint, status string) ([]model.CounselingSchedule, error) {
	var schedules []model.CounselingSchedule
	query := r.db.Preload("Ticket").Preload("Ticket.Student").Preload("Handler")

	if handlerID != nil {
		query = query.Where("handler_id = ?", *handlerID)
	}

	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Terurut berdasarkan tanggal konseling terdekat
	err := query.Order("date_value ASC, time_value ASC").Find(&schedules).Error
	if err != nil {
		return nil, err
	}
	return schedules, nil
}

func (r *ScheduleRepository) Create(schedule *model.CounselingSchedule) error {
	return r.db.Create(schedule).Error
}

func (r *ScheduleRepository) Update(schedule *model.CounselingSchedule) error {
	return r.db.Save(schedule).Error
}
