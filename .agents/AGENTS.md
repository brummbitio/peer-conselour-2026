# Project Rules — Layanan Konseling Mahasiswa Universitas Brawijaya

Berkas ini adalah sumber aturan utama bagi agen AI yang bekerja pada monorepo
`peer-conselour-web`. Semua isi di bawah mencerminkan **kondisi kode saat ini**.

> **PERINGATAN KREDENSIAL**
> Dilarang keras menuliskan kredensial nyata (IAM Client Secret, password
> database, password SMTP, kunci MinIO, JWT secret) pada berkas apa pun yang
> terlacak Git — termasuk berkas ini, `README.md`, dan `docker-compose.yml`.
> Gunakan `[DILINDUNGI_DI_ENV]` atau placeholder generik. Nilai sebenarnya
> hanya boleh berada di `peer-conselour-be/.env` (di-ignore Git) dan password
> manager tim.

---

## 1. Identitas & Bahasa

- Komunikasi dengan user: **Bahasa Indonesia**.
- Kode, nama variabel, komentar kode, dan pesan commit: **Bahasa Inggris**.
- Format pesan commit mengikuti **Conventional Commits**:
  `feat:`, `fix:`, `refactor:`, `docs:`, `security:`, `chore:`.

---

## 2. Arsitektur Monorepo

Satu repositori berisi frontend, backend, dan orkestrasi container.

| Direktori | Peran | Stack |
| --- | --- | --- |
| `peer-conselour-app/` | Frontend web | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS v4, Lucide React, Recharts, Motion (Framer), GSAP |
| `peer-conselour-be/` | REST API | Go (go.mod: `go 1.26.4`), Gin, GORM, PostgreSQL, MinIO Go SDK v7, SMTP mailer |
| `docker-compose.yml` | Orkestrasi lokal/staging | Docker Compose: `backend`, `frontend`, `minio` |
| `.agents/` | Aturan agen (berkas ini) | — |

Catatan penting:

- Frontend dan backend berada di **satu repo (monorepo)**. Aturan lama "dua repo
  terpisah" sudah tidak berlaku.
- Backend Go **sudah selesai dibangun dan berjalan**; tidak ada lagi mock data
  di frontend — seluruh data diambil dari API Go melalui `src/utils/api.ts`.
- Database PostgreSQL sudah terisi hasil migrasi dari osTicket lama.

### Struktur backend (`peer-conselour-be/`)

```
cmd/api/main.go              Entry point: config, DB, MinIO, ENUM, AutoMigrate, worker, router
config/                      config.go (env loader) + database.go (koneksi GORM)
internal/handler/            auth, ticket, schedule, user, upload
internal/model/              user, ticket, message, schedule, attachment
internal/repository/         user, ticket, message, schedule (akses GORM)
internal/notification/       ticket_notifier.go — dispatch email asinkron
internal/worker/             reminder_worker.go — reminder berjenjang H+1/H+3/H+5/H+7
middleware/                  auth_middleware, cors_middleware, rate_limit
pkg/email/                   mailer.go, ticket_emails.go
pkg/jwt/                     jwt.go — sign & verify token
pkg/media/                   media.go — magic-number detection, resize, WebP encode
pkg/storage/                 minio.go — client init & presigned URL
templates/email/             Template HTML email (embed.go)
```

### Struktur frontend (`peer-conselour-app/`)

```
app/                         App Router
app/_portal/                 Komponen & util bersama portal (lihat bagian 8)
app/admin/                   dashboard, tickets/[id], students/[id], admins/[nim]
app/tickets/[id]/            Detail tiket + chat mahasiswa
app/my-counseling/           Riwayat konseling mahasiswa
app/auth/                    auth-provider.tsx (context sesi)
app/berita/, app/psikoedukasi/, app/resources/, app/about/, app/services/
app/styles/                  auth.css, account-ticket.css, content-pages.css
src/utils/api.ts             SINGLE SOURCE OF TRUTH konfigurasi API
src/components/              Komponen base & application (buttons, input, date-picker)
src/hooks/                   Custom hooks
```

---

## 3. Autentikasi & Pengamanan Sesi

- **Pure SSO UB via IAM** (OAuth2 Authorization Code flow). Login lokal
  (username/password publik) **ditiadakan**.
  Endpoint: `GET /api/auth/sso` → IAM → `GET /api/auth/callback`.
- **JWT disimpan di HttpOnly + Secure + SameSite cookie** bernama `token`
  (`c.SetCookie` pada `internal/handler/auth_handler.go`), **bukan di
  `localStorage`**, untuk mencegah pencurian token lewat XSS. Request frontend
  mengirim cookie ini dengan `credentials: "include"` (`src/utils/api.ts`).
- **UTANG TEKNIS (wajib dibersihkan)**: masih tersisa jalur *legacy* di
  `app/auth/auth-provider.tsx` yang menyimpan query param `?token=` ke
  `localStorage`, serta header `Authorization` cadangan di `src/utils/api.ts`.
  Jalur ini membatalkan manfaat HttpOnly cookie bila terpakai — hapus keduanya
  saat menyentuh berkas tersebut, dan jangan menambah jalur penyimpanan token
  di sisi klien yang baru.
- **Dynamic CSRF state parameter**: nilai `state` acak disimpan di cookie
  `oauth_state` (HttpOnly, path `/api/auth`, TTL 300 detik) lalu dibandingkan
  dengan `state` yang dikembalikan IAM saat callback. Mismatch → callback
  ditolak.
- **CORS whitelisting**: hanya origin terdaftar di `middleware/cors_middleware.go`
  yang diizinkan, dengan `Access-Control-Allow-Credentials: true`.
- **Rate limiting global**: `middleware.RateLimitMiddleware(20, 40)`
  (20 req/detik, burst 40) diterapkan ke seluruh route.
- **Rute `dev-login`**: `GET /api/auth/dev-login` **hanya** terdaftar bila
  `APP_ENV=development` (dijaga di `cmd/api/main.go`). Dilarang mengaktifkannya
  di production.
- Otorisasi bertingkat via middleware: `AuthMiddleware` → `AdminOnly` →
  `SuperAdminOnly` (pembuatan/edit/reset password akun admin).

---

## 4. Penyimpanan Lampiran & Media (MinIO + Go)

Aturan wajib untuk semua pekerjaan terkait upload:

1. **Bucket privat**: `counseling-attachments` bersifat **PRIVAT**, bukan public
   bucket.
2. **Akses file** hanya melalui **Temporary Presigned GET URL** yang digenerate
   backend Go, berlaku **15 menit** (`storage.GetPresignedURL(ctx, obj, 15*time.Minute)`).
3. **Validasi tipe asli via Magic Numbers**: 512 byte pertama dibaca dengan
   `http.DetectContentType` (`pkg/media/media.go`). **Jangan** percaya ekstensi
   nama file atau header `Content-Type` dari klien.
   Format diizinkan: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`,
   `application/msword` (doc), dan `...wordprocessingml.document` (docx).
4. **Batas ukuran**: maksimal **10 MB** per berkas (`upload_handler.go`).
5. **Pemrosesan gambar di backend**: gambar yang sisi terpanjangnya melebihi
   **2048px** di-resize dengan `disintegration/imaging`, lalu dikonversi ke
   **WebP kualitas 82%** (`chai2010/webp`) sebelum disimpan ke MinIO.
6. **Pencegahan Directory Traversal**: nama objek di MinIO selalu **UUID v4**
   acak + ekstensi. Nama asli file hanya disimpan di database untuk tampilan.
7. **Validasi kepemilikan lampiran**: akses lampiran diverifikasi terhadap
   pemilik tiket sebelum presigned URL diterbitkan.

---

## 5. Notifikasi Email Asinkron

- Pengiriman email **tidak memblokir request HTTP**: `internal/notification/ticket_notifier.go`
  men-dispatch email di dalam goroutine terpisah.
- `internal/worker/reminder_worker.go` adalah **background worker** yang
  dijalankan sebagai goroutine dari `main.go` dan berdenyut memakai
  `time.NewTicker`, untuk mengirim reminder berjenjang **H+1, H+3, H+5, H+7**
  pada tiket yang belum ditanggapi.
- Template email berupa **HTML** di `templates/email/` (di-embed via
  `templates/embed.go`): `layout.html`, `ticket_created.html`,
  `first_counselor_reply.html`, `session_closed.html`, `reminder_h{1,3,5,7}.html`.
- **Guardrail wajib saat development**: `EMAIL_ENABLED=false` atau
  `EMAIL_DEV_MODE=true` + `EMAIL_DEV_OVERRIDE_TO=<email dev>` supaya email
  tidak pernah terkirim ke mahasiswa asli. Jangan pernah commit konfigurasi
  yang mengaktifkan email production.

---

## 6. Manajemen Environment (Single Source of Truth)

### Frontend

- Konfigurasi API **terpusat di `peer-conselour-app/src/utils/api.ts`**.
  Berkas `.env` frontend **tidak digunakan** untuk URL API.
- Development: aktifkan `export const BASE_URL = "http://localhost:8080";`
  dan komentari baris production.
- Production: aktifkan `export const BASE_URL = "https://api-konseling.ub.ac.id";`
  dan komentari baris development.
- **Agen dilarang** memecah konfigurasi URL ini kembali ke berkas `.env`
  terpisah — single source of truth harus dipertahankan.

### Backend

- Konfigurasi berada di `peer-conselour-be/.env`, mengikuti format
  `peer-conselour-be/.env.example` (satu-satunya berkas env yang boleh
  di-commit, dan isinya wajib placeholder).
- `APP_ENV=development` / `APP_ENV=production` menentukan perilaku
  keamanan (mis. pendaftaran rute `dev-login`).
- Kelompok variabel: `PORT`, `APP_ENV`, `DB_*`, `IAM_*`, `JWT_*`, `MINIO_*`,
  `FRONTEND_URL`, `SMTP_*`, `EMAIL_*`.

### Server & Deployment

- Frontend: Plesk Hosting UB (Next.js `output: standalone`).
- Backend Go: aaPanel UB (binary mandiri hasil `go build`).
- Kredensial panel/hosting: `[TERSEDIA_DI_PASSWORD_MANAGER]` — jangan dituliskan
  di repo dan jangan diubah.

---

## 7. Kebersihan Repositori (Git Hygiene)

Yang **tidak boleh** masuk Git (sudah diatur di `.gitignore` root):

- `**/.env` dan `**/.env.*` (kecuali `.env.example`)
- `*.sql`, `*.zip` — dump osTicket & paket deploy berisi data pribadi mahasiswa
- `new-db/`, `_asset-archive/`, `server-binaries/`, `graphify-out/`
- `docs/` — rencana migrasi & skema database internal
- `security_audit_report.md` — temuan celah keamanan

Yang **harus** tampil di root GitHub: `.agents/`, `peer-conselour-app/`,
`peer-conselour-be/`, `docker-compose.yml`, `.gitignore`, `README.md`.

---

## 8. Standar Desain UI & Animasi Modal

1. **Bahasa visual modal** mengikuti modal login/SSO: sudut membulat
   `border-radius: 22px` atau `24px`, `box-shadow` lembut, padding nyaman,
   header bersih. Header modal menyertakan identitas branding (Logo UB + teks
   *"Layanan Konseling — Universitas Brawijaya"*) dan tombol tutup bulat (`X`)
   bila penutupan manual diizinkan.
2. **Animasi pembukaan wajib seragam** di seluruh aplikasi:
   - **Backdrop**: `authBackdropFade` / `ticketBackdropFade` — opacity `0 → 1`,
     durasi `0.25s`, easing `cubic-bezier(0.16, 1, 0.3, 1)`.
   - **Panel**: `authPanelZoom` / `ticketPanelZoom` — scale `0.92 → 1` dan
     opacity `0 → 1`, durasi `0.32s`, easing elastis
     `cubic-bezier(0.34, 1.56, 0.64, 1)`.
   Modal baru harus mengimplementasikan atau mewarisi kelas animasi ini.
3. **Paginasi daftar kartu**: daftar tiket/mahasiswa/admin di dashboard admin
   memakai paginasi sisi klien dengan kontainer setinggi maksimal **3 kartu**
   dan scroll vertikal dinamis (`maxHeight` + `overflowY: "auto"`).
   Gunakan komponen bersama `app/_portal/CardScrollList.tsx` dan
   `app/_portal/usePagination.ts`.
4. **Grafik topik konseling** (Recharts) menampilkan 3 baris teratas dengan
   area scroll dinamis: `Math.max(160, topicStats.length * 48)`.
5. **Komponen portal bersama** ada di `app/_portal/` — gunakan kembali
   `PortalModal`, `PortalLoader`, `Pagination`, `TicketListCard`, `EmptyState`,
   `BackLink`, dan pemetaan label status di `ticketStatus.ts`. Jangan menduplikasi
   komponen ini per halaman.

---

## 9. Keamanan Konten Chat

- Pesan lama hasil migrasi osTicket bertipe HTML dirender lewat
  `dangerouslySetInnerHTML`, namun **wajib** disanitasi dengan **DOMPurify**
  terlebih dahulu (`app/tickets/[id]/components/messageFormat.ts` dan
  `MessageBody.tsx`).
- Pesan teks biasa dirender sebagai teks dengan auto-linking URL.
- Dilarang menambah jalur render HTML baru tanpa melewati sanitasi DOMPurify.

---

## 10. Alur Status Tiket

`ReplyTicket` (`internal/handler/ticket_handler.go`) mengubah status otomatis:

- Dibalas Admin/Konselor → `in_progress` (Sudah Dibalas).
- Dibalas Mahasiswa → kembali `open` (Menunggu Balasan), agar masuk lagi ke
  antrean admin.
- Mahasiswa dapat menutup tiket sendiri via `PUT /api/tickets/:id/resolve`
  → `resolved`.

ENUM PostgreSQL yang berlaku: `user_role`, `ticket_status`, `message_sender`,
`schedule_status`, `service_type` — dibuat manual di `main.go` sebelum
`AutoMigrate` karena GORM tidak membuat ENUM secara otomatis.

---

## 11. Gaya Kode

- TypeScript **strict** untuk frontend; hindari `any` pada kode baru.
- Go: pola layered `handler → repository → model`; jangan mengakses `config.DB`
  langsung dari handler bila repository sudah tersedia.
- Pertahankan komentar dan dokumentasi yang sudah ada kecuali diminta sebaliknya.
- Verifikasi frontend: `npx tsc --noEmit` adalah satu-satunya pemeriksa tipe
  (`next.config.mjs` memakai `ignoreBuildErrors`). Jangan menjalankan
  `npm run build` di direktori yang sama saat `next dev` sedang berjalan.
- Verifikasi backend: `go build ./...` dan `go test ./...`.
