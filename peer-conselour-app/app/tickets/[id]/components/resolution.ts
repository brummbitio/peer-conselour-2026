// Nilai disimpan di kolom tickets.resolution_reason. Label hanya tampil di sisi
// admin: mahasiswa tidak pernah melihat alasan penutupan.
export const RESOLUTION_REASON_OPTIONS: { value: string; label: string; hint?: string }[] = [
  { value: "klien_tidak_membalas", label: "Klien tidak membalas", hint: "biasanya dipilih setelah reminder H+7" },
  { value: "klien_tidak_datang", label: "Klien tidak datang konseling (No-show)" },
  { value: "lainnya", label: "Lainnya" },
];

export const resolutionReasonLabel = (value?: string | null) =>
  RESOLUTION_REASON_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "-";

export const STUDENT_CLOSURE_MESSAGE =
  "Terima kasih telah berani melangkah dan bercerita bersama Layanan Konseling UB. Kamu selalu dipersilakan membuka tiket baru kapan pun membutuhkan teman bercerita kembali.";
