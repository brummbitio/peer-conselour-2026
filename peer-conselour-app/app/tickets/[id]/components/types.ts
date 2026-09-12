import type { ApiTicket } from "../../../_portal/types";
import type { TicketViewer } from "../../../_portal/ticketStatus";

export type TicketViewMode = TicketViewer;

export type TicketDetail = ApiTicket;

export type ApiAttachment = {
  id: number;
  file_name: string;
  url: string;
  mime_type?: string | null;
};

export type ApiMessage = {
  id: number;
  ticket_id: number;
  sender_role: string;
  sender_name: string;
  created_at: string;
  body: string;
  edited_at?: string | null;
  attachments?: ApiAttachment[] | null;
};

export type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  kind: "image" | "file";
  mimeType: string;
};

export type ChatMessage = {
  id: string;
  ticketId: string;
  sender: string;
  senderName: string;
  sentAt: string;
  body: string;
  editedAt: string | null;
  attachments: MessageAttachment[];
};

/** Lampiran composer yang sedang/selesai diunggah ke MinIO sebelum pesan dikirim. */
export type PendingAttachment = {
  id: string;
  name: string;
  kind: "image" | "file";
  dbId?: number;
  isUploading: boolean;
  error?: string;
};

export type ReplyTarget = {
  id: string;
  name: string;
  body: string;
};

export type EditTarget = {
  id: string;
  /** Isi pesan tanpa prefix balasan, dimuat ke editor composer. */
  body: string;
  preview: string;
};

export type DeleteTarget = {
  id: string;
  preview: string;
};

export type LightboxImage = {
  name: string;
  url: string;
};

export type AdminResolutionType = "tertangani" | "tidak_tertangani";

export type ResolutionPayload = {
  resolutionType: AdminResolutionType;
  resolutionReason: string;
  resolutionNotes: string;
};

/** null berarti sukses; string berisi pesan error untuk ditampilkan. */
export type MutationResult = string | null;
