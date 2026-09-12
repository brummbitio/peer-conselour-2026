export const GENDER_OPTIONS = ["Laki-laki", "Perempuan"];

export const FACULTY_OPTIONS = [
  "Fakultas Ilmu Komputer",
  "Fakultas Teknik",
  "Fakultas Kedokteran",
  "Fakultas Hukum",
  "Fakultas Ekonomi dan Bisnis",
  "Fakultas Ilmu Administrasi",
  "Fakultas Pertanian",
  "Fakultas Peternakan",
  "Fakultas Perikanan dan Ilmu Kelautan",
  "Fakultas Matematika dan Ilmu Pengetahuan Alam",
  "Fakultas Ilmu Sosial dan Ilmu Politik",
  "Fakultas Ilmu Budaya",
  "Fakultas Vokasi",
];

export const normalizeFaculty = (fac: string | undefined): string => {
  if (!fac) return "";
  if (fac.startsWith("Fakultas ") || fac === "Program Pascasarjana") return fac;
  return "Fakultas " + fac;
};
