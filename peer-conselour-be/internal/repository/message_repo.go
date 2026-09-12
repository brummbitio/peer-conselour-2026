package repository

import (
	"peer-conselour-be/internal/model"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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

// FindByID mengambil satu pesan beserta relasi pengirim dan lampirannya
func (r *MessageRepository) FindByID(id uint) (*model.TicketMessage, error) {
	var message model.TicketMessage
	err := r.db.Preload("Sender").Preload("Attachments").First(&message, id).Error
	if err != nil {
		return nil, err
	}
	return &message, nil
}

// Update menyimpan perubahan pada kolom pesan tanpa menyentuh relasi (Sender/Attachments)
func (r *MessageRepository) Update(message *model.TicketMessage) error {
	return r.db.Omit(clause.Associations).Save(message).Error
}

// Delete menghapus pesan dari thread konseling.
// Lampiran dilepaskan dari pesan (message_id di-set NULL) terlebih dahulu supaya
// tidak melanggar foreign key constraint dan berkas fisik di object storage tetap aman.
func (r *MessageRepository) Delete(id uint) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&model.Attachment{}).
			Where("message_id = ?", id).
			Update("message_id", nil).Error; err != nil {
			return err
		}
		return tx.Delete(&model.TicketMessage{}, id).Error
	})
}

// CountByTicketAndRole menghitung jumlah pesan pada tiket dari peran pengirim tertentu
func (r *MessageRepository) CountByTicketAndRole(ticketID uint, role model.SenderRole) (int64, error) {
	var count int64
	err := r.db.Model(&model.TicketMessage{}).
		Where("ticket_id = ? AND sender_role = ?", ticketID, role).
		Count(&count).Error
	return count, err
}

// FindFirstByTicketID mengambil pesan tertua (pesan pembuka) pada sebuah tiket
func (r *MessageRepository) FindFirstByTicketID(ticketID uint) (*model.TicketMessage, error) {
	var message model.TicketMessage
	err := r.db.Where("ticket_id = ?", ticketID).
		Order("created_at ASC, id ASC").
		First(&message).Error
	if err != nil {
		return nil, err
	}
	return &message, nil
}
