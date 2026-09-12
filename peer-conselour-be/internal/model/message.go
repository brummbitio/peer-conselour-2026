package model

import (
	"time"
)

type SenderRole string

const (
	SenderMahasiswa SenderRole = "mahasiswa"
	SenderAdmin     SenderRole = "admin"
)

type TicketMessage struct {
	ID         uint       `gorm:"primaryKey;autoIncrement" json:"id"`
	TicketID   uint       `gorm:"not null" json:"ticket_id"`
	Ticket     Ticket     `gorm:"foreignKey:TicketID" json:"-"`
	SenderID   uint       `gorm:"not null" json:"sender_id"`
	Sender     User       `gorm:"foreignKey:SenderID" json:"sender,omitempty"`
	SenderRole SenderRole `gorm:"type:message_sender;not null" json:"sender_role"`
	SenderName string     `gorm:"size:255;not null" json:"sender_name"`
	Body       string       `gorm:"type:text;not null" json:"body"`
	CreatedAt  time.Time    `gorm:"not null" json:"created_at"`
	EditedAt   *time.Time   `gorm:"default:null" json:"edited_at"`
	Attachments []Attachment `gorm:"foreignKey:MessageID" json:"attachments,omitempty"`
}

func (TicketMessage) TableName() string {
	return "ticket_messages"
}
