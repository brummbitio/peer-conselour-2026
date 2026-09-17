package model

import (
	"time"

	"gorm.io/gorm"
)

type RekamanKonseling struct {
	ID               uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	ClientNIM        string         `gorm:"size:50;not null;index" json:"client_nim"`
	ClientName       string         `gorm:"size:255;not null" json:"client_name"`
	CounselorEmail   string         `gorm:"size:255;not null;index" json:"counselor_email"`
	SessionNumber    int            `gorm:"default:1;not null" json:"session_number"`
	SessionDate      time.Time      `gorm:"type:date;not null" json:"session_date"`
	DurationMinutes  int            `gorm:"default:60" json:"duration_minutes"`
	ObservationNotes string         `gorm:"type:text;not null" json:"observation_notes"`
	InterventionPlan string         `gorm:"type:text" json:"intervention_plan"`
	Status           string         `gorm:"size:50;default:'Konseling Berjalan'" json:"status"`
	CreatedAt        time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"created_at"`
	UpdatedAt        time.Time      `gorm:"not null;default:CURRENT_TIMESTAMP" json:"updated_at"`
	DeletedAt        gorm.DeletedAt `gorm:"index" json:"-"`
}

func (RekamanKonseling) TableName() string {
	return "rekaman_konseling"
}