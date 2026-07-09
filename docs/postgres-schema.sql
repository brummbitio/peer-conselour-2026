-- ==========================================
-- SKEMA POSTGRESQL - WEBSITE KONSELING BARU
-- ==========================================
-- File ini adalah rancangan tabel target hasil migrasi dari osTicket.
-- Semua ID menggunakan SERIAL agar mempermudah relasi data historis.

-- 1. ENUM DEFINITIONS
CREATE TYPE user_role AS ENUM ('student', 'admin', 'superadmin');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved');
CREATE TYPE message_sender AS ENUM ('mahasiswa', 'admin');
CREATE TYPE schedule_status AS ENUM ('pending_confirmation', 'scheduled', 'reschedule', 'cancelled', 'completed');
CREATE TYPE service_type AS ENUM ('tatap_muka', 'online');

-- 2. TABEL USERS (Mahasiswa, Peer Counselor, & Admin/Staff)
CREATE TABLE users (
    id SERIAL PRIMARY KEY,                    -- Menggunakan ID dari ost_user.id & ost_staff.staff_id
    nim VARCHAR(50) UNIQUE,                   -- NIM mahasiswa (NULL untuk data migrasi lama yang tidak lengkap)
    email VARCHAR(255) UNIQUE NOT NULL,       -- Email aktif
    password_hash VARCHAR(255),               -- Nullable (SSO tidak pakai password lokal)
    full_name VARCHAR(255) NOT NULL,          -- Nama lengkap
    role user_role NOT NULL DEFAULT 'student',-- Peran pengguna
    gender VARCHAR(20),                       -- 'Laki-laki' atau 'Perempuan'
    faculty VARCHAR(255),                     -- Nama fakultas hasil lookup (teks)
    department VARCHAR(255),                  -- Nama jurusan (teks)
    phone VARCHAR(50),                        -- Nomor HP (format bersih)
    origin_region VARCHAR(255),               -- Wilayah asal
    malang_address TEXT,                      -- Alamat kos/tinggal di Malang
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 3. TABEL TICKETS (Tiket Sesi Konseling)
CREATE TABLE tickets (
    id SERIAL PRIMARY KEY,                    -- Menggunakan ID dari ost_ticket.ticket_id
    code VARCHAR(50) UNIQUE NOT NULL,         -- Kode tiket (misal: '004575')
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    counselor_id INT REFERENCES users(id) ON DELETE SET NULL, -- Konselor yang menangani
    title VARCHAR(255) NOT NULL,              -- Subjek keluhan
    category VARCHAR(100) NOT NULL,           -- Bidang/Topik keluhan
    status ticket_status NOT NULL DEFAULT 'open',
    tahap_konseling VARCHAR(50),              -- 'Pertama' atau 'Lanjutan'
    summary TEXT,                             -- Ringkasan sesi
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    closed_at TIMESTAMP
);

-- 4. TABEL TICKET_MESSAGES (Riwayat Chat Tiket)
CREATE TABLE ticket_messages (
    id SERIAL PRIMARY KEY,                    -- Menggunakan ID dari ost_thread_entry.id
    ticket_id INT NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id),
    sender_role message_sender NOT NULL,
    sender_name VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,                       -- Isi pesan (HTML / Text disanitasi)
    created_at TIMESTAMP NOT NULL
);

-- 5. TABEL COUNSELING_SCHEDULES (Jadwal Konseling - Kanban/Kalender)
CREATE TABLE counseling_schedules (
    id SERIAL PRIMARY KEY,
    ticket_id INT REFERENCES tickets(id) ON DELETE SET NULL,
    client_name VARCHAR(255) NOT NULL,
    date_value DATE NOT NULL,
    time_value VARCHAR(100) NOT NULL,         -- contoh: '09:00' atau '09:00 - 10:30'
    handler_id INT REFERENCES users(id) ON DELETE SET NULL,
    service_type service_type NOT NULL,
    status schedule_status NOT NULL DEFAULT 'pending_confirmation',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
