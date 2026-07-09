package model

import (
	"time"
)

type TicketStatus string

const (
	StatusOpen       TicketStatus = "open"
	StatusInProgress TicketStatus = "in_progress"
	StatusResolved   TicketStatus = "resolved"
)

type Ticket struct {
	ID             uint         `gorm:"primaryKey;autoIncrement" json:"id"`
	Code           string       `gorm:"size:50;unique;not null" json:"code"`
	StudentID      uint         `gorm:"not null" json:"student_id"`
	Student        User         `gorm:"foreignKey:StudentID" json:"student,omitempty"`
	ServiceType    string       `gorm:"size:50;default:'online';not null" json:"service_type"`
	CounselorID    *uint        `json:"counselor_id"`
	Counselor      *User        `gorm:"foreignKey:CounselorID" json:"counselor,omitempty"`
	Title          string       `gorm:"size:255;not null" json:"title"`
	Category       string       `gorm:"size:100;not null" json:"category"`
	Status         TicketStatus `gorm:"type:ticket_status;default:'open';not null" json:"status"`
	TahapKonseling *string      `gorm:"size:50" json:"tahap_konseling"`
	Summary        *string      `gorm:"type:text" json:"summary"`
	CreatedAt      time.Time    `gorm:"not null" json:"created_at"`
	UpdatedAt      time.Time    `gorm:"not null" json:"updated_at"`
	ClosedAt       *time.Time   `json:"closed_at"`
}

func (Ticket) TableName() string {
	return "tickets"
}
