// Package worker berisi proses latar belakang backend.
package worker

import (
	"context"
	"log"
	"time"

	"peer-conselour-be/internal/model"
	"peer-conselour-be/internal/notification"
	"peer-conselour-be/internal/repository"
	"peer-conselour-be/pkg/email"
)

const (
	reminderInterval = 30 * time.Minute
	day              = 24 * time.Hour

	// minReminderGap mencegah beberapa reminder terkirim beruntun dalam satu hari
	// ketika selisih sejak balasan konselor sudah melewati beberapa ambang sekaligus
	// (misalnya server sempat mati berhari-hari atau tiket dibuka kembali).
	// Jarak normal antar-reminder adalah 2 hari, sehingga alur normal tidak terpengaruh.
	minReminderGap = 1 * day
)

// reminderLadder: indeks = reminder_step saat ini. Setelah step 4 (H+7) worker
// berhenti dan tiket menunggu admin menutupnya secara manual.
var reminderLadder = []struct {
	after time.Duration
	kind  email.Kind
}{
	{after: 1 * day, kind: email.KindReminderH1},
	{after: 3 * day, kind: email.KindReminderH3},
	{after: 5 * day, kind: email.KindReminderH5},
	{after: 7 * day, kind: email.KindReminderH7},
}

// DueReminder menentukan reminder yang jatuh tempo untuk sebuah tiket.
func DueReminder(step int, lastAdminReplyAt time.Time, lastReminderAt *time.Time, now time.Time) (email.Kind, bool) {
	if step < 0 || step >= len(reminderLadder) {
		return "", false
	}
	if now.Sub(lastAdminReplyAt) < reminderLadder[step].after {
		return "", false
	}
	if lastReminderAt != nil && now.Sub(*lastReminderAt) < minReminderGap {
		return "", false
	}
	return reminderLadder[step].kind, true
}

type ReminderWorker struct {
	tickets  *repository.TicketRepository
	notifier *notification.TicketNotifier
	interval time.Duration
}

func NewReminderWorker(tickets *repository.TicketRepository, notifier *notification.TicketNotifier) *ReminderWorker {
	return &ReminderWorker{tickets: tickets, notifier: notifier, interval: reminderInterval}
}

// Start menjalankan worker sampai ctx dibatalkan. Bila email nonaktif, worker
// tidak berjalan sama sekali agar reminder_step tidak maju tanpa email terkirim.
func (w *ReminderWorker) Start(ctx context.Context) {
	if !w.notifier.Enabled() {
		log.Println("Reminder worker tidak dijalankan: EMAIL_ENABLED=false")
		return
	}

	log.Printf("Reminder worker aktif: interval %s, hanya tiket %s* yang dibuat sejak %s",
		w.interval, model.TicketCodePrefix, model.NewPlatformCutoff.Format(time.RFC3339))

	w.RunOnce()
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			w.RunOnce()
		}
	}
}

func (w *ReminderWorker) RunOnce() {
	now := time.Now()
	candidates, err := w.tickets.FindReminderCandidates(model.NewPlatformCutoff, model.TicketCodePrefix, len(reminderLadder))
	if err != nil {
		log.Printf("Reminder worker: gagal mengambil tiket kandidat: %v", err)
		return
	}

	sent := 0
	for i := range candidates {
		ticket := &candidates[i]
		// Lapis pengaman kedua di luar filter SQL: tiket migrasi osTicket tidak pernah diproses.
		if ticket.IsLegacy() || ticket.LastAdminReplyAt == nil {
			continue
		}

		kind, due := DueReminder(ticket.ReminderStep, *ticket.LastAdminReplyAt, ticket.LastReminderAt, now)
		if !due {
			continue
		}

		// Klaim step lebih dulu (compare-and-set) agar tidak ada email ganda bila
		// tiket berubah bersamaan, misalnya mahasiswa membalas saat worker berjalan.
		claimed, err := w.tickets.ClaimReminderStep(ticket.ID, ticket.ReminderStep, now)
		if err != nil {
			log.Printf("Reminder worker: gagal mengklaim tiket #%d: %v", ticket.ID, err)
			continue
		}
		if !claimed {
			continue
		}

		if err := w.notifier.Send(kind, ticket); err != nil {
			log.Printf("Reminder worker: gagal mengirim %s untuk tiket #%d: %v", kind, ticket.ID, err)
			// Kembalikan step supaya reminder dicoba lagi pada putaran berikutnya.
			if err := w.tickets.ReleaseReminderStep(ticket.ID, ticket.ReminderStep+1, ticket.LastReminderAt); err != nil {
				log.Printf("Reminder worker: gagal mengembalikan step tiket #%d: %v", ticket.ID, err)
			}
			continue
		}
		sent++
	}

	log.Printf("Reminder worker: %d tiket kandidat, %d reminder terkirim", len(candidates), sent)
}
