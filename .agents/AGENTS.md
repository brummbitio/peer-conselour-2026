# Project Rules — Website Layanan Konseling Mahasiswa UB

## Bahasa
- Komunikasi dengan user menggunakan **Bahasa Indonesia**.
- Kode, komentar kode, dan nama variabel tetap dalam **Bahasa Inggris**.

## Konteks Utama
- Selalu rujuk **`docs/migration-plan.md`** untuk konteks migrasi data dari osTicket lama.
- File SQL dump osTicket lama tersedia di root project: `wp_dzj2w(4).sql` (208 MB, jangan di-commit ke git).

## Arsitektur
- **Frontend**: Next.js (TypeScript) — repo ini (`peer-conselour-web`).
- **Backend**: Golang — repo terpisah (belum dibuat).
- **Database**: PostgreSQL (baru, skema dirancang dari nol).
- Frontend dan backend adalah **dua repo terpisah**. Jangan mencampur kode backend ke repo ini.

## Data Migrasi
- Sumber: osTicket (MariaDB), ~3.758 user, ~4.576 tiket, 32 staff/konselor.
- Strategi: Migrasi **semua data**, field kosong biarkan NULL.
- Password lama **tidak dimigrasi** — user harus reset di sistem baru.

## Frontend (Repo Ini)
- Saat ini frontend masih menggunakan **mock data** di `app/tickets/mock-data.ts` dan `app/auth/auth-provider.tsx`.
- Nantinya mock data akan diganti dengan fetch ke API backend Go.
- Jangan hapus mock data sampai backend dan API sudah siap.

## Gaya Kode
- Gunakan TypeScript strict untuk frontend.
- Pertahankan semua komentar dan dokumentasi yang sudah ada kecuali diminta sebaliknya.

## Autentikasi & IAM UB
- Sistem login menggunakan **Pure SSO UB** via IAM (OAuth2/OpenID Connect) untuk Mahasiswa & Staff aktif. Login lokal ditiadakan.
- Konfigurasi Client ID: `konseling` / Client Secret: `[DILINDUNGI_DI_ENV]`.
- **Dev Bypass Login**: Rute `/api/auth/dev-login` dibuat untuk keperluan pengujian lokal (development). **WAJIB dipastikan dinonaktifkan/dihapus di lingkungan production/aaPanel** agar tidak memicu celah keamanan bypass login.

## Server & Deployment
- Domain Dev: `dev-konseling.ub.ac.id`
- Frontend: Plesk Hosting UB
- Backend (Go): A Panel (aaPanel) UB
  - Host: `https://panel-konseling.ub.ac.id/2kv8tq2z`
  - Username: `[TERSEDIA_DI_PASSWORD_MANAGER]` (jangan diubah)
  - Password: `[TERSEDIA_DI_PASSWORD_MANAGER]` (jangan diubah)



## Catatan Perubahan & Perkembangan Terakhir (06 Juli 2026)

### 1. Paginasi & Batasan Layout List Kartu (Frontend)
Mengimplementasikan paginasi sisi klien (10 item per halaman) dan membatasi tinggi kontainer setinggi maksimal 3 kartu (`maxHeight: "330px"`, `overflowY: "auto"`) pada empat area daftar utama di dashboard admin:
* **Daftar Tiket** (Dashboard)
* **Daftar Mahasiswa** (Dashboard) — *Bonus memperbaiki render nama lengkap mahasiswa yang sebelumnya kosong akibat kompatibilitas properti GORM/JSON*.
* **Daftar Admin** (Dashboard) — *Membuka pembatasan hardcode slice 5 data sehingga seluruh 31 akun admin terdaftar dapat diakses*.
* **Daftar Tiket Tugas Admin** (Halaman Detail Admin) — *Bonus memperbaiki render tanggal lokal dan nama mahasiswa pembuat tiket*.

### 2. Format Chat Detail Tiket (Pembersihan Tag HTML)
Menyisipkan fungsi deteksi format pesan dinamis (`renderMessageBody`) pada halaman detail chat percakapan tiket:
* Pesan baru bermigrasi bertipe HTML (osTicket lama) dirender secara native (`dangerouslySetInnerHTML`) agar tag HTML mentah seperti `<p>` tidak tampil sebagai teks literal.
* Pesan teks biasa (baru) tetap dirender menggunakan fungsi pembantu link URL otomatis.
* Mengatur margin paragraf HTML di dalam chat bubble agar rapi melalui stylesheet `account-ticket.css`.

### 3. Otomatisasi Alur Status Tiket (Backend & Database)
* **Backend Go**: Memperbarui logika update status tiket pada fungsi `ReplyTicket` (`internal/handler/ticket_handler.go`) agar status otomatis beralih:
  * Menjadi `in_progress` (Sudah Dibalas) jika dibalas oleh Admin/Konselor.
  * Kembali menjadi `open` (Menunggu Balasan) jika dibalas oleh Mahasiswa (agar masuk kembali ke antrean admin).
* **Pembersihan Database PostgreSQL**: Menjalankan kueri pembaruan massal (*bulk update*) di PostgreSQL untuk mengubah status **1.977 tiket** lama dari `open` menjadi `in_progress` karena terdeteksi sudah memiliki minimal satu tanggapan dari peran admin di riwayat percakapannya.

### 4. Perbaikan Visual Grafik Topik Konseling (Dashboard)
* Memperbaiki parse data stat dari API backend (mengubah array objek response menjadi pemetaan dictionary/key-value yang ramah Recharts).
* Membatasi visual grafik topik hanya memuat 3 baris bar teratas dengan area scroll vertikal dinamis berdasarkan total jumlah kategori (`Math.max(160, topicStats.length * 48)`).
* Menghapus awalan redundan `"Konseling "` pada label YAxis serta memperlebar batas kolom teks kiri dan margin kanan agar tulisan label serta angka nilai bar tidak terpotong di tepi canvas.

## Desain Penyimpanan Lampiran (MinIO & Golang Backend)
Untuk implementasi upload lampiran/file chat nantinya, ikuti panduan berikut demi keamanan dan efisiensi:
1. **Keamanan & Privasi Data**:
   - MinIO Bucket untuk lampiran konseling **WAJIB bersifat PRIVAT** (bukan public bucket).
   - Akses file oleh user/konselor dilakukan menggunakan **Temporary Presigned GET URL** (misal berlaku selama 10-15 menit) yang digenerate oleh backend Go saat membuka halaman chat.
2. **Validasi File di Backend Go**:
   - Deteksi tipe file asli menggunakan **Magic Numbers (512 byte pertama)** melalui `http.DetectContentType` (jangan percaya ekstensi nama file atau header Content-Type).
   - Hanya izinkan format yang aman: PDF, Word (Doc/Docx), dan Gambar (JPEG, PNG, WebP).
3. **Pemrosesan Gambar (BE-side Processing)**:
   - Gunakan library Go seperti `disintegration/imaging` untuk me-resize gambar yang terlalu besar ke lebar maksimal **2048px**.
   - Kompres dan konversi semua gambar menjadi format **WebP** dengan kualitas **82%** sebelum dikirim ke MinIO.
4. **Pencegahan Directory Traversal**:
   - Selalu ganti nama file asli menjadi **UUID v4** acak sebelum diunggah ke MinIO. Nama asli file hanya disimpan di database untuk kebutuhan tampilan.

## Cara Pindah Environment (Dev / Prod)
### 1. Frontend Configuration
Konfigurasi API URL dan JWT Key di frontend terpusat pada satu file saja: **`src/utils/api.ts`**. Berkas `.env` di frontend tidak digunakan lagi untuk mempermudah peralihan.
- **Untuk Development (Lokal)**: Aktifkan `export const BASE_URL = "http://localhost:8080"` di `src/utils/api.ts` dan komentari baris URL production.
- **Untuk Production**: Komentari baris lokal dev, lalu uncomment `export const BASE_URL = "https://api-konseling.ub.ac.id"`.
- Agen dilarang keras memecah konfigurasi URL ini kembali ke berkas `.env` eksternal lain di frontend agar tetap memiliki *single source of truth*.

### 2. Backend Configuration (Golang BE)
Konfigurasi environment backend berada di berkas **`peer-conselour-be/.env`**. Berkas ini memiliki dua blok konfigurasi utama (Dev dan Prod) yang dipisahkan dengan jelas:
- **Untuk Development (Lokal)**: Aktifkan/uncomment semua baris di bawah blok `✅ DEVELOPMENT (Local Config)` dan berikan tanda komentar (`#`) pada baris di bawah blok `🚀 PRODUCTION (Server Config)`.
- **Untuk Production**: Berikan tanda komentar (`#`) pada baris di bawah blok `✅ DEVELOPMENT` dan aktifkan/uncomment baris di bawah blok `🚀 PRODUCTION`.
- Pengaturan IAM UB yang bersifat umum didefinisikan di bagian bawah berkas sebagai nilai bersama (shared configs).

## Aturan Desain & Animasi Pop-up Modal
1. **Penyelarasan Desain Modal**:
   - Setiap modal baru atau yang dimodifikasi wajib mengikuti bahasa visual modal login/SSO (sudut membulat `border-radius: 22px` atau `24px`, bayangan lembut `box-shadow`, padding nyaman, dan struktur header yang bersih).
   - Tajuk modal (*Header*) wajib menyertakan identitas branding resmi (Logo UB + nama unit *"Layanan Konseling - Universitas Brawijaya"*) dan tombol silang penutup bulat (`X` bulat) jika penutupan manual diizinkan.
2. **Efek Animasi Pembukaan (Transition & Keyframes)**:
   - **Backdrop (Overlay)**: Wajib dianimasikan memudar masuk (*fade-in*) menggunakan `authBackdropFade` atau `ticketBackdropFade` (transisi opacity dari `0` ke `1` selama `0.25s` dengan bezier `cubic-bezier(0.16, 1, 0.3, 1)`).
   - **Panel Modal**: Wajib dianimasikan dengan efek melompat membesar halus (*scale zoom-in*) menggunakan `authPanelZoom` atau `ticketPanelZoom` (transisi scale dari `0.92` ke `1` dan opacity `0` ke `1` selama `0.32s` dengan bezier elastic `cubic-bezier(0.34, 1.56, 0.64, 1)`).
   - Semua modal baru harus mengimplementasikan atau mewarisi kelas animasi ini agar transisi tampil seragam di seluruh aplikasi.


