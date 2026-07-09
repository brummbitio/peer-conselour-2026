package repository

import (
	"peer-conselour-be/internal/model"

	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

func (r *UserRepository) FindByID(id uint) (*model.User, error) {
	var user model.User
	err := r.db.First(&user, id).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByNIM(nim string) (*model.User, error) {
	var user model.User
	err := r.db.Where("nim = ?", nim).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) FindByEmail(email string) (*model.User, error) {
	var user model.User
	err := r.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *UserRepository) Create(user *model.User) error {
	return r.db.Create(user).Error
}

func (r *UserRepository) Update(user *model.User) error {
	return r.db.Save(user).Error
}

func (r *UserRepository) FindAllStudents(search string) ([]model.User, error) {
	var students []model.User
	query := r.db.Where("role = 'student' OR id IN (SELECT DISTINCT student_id FROM tickets)")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("full_name ILIKE ? OR email ILIKE ? OR nim ILIKE ?", searchPattern, searchPattern, searchPattern)
	}
	err := query.Order("full_name ASC").Find(&students).Error
	if err != nil {
		return nil, err
	}
	return students, nil
}

func (r *UserRepository) FindAllAdmins(search string) ([]model.User, error) {
	var admins []model.User
	query := r.db.Where("role IN ('admin', 'superadmin')")
	if search != "" {
		searchPattern := "%" + search + "%"
		query = query.Where("full_name ILIKE ? OR email ILIKE ?", searchPattern, searchPattern)
	}
	err := query.Order("full_name ASC").Find(&admins).Error
	if err != nil {
		return nil, err
	}
	return admins, nil
}
