package model

import (
	"time"
)

type Attachment struct {
	ID          uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	MessageID   *uint     `gorm:"default:null" json:"message_id,omitempty"`
	TicketID    *uint     `gorm:"default:null" json:"ticket_id,omitempty"`
	FileName    string    `gorm:"size:255;not null" json:"file_name"`
	MinioObject string    `gorm:"size:255;not null" json:"-"` // Hidden in JSON for security
	MimeType    string    `gorm:"size:100;not null" json:"mime_type"`
	FileSize    int64     `gorm:"not null" json:"file_size"`
	CreatedAt   time.Time `gorm:"not null" json:"created_at"`
	URL         string    `gorm:"-" json:"url,omitempty"` // Temporary presigned GET URL generated dynamically
}

func (Attachment) TableName() string {
	return "attachments"
}
