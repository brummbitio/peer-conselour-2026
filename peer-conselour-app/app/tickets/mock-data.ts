export type TicketStatus = "open" | "in_progress" | "resolved";

export type StudentProfile = {
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

export type TicketItem = {
  id: string;
  code: string;
  title: string;
  category: string;
  status: TicketStatus;
  createdAt: string;
  lastReplyAt: string;
  counselor: string;
  summary: string;
  studentId: string;
};

export type TicketMessage = {
  id: string;
  ticketId: string;
  sender: "mahasiswa" | "admin";
  senderName: string;
  sentAt: string;
  body: string;
};

export const counselingBookings = [
  {
    id: "booking-1",
    title: "Konseling Individu Reguler",
    mode: "Tatap Muka",
    dateRange: "14 April 2026 - 12 Mei 2026",
    counselor: "Nadia Prameswari, M.Psi",
    location: "Gedung Rektorat Lt. 2",
    image: "/hero/hero-photo.webp",
    ticketId: "tkt-001",
    status: "active" as const,
  },
  {
    id: "booking-2",
    title: "Sesi Tindak Lanjut Akademik",
    mode: "Online",
    dateRange: "2 Maret 2026 - 30 Maret 2026",
    counselor: "Dr. Maya Hartono",
    location: "Google Meet",
    image: "/articles/gentle-reset.svg",
    ticketId: "tkt-002",
    status: "history" as const,
  },
];

export const tickets: TicketItem[] = [
  {
    id: "tkt-001",
    code: "UB-CS-001",
    title: "Saya merasa cemas menjelang ujian akhir",
    category: "Akademik",
    status: "in_progress",
    createdAt: "13 April 2026",
    lastReplyAt: "14 April 2026, 09:20",
    counselor: "Nadia Prameswari, M.Psi",
    summary:
      "Mahasiswa mengalami overthinking dan sulit tidur menjelang ujian.",
    studentId: "std-001",
  },
  {
    id: "tkt-002",
    code: "UB-CS-002",
    title: "Ingin konsultasi terkait konflik pertemanan",
    category: "Relasi Sosial",
    status: "open",
    createdAt: "10 April 2026",
    lastReplyAt: "10 April 2026, 19:12",
    counselor: "Dr. Maya Hartono",
    summary:
      "Mahasiswa merasa tidak nyaman dalam kelompok pertemanan dan butuh arahan komunikasi.",
    studentId: "std-002",
  },
  {
    id: "tkt-003",
    code: "UB-CS-003",
    title: "Perlu pendampingan setelah mengalami perundungan",
    category: "Perundungan",
    status: "resolved",
    createdAt: "3 April 2026",
    lastReplyAt: "7 April 2026, 14:30",
    counselor: "Rafi Aditya, M.Psi",
    summary:
      "Kasus telah ditangani dengan pendampingan awal, rujukan, dan pemantauan berkala.",
    studentId: "std-003",
  },
];

export const studentProfiles: StudentProfile[] = [
  {
    id: "std-001",
    nim: "2024100001",
    fullName: "Fernando Pradana",
    gender: "Laki-laki",
    faculty: "Fakultas Ilmu Komputer",
    department: "Teknik Informatika",
    email: "fernando@student.ub.ac.id",
    phone: "0812-3456-7890",
    originRegion: "Bandung, Jawa Barat",
    malangAddress: "Jl. Soekarno Hatta No. 24, Lowokwaru, Malang",
  },
  {
    id: "std-002",
    nim: "2024100002",
    fullName: "Nadia Cahyaningrum",
    gender: "Perempuan",
    faculty: "Fakultas Ilmu Komputer",
    department: "Sistem Informasi",
    email: "nadia@student.ub.ac.id",
    phone: "0813-1298-4431",
    originRegion: "Madiun, Jawa Timur",
    malangAddress: "Perum Griya Cempaka Asri Blok B3, Dau, Malang",
  },
  {
    id: "std-003",
    nim: "2023100456",
    fullName: "Nabila Ayu Lestari",
    gender: "Perempuan",
    faculty: "FISIP",
    department: "Ilmu Komunikasi",
    email: "nabila.ayu@student.ub.ac.id",
    phone: "0813-2200-7744",
    originRegion: "Denpasar, Bali",
    malangAddress: "Jl. Sigura-gura No. 88, Lowokwaru, Malang",
  },
];

export const ticketMessages: TicketMessage[] = [
  {
    id: "msg-1",
    ticketId: "tkt-001",
    sender: "mahasiswa",
    senderName: "Fernando",
    sentAt: "13 April 2026, 20:14",
    body: "Kak, saya akhir-akhir ini susah tidur karena kepikiran ujian. Fokus belajar jadi turun.",
  },
  {
    id: "msg-2",
    ticketId: "tkt-001",
    sender: "admin",
    senderName: "Admin UB",
    sentAt: "14 April 2026, 09:20",
    body: "Terima kasih sudah cerita. Kita bisa mulai dari teknik grounding singkat sebelum belajar dan susun jadwal belajar yang realistis, ya.",
  },
  {
    id: "msg-3",
    ticketId: "tkt-002",
    sender: "mahasiswa",
    senderName: "Fernando",
    sentAt: "10 April 2026, 19:12",
    body: "Saya bingung cara ngobrol baik-baik ke teman kelompok yang sering meremehkan.",
  },
  {
    id: "msg-4",
    ticketId: "tkt-003",
    sender: "admin",
    senderName: "Admin UB",
    sentAt: "07 April 2026, 14:30",
    body: "Terima kasih sudah melapor. Kami sudah menyiapkan rencana pendampingan dan titik aman jika dibutuhkan.",
  },
];

export function getTicketById(id: string) {
  return tickets.find((item) => item.id === id);
}

export function getMessagesByTicketId(ticketId: string) {
  return ticketMessages.filter((message) => message.ticketId === ticketId);
}

export function getStudentById(id: string) {
  return studentProfiles.find((student) => student.id === id);
}

export function getFirstResponderByTicketId(ticketId: string) {
  return (
    ticketMessages.find(
      (message) => message.ticketId === ticketId && message.sender === "admin"
    )?.senderName ?? null
  );
}

export function getFirstResponderByTicketMap() {
  return tickets.reduce<Record<string, string | null>>((acc, ticket) => {
    acc[ticket.id] = getFirstResponderByTicketId(ticket.id);
    return acc;
  }, {});
}

export function getFirstResponderRecap() {
  const recap = tickets.reduce<Record<string, number>>((acc, ticket) => {
    const firstResponder = getFirstResponderByTicketId(ticket.id);
    if (!firstResponder) return acc;
    acc[firstResponder] = (acc[firstResponder] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(recap)
    .map(([adminName, count]) => ({ adminName, count }))
    .sort((a, b) => b.count - a.count);
}

export const ticketStatusLabel: Record<TicketStatus, string> = {
  open: "Menunggu Balasan",
  in_progress: "Sudah Dibalas",
  resolved: "Selesai",
};
