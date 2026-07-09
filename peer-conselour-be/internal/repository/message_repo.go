package repository

import (
	"peer-conselour-be/internal/model"

	"gorm.io/gorm"
)

type MessageRepository struct {
	db *gorm.DB
}

func NewMessageRepository(db *gorm.DB) *MessageRepository {
	return &MessageRepository{db: db}
}

func (r *MessageRepository) FindAllByTicketID(ticketID uint) ([]model.TicketMessage, error) {
	var messages []model.TicketMessage
	// Mengambil semua chat di dalam tiket, terurut dari terlama ke terbaru (chronological)
	err := r.db.Preload("Sender").Preload("Attachments").Where("ticket_id = ?", ticketID).Order("created_at ASC").Find(&messages).Error
	if err != nil {
		return nil, err
	}
	return messages, nil
}

func (r *MessageRepository) Create(message *model.TicketMessage) error {
	return r.db.Create(message).Error
}
