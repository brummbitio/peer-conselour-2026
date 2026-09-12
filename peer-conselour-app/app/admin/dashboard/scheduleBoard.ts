import type {
  CounselingScheduleColumn,
  CounselingScheduleItem,
  CounselingScheduleStatus,
} from "./types";

/**
 * Bentuk mentah satu jadwal seperti yang dikirim `GET /api/admin/schedules`.
 * Sengaja permisif: backend boleh mengirim `handler: null` atau `date_value`
 * dalam format RFC3339 penuh.
 */
export type AdminScheduleApiItem = {
  id: number | string;
  client_name?: string | null;
  date_value?: string | null;
  time_value?: string | null;
  service_type?: string | null;
  status?: string | null;
  handler?: { full_name?: string | null } | null;
};

/**
 * Status optimistis per kartu: hasil drag & drop yang belum dikonfirmasi server.
 * Selama sebuah id ada di sini, nilainya menang atas status dari server —
 * inilah yang mencegah respons GET basi menarik kartu balik ke kolom asal.
 */
export type PendingStatusMap = Readonly<Record<string, CounselingScheduleStatus>>;

/** Perubahan optimistis dari overlay edit (jam, konselor, jenis layanan). */
export type PendingFieldsMap = Readonly<
  Record<string, Readonly<Partial<CounselingScheduleItem>>>
>;

export const UNASSIGNED_HANDLER = "Belum Ditugaskan";

export const SCHEDULE_COLUMN_META: ReadonlyArray<{
  id: CounselingScheduleStatus;
  title: string;
  description: string;
}> = [
  { id: "pending_confirmation", title: "Konfirmasi", description: "Menunggu persetujuan" },
  { id: "scheduled", title: "Terjadwal", description: "Sesi konseling disepakati" },
  { id: "reschedule", title: "Reschedule", description: "Permintaan atur ulang waktu" },
  { id: "cancelled", title: "Dibatalkan", description: "Sesi konseling batal" },
  { id: "completed", title: "Selesai", description: "Sesi konseling telah usai" },
];

const SCHEDULE_STATUS_SET: ReadonlySet<string> = new Set(
  SCHEDULE_COLUMN_META.map((meta) => meta.id)
);

export function isScheduleStatus(value: unknown): value is CounselingScheduleStatus {
  return typeof value === "string" && SCHEDULE_STATUS_SET.has(value);
}

/** Normalisasi satu baris API menjadi item kartu Kanban. */
export function toScheduleItem(raw: AdminScheduleApiItem): CounselingScheduleItem {
  const dateValue = raw.date_value ? String(raw.date_value).split("T")[0] ?? "" : "";
  return {
    id: String(raw.id),
    clientName: raw.client_name ?? "",
    dateValue,
    timeValue: raw.time_value ?? "",
    handlerName: raw.handler?.full_name || UNASSIGNED_HANDLER,
    serviceType: raw.service_type === "online" ? "online" : "tatap_muka",
  };
}

/**
 * Urutan yang sama persis dengan backend (`ORDER BY date_value ASC, time_value ASC`),
 * dengan id sebagai tie-break supaya deterministik.
 *
 * Penting untuk kemulusan: kartu yang dipindah secara optimistis langsung mendarat
 * di posisi yang nanti juga dipakai server, jadi sinkronisasi latar tidak menggeser
 * apa pun.
 */
export function compareScheduleItems(
  a: CounselingScheduleItem,
  b: CounselingScheduleItem
): number {
  if (a.dateValue !== b.dateValue) return a.dateValue < b.dateValue ? -1 : 1;
  if (a.timeValue !== b.timeValue) return a.timeValue < b.timeValue ? -1 : 1;
  const aId = Number(a.id);
  const bId = Number(b.id);
  if (Number.isFinite(aId) && Number.isFinite(bId) && aId !== bId) return aId - bId;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Satu-satunya sumber kebenaran tampilan papan: data server digabung dengan
 * perubahan optimistis yang belum dikonfirmasi. Murni — tidak ada state internal,
 * jadi aman dipanggil dari `useMemo` setiap render.
 */
export function buildScheduleColumns(
  liveSchedules: readonly AdminScheduleApiItem[],
  pendingStatus: PendingStatusMap = {},
  pendingFields: PendingFieldsMap = {}
): CounselingScheduleColumn[] {
  const columns = SCHEDULE_COLUMN_META.map<CounselingScheduleColumn>((meta) => ({
    ...meta,
    items: [],
  }));
  const byStatus = new Map<CounselingScheduleStatus, CounselingScheduleItem[]>(
    columns.map((column) => [column.id, column.items])
  );

  for (const raw of liveSchedules) {
    const item = toScheduleItem(raw);
    const overrides = pendingFields[item.id];
    const merged = overrides ? { ...item, ...overrides } : item;

    const optimisticStatus = pendingStatus[item.id];
    const serverStatus = raw.status;
    const status = optimisticStatus ?? (isScheduleStatus(serverStatus) ? serverStatus : null);
    if (!status) continue;

    byStatus.get(status)?.push(merged);
  }

  for (const column of columns) column.items.sort(compareScheduleItems);
  return columns;
}

/**
 * Buang override status yang sudah disusul server. Mengembalikan referensi
 * `pending` yang sama saat tidak ada perubahan, supaya aman dipakai di dalam
 * `setState` updater tanpa memicu render berulang.
 */
export function prunePendingStatus(
  pending: PendingStatusMap,
  liveSchedules: readonly AdminScheduleApiItem[]
): PendingStatusMap {
  const pendingIds = Object.keys(pending);
  if (pendingIds.length === 0) return pending;

  const serverStatusById = new Map<string, string | null | undefined>(
    liveSchedules.map((raw) => [String(raw.id), raw.status])
  );

  let changed = false;
  const next: Record<string, CounselingScheduleStatus> = { ...pending };
  for (const id of pendingIds) {
    // Server sudah setuju, atau jadwalnya hilang sama sekali -> override tidak relevan lagi.
    if (!serverStatusById.has(id) || serverStatusById.get(id) === pending[id]) {
      delete next[id];
      changed = true;
    }
  }
  return changed ? next : pending;
}

/** Versi `prunePendingStatus` untuk perubahan jam / konselor / jenis layanan. */
export function prunePendingFields(
  pending: PendingFieldsMap,
  liveSchedules: readonly AdminScheduleApiItem[]
): PendingFieldsMap {
  const pendingIds = Object.keys(pending);
  if (pendingIds.length === 0) return pending;

  const serverItemById = new Map<string, CounselingScheduleItem>(
    liveSchedules.map((raw) => {
      const item = toScheduleItem(raw);
      return [item.id, item];
    })
  );

  let changed = false;
  const next: Record<string, Readonly<Partial<CounselingScheduleItem>>> = { ...pending };
  for (const id of pendingIds) {
    const serverItem = serverItemById.get(id);
    if (!serverItem) {
      delete next[id];
      changed = true;
      continue;
    }
    const overrides = pending[id] ?? {};
    const settled = (Object.keys(overrides) as Array<keyof CounselingScheduleItem>).every(
      (field) => serverItem[field] === overrides[field]
    );
    if (settled) {
      delete next[id];
      changed = true;
    }
  }
  return changed ? next : pending;
}

/**
 * Buang override milik kartu yang PUT-nya sudah selesai.
 *
 * Pencocokan nilai saja tidak cukup: kalau admin men-drop kartu yang sama dua
 * kali beruntun, urutan PUT bisa terbalik dan override terakhir tidak akan
 * pernah cocok dengan nilai server — kartu jadi menampilkan status palsu
 * selamanya. Begitu PUT selesai dan payload server berikutnya tiba, kita
 * serahkan lagi kendali ke server tanpa syarat.
 */
export function dropSettledOverrides<TValue>(
  pending: Readonly<Record<string, TValue>>,
  settledIds: ReadonlySet<string>
): Readonly<Record<string, TValue>> {
  if (settledIds.size === 0) return pending;

  let changed = false;
  const next: Record<string, TValue> = { ...pending };
  settledIds.forEach((id) => {
    if (id in next) {
      delete next[id];
      changed = true;
    }
  });
  return changed ? next : pending;
}

/** Status efektif sebuah kartu saat ini (optimistis kalau ada, kalau tidak dari server). */
export function findScheduleStatus(
  cardId: string,
  liveSchedules: readonly AdminScheduleApiItem[],
  pendingStatus: PendingStatusMap = {}
): CounselingScheduleStatus | null {
  const optimistic = pendingStatus[cardId];
  if (optimistic) return optimistic;
  for (const raw of liveSchedules) {
    if (String(raw.id) === cardId) {
      return isScheduleStatus(raw.status) ? raw.status : null;
    }
  }
  return null;
}
