package email

import (
	"bytes"
	"fmt"
	"html/template"

	emailtemplates "peer-conselour-be/templates"
)

// Kind menamai jenis email tiket; nilainya sama dengan nama berkas di templates/email.
type Kind string

const (
	KindTicketCreated       Kind = "ticket_created"        // EMAIL 1
	KindFirstCounselorReply Kind = "first_counselor_reply" // EMAIL 2
	KindReminderH1          Kind = "reminder_h1"           // EMAIL 3
	KindReminderH3          Kind = "reminder_h3"           // EMAIL 4
	KindReminderH5          Kind = "reminder_h5"           // EMAIL 5
	KindReminderH7          Kind = "reminder_h7"           // EMAIL 6
	KindSessionClosed       Kind = "session_closed"        // EMAIL 7
)

var subjectFormats = map[Kind]string{
	KindTicketCreated:       "[Layanan Konseling UB] Pengajuan Sesi Konseling Diterima - #%s",
	KindFirstCounselorReply: "[Layanan Konseling UB] Konselor Telah Menanggapi Tiketmu - #%s",
	KindReminderH1:          "[Layanan Konseling UB] Pengingat Sesi Konseling - #%s",
	KindReminderH3:          "[Layanan Konseling UB] Bagaimana Kabarmu Hari Ini? - #%s",
	KindReminderH5:          "[Layanan Konseling UB] Konfirmasi Kelanjutan Sesi Konseling - #%s",
	KindReminderH7:          "[PENTING - Layanan Konseling UB] Pemberitahuan Penutupan Tiket - #%s",
	KindSessionClosed:       "[Layanan Konseling UB] Sesi Konseling Telah Selesai - #%s",
}

// TicketEmailData berisi nilai yang sudah siap tampil; html/template meng-escape semuanya.
type TicketEmailData struct {
	StudentName string
	TicketCode  string
	Topic       string
	ServiceType string
	CreatedAt   string
	TicketURL   string
	HomeURL     string
	LogoURL     string
}

type buttonData struct {
	Label string
	URL   string
}

func parseTemplates() (map[Kind]*template.Template, error) {
	funcs := template.FuncMap{
		"button": func(label, url string) buttonData {
			return buttonData{Label: label, URL: url}
		},
	}

	parsed := make(map[Kind]*template.Template, len(subjectFormats))
	for kind := range subjectFormats {
		tmpl, err := template.New(string(kind)).Funcs(funcs).ParseFS(
			emailtemplates.FS,
			"email/layout.html",
			"email/"+string(kind)+".html",
		)
		if err != nil {
			return nil, fmt.Errorf("email: gagal memuat template %s: %w", kind, err)
		}
		parsed[kind] = tmpl
	}
	return parsed, nil
}

// RenderTicketEmail menghasilkan subjek dan HTML email tanpa mengirimkannya.
func (m *Mailer) RenderTicketEmail(kind Kind, data TicketEmailData) (string, string, error) {
	tmpl, ok := m.templates[kind]
	if !ok {
		return "", "", fmt.Errorf("email: jenis email tidak dikenal: %s", kind)
	}

	var body bytes.Buffer
	if err := tmpl.ExecuteTemplate(&body, "layout", data); err != nil {
		return "", "", fmt.Errorf("email: gagal merender template %s: %w", kind, err)
	}
	return fmt.Sprintf(subjectFormats[kind], data.TicketCode), body.String(), nil
}

func (m *Mailer) SendTicketEmail(kind Kind, to string, data TicketEmailData) error {
	if !m.Enabled() {
		return ErrDisabled
	}
	subject, html, err := m.RenderTicketEmail(kind, data)
	if err != nil {
		return err
	}
	return m.Send(Message{To: to, Subject: subject, HTML: html})
}
