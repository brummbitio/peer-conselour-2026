package repository

import (
	"peer-conselour-be/internal/model"

	"gorm.io/gorm"
)

type RekamanKonselingRepository interface {
	Create(record *model.RekamanKonseling) error
	FindByNIM(nim string) ([]model.RekamanKonseling, error)
	FindByID(id uint) (*model.RekamanKonseling, error)
	Update(record *model.RekamanKonseling) error
	Delete(id uint) error
	CountByNIM(nim string) (int64, error)
}

type rekamanKonselingRepository struct {
	db *gorm.DB
}

func NewRekamanKonselingRepository(db *gorm.DB) RekamanKonselingRepository {
	return &rekamanKonselingRepository{db: db}
}

func (r *rekamanKonselingRepository) Create(record *model.RekamanKonseling) error {
	return r.db.Create(record).Error
}

func (r *rekamanKonselingRepository) FindByNIM(nim string) ([]model.RekamanKonseling, error) {
	var records []model.RekamanKonseling
	err := r.db.Where("client_nim = ?", nim).Order("session_number ASC").Find(&records).Error
	return records, err
}

func (r *rekamanKonselingRepository) FindByID(id uint) (*model.RekamanKonseling, error) {
	var record model.RekamanKonseling
	err := r.db.First(&record, "id = ?", id).Error
	return &record, err
}

func (r *rekamanKonselingRepository) Update(record *model.RekamanKonseling) error {
	return r.db.Save(record).Error
}

func (r *rekamanKonselingRepository) Delete(id uint) error {
	return r.db.Delete(&model.RekamanKonseling{}, "id = ?", id).Error
}

func (r *rekamanKonselingRepository) CountByNIM(nim string) (int64, error) {
	var count int64
	err := r.db.Model(&model.RekamanKonseling{}).Where("client_nim = ?", nim).Count(&count).Error
	return count, err
}