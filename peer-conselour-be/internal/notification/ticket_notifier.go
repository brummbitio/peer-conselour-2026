// Package notification menjembatani data tiket dengan email transaksional.
package notification

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"peer-conselour-be/internal/model"
	"peer-conselour-be/pkg/email"
)

var (
	ErrLegacyTicket = errors.New("notifikasi: tiket hasil migrasi osTicket tidak dikirimi email otomatis")
	ErrNoRecipient  = errors.New("notifikasi: email mahasiswa pada tiket kosong")
)

var indonesianMonths = [...]string{
	"Januari", "Februari", "Maret", "April", "Mei", "Juni",
	"Juli", "Agustus", "September", "Oktober", "November", "Desember",
}

var wib = func() *time.Location {
	if loc, err := time.LoadLocation("Asia/Jakarta"); err == nil {
		return loc
	}
	return time.FixedZone("WIB", 7*60*60)
}()

type TicketNotifier struct {
	mailer      *email.Mailer
	linkBaseURL string
}

func NewTicketNotifier(mailer *email.Mailer, linkBaseURL string) *TicketNotifier {
	return &TicketNotifier{
		mailer:      mailer,
		linkBaseURL: strings.TrimRight(linkBaseURL, "/"),
	}
}

func (n *TicketNotifier) Enabled() bool {
	return n != nil && n.mailer.Enabled()
}

// Send mengirim email secara sinkron (dipakai worker agar tahu hasil pengiriman).
// Tiket Student harus sudah di-preload.
func (n *TicketNotifier) Send(kind email.Kind, ticket *model.Ticket) error {
	to, data, err := n.prepare(ticket)
	if err != nil {
		return err
	}
	if err := n.mailer.SendTicketEmail(kind, to, data); err != nil {
		return err
	}
	log.Printf("Email %s terkirim untuk tiket #%d", kind, ticket.ID)
	return nil
}

// SendAsync mengirim email di goroutine terpisah agar response HTTP tidak
// menunggu SMTP. Data tiket disalin lebih dulu sehingga aman walau handler
// masih memodifikasi struct tiket setelahnya.
func (n *TicketNotifier) SendAsync(kind email.Kind, ticket *model.Ticket) {
	to, data, err := n.prepare(ticket)
	if err != nil {
		log.Printf("[EMAIL] Email %s untuk tiket #%d dilewati: %v", kind, ticket.ID, err)
		return
	}

	ticketID := ticket.ID
	go func() {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("Panic saat mengirim email %s untuk tiket #%d: %v", kind, ticketID, r)
			}
		}()
		if err := n.mailer.SendTicketEmail(kind, to, data); err != nil {
			log.Printf("Gagal mengirim email %s untuk tiket #%d: %v", kind, ticketID, err)
			return
		}
		log.Printf("Email %s terkirim untuk tiket #%d", kind, ticketID)
	}()
}

func (n *TicketNotifier) prepare(ticket *model.Ticket) (string, email.TicketEmailData, error) {
	if !n.Enabled() {
		return "", email.TicketEmailData{}, email.ErrDisabled
	}
	if ticket.IsLegacy() {
		return "", email.TicketEmailData{}, ErrLegacyTicket
	}

	to := strings.TrimSpace(ticket.Student.Email)
	if to == "" {
		return "", email.TicketEmailData{}, ErrNoRecipient
	}

	name := strings.TrimSpace(ticket.Student.FullName)
	if name == "" {
		name = "Mahasiswa"
	}

	return to, email.TicketEmailData{
		StudentName: name,
		TicketCode:  ticket.Code,
		Topic:       ticket.Category,
		ServiceType: serviceTypeLabel(ticket.ServiceType),
		CreatedAt:   formatWIB(ticket.CreatedAt),
		TicketURL:   fmt.Sprintf("%s/tickets/%d", n.linkBaseURL, ticket.ID),
		HomeURL:     n.linkBaseURL,
		LogoURL:     n.linkBaseURL + "/branding/logo-konseling.png",
	}, nil
}

func serviceTypeLabel(serviceType string) string {
	if serviceType == "tatap_muka" {
		return "Tatap Muka"
	}
	return "Online"
}

func formatWIB(t time.Time) string {
	local := t.In(wib)
	return fmt.Sprintf("%d %s %d, %02d:%02d WIB",
		local.Day(), indonesianMonths[local.Month()-1], local.Year(), local.Hour(), local.Minute())
}
