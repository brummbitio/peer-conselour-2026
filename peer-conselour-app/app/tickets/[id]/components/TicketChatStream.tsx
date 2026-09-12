import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { Copy, CornerUpLeft, Pencil, Trash2 } from "lucide-react";
import { MessageBody } from "./MessageBody";
import { getSenderDisplayName, parseReplyPrefix, stripMessageMarkup, toPreview } from "./messageFormat";
import type {
  ChatMessage,
  DeleteTarget,
  EditTarget,
  LightboxImage,
  MessageAttachment,
  ReplyTarget,
  TicketViewMode,
} from "./types";

type ActionsPart = "body" | "attachment";

type TicketChatStreamProps = {
  messages: ChatMessage[];
  viewer: TicketViewMode;
  editingMessageId: string | null;
  onReply: (target: ReplyTarget) => void;
  onEdit: (target: EditTarget) => void;
  onDelete: (target: DeleteTarget) => void;
  onOpenLightbox: (images: LightboxImage[], index: number) => void;
};

/**
 * Daftar percakapan tiket. Di-memo terpisah dari composer supaya mengetik
 * pesan tidak merender ulang seluruh bubble (termasuk sanitasi HTML osTicket).
 */
export const TicketChatStream = memo(function TicketChatStream({
  messages,
  viewer,
  editingMessageId,
  onReply,
  onEdit,
  onDelete,
  onOpenLightbox,
}: TicketChatStreamProps) {
  const messageListRef = useRef<HTMLDivElement>(null);
  const scrollBottomSentinelRef = useRef<HTMLDivElement>(null);
  const highlightTimerRef = useRef<number | null>(null);
  const copyToastTimerRef = useRef<number | null>(null);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [showCopyToast, setShowCopyToast] = useState(false);
  // Di layar sentuh tidak ada hover, jadi tombol aksi bubble (balas/salin/edit/
  // hapus) dibuka dengan tap pada bubble. Di desktop kelas ini tidak berefek
  // karena aksi tetap muncul lewat :hover.
  const [openActions, setOpenActions] = useState<{ messageId: string; part: ActionsPart } | null>(null);

  useEffect(() => {
    return () => {
      if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
      if (copyToastTimerRef.current) window.clearTimeout(copyToastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  // Setup IntersectionObserver for scroll-to-bottom button
  useEffect(() => {
    const sentinel = scrollBottomSentinelRef.current;
    const root = messageListRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowScrollBottomBtn(!entry.isIntersecting);
      },
      { root, threshold: 0.1 }
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, []);

  const messagesById = useMemo(() => new Map(messages.map((message) => [message.id, message])), [messages]);

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
  }, []);

  const jumpToMessage = useCallback((messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (!element) return;
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => setHighlightedMessageId(null), 1500);
  }, []);

  const copyMessageText = useCallback((text: string) => {
    if (!navigator.clipboard) return;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setShowCopyToast(true);
        if (copyToastTimerRef.current) window.clearTimeout(copyToastTimerRef.current);
        copyToastTimerRef.current = window.setTimeout(() => setShowCopyToast(false), 2000);
      })
      .catch((err) => {
        console.error("Gagal menyalin teks:", err);
      });
  }, []);

  const toggleActions = useCallback((messageId: string, part: ActionsPart) => {
    setOpenActions((current) =>
      current?.messageId === messageId && current.part === part ? null : { messageId, part }
    );
  }, []);

  return (
    <div className="ticket-message-list-wrap">
      <div
        className={`ticket-message-list${editingMessageId ? " ticket-message-list-dimmed" : ""}`}
        ref={messageListRef}
        onClick={(event) => {
          // Tap pada area kosong menutup toolbar aksi yang sedang terbuka.
          if (event.target === event.currentTarget) setOpenActions(null);
        }}
      >
        {messages.map((message, messageIndex) => {
          const { replyToId } = parseReplyPrefix(message.body);
          return (
            <ChatMessageItem
              key={message.id}
              message={message}
              parentMessage={replyToId ? messagesById.get(replyToId) : undefined}
              viewer={viewer}
              isFirstMessage={messageIndex === 0}
              isEditing={editingMessageId === message.id}
              isHighlighted={highlightedMessageId === message.id}
              openActionsPart={openActions?.messageId === message.id ? openActions.part : null}
              onToggleActions={toggleActions}
              onReply={onReply}
              onCopy={copyMessageText}
              onEdit={onEdit}
              onDelete={onDelete}
              onJumpToMessage={jumpToMessage}
              onOpenLightbox={onOpenLightbox}
            />
          );
        })}
        {/* Scroll Bottom Sentinel */}
        <div ref={scrollBottomSentinelRef} style={{ height: "1px", width: "100%" }} />
      </div>

      {/* Scroll bottom button */}
      <button
        type="button"
        className={`ticket-scroll-bottom-btn${showScrollBottomBtn ? " visible" : ""}`}
        onClick={scrollToBottom}
        aria-label="Scroll ke bawah"
      >
        Pesan baru ↓
      </button>

      {showCopyToast
        ? createPortal(<div className="ticket-copy-toast">Teks pesan berhasil disalin!</div>, document.body)
        : null}
    </div>
  );
});

type ChatMessageItemProps = {
  message: ChatMessage;
  parentMessage?: ChatMessage;
  viewer: TicketViewMode;
  isFirstMessage: boolean;
  isEditing: boolean;
  isHighlighted: boolean;
  openActionsPart: ActionsPart | null;
  onToggleActions: (messageId: string, part: ActionsPart) => void;
  onReply: (target: ReplyTarget) => void;
  onCopy: (text: string) => void;
  onEdit: (target: EditTarget) => void;
  onDelete: (target: DeleteTarget) => void;
  onJumpToMessage: (messageId: string) => void;
  onOpenLightbox: (images: LightboxImage[], index: number) => void;
};

const ChatMessageItem = memo(function ChatMessageItem({
  message,
  parentMessage,
  viewer,
  isFirstMessage,
  isEditing,
  isHighlighted,
  openActionsPart,
  onToggleActions,
  onReply,
  onCopy,
  onEdit,
  onDelete,
  onJumpToMessage,
  onOpenLightbox,
}: ChatMessageItemProps) {
  const isOwnMessage =
    (viewer === "admin" && message.sender === "admin") ||
    (viewer === "student" && message.sender === "mahasiswa");
  const senderDisplayName = getSenderDisplayName(message.sender, message.senderName, viewer);
  const hasAttachments = message.attachments.length > 0;
  const hasBody = message.body.trim().length > 0;
  const { displayBody } = parseReplyPrefix(message.body);

  const replyParent = parentMessage
    ? {
        id: parentMessage.id,
        senderName: getSenderDisplayName(parentMessage.sender, parentMessage.senderName, viewer),
        body: toPreview(stripMessageMarkup(parentMessage.body)),
      }
    : null;

  const cleanFullBody = stripMessageMarkup(displayBody);
  // Preview dirapatkan jadi satu baris agar muat di bilah composer
  const replyPreviewBody = toPreview(cleanFullBody);
  // Edit & hapus hanya untuk pesan milik sendiri. Pesan pertama tiket
  // (cerita awal intake konseling) boleh disunting tapi tidak boleh dihapus.
  // Lampiran tersimpan permanen di storage: pesan tanpa teks tidak bisa
  // diedit, hanya bisa dihapus. Pesan teks + lampiran hanya edit captionnya.
  const canEditMessage = isOwnMessage && hasBody;
  const canDeleteMessage = isOwnMessage && !isFirstMessage;
  const bubbleActionCount = 2 + (canEditMessage ? 1 : 0) + (canDeleteMessage ? 1 : 0);

  const bubbleActions = (
    <div className={`ticket-bubble-actions${bubbleActionCount > 2 ? " ticket-bubble-actions-grid" : ""}`}>
      <button
        type="button"
        className="ticket-bubble-action-btn"
        title="Balas"
        aria-label="Balas pesan"
        onClick={() => onReply({ id: message.id, name: senderDisplayName, body: replyPreviewBody })}
      >
        <CornerUpLeft size={13} />
      </button>
      <button
        type="button"
        className="ticket-bubble-action-btn"
        title="Salin teks"
        aria-label="Salin teks pesan"
        onClick={() => onCopy(cleanFullBody)}
      >
        <Copy size={13} />
      </button>
      {canEditMessage && (
        <button
          type="button"
          className="ticket-bubble-action-btn"
          title="Edit pesan"
          aria-label="Edit pesan"
          onClick={() => onEdit({ id: message.id, body: displayBody, preview: replyPreviewBody })}
        >
          <Pencil size={13} />
        </button>
      )}
      {canDeleteMessage && (
        <button
          type="button"
          className="ticket-bubble-action-btn ticket-bubble-action-danger"
          title="Hapus pesan"
          aria-label="Hapus pesan"
          onClick={() => onDelete({ id: message.id, preview: replyPreviewBody })}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );

  // Bubble lampiran tanpa teks tetap perlu aksi hapus (mis. salah kirim gambar)
  const attachmentOnlyActions = (
    <div className="ticket-bubble-actions">
      <button
        type="button"
        className="ticket-bubble-action-btn"
        title="Balas"
        aria-label="Balas pesan"
        onClick={() => onReply({ id: message.id, name: senderDisplayName, body: "Lampiran" })}
      >
        <CornerUpLeft size={13} />
      </button>
      {canDeleteMessage && (
        <button
          type="button"
          className="ticket-bubble-action-btn ticket-bubble-action-danger"
          title="Hapus pesan"
          aria-label="Hapus pesan"
          onClick={() => onDelete({ id: message.id, preview: "Pesan berisi lampiran" })}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );

  const attachmentsBubble = hasAttachments ? (
    <AttachmentsBubble
      message={message}
      isOwnMessage={isOwnMessage}
      showHead={!hasBody}
      senderDisplayName={senderDisplayName}
      onOpenLightbox={onOpenLightbox}
    />
  ) : null;

  return (
    <div
      id={`msg-${message.id}`}
      className={`ticket-message-group ticket-message-group-${message.sender} ${
        isOwnMessage ? "ticket-message-group-self" : "ticket-message-group-other"
      } ${isHighlighted ? "ticket-message-highlight" : ""} ${isEditing ? "ticket-message-editing" : ""}`}
      style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}
    >
      {hasBody && (
        <div
          className={`ticket-message-bubble-wrap${openActionsPart === "body" ? " is-actions-open" : ""}`}
          onClick={() => onToggleActions(message.id, "body")}
        >
          {/* Actions LEFT for own message, RIGHT for other */}
          {isOwnMessage && bubbleActions}
          <article
            className={`ticket-message-bubble ${
              isOwnMessage ? "ticket-message-self" : "ticket-message-other"
            } ticket-message-${message.sender}`}
          >
            <div className="ticket-message-head">
              <strong>{senderDisplayName}</strong>
              <span>
                {message.sentAt}
                {message.editedAt ? <em className="ticket-message-edited-flag">(diedit)</em> : null}
              </span>
            </div>
            {replyParent && (
              <div
                className="ticket-message-reply-quote"
                style={{ cursor: "pointer" }}
                role="button"
                tabIndex={0}
                aria-label={`Lihat pesan yang dibalas dari ${replyParent.senderName}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onJumpToMessage(replyParent.id);
                }}
                onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  event.stopPropagation();
                  onJumpToMessage(replyParent.id);
                }}
              >
                <div className="ticket-message-reply-quote-name">{replyParent.senderName}</div>
                <div className="ticket-message-reply-quote-text">{replyParent.body}</div>
              </div>
            )}
            <div className="ticket-message-body-wrap">
              <MessageBody body={displayBody} />
            </div>
          </article>
          {!isOwnMessage && bubbleActions}
        </div>
      )}

      {hasAttachments &&
        (hasBody ? (
          attachmentsBubble
        ) : (
          <div
            className={`ticket-message-bubble-wrap${openActionsPart === "attachment" ? " is-actions-open" : ""}`}
            onClick={() => onToggleActions(message.id, "attachment")}
          >
            {isOwnMessage && attachmentOnlyActions}
            {attachmentsBubble}
            {!isOwnMessage && attachmentOnlyActions}
          </div>
        ))}
    </div>
  );
});

type AttachmentsBubbleProps = {
  message: ChatMessage;
  isOwnMessage: boolean;
  showHead: boolean;
  senderDisplayName: string;
  onOpenLightbox: (images: LightboxImage[], index: number) => void;
};

function AttachmentsBubble({ message, isOwnMessage, showHead, senderDisplayName, onOpenLightbox }: AttachmentsBubbleProps) {
  const images = message.attachments.filter((attachment: MessageAttachment) => attachment.kind === "image");
  const files = message.attachments.filter((attachment: MessageAttachment) => attachment.kind === "file");

  const openImage = (index: number) => {
    onOpenLightbox(
      images.map((image) => ({ name: image.name, url: image.url })),
      index
    );
  };

  return (
    <article
      className={`ticket-message-bubble ticket-message-attachments-bubble ${
        isOwnMessage ? "ticket-message-self" : "ticket-message-other"
      } ticket-message-${message.sender}`}
      style={{ padding: "6px", width: "100%", maxWidth: "min(332px, 100%)" }}
    >
      {showHead && (
        <div className="ticket-message-head" style={{ padding: "2px 6px 4px 6px" }}>
          <strong>{senderDisplayName}</strong>
          <span>{message.sentAt}</span>
        </div>
      )}
      <div className="ticket-message-attachments-area">
        {/* 1. Images Gallery (WhatsApp-style) */}
        {images.length > 0 && (
          <div
            className={`ticket-message-gallery ticket-message-gallery-${Math.min(images.length, 4)}`}
            style={{ marginTop: "0" }}
          >
            {images.slice(0, 4).map((image, index) => {
              const isLastItem = index === 3 && images.length > 4;
              const remainingCount = images.length - 4;

              return (
                <div
                  key={image.id}
                  className="ticket-message-gallery-item"
                  role="button"
                  tabIndex={0}
                  aria-label={`Lihat gambar ${image.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openImage(index);
                  }}
                  onKeyDown={(event: KeyboardEvent<HTMLDivElement>) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    openImage(index);
                  }}
                >
                  <img src={image.url} alt={image.name} className="ticket-message-gallery-img" loading="lazy" />
                  {isLastItem && (
                    <div className="ticket-message-gallery-overlay">
                      <span>+{remainingCount + 1}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* 2. Documents List */}
        {files.length > 0 && (
          <div
            className="ticket-message-documents"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "6px",
              marginTop: images.length > 0 ? "8px" : "0",
              padding: "4px",
            }}
          >
            {files.map((file) => (
              <a
                key={file.id}
                href={file.url}
                target="_blank"
                rel="noreferrer noopener"
                className="ticket-message-document-row"
                style={{ maxWidth: "100%" }}
                onClick={(event) => event.stopPropagation()}
              >
                <span className="ticket-message-document-icon">📄</span>
                <div className="ticket-message-document-info">
                  <span className="ticket-message-document-name">{file.name}</span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
