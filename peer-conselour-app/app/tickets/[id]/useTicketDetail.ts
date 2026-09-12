"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@/utils/api";
import { mapApiMessage, REPLY_PREFIX_RE } from "./components/messageFormat";
import type {
  ApiMessage,
  ChatMessage,
  MutationResult,
  ResolutionPayload,
  TicketDetail,
  TicketViewMode,
} from "./components/types";

const getErrorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message ? err.message : fallback;

/**
 * Respons PUT tiket tidak selalu mem-preload relasi. Data mahasiswa & konselor
 * dari pemuatan awal dipertahankan agar panel "Detail Mahasiswa" tidak kosong.
 */
function mergeTicket(previous: TicketDetail, updated: unknown, overrides: Partial<TicketDetail>): TicketDetail {
  const patch = updated && typeof updated === "object" ? (updated as Partial<TicketDetail>) : {};
  return {
    ...previous,
    ...patch,
    student: patch.student?.id ? patch.student : previous.student,
    counselor: patch.counselor?.id ? patch.counselor : previous.counselor,
    ...overrides,
  };
}

/** Data & mutasi detail tiket untuk mode mahasiswa maupun admin. */
export function useTicketDetail(ticketId: string, viewer: TicketViewMode, enabled: boolean) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const messagesRef = useRef<ChatMessage[]>([]);

  const isAdminView = viewer === "admin";
  const ticketPath = isAdminView ? `/api/admin/tickets/${ticketId}` : `/api/tickets/${ticketId}`;
  const messageApiBase = `${ticketPath}/messages`;

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!enabled) return;
    // AbortController: respons tiket lama tidak boleh menimpa tiket baru saat
    // pengguna berpindah tiket, dan tidak ada setState setelah unmount.
    const controller = new AbortController();
    setIsLoading(true);

    api
      .get(ticketPath, { signal: controller.signal })
      .then((data: { ticket?: TicketDetail | null; messages?: ApiMessage[] | null }) => {
        setTicket(data?.ticket ?? null);
        setMessages((data?.messages ?? []).map(mapApiMessage));
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        console.error("Gagal memuat detail tiket:", err);
        setTicket(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [enabled, ticketPath]);

  const sendMessage = useCallback(
    async (body: string, attachmentIds: number[]): Promise<boolean> => {
      try {
        const created: ApiMessage = await api.post(messageApiBase, {
          body,
          attachment_ids: attachmentIds,
        });
        setMessages((current) => [...current, mapApiMessage(created)]);
        setTicket((previous) =>
          previous ? { ...previous, status: isAdminView ? "in_progress" : "open" } : previous
        );
        return true;
      } catch (err) {
        console.error("Gagal mengirimkan pesan:", err);
        alert(getErrorMessage(err, "Gagal mengirimkan pesan. Coba lagi."));
        return false;
      }
    },
    [messageApiBase, isAdminView]
  );

  const updateMessage = useCallback(
    async (messageId: string, text: string): Promise<boolean> => {
      // Prefix ">>reply-to:<id>\n" dipertahankan agar kutipan balasan tidak hilang.
      const original = messagesRef.current.find((item) => item.id === messageId);
      const replyPrefix = original?.body.match(REPLY_PREFIX_RE)?.[0] ?? "";
      const nextBody = `${replyPrefix}${text}`;

      try {
        const updated: Partial<ApiMessage> | null = await api.put(`${messageApiBase}/${messageId}`, {
          body: nextBody,
        });
        setMessages((current) =>
          current.map((item) =>
            item.id === messageId
              ? {
                  ...item,
                  body: updated?.body ?? nextBody,
                  editedAt: updated?.edited_at ?? new Date().toISOString(),
                }
              : item
          )
        );
        return true;
      } catch (err) {
        console.error("Gagal memperbarui pesan:", err);
        // Tampilkan alasan penolakan dari server (mis. bukan pemilik pesan)
        alert(getErrorMessage(err, "Gagal memperbarui pesan."));
        return false;
      }
    },
    [messageApiBase]
  );

  const deleteMessage = useCallback(
    async (messageId: string): Promise<boolean> => {
      try {
        await api.delete(`${messageApiBase}/${messageId}`);
        setMessages((current) => current.filter((item) => item.id !== messageId));
        return true;
      } catch (err) {
        console.error("Gagal menghapus pesan:", err);
        // Tampilkan alasan penolakan dari server (mis. pesan pertama tiket)
        alert(getErrorMessage(err, "Gagal menghapus pesan."));
        return false;
      }
    },
    [messageApiBase]
  );

  const completeTicket = useCallback(
    async (payload: ResolutionPayload | null): Promise<MutationResult> => {
      try {
        // Mahasiswa tidak memilih hasil klinis: backend menandainya "selesai_mandiri_mahasiswa"
        const updated: unknown =
          isAdminView && payload
            ? await api.put(ticketPath, {
                status: "resolved",
                resolution_type: payload.resolutionType,
                resolution_reason: payload.resolutionReason,
                resolution_notes: payload.resolutionNotes,
              })
            : await api.put(`/api/tickets/${ticketId}/resolve`, {});
        setTicket((previous) => (previous ? mergeTicket(previous, updated, { status: "resolved" }) : previous));
        return null;
      } catch (err) {
        console.error("Gagal menyelesaikan sesi konseling:", err);
        return getErrorMessage(err, "Gagal menyelesaikan sesi konseling. Coba lagi.");
      }
    },
    [isAdminView, ticketPath, ticketId]
  );

  // Membatalkan status selesai: tiket dikembalikan ke status "Sudah Dibalas" (in_progress)
  const reopenTicket = useCallback(async (): Promise<MutationResult> => {
    try {
      await api.put(`/api/admin/tickets/${ticketId}`, { status: "in_progress" });
      setTicket((previous) =>
        previous
          ? {
              ...previous,
              status: "in_progress",
              closed_at: null,
              resolution_type: null,
              resolution_reason: null,
              resolution_notes: null,
            }
          : previous
      );
      return null;
    } catch (err) {
      console.error("Gagal membuka kembali sesi konseling:", err);
      return getErrorMessage(err, "Gagal membuka kembali sesi konseling. Coba lagi.");
    }
  }, [ticketId]);

  return {
    ticket,
    messages,
    isLoading,
    sendMessage,
    updateMessage,
    deleteMessage,
    completeTicket,
    reopenTicket,
  };
}
