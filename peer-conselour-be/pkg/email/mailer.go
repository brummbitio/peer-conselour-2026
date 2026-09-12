// Package email mengirim email transaksional Layanan Konseling UB melalui SMTP.
//
// Pengaman lingkungan dev: selama EMAIL_DEV_MODE aktif, SEMUA email dialihkan ke
// EMAIL_DEV_OVERRIDE_TO dan subjeknya diberi prefix penerima asli, sehingga
// mahasiswa di database tidak pernah menerima email uji coba.
package email

import (
	"bytes"
	"crypto/rand"
	"crypto/tls"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"html/template"
	"mime"
	"mime/quotedprintable"
	"net"
	"net/mail"
	"net/smtp"
	"strconv"
	"strings"
	"time"

	emailtemplates "peer-conselour-be/templates"
)

const (
	dialTimeout = 15 * time.Second
	sendTimeout = 60 * time.Second
)

var (
	ErrDisabled           = errors.New("email: pengiriman email dinonaktifkan (EMAIL_ENABLED=false)")
	ErrDevOverrideMissing = errors.New("email: EMAIL_DEV_MODE aktif tetapi EMAIL_DEV_OVERRIDE_TO kosong atau tidak valid")
)

type Settings struct {
	Enabled bool
	Host    string
	Port    int
	// Secure true = TLS langsung (port 465); false = STARTTLS bila server mendukung.
	Secure        bool
	User          string
	Password      string
	FromName      string
	FromEmail     string
	DevMode       bool
	DevOverrideTo string
}

type Message struct {
	To      string
	Subject string
	HTML    string
}

type Mailer struct {
	settings  Settings
	templates map[Kind]*template.Template
}

// NewMailer memuat template email dan memvalidasi konfigurasi SMTP. Konfigurasi
// yang tidak lengkap hanya menjadi error bila email benar-benar diaktifkan.
func NewMailer(settings Settings) (*Mailer, error) {
	templates, err := parseTemplates()
	if err != nil {
		return nil, err
	}

	m := &Mailer{settings: settings, templates: templates}
	if settings.Enabled {
		if err := m.validate(); err != nil {
			return nil, err
		}
	}
	return m, nil
}

func (m *Mailer) validate() error {
	s := m.settings
	if s.Host == "" || s.Port <= 0 {
		return errors.New("email: SMTP_HOST dan SMTP_PORT wajib diisi saat EMAIL_ENABLED=true")
	}
	if _, err := mail.ParseAddress(s.FromEmail); err != nil {
		return fmt.Errorf("email: SMTP_FROM_EMAIL tidak valid: %w", err)
	}
	if s.DevMode {
		if _, err := mail.ParseAddress(strings.TrimSpace(s.DevOverrideTo)); err != nil {
			return ErrDevOverrideMissing
		}
	}
	return nil
}

func (m *Mailer) Enabled() bool {
	return m != nil && m.settings.Enabled
}

func (m *Mailer) DevMode() bool {
	return m.settings.DevMode
}

func (m *Mailer) DevOverrideTo() string {
	return m.settings.DevOverrideTo
}

// Send mengirim satu email HTML. Interceptor dev mode diterapkan di sini, sebelum
// alamat penerima maupun isi pesan menyentuh koneksi SMTP.
func (m *Mailer) Send(msg Message) error {
	if !m.Enabled() {
		return ErrDisabled
	}

	to, subject, err := m.resolveRecipient(msg.To, msg.Subject)
	if err != nil {
		return err
	}

	body, err := m.buildMIME(to, subject, msg.HTML)
	if err != nil {
		return err
	}
	return m.deliver(to, body)
}

// resolveRecipient mengembalikan penerima & subjek final. Pada dev mode penerima
// selalu diganti paksa menjadi EMAIL_DEV_OVERRIDE_TO.
func (m *Mailer) resolveRecipient(originalTo, subject string) (string, string, error) {
	original, err := mail.ParseAddress(strings.TrimSpace(originalTo))
	if err != nil {
		return "", "", fmt.Errorf("email: alamat penerima tidak valid: %w", err)
	}
	subject = strings.NewReplacer("\r", " ", "\n", " ").Replace(subject)

	if !m.settings.DevMode {
		return original.Address, subject, nil
	}

	override, err := mail.ParseAddress(strings.TrimSpace(m.settings.DevOverrideTo))
	if err != nil {
		return "", "", ErrDevOverrideMissing
	}
	return override.Address, fmt.Sprintf("[DEV TEST - Asli untuk: %s] %s", original.Address, subject), nil
}

func (m *Mailer) buildMIME(to, subject, html string) ([]byte, error) {
	from := mail.Address{Name: m.settings.FromName, Address: m.settings.FromEmail}
	recipient := mail.Address{Address: to}

	random := make([]byte, 12)
	_, _ = rand.Read(random)
	boundary := fmt.Sprintf("bnd_%d_%s", time.Now().UnixNano(), hex.EncodeToString(random))

	var buf bytes.Buffer
	headers := []string{
		"From: " + from.String(),
		"To: " + recipient.String(),
		"Subject: " + mime.QEncoding.Encode("UTF-8", subject),
		"Date: " + time.Now().Format(time.RFC1123Z),
		"Message-ID: " + m.newMessageID(),
		"MIME-Version: 1.0",
		"Content-Type: multipart/related; boundary=\"" + boundary + "\"",
	}
	buf.WriteString(strings.Join(headers, "\r\n"))
	buf.WriteString("\r\n\r\n")

	// Part 1: HTML Body
	buf.WriteString("--" + boundary + "\r\n")
	buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n\r\n")

	qp := quotedprintable.NewWriter(&buf)
	if _, err := qp.Write([]byte(html)); err != nil {
		return nil, fmt.Errorf("email: gagal menyusun isi email: %w", err)
	}
	if err := qp.Close(); err != nil {
		return nil, fmt.Errorf("email: gagal menyusun isi email: %w", err)
	}
	buf.WriteString("\r\n\r\n")

	// Part 2: Inline Logo Attachment (CID: <logo-konseling>)
	logoBytes, err := emailtemplates.FS.ReadFile("email/logo-konseling.png")
	if err == nil && len(logoBytes) > 0 {
		buf.WriteString("--" + boundary + "\r\n")
		buf.WriteString("Content-Type: image/png; name=\"logo-konseling.png\"\r\n")
		buf.WriteString("Content-Transfer-Encoding: base64\r\n")
		buf.WriteString("Content-ID: <logo-konseling>\r\n")
		buf.WriteString("Content-Disposition: inline; filename=\"logo-konseling.png\"\r\n\r\n")

		b64 := base64.StdEncoding.EncodeToString(logoBytes)
		for i := 0; i < len(b64); i += 76 {
			end := i + 76
			if end > len(b64) {
				end = len(b64)
			}
			buf.WriteString(b64[i:end] + "\r\n")
		}
		buf.WriteString("\r\n")
	}

	buf.WriteString("--" + boundary + "--\r\n")
	return buf.Bytes(), nil
}

func (m *Mailer) newMessageID() string {
	domain := "localhost"
	if at := strings.LastIndex(m.settings.FromEmail, "@"); at >= 0 && at < len(m.settings.FromEmail)-1 {
		domain = m.settings.FromEmail[at+1:]
	}
	random := make([]byte, 12)
	_, _ = rand.Read(random)
	return fmt.Sprintf("<%d.%s@%s>", time.Now().UnixNano(), hex.EncodeToString(random), domain)
}

func (m *Mailer) deliver(to string, body []byte) error {
	s := m.settings
	addr := net.JoinHostPort(s.Host, strconv.Itoa(s.Port))
	dialer := &net.Dialer{Timeout: dialTimeout}
	tlsConfig := &tls.Config{ServerName: s.Host, MinVersion: tls.VersionTLS12}

	var conn net.Conn
	var err error
	if s.Secure {
		conn, err = tls.DialWithDialer(dialer, "tcp", addr, tlsConfig)
	} else {
		conn, err = dialer.Dial("tcp", addr)
	}
	if err != nil {
		return fmt.Errorf("email: gagal terhubung ke SMTP %s: %w", addr, err)
	}
	_ = conn.SetDeadline(time.Now().Add(sendTimeout))

	client, err := smtp.NewClient(conn, s.Host)
	if err != nil {
		conn.Close()
		return fmt.Errorf("email: handshake SMTP gagal: %w", err)
	}
	defer client.Close()

	if !s.Secure {
		if ok, _ := client.Extension("STARTTLS"); ok {
			if err := client.StartTLS(tlsConfig); err != nil {
				return fmt.Errorf("email: STARTTLS gagal: %w", err)
			}
		}
	}

	if s.User != "" {
		// smtp.PlainAuth menolak mengirim kredensial lewat koneksi tanpa enkripsi.
		if err := client.Auth(smtp.PlainAuth("", s.User, s.Password, s.Host)); err != nil {
			return fmt.Errorf("email: autentikasi SMTP gagal: %w", err)
		}
	}

	if err := client.Mail(s.FromEmail); err != nil {
		return fmt.Errorf("email: MAIL FROM ditolak: %w", err)
	}
	if err := client.Rcpt(to); err != nil {
		return fmt.Errorf("email: RCPT TO ditolak: %w", err)
	}

	writer, err := client.Data()
	if err != nil {
		return fmt.Errorf("email: DATA ditolak: %w", err)
	}
	if _, err := writer.Write(body); err != nil {
		writer.Close()
		return fmt.Errorf("email: gagal menulis isi email: %w", err)
	}
	if err := writer.Close(); err != nil {
		return fmt.Errorf("email: server menolak isi email: %w", err)
	}
	return client.Quit()
}
