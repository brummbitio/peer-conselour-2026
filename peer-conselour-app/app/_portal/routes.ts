export type BackTarget = {
  href: string;
  label: string;
};

/** Tujuan tombol kembali yang seragam di seluruh portal mahasiswa & admin. */
export const PORTAL_BACK_TARGETS = {
  studentTickets: { href: "/my-counseling", label: "Kembali ke Tiket Saya" },
  adminTickets: { href: "/admin/dashboard?tab=tickets", label: "Kembali ke Daftar Tiket" },
  adminStudents: { href: "/admin/dashboard?tab=students", label: "Kembali ke Daftar Mahasiswa" },
  adminAdmins: { href: "/admin/dashboard?tab=admins", label: "Kembali ke Daftar Admin" },
} as const satisfies Record<string, BackTarget>;
