"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  PanelsTopLeft,
  CalendarDays,
  Plus,
  Expand,
  Shrink,
  UserRound,
  Video,
  Users,
  Check,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/utils/api";
import { DateTimePanel } from "@/components/application/date-picker/date-time-panel";
import { ScheduleCalendar } from "../ScheduleCalendar";
import { AddScheduleModal } from "./AddScheduleModal";
import {
  formatScheduleDateLabel,
  formatScheduleTimeDisplay,
} from "../types";
import type {
  CounselingScheduleItem,
  CounselingScheduleStatus,
  ScheduleOverlayKind,
  ScheduleOverlayState,
} from "../types";
import {
  UNASSIGNED_HANDLER,
  buildScheduleColumns,
  dropSettledOverrides,
  findScheduleStatus,
  prunePendingFields,
  prunePendingStatus,
  type AdminScheduleApiItem,
  type PendingFieldsMap,
  type PendingStatusMap,
} from "../scheduleBoard";
import "../../../styles/admin-schedule.css";

/**
 * Tipe MIME khusus supaya papan bisa mengenali drag miliknya sendiri tanpa
 * membaca `dataTransfer.getData` — yang memang diblokir browser selama
 * `dragover`. `dataTransfer.types` boleh dibaca kapan saja.
 */
const SCHEDULE_CARD_MIME = "application/x-schedule-card";

/** Durasi animasi mendarat; harus sinkron dengan `admin-schedule-card-land` di CSS. */
const CARD_LANDING_MS = 420;

interface AdminSchedulesTabProps {
  liveSchedules: AdminScheduleApiItem[];
  adminAccounts: any[];
  adminStudents: any[];
  refetchSchedules: () => void;
}

export function AdminSchedulesTab({
  liveSchedules,
  adminAccounts,
  adminStudents,
  refetchSchedules,
}: AdminSchedulesTabProps) {
  const [scheduleViewMode, setScheduleViewMode] = useState<"kanban" | "calendar">("kanban");
  const [activeScheduleOverlay, setActiveScheduleOverlay] = useState<ScheduleOverlayState | null>(null);
  const [collapsedColumns, setCollapsedColumns] = useState<CounselingScheduleStatus[]>([]);
  const [isAddScheduleModalOpen, setIsAddScheduleModalOpen] = useState(false);

  // Status dan state konfirmasi hapus kartu jadwal
  const [scheduleToDelete, setScheduleToDelete] = useState<CounselingScheduleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedScheduleIds, setDeletedScheduleIds] = useState<Set<string>>(new Set());

  // Perubahan optimistis yang belum dikonfirmasi server. Selama sebuah id ada
  // di sini, nilainya menang atas data server — inilah yang membuat kartu tidak
  // pernah "mental" balik saat respons GET yang basi mendarat.
  const [pendingStatus, setPendingStatus] = useState<PendingStatusMap>({});
  const [pendingFields, setPendingFields] = useState<PendingFieldsMap>({});

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [dragOverColumnId, setDragOverColumnId] = useState<CounselingScheduleStatus | null>(null);
  const [landedCardId, setLandedCardId] = useState<string | null>(null);

  const scheduleOverlayRef = useRef<HTMLDivElement | null>(null);
  // Ref, bukan state: `onDrop` harus bisa membaca kartu yang sedang di-drag
  // tanpa bergantung pada closure render yang mungkin sudah basi.
  const draggedCardIdRef = useRef<string | null>(null);
  const dragOverColumnRef = useRef<CounselingScheduleStatus | null>(null);
  const landingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Kartu yang PUT-nya sudah selesai: kendali dikembalikan ke server pada
  // payload berikutnya, apa pun isinya.
  const settledStatusRef = useRef<Set<string>>(new Set());
  const settledFieldsRef = useRef<Set<string>>(new Set());

  /**
   * Data jadwal yang aktif (tidak termasuk kartu yang baru dihapus secara optimistis).
   */
  const activeLiveSchedules = useMemo(() => {
    if (deletedScheduleIds.size === 0) return liveSchedules;
    return liveSchedules.filter((item) => !deletedScheduleIds.has(String(item.id)));
  }, [liveSchedules, deletedScheduleIds]);

  /**
   * Papan dirender langsung dari (data server + perubahan optimistis).
   * Tidak ada lagi `useEffect` yang menyalin data server ke state lokal —
   * penyalinan itulah yang dulu menimpa hasil drag & drop.
   */
  const scheduleColumns = useMemo(
    () => buildScheduleColumns(activeLiveSchedules, pendingStatus, pendingFields),
    [activeLiveSchedules, pendingStatus, pendingFields]
  );

  // Buang override yang sudah disusul server. Kedua fungsi prune mengembalikan
  // referensi yang sama saat tidak ada perubahan, jadi React langsung bail-out
  // dan efek ini tidak bisa memicu render berulang.
  useEffect(() => {
    // Hook data memakai penjaga nomor urut, jadi `liveSchedules` hanya pernah
    // berubah dari request TERBARU. Payload ini karenanya pasti terbit setelah
    // PUT yang sudah selesai di bawah.
    const settledStatuses = settledStatusRef.current;
    const settledFields = settledFieldsRef.current;
    settledStatusRef.current = new Set();
    settledFieldsRef.current = new Set();

    setPendingStatus((prev) =>
      dropSettledOverrides(prunePendingStatus(prev, liveSchedules), settledStatuses)
    );
    setPendingFields((prev) =>
      dropSettledOverrides(prunePendingFields(prev, liveSchedules), settledFields)
    );

    // Bersihkan ID kartu yang sudah benar-benar hilang dari server
    if (deletedScheduleIds.size > 0) {
      const serverIds = new Set(liveSchedules.map((s) => String(s.id)));
      setDeletedScheduleIds((prev) => {
        let changed = false;
        const next = new Set<string>();
        for (const id of prev) {
          if (serverIds.has(id)) {
            next.add(id);
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }
  }, [liveSchedules, deletedScheduleIds.size]);

  useEffect(() => {
    return () => {
      if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
    };
  }, []);

  // Kunci scroll body dan tangkap tombol Escape saat modal konfirmasi hapus aktif
  useEffect(() => {
    if (!scheduleToDelete) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isDeleting) {
        setScheduleToDelete(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [scheduleToDelete, isDeleting]);

  const toggleColumnCollapse = (columnId: CounselingScheduleStatus) => {
    setCollapsedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  // ---------------------------------------------------------------------------
  // Mutasi
  // ---------------------------------------------------------------------------

  const markCardLanded = useCallback((cardId: string) => {
    if (landingTimerRef.current) clearTimeout(landingTimerRef.current);
    setLandedCardId(cardId);
    landingTimerRef.current = setTimeout(() => setLandedCardId(null), CARD_LANDING_MS);
  }, []);

  const updateScheduleItemStatus = useCallback(
    async (cardId: string, targetColumnId: CounselingScheduleStatus) => {
      const currentStatus = findScheduleStatus(cardId, liveSchedules, pendingStatus);
      if (!currentStatus || currentStatus === targetColumnId) return;

      // 1. Pindahkan kartu seketika.
      setPendingStatus((prev) => ({ ...prev, [cardId]: targetColumnId }));
      markCardLanded(cardId);

      try {
        // 2. Simpan ke PostgreSQL.
        await api.put(`/api/admin/schedules/${cardId}`, { status: targetColumnId });
        settledStatusRef.current.add(cardId);
        // 3. Sinkron senyap — tidak memunculkan layar loading apa pun.
        refetchSchedules();
      } catch (err) {
        console.error("Gagal memperbarui status jadwal ke server:", err);
        // Rollback langsung; jauh lebih cepat dan pasti daripada menunggu refetch.
        setPendingStatus((prev) => {
          if (!(cardId in prev)) return prev;
          const next = { ...prev };
          delete next[cardId];
          return next;
        });
      }
    },
    [liveSchedules, pendingStatus, markCardLanded, refetchSchedules]
  );

  const updateScheduleItem = useCallback(
    async (cardId: string, updater: (item: CounselingScheduleItem) => CounselingScheduleItem) => {
      let currentItem: CounselingScheduleItem | null = null;
      for (const column of scheduleColumns) {
        const found = column.items.find((it) => it.id === cardId);
        if (found) {
          currentItem = found;
          break;
        }
      }
      if (!currentItem) return;

      const nextItem = updater(currentItem);

      let handlerId: number | undefined;
      if (nextItem.handlerName && nextItem.handlerName !== UNASSIGNED_HANDLER) {
        const matched = adminAccounts.find((acc) => acc.fullName === nextItem.handlerName);
        if (matched) handlerId = Number(matched.nim);
      }

      // Hanya field yang benar-benar dikirim ke server yang boleh dijadikan
      // override optimistis, supaya tampilan tidak pernah menjanjikan perubahan
      // yang tidak tersimpan (dan override-nya pasti bisa "settle").
      const overrides: Partial<CounselingScheduleItem> = {};
      if (nextItem.dateValue) overrides.dateValue = nextItem.dateValue;
      if (nextItem.timeValue) overrides.timeValue = nextItem.timeValue;
      if (nextItem.serviceType) overrides.serviceType = nextItem.serviceType;
      if (handlerId !== undefined) overrides.handlerName = nextItem.handlerName;

      setPendingFields((prev) => ({ ...prev, [cardId]: { ...prev[cardId], ...overrides } }));

      try {
        await api.put(`/api/admin/schedules/${cardId}`, {
          date_value: nextItem.dateValue,
          time_value: nextItem.timeValue,
          handler_id: handlerId,
          service_type: nextItem.serviceType,
        });
        settledFieldsRef.current.add(cardId);
        refetchSchedules();
      } catch (err) {
        console.error("Gagal memperbarui jadwal di server:", err);
        setPendingFields((prev) => {
          if (!(cardId in prev)) return prev;
          const next = { ...prev };
          delete next[cardId];
          return next;
        });
      }
    },
    [scheduleColumns, adminAccounts, refetchSchedules]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!scheduleToDelete) return;
    const targetId = scheduleToDelete.id;
    setIsDeleting(true);

    // Hapus sementara dari UI secara optimistis
    setDeletedScheduleIds((prev) => new Set(prev).add(targetId));

    try {
      await api.delete(`/api/admin/schedules/${targetId}`);
      setScheduleToDelete(null);
      refetchSchedules();
    } catch (err) {
      console.error("Gagal menghapus jadwal konseling:", err);
      // Rollback jika server gagal
      setDeletedScheduleIds((prev) => {
        const next = new Set(prev);
        next.delete(targetId);
        return next;
      });
      alert("Gagal menghapus jadwal konseling. Silakan coba beberapa saat lagi.");
    } finally {
      setIsDeleting(false);
    }
  }, [scheduleToDelete, refetchSchedules]);

  // ---------------------------------------------------------------------------
  // Drag & Drop
  // ---------------------------------------------------------------------------

  const resetDragState = useCallback(() => {
    draggedCardIdRef.current = null;
    dragOverColumnRef.current = null;
    setDraggedCardId(null);
    setDragOverColumnId(null);
  }, []);

  /**
   * Jaring pengaman. `dragend` dikirim browser ke elemen sumber; begitu React
   * memindahkan kartu ke kolom lain, node sumber sudah dilepas dari DOM sehingga
   * event-nya tidak pernah sampai ke handler React. Tanpa ini papan bisa
   * tertinggal dalam state "sedang men-drag" dan berhenti merespons.
   */
  useEffect(() => {
    const handleGlobalDragEnd = () => resetDragState();
    window.addEventListener("dragend", handleGlobalDragEnd);
    window.addEventListener("drop", handleGlobalDragEnd);
    return () => {
      window.removeEventListener("dragend", handleGlobalDragEnd);
      window.removeEventListener("drop", handleGlobalDragEnd);
    };
  }, [resetDragState]);

  const isScheduleCardDrag = (event: React.DragEvent<HTMLElement>): boolean =>
    draggedCardIdRef.current !== null ||
    Array.prototype.includes.call(event.dataTransfer.types, SCHEDULE_CARD_MIME);

  const setDragOverColumn = useCallback((columnId: CounselingScheduleStatus | null) => {
    // `dragover` menyala terus-menerus; tanpa penjaga ini setiap gerakan mouse
    // memicu render ulang seluruh papan dan terasa tersendat.
    if (dragOverColumnRef.current === columnId) return;
    dragOverColumnRef.current = columnId;
    setDragOverColumnId(columnId);
  }, []);

  const handleDragStart = (event: React.DragEvent<HTMLElement>, cardId: string) => {
    draggedCardIdRef.current = cardId;
    setDraggedCardId(cardId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(SCHEDULE_CARD_MIME, cardId);
    event.dataTransfer.setData("text/plain", cardId);
  };

  const handleDragEnd = () => resetDragState();

  const handleDragEnter = (event: React.DragEvent<HTMLElement>, columnId: CounselingScheduleStatus) => {
    if (!isScheduleCardDrag(event)) return;
    event.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLElement>, columnId: CounselingScheduleStatus) => {
    if (!isScheduleCardDrag(event)) return;
    // Wajib: tanpa preventDefault di sini browser menolak drop dan kartu
    // memantul balik ke kolom asal.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverColumn(columnId);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLElement>, columnId: CounselingScheduleStatus) => {
    // `dragleave` juga menyala saat pointer cuma berpindah ke elemen anak
    // (judul kartu, pill, dsb). Kalau tujuannya masih di dalam kolom ini,
    // abaikan — dulu inilah yang mereset target drop sebelum kartu dilepas.
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    if (dragOverColumnRef.current === columnId) setDragOverColumn(null);
  };

  const handleDrop = (event: React.DragEvent<HTMLElement>, targetColumnId: CounselingScheduleStatus) => {
    if (!isScheduleCardDrag(event)) return;
    event.preventDefault();
    event.stopPropagation();

    const cardId =
      draggedCardIdRef.current ||
      event.dataTransfer.getData(SCHEDULE_CARD_MIME) ||
      event.dataTransfer.getData("text/plain");

    resetDragState();
    if (!cardId) return;
    void updateScheduleItemStatus(cardId, targetColumnId);
  };

  // ---------------------------------------------------------------------------
  // Overlay
  // ---------------------------------------------------------------------------

  const openScheduleOverlay = (
    event: React.MouseEvent<HTMLButtonElement>,
    item: CounselingScheduleItem,
    kind: ScheduleOverlayKind
  ) => {
    const anchorRect = event.currentTarget.getBoundingClientRect();
    const panelWidth = kind === "datetime" ? 480 : kind === "handler" ? 300 : 260;
    const viewportPadding = 18;
    const calculatedLeft = Math.min(
      Math.max(viewportPadding, anchorRect.left),
      window.innerWidth - panelWidth - viewportPadding
    );
    const calculatedTop = anchorRect.bottom + 8;
    const availableHeight = Math.max(
      kind === "datetime" ? 320 : 160,
      window.innerHeight - calculatedTop - viewportPadding
    );

    setActiveScheduleOverlay({
      cardId: item.id,
      kind,
      top: calculatedTop,
      left: calculatedLeft,
      maxHeight: availableHeight,
    });
  };

  const activeScheduleCard = useMemo(() => {
    if (!activeScheduleOverlay) return null;
    for (const column of scheduleColumns) {
      const match = column.items.find((item) => item.id === activeScheduleOverlay.cardId);
      if (match) return match;
    }
    return null;
  }, [activeScheduleOverlay, scheduleColumns]);

  useEffect(() => {
    if (!activeScheduleOverlay) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveScheduleOverlay(null);
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (scheduleOverlayRef.current?.contains(target)) return;
      setActiveScheduleOverlay(null);
    };
    window.addEventListener("keydown", onEscape);
    window.addEventListener("mousedown", onPointerDown);
    return () => {
      window.removeEventListener("keydown", onEscape);
      window.removeEventListener("mousedown", onPointerDown);
    };
  }, [activeScheduleOverlay]);

  const scheduleHandlerOptions = useMemo(() => {
    const options = new Set<string>();
    adminAccounts.forEach((account) => {
      if (account.fullName) options.add(account.fullName);
    });
    scheduleColumns.forEach((column) => {
      column.items.forEach((item) => {
        if (item.handlerName) options.add(item.handlerName);
      });
    });
    options.delete(UNASSIGNED_HANDLER);
    return [UNASSIGNED_HANDLER, ...Array.from(options)];
  }, [adminAccounts, scheduleColumns]);

  const scheduleOverlayContent =
    activeScheduleOverlay && activeScheduleCard && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={scheduleOverlayRef}
            className={`admin-schedule-overlay-panel admin-schedule-overlay-panel-${activeScheduleOverlay.kind}`}
            style={{
              top: activeScheduleOverlay.top,
              left: activeScheduleOverlay.left,
              maxHeight: activeScheduleOverlay.maxHeight,
            }}
          >
            {activeScheduleOverlay.kind === "datetime" ? (
              <DateTimePanel
                dateValue={activeScheduleCard.dateValue}
                timeValue={activeScheduleCard.timeValue}
                onCancel={() => setActiveScheduleOverlay(null)}
                onApply={(nextValue) => {
                  void updateScheduleItem(activeScheduleCard.id, (previousItem) => ({
                    ...previousItem,
                    dateValue: nextValue.dateValue,
                    timeValue: nextValue.timeValue,
                  }));
                  setActiveScheduleOverlay(null);
                }}
              />
            ) : null}

            {activeScheduleOverlay.kind === "handler" ? (
              <div className="admin-schedule-overlay-list-wrap">
                <h5>Pilih Penangan</h5>
                <div className="admin-schedule-overlay-list">
                  {scheduleHandlerOptions.map((handlerName) => {
                    const isSelected = handlerName === activeScheduleCard.handlerName;
                    return (
                      <button
                        key={handlerName}
                        type="button"
                        className={`admin-schedule-overlay-option admin-schedule-overlay-option-handler ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          void updateScheduleItem(activeScheduleCard.id, (previousItem) => ({
                            ...previousItem,
                            handlerName,
                          }));
                          setActiveScheduleOverlay(null);
                        }}
                      >
                        <span>{handlerName}</span>
                        {isSelected ? <Check size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {activeScheduleOverlay.kind === "service" ? (
              <div className="admin-schedule-overlay-list-wrap">
                <h5>Jenis Layanan</h5>
                <div className="admin-schedule-overlay-list">
                  {[
                    { value: "tatap_muka" as const, label: "Tatap Muka" },
                    { value: "online" as const, label: "Online" },
                  ].map((serviceOption) => {
                    const isSelected = serviceOption.value === activeScheduleCard.serviceType;
                    return (
                      <button
                        key={serviceOption.value}
                        type="button"
                        className={`admin-schedule-overlay-option admin-schedule-overlay-option-service admin-schedule-overlay-option-service-${serviceOption.value} ${
                          isSelected ? "is-selected" : ""
                        }`}
                        onClick={() => {
                          void updateScheduleItem(activeScheduleCard.id, (previousItem) => ({
                            ...previousItem,
                            serviceType: serviceOption.value,
                          }));
                          setActiveScheduleOverlay(null);
                        }}
                      >
                        {serviceOption.value === "online" ? <Video size={15} /> : <Users size={15} />}
                        <span>{serviceOption.label}</span>
                        {isSelected ? <Check size={15} /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <article className="admin-schedule-toolbar">
        <div className="admin-schedule-toolbar-copy">
          <h2>Jadwal Konseling</h2>
        </div>
        <div className="admin-schedule-toolbar-actions">
          <div className="admin-schedule-view-toggle" aria-label="Mode tampilan jadwal">
            <button
              type="button"
              className={scheduleViewMode === "kanban" ? "is-active" : ""}
              onClick={() => setScheduleViewMode("kanban")}
              aria-label="Tampilan kanban"
              title="Kanban"
            >
              <PanelsTopLeft size={16} />
            </button>
            <button
              type="button"
              className={scheduleViewMode === "calendar" ? "is-active" : ""}
              onClick={() => setScheduleViewMode("calendar")}
              aria-label="Tampilan kalender"
              title="Kalender"
            >
              <CalendarDays size={16} />
            </button>
          </div>
          <button
            type="button"
            className="button button-primary admin-schedule-add-button"
            onClick={() => setIsAddScheduleModalOpen(true)}
          >
            <Plus size={16} />
            Tambah Jadwal
          </button>
        </div>
      </article>

      {scheduleViewMode === "kanban" ? (
        <div
          className={`admin-schedule-board ${draggedCardId ? "is-dragging-card" : ""}`}
          aria-label="Kolom jadwal konseling"
        >
          {scheduleColumns.map((column) => {
            const isCollapsed = collapsedColumns.includes(column.id);
            const isDragOver = dragOverColumnId === column.id;
            return (
              <section
                key={column.id}
                className={`admin-schedule-column admin-schedule-column-${column.id} ${
                  isCollapsed ? "is-collapsed" : ""
                } ${isDragOver ? "is-drag-over" : ""}`}
                // Drop target dipasang di level kolom — satu-satunya elemen yang
                // ukurannya stabil selama drag. Semua event dari anak-anaknya
                // menggelembung ke sini.
                onDragOver={(event) => handleDragOver(event, column.id)}
                onDragEnter={(event) => handleDragEnter(event, column.id)}
                onDragLeave={(event) => handleDragLeave(event, column.id)}
                onDrop={(event) => handleDrop(event, column.id)}
              >
                <header className="admin-schedule-column-head">
                  <div className="admin-schedule-column-head-title">
                    <h3>{column.title}</h3>
                    <span>{column.items.length}</span>
                  </div>
                  <button
                    type="button"
                    className="admin-schedule-column-toggle"
                    onClick={() => toggleColumnCollapse(column.id)}
                    aria-label={isCollapsed ? "Expand column" : "Collapse column"}
                  >
                    {isCollapsed ? <Expand size={14} /> : <Shrink size={14} />}
                  </button>
                </header>

                <div className="admin-schedule-column-body-wrap">
                  <p>{column.description}</p>
                  <div className="admin-schedule-column-list">
                    {column.items.map((item) => {
                      const isDateTimeOpen =
                        activeScheduleOverlay?.cardId === item.id &&
                        activeScheduleOverlay.kind === "datetime";
                      const isHandlerOpen =
                        activeScheduleOverlay?.cardId === item.id &&
                        activeScheduleOverlay.kind === "handler";
                      const isServiceOpen =
                        activeScheduleOverlay?.cardId === item.id &&
                        activeScheduleOverlay.kind === "service";
                      const isDragging = draggedCardId === item.id;
                      const isLanding = landedCardId === item.id;

                      return (
                        <article
                          key={item.id}
                          className={`admin-schedule-card ${isDragging ? "is-dragging" : ""} ${
                            isLanding ? "is-landing" : ""
                          }`}
                          draggable
                          onDragStart={(event) => handleDragStart(event, item.id)}
                          onDragEnd={handleDragEnd}
                        >
                          <h4>{item.clientName}</h4>
                          <div className="admin-schedule-pill-row">
                            <button
                              type="button"
                              draggable={false}
                              className={`admin-schedule-pill admin-schedule-pill-calendar ${
                                isDateTimeOpen ? "is-active" : ""
                              }`}
                              onClick={(event) => openScheduleOverlay(event, item, "datetime")}
                            >
                              <CalendarDays size={14} />
                              {formatScheduleDateLabel(item.dateValue)} •{" "}
                              {formatScheduleTimeDisplay(item.timeValue)}
                            </button>
                            <button
                              type="button"
                              draggable={false}
                              className={`admin-schedule-pill ${isHandlerOpen ? "is-active" : ""}`}
                              onClick={(event) => openScheduleOverlay(event, item, "handler")}
                            >
                              <UserRound size={14} />
                              {item.handlerName}
                            </button>
                            <button
                              type="button"
                              draggable={false}
                              className={`admin-schedule-pill admin-schedule-pill-service admin-schedule-pill-service-${item.serviceType} ${
                                isServiceOpen ? "is-active" : ""
                              }`}
                              onClick={(event) => openScheduleOverlay(event, item, "service")}
                            >
                              {item.serviceType === "online" ? <Video size={14} /> : <Users size={14} />}
                              {item.serviceType === "online" ? "Online" : "Tatap Muka"}
                            </button>
                            <button
                              type="button"
                              draggable={false}
                              className="admin-schedule-pill admin-schedule-pill-delete"
                              title="Hapus Jadwal"
                              aria-label="Hapus Jadwal"
                              onClick={(event) => {
                                event.stopPropagation();
                                setScheduleToDelete(item);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </article>
                      );
                    })}

                    {column.items.length === 0 && (
                      <div
                        className={`admin-schedule-empty-dropzone ${
                          draggedCardId ? "is-active-drag" : ""
                        } ${isDragOver ? "is-drop-target" : ""}`}
                      >
                        <span>{draggedCardId ? "Lepas jadwal di sini" : "Belum ada jadwal"}</span>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <ScheduleCalendar
          columns={scheduleColumns}
          onOpenOverlay={openScheduleOverlay as any}
          formatDate={formatScheduleDateLabel}
          formatTime={formatScheduleTimeDisplay}
          onStatusChange={updateScheduleItemStatus}
        />
      )}

      {scheduleOverlayContent}

      <AddScheduleModal
        isOpen={isAddScheduleModalOpen}
        onClose={() => setIsAddScheduleModalOpen(false)}
        adminStudents={adminStudents}
        adminAccounts={adminAccounts}
        scheduleColumns={scheduleColumns}
        onSuccess={refetchSchedules}
      />

      {scheduleToDelete && typeof document !== "undefined" && createPortal(
        <div
          className="schedule-delete-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="schedule-delete-modal-title"
        >
          <button
            type="button"
            className="schedule-delete-backdrop"
            aria-label="Tutup pop up konfirmasi hapus"
            onClick={() => !isDeleting && setScheduleToDelete(null)}
          />
          <div className="schedule-delete-panel">
            <header className="schedule-delete-header">
              <div className="schedule-delete-brand">
                <Image
                  src="/branding/logo-konseling.png"
                  alt="Logo Layanan Konseling"
                  width={40}
                  height={40}
                  className="schedule-delete-brand-logo"
                  priority
                />
                <div className="schedule-delete-brand-text">
                  <p>Layanan Konseling</p>
                  <span>Universitas Brawijaya</span>
                </div>
              </div>
              <button
                type="button"
                className="schedule-delete-close"
                onClick={() => !isDeleting && setScheduleToDelete(null)}
                aria-label="Tutup"
                disabled={isDeleting}
              >
                <X size={16} />
              </button>
            </header>

            <div className="schedule-delete-body">
              <h3 id="schedule-delete-modal-title">Hapus Jadwal Konseling?</h3>
              <p>Apakah Anda ingin menghapus jadwal konseling ini?</p>

              <div className="schedule-delete-actions">
                <button
                  type="button"
                  className="schedule-delete-btn-cancel"
                  onClick={() => setScheduleToDelete(null)}
                  disabled={isDeleting}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className="schedule-delete-btn-confirm"
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                >
                  {isDeleting ? "Menghapus..." : "Ya, Hapus Jadwal"}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
