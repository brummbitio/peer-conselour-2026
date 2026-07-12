# 📋 Migration Plan: osTicket → Website Konseling Baru

> **Dokumen ini adalah patokan utama untuk seluruh proses migrasi.**
> Setiap diskusi dan implementasi harus merujuk ke sini agar konteks tidak hilang.

---

## 🏗️ Arsitektur yang Disepakati

| Komponen | Teknologi | Repo |
|----------|-----------|------|
| Frontend | Next.js (TypeScript) | `peer-conselour-web` (repo ini) |
| Backend | **Golang** | Repo terpisah (belum dibuat) |
| Database | **PostgreSQL** | Baru, skema dirancang dari nol |
| Sumber data migrasi | osTicket (MariaDB) | File dump: `wp_dzj2w(4).sql` (208 MB) |

---

## 📊 Skala Data yang Akan Dimigrasi

| Data | Jumlah | Rentang Waktu |
|------|--------|---------------|
| Mahasiswa (user) | ~3.758 | Nov 2021 – Jul 2026 |
| Tiket konseling | ~4.576 | Nov 2021 – Jul 2026 |
| Pesan/thread entries | Ribuan | Nov 2021 – Jul 2026 |
| Staff/konselor | 32 orang | — |
| Kategori bidang konseling | 10 bidang | — |
| Fakultas | 18 fakultas | — |

---

## 🗄️ Sumber Data osTicket (Tabel-Tabel Kunci)

### A. Data Pengguna (Mahasiswa)

#### `ost_user` — Data dasar user
```sql
CREATE TABLE ost_user (
  id            INT UNSIGNED NOT NULL,    -- PK
  org_id        INT UNSIGNED NOT NULL,
  default_email_id INT NOT NULL,          -- FK ke ost_user_email
  status        INT UNSIGNED NOT NULL DEFAULT 0,
  name          VARCHAR(128) NOT NULL,    -- Nama tampilan
  created       DATETIME NOT NULL,
  updated       DATETIME NOT NULL
);
```

#### `ost_user_email` — Email user
```sql
CREATE TABLE ost_user_email (
  id      INT UNSIGNED NOT NULL,   -- PK
  user_id INT UNSIGNED NOT NULL,   -- FK ke ost_user.id
  flags   INT UNSIGNED NOT NULL DEFAULT 0,
  address VARCHAR(255) NOT NULL    -- Alamat email
);
```

#### `ost_user__cdata` — Profil lengkap mahasiswa ⭐
```sql
CREATE TABLE ost_user__cdata (
  user_id       INT UNSIGNED NOT NULL,  -- PK, FK ke ost_user.id
  NIM           MEDIUMTEXT DEFAULT NULL,
  name          MEDIUMTEXT DEFAULT NULL,
  fakultas      MEDIUMTEXT DEFAULT NULL, -- ID angka → lookup ke ost_list_items
  jurusan       MEDIUMTEXT DEFAULT NULL, -- Teks bebas
  jenis_kelamin MEDIUMTEXT DEFAULT NULL, -- "L" atau "P"
  phone         MEDIUMTEXT DEFAULT NULL, -- Format bervariasi: 08xx, 62xx, +62xx
  jenis         MEDIUMTEXT DEFAULT NULL, -- 1=Online, 2=Tatap Muka
  notes         MEDIUMTEXT DEFAULT NULL
);
```

**Contoh data user lama (2021, tidak lengkap):**
```
(2, NULL, NULL, NULL, NULL, NULL, '08235656565', NULL, NULL)
```

**Contoh data user baru (2025-2026, lengkap):**
```
(3716, '245150700111013', NULL, '14', 'Teknologi Informasi', 'P', '085157242166', '1', '')
```

---

### B. Data Tiket Konseling

#### `ost_ticket` — Header tiket
```sql
CREATE TABLE ost_ticket (
  ticket_id     INT UNSIGNED NOT NULL,          -- PK
  ticket_pid    INT UNSIGNED DEFAULT NULL,      -- Parent ticket (jarang dipakai)
  number        VARCHAR(20) DEFAULT NULL,       -- Nomor tampilan: "004575"
  user_id       INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_user.id
  user_email_id INT UNSIGNED NOT NULL DEFAULT 0,
  status_id     INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_ticket_status
  dept_id       INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_department
  topic_id      INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_help_topic
  staff_id      INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_staff (assigned)
  team_id       INT UNSIGNED NOT NULL DEFAULT 0,
  source        ENUM('Web','Email','Phone','API','Other') NOT NULL DEFAULT 'Other',
  isoverdue     TINYINT UNSIGNED NOT NULL DEFAULT 0,
  isanswered    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  closed        DATETIME DEFAULT NULL,
  lastupdate    DATETIME DEFAULT NULL,
  created       DATETIME NOT NULL,
  updated       DATETIME NOT NULL
);
```

#### `ost_ticket__cdata` — Detail tambahan tiket ⭐
```sql
CREATE TABLE ost_ticket__cdata (
  ticket_id       INT UNSIGNED NOT NULL,       -- PK, FK ke ost_ticket
  tahapKonseling  MEDIUMTEXT DEFAULT NULL,     -- 1=Pertama, 2=Lanjutan
  subject         MEDIUMTEXT DEFAULT NULL,     -- Topik keluhan (teks bebas)
  priority        MEDIUMTEXT DEFAULT NULL,     -- 1=Low, 2=Normal, 3=High, 4=Emergency
  StatusMahasiswa MEDIUMTEXT DEFAULT NULL      -- 18=Aktif, 19=Alumni
);
```

**Contoh subject:**
```
"depresi dan keinginan bunuh diri"
"Overthingking, Hubungan Interpersonal Dengan Teman dan Pasangan"
"inferior dan kecenderungan suka dengan sesama jenis"
"Permasalahan akademis"
"masalah hubungan pribadi"
```

---

### C. Data Percakapan (Thread)

#### `ost_thread` — Penghubung tiket ↔ pesan
```sql
CREATE TABLE ost_thread (
  id          INT UNSIGNED NOT NULL,   -- PK
  object_id   INT UNSIGNED NOT NULL,   -- = ticket_id (WHERE object_type='T')
  object_type CHAR(1) NOT NULL,        -- 'T' = Ticket
  lastresponse DATETIME DEFAULT NULL,
  lastmessage  DATETIME DEFAULT NULL,
  created      DATETIME NOT NULL
);
```

#### `ost_thread_entry` — Isi pesan aktual ⭐
```sql
CREATE TABLE ost_thread_entry (
  id        INT UNSIGNED NOT NULL,          -- PK
  pid       INT UNSIGNED NOT NULL DEFAULT 0,-- Parent entry
  thread_id INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_thread.id
  staff_id  INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_staff (jika reply admin)
  user_id   INT UNSIGNED NOT NULL DEFAULT 0,-- FK ke ost_user (jika pesan mahasiswa)
  type      CHAR(1) NOT NULL DEFAULT '',    -- 'M'=Message (user), 'R'=Response (staff)
  poster    VARCHAR(128) NOT NULL DEFAULT '',-- Nama pengirim (teks)
  title     VARCHAR(255) DEFAULT NULL,
  body      TEXT NOT NULL,                  -- ISI PESAN (bisa HTML atau plain text)
  format    VARCHAR(16) NOT NULL DEFAULT 'html',
  created   DATETIME NOT NULL,
  updated   DATETIME NOT NULL
);
```

**Jalur relasi:** `ost_ticket.ticket_id` → `ost_thread.object_id` → `ost_thread_entry.thread_id`

---

### D. Data Staff / Konselor

#### `ost_staff` — Semua admin dan konselor
```sql
CREATE TABLE ost_staff (
  staff_id   INT UNSIGNED NOT NULL,    -- PK
  dept_id    INT UNSIGNED NOT NULL,    -- FK ke ost_department
  role_id    INT UNSIGNED NOT NULL,
  username   VARCHAR(32) NOT NULL,
  firstname  VARCHAR(32) DEFAULT NULL,
  lastname   VARCHAR(32) DEFAULT NULL,
  passwd     VARCHAR(128) DEFAULT NULL,-- JANGAN dimigrasi (hash lama)
  email      VARCHAR(255) DEFAULT NULL,
  phone      VARCHAR(24) NOT NULL DEFAULT '',
  mobile     VARCHAR(24) NOT NULL DEFAULT '',
  isactive   TINYINT NOT NULL DEFAULT 1,
  isadmin    TINYINT NOT NULL DEFAULT 0,
  isvisible  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  created    DATETIME NOT NULL,
  lastlogin  DATETIME DEFAULT NULL,
  updated    DATETIME NOT NULL
);
```

**Daftar staff (32 orang):**

| Tipe | Jumlah | Email Domain | Contoh |
|------|--------|-------------|--------|
| Konselor profesional | 9 | @ub.ac.id | Ulifa Rahma, Moch Sholeh, Bu Meita |
| Peer counselor (mahasiswa) | 23 | @student.ub.ac.id | Fita Diana, Nasywa Lathifa, Maurits Sitinjak |
| Admin (isadmin=1) | 6 | Campuran | admin, hanselsamosir, mauritssitinjak, razzanazizi, abbiyuluthfi, fernandoputra |

---

### E. Lookup / Referensi

#### Status Tiket (`ost_ticket_status`)

| ID | Nama | State |
|----|------|-------|
| 1 | Open | open |
| 2 | Resolved | closed |
| 3 | Closed | closed |
| 4 | Archived | archived |
| 5 | Deleted | deleted |

#### Bidang / Kategori Konseling (`ost_help_topic`)

| topic_id | Nama | Departemen |
|----------|------|-----------|
| 12 | Konseling Mahasiswa | Konseling |
| 13 | Rujukan Dosen | Konseling |
| 14 | Rujukan BK Fakultas | Konseling |
| 15 | Konseling Masalah Pribadi | Konseling |
| 16 | Konseling Masalah Akademik | Konseling |
| 17 | Konseling Masalah Sosial | Konseling |
| 18 | Konseling Masalah Keluarga | Konseling |
| 19 | Konseling Masalah Karier | Konseling |
| 20 | Konseling Masalah Perundungan | Konseling |
| 21 | Konseling PPKS | PPKS |

#### Departemen (`ost_department`)

| ID | Nama |
|----|------|
| 4 | Konseling |
| 5 | PPKS |

#### Fakultas (`ost_list_items` → list_id = 2)

| ID | Fakultas |
|----|----------|
| 1 | Hukum |
| 2 | Ekonomi & Bisnis |
| 3 | Ilmu Administrasi |
| 4 | Pertanian |
| 5 | Peternakan |
| 6 | Teknik |
| 7 | Kedokteran |
| 8 | Perikanan dan Ilmu Kelautan |
| 9 | Matematika dan Ilmu Pengetahuan Alam |
| 10 | Teknologi Pertanian |
| 11 | Ilmu Sosial dan Ilmu Politik |
| 12 | Ilmu Budaya |
| 13 | Kedokteran Hewan |
| 14 | Ilmu Komputer |
| 15 | Kedokteran Gigi |
| 16 | Vokasi |
| 17 | Pascasarjana |
| 20 | Ilmu Kesehatan |

#### Status Mahasiswa (`ost_list_items` → list_id = 3)

| ID | Status |
|----|--------|
| 18 | Aktif |
| 19 | Alumni |

#### Prioritas Tiket (`ost_ticket_priority`)

| ID | Tag | Nama |
|----|-----|------|
| 1 | low | Low |
| 2 | normal | Normal |
| 3 | high | High |
| 4 | emergency | Emergency |

#### Jenis Layanan Konseling (dari `ost_form_field`, field_id=37)

| Nilai | Label |
|-------|-------|
| 1 | Konseling Online |
| 2 | Konseling Tatap Muka |

#### Tahap Konseling (dari `ost_form_field`, field_id=43)

| Nilai | Label |
|-------|-------|
| 1 | Konseling Pertama |
| 2 | Konseling Lanjutan |

---

## 🔗 Diagram Relasi Data osTicket

```
ost_user (id)
├── 1:1 → ost_user__cdata (user_id) ......... [NIM, fakultas, jurusan, phone, jenis_kelamin]
├── 1:N → ost_user_email (user_id) .......... [alamat email]
└── 1:N → ost_ticket (user_id)
             ├── N:1 → ost_ticket_status (status_id) ... [Open/Resolved/Closed]
             ├── N:1 → ost_help_topic (topic_id) ....... [Bidang konseling]
             ├── N:1 → ost_department (dept_id) ........ [Konseling / PPKS]
             ├── N:1 → ost_staff (staff_id) ............ [Konselor yang ditugaskan]
             ├── 1:1 → ost_ticket__cdata (ticket_id) ... [subject, tahapKonseling, priority]
             └── 1:1 → ost_thread (object_id, object_type='T')
                          └── 1:N → ost_thread_entry (thread_id)
                                      [type M=pesan user, R=reply staff]
                                      [body = isi pesan, format = html/text]

ost_user__cdata.fakultas (angka) → ost_list_items.id (lookup nama fakultas)
```

---

## ⚠️ Tantangan Migrasi yang Harus Ditangani

### 1. Data User Tidak Konsisten
- **User lama (2021-2024):** Kebanyakan hanya punya `name` + `phone`. Tidak ada NIM, fakultas, atau jurusan.
- **User baru (2025-2026):** Data lengkap (NIM, fakultas, jurusan, jenis kelamin, dll.)
- **Keputusan:** Tetap migrasi semua, field kosong biarkan NULL.

### 2. Fakultas Disimpan Sebagai ID
- Kolom `fakultas` di `ost_user__cdata` berisi angka (1-20), bukan teks.
- Perlu di-resolve ke nama fakultas via tabel `ost_list_items`.

### 3. Format Body Pesan Campur
- Pesan dari mahasiswa (type=M) biasanya **plain text**.
- Respons dari staff (type=R) biasanya **HTML** (`<p>`, `<br>`, dll.).
- Perlu sanitasi/normalisasi saat migrasi.

### 4. Password Tidak Bisa Dimigrasi
- Password osTicket menggunakan hash format lama yang tidak kompatibel.
- User dan staff harus di-reset password-nya di sistem baru.

### 5. Format Nomor HP Bervariasi
- Ada yang format `08xx`, `62xx`, `+62xx`.
- Perlu dinormalisasi ke satu format standar.

### 6. Relasi Thread Tidak Langsung
- `ost_ticket` ↔ `ost_thread_entry` dihubungkan melalui tabel perantara `ost_thread`.
- Path: `ticket.ticket_id` → `thread.object_id` → `thread_entry.thread_id`

---

## 📌 Halaman Frontend yang Sudah Ada (Butuh API)

Berikut halaman yang sudah ada di frontend dan akan membutuhkan endpoint API dari backend Go:

| Halaman | Path | Data yang Dibutuhkan |
|---------|------|---------------------|
| Login/Register | `/login` | Auth (NIM/email + password) |
| Beranda | `/` | Info publik |
| Psikoedukasi | `/resources` | Artikel, poster, video |
| Berita | `/news` | Berita kampus |
| Tentang | `/about` | Info layanan |
| Book Session | `/book-session` | Form booking konseling |
| My Counseling | `/my-counseling` | Booking & tiket mahasiswa |
| Ticket List | `/tickets` | Daftar tiket mahasiswa |
| Ticket Detail | `/tickets/[id]` | Detail + percakapan tiket |
| Admin Dashboard | `/admin/dashboard` | Statistik, tiket, jadwal, mahasiswa, admin |
| Admin Ticket Detail | `/admin/tickets/[id]` | Detail tiket untuk admin |
| Admin Student Detail | `/admin/students/[id]` | Profil mahasiswa |
| Admin Detail | `/admin/admins/[nim]` | Profil admin |

### Model Data Frontend yang Sudah Didefinisikan

**AuthUser** (di `auth-provider.tsx`):
```typescript
type AuthUser = {
  role: "student" | "admin" | "superadmin";
  nim: string;
  fullName: string;
  gender?: string;
  faculty?: string;
  department?: string;
  email?: string;
  phone?: string;
};
```

**TicketItem** (di `mock-data.ts`):
```typescript
type TicketItem = {
  id: string;
  code: string;
  title: string;
  category: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
  lastReplyAt: string;
  counselor: string;
  summary: string;
  studentId: string;
};
```

**TicketMessage** (di `mock-data.ts`):
```typescript
type TicketMessage = {
  id: string;
  ticketId: string;
  sender: "mahasiswa" | "admin";
  senderName: string;
  sentAt: string;
  body: string;
};
```

**StudentProfile** (di `mock-data.ts`):
```typescript
type StudentProfile = {
  id: string;
  nim: string;
  fullName: string;
  gender: string;
  faculty: string;
  department: string;
  email: string;
  phone: string;
  originRegion: string;
  malangAddress: string;
};
```

**CounselingScheduleItem** (di `AdminDashboardClient.tsx`):
```typescript
type CounselingScheduleItem = {
  id: string;
  clientName: string;
  dateValue: string;
  timeValue: string;
  handlerName: string;
  serviceType: "tatap_muka" | "online";
};
```

**CounselingScheduleStatus**:
```typescript
type CounselingScheduleStatus =
  | "pending_confirmation"
  | "scheduled"
  | "reschedule"
  | "cancelled"
  | "completed";
```

---

## 🔐 Sistem Autentikasi & IAM UB

Untuk memfasilitasi autentikasi pengguna secara aman dan terintegrasi dengan Universitas Brawijaya, sistem akan menggunakan dua metode masuk (Dual Login System).

### A. Konfigurasi IAM UB (OpenID Connect / OIDC)
Sistem login resmi terintegrasi dengan repositori data mahasiswa aktif dan staff UB menggunakan OAuth2/OIDC.

* **Client ID**: `konseling`
* **Client Secret**: `[CLIENT_SECRET_TERSEDIA_DI_ENV]`
* **Realms URL**: `https://iam.ub.ac.id/auth/realms/ub`

**Endpoints OIDC:**
* **urlAuthorize**: `https://iam.ub.ac.id/auth/realms/ub/protocol/openid-connect/auth`
* **urlAccessToken**: `https://iam.ub.ac.id/auth/realms/ub/protocol/openid-connect/token`
* **urlResourceOwnerDetails**: `https://iam.ub.ac.id/auth/realms/ub/protocol/openid-connect/userinfo`

### B. Strategi Dual Login
Karena akun IAM alumni biasanya dinonaktifkan oleh universitas setelah kelulusan, sistem konseling baru akan membagi login menjadi 2 opsi:

1. **Tombol "SSO UB"**:
   - Untuk Mahasiswa & Staff Aktif.
   - Login dialihkan ke IAM UB.
   - Data profil (NIM, Nama, Email, Fakultas, Jurusan) ditarik otomatis dari OIDC saat pertama kali masuk (Auto-Provisioning).
   
2. **Form "Login Akun Lokal (Email + Password)"**:
   - Untuk Alumni dan user migrasi lama yang akun OIDC-nya sudah tidak aktif.
   - Login menggunakan email terdaftar dan password lokal yang disimpan di database baru.
   - Password awal user migrasi akan dibuatkan nilai acak/kosong, dan alumni didorong menggunakan fitur "Lupa Password" untuk membuat password lokal baru.

### C. Strategi Penyatuan Akun (Account Merging)
Untuk menjamin mahasiswa lama (data 2021-2024 yang tidak punya NIM di database osTicket) tidak kehilangan riwayat tiket konseling mereka saat masuk pertama kali menggunakan SSO UB:

1. **Pencarian Ganda (Dual-Lookup)**:
   Saat user login melalui SSO UB, backend Go akan menerima data NIM, Nama, dan Email dari server UB, lalu mencari kecocokan di database PostgreSQL dengan urutan:
   - **Pencarian 1**: Berdasarkan `nim`.
   - **Pencarian 2** (jika NIM tidak ditemukan/NULL): Berdasarkan `email`.
2. **Pembaruan Akun**:
   - Jika ditemukan user yang memiliki email sama tetapi kolom `nim` masih NULL (kondisi user lama hasil migrasi), backend Go akan memperbarui data tersebut dengan menyimpan NIM resmi yang didapat dari SSO UB.
   - Relasi ID di database tetap dipertahankan, sehingga seluruh riwayat tiket konseling lama mahasiswa otomatis muncul di dashboard mereka.

---

## 🌐 Infrastruktur & Deployment

Konfigurasi lingkungan server untuk development dan production:

* **Domain Develop / Testing**: `dev-konseling.ub.ac.id`

### A. Frontend (Next.js)
- **Environment**: Plesk Hosting (Universitas Brawijaya)
- **Path Repo**: `peer-conselour-web` (repo ini)

### B. Backend (Golang)
- **Environment**: A Panel (aaPanel) UB
- **Akses Panel**:
  - **URL Host**: `https://panel-konseling.ub.ac.id/2kv8tq2z`
  - **Username**: `[TERSEDIA_DI_PASSWORD_MANAGER]`
  - **Password**: `[TERSEDIA_DI_PASSWORD_MANAGER]`
- **Catatan**: Data autentikasi panel backend ini dilarang diubah dan hanya disimpan di password manager aman milik universitas.

---



## 🔜 Langkah Selanjutnya (Belum Dieksekusi)

Bagian ini akan diisi setelah diskusi lebih lanjut:

- [ ] Desain skema database PostgreSQL baru (Diskusi awal: menggunakan SERIAL integer ID, password_hash nullable, status/fakultas berupa teks langsung)
- [ ] Mapping field osTicket → skema PostgreSQL baru
- [ ] Struktur project backend Go (folder, framework, library)
- [ ] Integrasi callback IAM UB di backend Go
- [ ] Daftar API endpoints yang dibutuhkan frontend
- [ ] Script/tool migrasi data (Go atau SQL)
- [ ] Strategi autentikasi internal (JWT untuk sesi frontend)
- [ ] Integrasi frontend ↔ backend (CORS, env, dll.)
- [ ] Testing dan verifikasi data pasca-migrasi

