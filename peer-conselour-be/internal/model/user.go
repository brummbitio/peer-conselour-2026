package model

import (
	"time"
)

type UserRole string

const (
	RoleStudent    UserRole = "student"
	RoleAdmin      UserRole = "admin"
	RoleSuperAdmin UserRole = "superadmin"
)

type User struct {
	ID            uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	NIM           *string   `gorm:"size:50;unique;index" json:"nim"`
	Email         string    `gorm:"size:255;unique;not null;index" json:"email"`
	PasswordHash  *string   `gorm:"size:255" json:"-"`
	FullName      string    `gorm:"size:255;not null" json:"full_name"`
	Role          UserRole  `gorm:"type:user_role;default:'student';not null" json:"role"`
	Gender        *string   `gorm:"size:20" json:"gender"`
	Faculty       *string   `gorm:"size:255" json:"faculty"`
	Department    *string   `gorm:"size:255" json:"department"`
	Phone         *string   `gorm:"size:50" json:"phone"`
	Address       *string   `gorm:"type:text" json:"address"`
	CreatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt     time.Time `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
}

func (User) TableName() string {
	return "users"
}
