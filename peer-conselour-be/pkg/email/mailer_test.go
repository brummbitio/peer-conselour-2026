package email

import (
	"bufio"
	"errors"
	"io"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"strings"
	"testing"
	"time"
)

type capturedMail struct {
	rcpt []string
	data string
}

// startFakeSMTP menjalankan server SMTP minimal (tanpa TLS/AUTH) yang merekam satu email.
func startFakeSMTP(t *testing.T) (int, <-chan capturedMail) {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatalf("gagal membuka listener: %v", err)
	}
	t.Cleanup(func() { listener.Close() })

	result := make(chan capturedMail, 1)
	go func() {
		conn, err := listener.Accept()
		if err != nil {
			return
		}
		defer conn.Close()
		_ = conn.SetDeadline(time.Now().Add(10 * time.Second))

		reader := bufio.NewReader(conn)
		reply := func(line string) { _, _ = io.WriteString(conn, line+"\r\n") }
		var captured capturedMail

		reply("220 fake.smtp ESMTP")
		for {
			line, err := reader.ReadString('\n')
			if err != nil {
				return
			}
			command := strings.ToUpper(strings.TrimSpace(line))
			switch {
			case strings.HasPrefix(command, "EHLO"), strings.HasPrefix(command, "HELO"):
				reply("250 fake.smtp")
			case strings.HasPrefix(command, "RCPT TO:"):
				captured.rcpt = append(captured.rcpt, strings.TrimSpace(line[len("RCPT TO:"):]))
				reply("250 OK")
			case command == "DATA":
				reply("354 End data with <CR><LF>.<CR><LF>")
				var data strings.Builder
				for {
					dataLine, err := reader.ReadString('\n')
					if err != nil {
						return
					}
					if dataLine == ".\r\n" {
						break
					}
					data.WriteString(dataLine)
				}
				captured.data = data.String()
				reply("250 OK")
			case command == "QUIT":
				reply("221 Bye")
				result <- captured
				return
			default:
				reply("250 OK")
			}
		}
	}()

	return listener.Addr().(*net.TCPAddr).Port, result
}

func newTestMailer(t *testing.T, port int, devMode bool) *Mailer {
	t.Helper()
	mailer, err := NewMailer(Settings{
		Enabled:       true,
		Host:          "127.0.0.1",
		Port:          port,
		Secure:        false,
		FromName:      "Layanan Konseling UB",
		FromEmail:     "konseling@ub.ac.id",
		DevMode:       devMode,
		DevOverrideTo: "developer@example.com",
	})
	if err != nil {
		t.Fatalf("NewMailer() error: %v", err)
	}
	return mailer
}

var sampleTicketData = TicketEmailData{
	StudentName: "Budi <Santoso>",
	TicketCode:  "UB-CS-260911-994",
	Topic:       "Konseling Masalah Akademik",
	ServiceType: "Online",
	CreatedAt:   "11 September 2026, 20:13 WIB",
	TicketURL:   "https://konseling.ub.ac.id/tickets/4932",
	HomeURL:     "https://konseling.ub.ac.id",
	LogoURL:     "https://konseling.ub.ac.id/branding/logo-konseling.png",
}

func waitForMail(t *testing.T, result <-chan capturedMail) (capturedMail, *mail.Message, string) {
	t.Helper()
	select {
	case captured := <-result:
		msg, err := mail.ReadMessage(strings.NewReader(captured.data))
		if err != nil {
			t.Fatalf("email tidak dapat diparse: %v", err)
		}
		body, err := io.ReadAll(quotedprintable.NewReader(msg.Body))
		if err != nil {
			t.Fatalf("isi email tidak dapat didekode: %v", err)
		}
		return captured, msg, string(body)
	case <-time.After(5 * time.Second):
		t.Fatal("fake SMTP tidak menerima email")
	}
	return capturedMail{}, nil, ""
}

func decodeSubject(t *testing.T, msg *mail.Message) string {
	t.Helper()
	subject, err := new(mime.WordDecoder).DecodeHeader(msg.Header.Get("Subject"))
	if err != nil {
		t.Fatalf("subjek tidak dapat didekode: %v", err)
	}
	return subject
}

func TestDevModeRedirectsRecipientAndPrefixesSubject(t *testing.T) {
	port, result := startFakeSMTP(t)
	mailer := newTestMailer(t, port, true)

	if err := mailer.SendTicketEmail(KindTicketCreated, "mahasiswa@student.ub.ac.id", sampleTicketData); err != nil {
		t.Fatalf("SendTicketEmail() error: %v", err)
	}

	captured, msg, body := waitForMail(t, result)
	if len(captured.rcpt) != 1 || captured.rcpt[0] != "<developer@example.com>" {
		t.Fatalf("RCPT = %v, want hanya <developer@example.com>", captured.rcpt)
	}
	if to := msg.Header.Get("To"); strings.Contains(to, "mahasiswa@") {
		t.Fatalf("header To masih memuat penerima asli: %s", to)
	}

	wantSubject := "[DEV TEST - Asli untuk: mahasiswa@student.ub.ac.id] [Layanan Konseling UB] Pengajuan Sesi Konseling Diterima - #UB-CS-260911-994"
	if got := decodeSubject(t, msg); got != wantSubject {
		t.Fatalf("subjek = %q, want %q", got, wantSubject)
	}

	for _, want := range []string{
		"Halo, Budi &lt;Santoso&gt;!",
		"#UB-CS-260911-994",
		"Konseling Masalah Akademik",
		`href="https://konseling.ub.ac.id/tickets/4932"`,
		"Buka Tiket Konseling",
		"Pemberitahuan Kerahasiaan &amp; Darurat:",
		"#0f2b48",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("isi email tidak memuat %q", want)
		}
	}
	if strings.Contains(body, "<Santoso>") {
		t.Error("nama mahasiswa tidak di-escape")
	}
}

func TestProductionModeSendsToOriginalRecipient(t *testing.T) {
	port, result := startFakeSMTP(t)
	mailer := newTestMailer(t, port, false)

	if err := mailer.SendTicketEmail(KindSessionClosed, "mahasiswa@student.ub.ac.id", sampleTicketData); err != nil {
		t.Fatalf("SendTicketEmail() error: %v", err)
	}

	captured, msg, _ := waitForMail(t, result)
	if len(captured.rcpt) != 1 || captured.rcpt[0] != "<mahasiswa@student.ub.ac.id>" {
		t.Fatalf("RCPT = %v, want <mahasiswa@student.ub.ac.id>", captured.rcpt)
	}
	if got, want := decodeSubject(t, msg), "[Layanan Konseling UB] Sesi Konseling Telah Selesai - #UB-CS-260911-994"; got != want {
		t.Fatalf("subjek = %q, want %q", got, want)
	}
}

func TestDevModeWithoutOverrideIsRejected(t *testing.T) {
	_, err := NewMailer(Settings{
		Enabled:   true,
		Host:      "127.0.0.1",
		Port:      2525,
		FromEmail: "konseling@ub.ac.id",
		DevMode:   true,
	})
	if !errors.Is(err, ErrDevOverrideMissing) {
		t.Fatalf("NewMailer() error = %v, want ErrDevOverrideMissing", err)
	}
}

func TestDisabledMailerNeverSends(t *testing.T) {
	mailer, err := NewMailer(Settings{Enabled: false})
	if err != nil {
		t.Fatalf("NewMailer() error: %v", err)
	}
	if err := mailer.SendTicketEmail(KindTicketCreated, "mahasiswa@student.ub.ac.id", sampleTicketData); !errors.Is(err, ErrDisabled) {
		t.Fatalf("SendTicketEmail() error = %v, want ErrDisabled", err)
	}
}

func TestAllTicketEmailsRender(t *testing.T) {
	mailer, err := NewMailer(Settings{Enabled: false})
	if err != nil {
		t.Fatalf("NewMailer() error: %v", err)
	}

	ctaByKind := map[Kind]string{
		KindTicketCreated:       "Buka Tiket Konseling",
		KindFirstCounselorReply: "Baca Tanggapan Konselor",
		KindReminderH1:          "Buka Tiket Konseling",
		KindReminderH3:          "Lanjutkan Sesi Konseling",
		KindReminderH5:          "Masuk ke Sesi Konseling",
		KindReminderH7:          "Balas Sebelum Tiket Ditutup",
		KindSessionClosed:       "Buka Tiket Layanan Konseling",
	}
	if len(ctaByKind) != len(subjectFormats) {
		t.Fatalf("test mencakup %d jenis email, template ada %d", len(ctaByKind), len(subjectFormats))
	}

	for kind, cta := range ctaByKind {
		subject, html, err := mailer.RenderTicketEmail(kind, sampleTicketData)
		if err != nil {
			t.Fatalf("RenderTicketEmail(%s) error: %v", kind, err)
		}
		if !strings.HasSuffix(subject, "#UB-CS-260911-994") {
			t.Errorf("%s: subjek %q tidak diakhiri kode tiket", kind, subject)
		}
		if !strings.Contains(html, cta) {
			t.Errorf("%s: tombol %q tidak ditemukan", kind, cta)
		}
		if !strings.Contains(html, "Layanan Konseling UB") {
			t.Errorf("%s: footer universal tidak ditemukan", kind)
		}
	}
}
