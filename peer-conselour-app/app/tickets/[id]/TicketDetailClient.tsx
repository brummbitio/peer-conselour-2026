"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import { PortalLoader } from "../../_portal/PortalLoader";
import { PORTAL_BACK_TARGETS } from "../../_portal/routes";
import { TicketBackLink, TicketHeader } from "./components/TicketHeader";
import { TicketChatStream } from "./components/TicketChatStream";
import { TicketComposer } from "./components/TicketComposer";
import { TicketSidePanel } from "./components/TicketSidePanel";
import { TicketResolutionModal } from "./components/TicketResolutionModal";
import { TicketDeleteModal } from "./components/TicketDeleteModal";
import { TicketAttachmentLightbox } from "./components/TicketAttachmentLightbox";
import { useTicketDetail } from "./useTicketDetail";
import type {
  DeleteTarget,
  EditTarget,
  LightboxImage,
  ReplyTarget,
  ResolutionPayload,
  TicketViewMode,
} from "./components/types";
import "../../styles/ticket-chat.css";
import "../../styles/account-ticket.css";

const StartCounselingModal = dynamic(() => import("../../StartCounselingModal"), { ssr: false });

type StatusIntent = "complete" | "reopen";

export default function TicketDetailClient({
  ticketId,
  mode = "student",
}: {
  ticketId: string;
  mode?: TicketViewMode;
}) {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const isAdminView = mode === "admin";
  const hasAccess = isReady && !!user && (isAdminView ? isAdminRole(user.role) : !isAdminRole(user.role));

  useEffect(() => {
    if (!isReady) return;

    if (!user) {
      router.replace("/");
      return;
    }

    if (isAdminView && !isAdminRole(user.role)) {
      router.replace("/my-counseling");
    } else if (!isAdminView && isAdminRole(user.role)) {
      router.replace("/admin/dashboard");
    }
  }, [isReady, user, isAdminView, router]);

  const { ticket, messages, isLoading, sendMessage, updateMessage, deleteMessage, completeTicket, reopenTicket } =
    useTicketDetail(ticketId, mode, hasAccess);

  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const [editing, setEditing] = useState<EditTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [statusIntent, setStatusIntent] = useState<StatusIntent | null>(null);
  const [lightbox, setLightbox] = useState<{ images: LightboxImage[]; index: number } | null>(null);
  const [isNewCounselingOpen, setIsNewCounselingOpen] = useState(false);

  // Callback stabil (useCallback) supaya TicketChatStream yang di-memo tidak
  // ikut re-render ketika state lain di halaman berubah.
  const handleReply = useCallback((target: ReplyTarget) => setReplyTo(target), []);
  const cancelReply = useCallback(() => setReplyTo(null), []);
  const handleDeleteRequest = useCallback((target: DeleteTarget) => setDeleteTarget(target), []);
  const closeDeleteModal = useCallback(() => setDeleteTarget(null), []);
  const handleOpenLightbox = useCallback(
    (images: LightboxImage[], index: number) => setLightbox({ images, index }),
    []
  );
  const closeLightbox = useCallback(() => setLightbox(null), []);
  const closeStatusModal = useCallback(() => setStatusIntent(null), []);
  const openNewCounseling = useCallback(() => setIsNewCounselingOpen(true), []);
  const closeNewCounseling = useCallback(() => setIsNewCounselingOpen(false), []);

  const handleEdit = useCallback((target: EditTarget) => {
    setReplyTo(null);
    setEditing(target);
    document.getElementById(`msg-${target.id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);
  const cancelEdit = useCallback(() => setEditing(null), []);

  const handleSend = useCallback(
    async ({ body, attachmentIds }: { body: string; attachmentIds: number[] }) => {
      const payloadBody = replyTo ? `>>reply-to:${replyTo.id}\n${body}` : body;
      const sent = await sendMessage(payloadBody, attachmentIds);
      if (sent) setReplyTo(null);
      return sent;
    },
    [replyTo, sendMessage]
  );

  const handleSaveEdit = useCallback(
    async (messageId: string, body: string) => {
      const saved = await updateMessage(messageId, body);
      if (saved) setEditing(null);
      return saved;
    },
    [updateMessage]
  );

  const handleConfirmDelete = useCallback(
    async (messageId: string) => {
      const deleted = await deleteMessage(messageId);
      if (deleted) {
        setReplyTo((current) => (current?.id === messageId ? null : current));
        setEditing((current) => (current?.id === messageId ? null : current));
        setDeleteTarget(null);
      }
      return deleted;
    },
    [deleteMessage]
  );

  const handleComplete = useCallback(
    async (payload: ResolutionPayload | null) => {
      const error = await completeTicket(payload);
      if (error === null) setStatusIntent(null);
      return error;
    },
    [completeTicket]
  );

  const handleReopen = useCallback(async () => {
    const error = await reopenTicket();
    if (error === null) setStatusIntent(null);
    return error;
  }, [reopenTicket]);

  const isSessionCompleted = ticket?.status === "resolved";
  // Hanya admin yang berwenang membuka kembali (reopen) tiket yang sudah selesai
  const canReopenSession = isAdminView && isSessionCompleted;

  const requestStatusChange = useCallback(() => {
    if (isSessionCompleted && !canReopenSession) return;
    setStatusIntent(canReopenSession ? "reopen" : "complete");
  }, [isSessionCompleted, canReopenSession]);

  if (!hasAccess) {
    return <PortalLoader label="Memverifikasi Sesi..." />;
  }

  if (isLoading) {
    return <PortalLoader label="Memuat detail sesi konseling..." />;
  }

  if (!ticket) {
    const fallback = isAdminView ? PORTAL_BACK_TARGETS.adminTickets : PORTAL_BACK_TARGETS.studentTickets;
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Tiket Tidak Ditemukan</h1>
          <p>Sepertinya ID tiket yang kamu buka belum tersedia di sistem kami.</p>
          <Link href={fallback.href} className="button button-primary">
            {fallback.label}
          </Link>
        </div>
      </section>
    );
  }

  const isAnyOverlayOpen = statusIntent !== null || deleteTarget !== null || lightbox !== null;

  return (
    <section className="section site-width account-page">
      <TicketBackLink viewer={mode} />

      <div className="ticket-chat-layout">
        <div className="ticket-chat-main">
          <TicketHeader ticket={ticket} viewer={mode} />
          <TicketChatStream
            messages={messages}
            viewer={mode}
            editingMessageId={editing?.id ?? null}
            onReply={handleReply}
            onEdit={handleEdit}
            onDelete={handleDeleteRequest}
            onOpenLightbox={handleOpenLightbox}
          />
          <TicketComposer
            viewer={mode}
            replyTo={replyTo}
            editing={editing}
            shortcutsSuspended={isAnyOverlayOpen}
            onCancelReply={cancelReply}
            onCancelEdit={cancelEdit}
            onSend={handleSend}
            onSaveEdit={handleSaveEdit}
          />
        </div>

        <TicketSidePanel
          ticket={ticket}
          viewer={mode}
          onRequestStatusChange={requestStatusChange}
          onRequestNewCounseling={openNewCounseling}
        />
      </div>

      {statusIntent ? (
        <TicketResolutionModal
          intent={statusIntent}
          viewer={mode}
          onClose={closeStatusModal}
          onComplete={handleComplete}
          onReopen={handleReopen}
        />
      ) : null}

      {deleteTarget ? (
        <TicketDeleteModal target={deleteTarget} onClose={closeDeleteModal} onConfirm={handleConfirmDelete} />
      ) : null}

      {lightbox ? (
        <TicketAttachmentLightbox images={lightbox.images} initialIndex={lightbox.index} onClose={closeLightbox} />
      ) : null}

      {!isAdminView && isSessionCompleted ? (
        <StartCounselingModal open={isNewCounselingOpen} onClose={closeNewCounseling} />
      ) : null}
    </section>
  );
}
