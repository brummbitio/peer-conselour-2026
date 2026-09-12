package model

import (
	"strings"
	"time"
)

type TicketStatus string

const (
	StatusOpen       TicketStatus = "open"
	StatusInProgress TicketStatus = "in_progress"
	StatusResolved   TicketStatus = "resolved"
)

// Hasil penanganan tiket yang sudah selesai (kolom resolution_type).
// NULL pada tiket resolved lama dihitung sebagai tertangani.
const (
	ResolutionTertangani      = "tertangani"
	ResolutionTidakTertangani = "tidak_tertangani"
	ResolutionSelesaiMandiri  = "selesai_mandiri_mahasiswa"
	ReasonKlienTidakMembalas  = "klien_tidak_membalas"
	ReasonKlienTidakDatang    = "klien_tidak_datang"
	ReasonLainnya             = "lainnya"
)

// TicketCodePrefix menandai tiket yang dibuat di web baru (UB-CS-YYMMDD-XXX).
// Tiket hasil migrasi osTicket memakai nomor 6 digit (misal "004930").
const TicketCodePrefix = "UB-CS-"

// NewPlatformCutoff adalah batas awal tiket web baru. Beberapa tiket osTicket
// hasil migrasi juga dibuat pada 11 September 2026, sehingga batas tanggal saja
// tidak cukup; IsLegacy menggabungkannya dengan prefix kode tiket.
var NewPlatformCutoff = time.Date(2026, time.September, 11, 0, 0, 0, 0, time.FixedZone("WIB", 7*60*60))

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
	// Pointer so "not answered" (legacy tickets, NULL) stays distinct from an explicit false.
	HasPsychologistExp *bool      `gorm:"default:null" json:"has_psychologist_exp"`
	Summary            *string    `gorm:"type:text" json:"summary"`
	CreatedAt          time.Time  `gorm:"not null" json:"created_at"`
	UpdatedAt          time.Time  `gorm:"not null" json:"updated_at"`
	ClosedAt           *time.Time `json:"closed_at"`

	ResolutionType     *string    `gorm:"size:50;default:null" json:"resolution_type"`
	ResolutionReason   *string    `gorm:"size:100;default:null" json:"resolution_reason"`
	ResolutionNotes    *string    `gorm:"type:text;default:null" json:"resolution_notes"`
	LastAdminReplyAt   *time.Time `gorm:"default:null" json:"last_admin_reply_at"`
	LastStudentReplyAt *time.Time `gorm:"default:null" json:"last_student_reply_at"`
	ReminderStep       int        `gorm:"type:integer;default:0" json:"reminder_step"`
	LastReminderAt     *time.Time `gorm:"default:null" json:"last_reminder_at"`
}

func (Ticket) TableName() string {
	return "tickets"
}

// IsLegacy bernilai true untuk tiket hasil migrasi osTicket. Tiket seperti ini
// tidak boleh memicu email otomatis apa pun (reminder maupun notifikasi).
func (t *Ticket) IsLegacy() bool {
	return !strings.HasPrefix(t.Code, TicketCodePrefix) || t.CreatedAt.Before(NewPlatformCutoff)
}
