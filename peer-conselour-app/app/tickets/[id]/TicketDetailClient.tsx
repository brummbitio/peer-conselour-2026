"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Paperclip, SendHorizontal, X } from "lucide-react";
import { isAdminRole, useAuth } from "../../auth/auth-provider";
import {
  TicketStatus,
  ticketStatusLabel,
} from "../mock-data";
import { api } from "@/utils/api";

type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  kind: "image" | "file";
  dbId?: number;
  isUploading?: boolean;
  error?: string;
};

type ChatMessage = TicketMessage & {
  attachments?: MessageAttachment[];
};

export default function TicketDetailClient({
  ticketId,
  mode = "student",
}: {
  ticketId: string;
  mode?: "student" | "admin";
}) {
  const { user, isReady } = useAuth();
  const router = useRouter();
  const isAdminView = mode === "admin";
  const [ticket, setTicket] = useState<any | null>(null);
  const [student, setStudent] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [draft, setDraft] = useState("");
  const messageListRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isSessionCompleted, setIsSessionCompleted] = useState(false);
  const [isCompleteConfirmOpen, setIsCompleteConfirmOpen] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [activeLightbox, setActiveLightbox] = useState<{
    images: { name: string; url: string }[];
    index: number;
  } | null>(null);

  const openLightbox = (images: { name: string; url: string }[], index: number) => {
    setActiveLightbox({ images, index });
  };

  const closeLightbox = () => {
    setActiveLightbox(null);
  };

  const navigateLightbox = (direction: "prev" | "next") => {
    if (!activeLightbox) return;
    const { images, index } = activeLightbox;
    let nextIndex = direction === "next" ? index + 1 : index - 1;
    if (nextIndex >= images.length) nextIndex = 0;
    if (nextIndex < 0) nextIndex = images.length - 1;
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(url, "_blank");
    }
  };
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

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

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const path = isAdminView ? `/api/admin/tickets/${ticketId}` : `/api/tickets/${ticketId}`;
        const data = await api.get(path);
        setTicket(data.ticket);
        
        const formattedMessages = (data.messages || []).map((msg: any) => ({
          id: String(msg.id),
          ticketId: String(msg.ticket_id),
          sender: msg.sender_role,
          senderName: msg.sender_name,
          sentAt: new Date(msg.created_at).toLocaleString("id-ID", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
          body: msg.body,
          attachments: (msg.attachments || []).map((att: any) => ({
            id: String(att.id),
            name: att.file_name,
            url: att.url,
            kind: att.mime_type.startsWith("image/") ? "image" : "file",
            mimeType: att.mime_type,
          })),
        }));
        setMessages(formattedMessages);
        setIsSessionCompleted(data.ticket.status === "resolved");
        
        if (data.ticket && data.ticket.student) {
          setStudent(data.ticket.student);
        }
      } catch (err) {
        console.error("Gagal memuat detail tiket:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [ticketId, isAdminView]);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [messages.length]);

  useEffect(() => {
    setIsSessionCompleted(ticket?.status === "resolved");
  }, [ticket?.id, ticket?.status]);

  useEffect(() => {
    if (!isCompleteConfirmOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsCompleteConfirmOpen(false);
      }
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("keydown", onEscape);
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isCompleteConfirmOpen]);

  useEffect(() => {
    const textarea = composerTextareaRef.current;
    if (!textarea) return;

    textarea.style.height = "0px";
    const computed = window.getComputedStyle(textarea);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 24;
    const paddingTop = Number.parseFloat(computed.paddingTop) || 0;
    const paddingBottom = Number.parseFloat(computed.paddingBottom) || 0;
    const borderTop = Number.parseFloat(computed.borderTopWidth) || 0;
    const borderBottom = Number.parseFloat(computed.borderBottomWidth) || 0;
    const maxHeight =
      lineHeight * 5 + paddingTop + paddingBottom + borderTop + borderBottom;

    const nextHeight = Math.min(textarea.scrollHeight, maxHeight);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [draft]);

  if (!isReady || !user || (isAdminView && !isAdminRole(user.role)) || (!isAdminView && isAdminRole(user.role))) {
    return (
      <section className="section site-width account-page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "450px", gap: "20px" }}>
        <div className="loader-progress-bar" style={{ width: "140px" }}>
          <div className="loader-progress-fill" />
        </div>
        <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "0.1em", textTransform: "uppercase", opacity: 0.7 }}>
          Memverifikasi Sesi...
        </span>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="section site-width account-page">
        <div style={{ textAlign: "center", padding: "80px 0", color: "#fff" }}>
          <p>Memuat detail sesi konseling...</p>
        </div>
      </section>
    );
  }

  if (!ticket) {
    const fallbackHref = isAdminView ? "/admin/dashboard?tab=tickets" : "/my-counseling";
    const fallbackLabel = isAdminView ? "Kembali ke Daftar Tiket" : "Kembali ke Tiket Saya";
    return (
      <section className="section site-width account-page">
        <div className="account-login-prompt">
          <h1>Tiket Tidak Ditemukan</h1>
          <p>Sepertinya ID tiket yang kamu buka belum tersedia di sistem kami.</p>
          <Link href={fallbackHref} className="button button-primary">
            {fallbackLabel}
          </Link>
        </div>
      </section>
    );
  }

  const counselingMode = ticket.service_type === "tatap_muka" ? "Konseling Tatap Muka" : "Konseling Online";
  const counselingStage = ticket.tahap_konseling ? `Konseling ${ticket.tahap_konseling}` : "Konseling Pertama";

  const uploadFile = async (rawFile: File) => {
    const formData = new FormData();
    formData.append("file", rawFile);
    const token = localStorage.getItem("ub_counseling_jwt");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/api/uploads`, {
      method: "POST",
      headers: {
        "Authorization": token ? `Bearer ${token}` : ""
      },
      body: formData
    });
    if (!res.ok) {
      throw new Error("Gagal mengunggah file");
    }
    return await res.json();
  };

  const sendMessage = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;

    const hasUploading = pendingAttachments.some(a => a.isUploading);
    if (hasUploading) {
      alert("Harap tunggu hingga semua berkas selesai diunggah.");
      return;
    }

    try {
      const path = isAdminView ? `/api/admin/tickets/${ticketId}/messages` : `/api/tickets/${ticketId}/messages`;
      const attachmentIds = pendingAttachments.map(a => a.dbId).filter((id): id is number => id !== undefined);

      const created = await api.post(path, {
        body: trimmed,
        attachment_ids: attachmentIds,
      });

      const formatted = {
        id: String(created.id),
        ticketId: String(created.ticket_id),
        sender: created.sender_role,
        senderName: created.sender_name,
        sentAt: new Date(created.created_at).toLocaleString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        body: created.body,
        attachments: (created.attachments || []).map((att: any) => ({
          id: String(att.id),
          name: att.file_name,
          url: att.url,
          kind: att.mime_type.startsWith("image/") ? "image" : "file",
          mimeType: att.mime_type,
        })),
      };
      setMessages((current) => [...current, formatted]);
      setTicket((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          status: isAdminView ? "in_progress" : "open"
        };
      });
      setDraft("");
      setPendingAttachments([]);
    } catch (err) {
      console.error("Gagal mengirimkan pesan:", err);
    }
  };

  const onPickAttachment = () => {
    fileInputRef.current?.click();
  };

  const onAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files?.length) return;

    // Batasi ukuran file maksimal 10 MB
    const MAX_SIZE = 10 * 1024 * 1024;
    const validFiles = Array.from(files).filter((file) => {
      if (file.size > MAX_SIZE) {
        alert(`File "${file.name}" melebihi batas ukuran maksimal (10 MB).`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    const newAttachments = validFiles.map((file, index) => {
      const tempId = `${Date.now()}-${file.name}-${index}`;

      uploadFile(file).then((uploaded) => {
        setPendingAttachments((current) =>
          current.map((item) =>
            item.id === tempId
              ? { ...item, dbId: uploaded.id, name: uploaded.file_name, url: uploaded.url, isUploading: false }
              : item
          )
        );
      }).catch((err) => {
        setPendingAttachments((current) =>
          current.map((item) =>
            item.id === tempId
              ? { ...item, isUploading: false, error: "Gagal mengunggah file" }
              : item
          )
        );
      });

      return {
        id: tempId,
        name: file.name,
        url: URL.createObjectURL(file),
        kind: file.type.startsWith("image/") ? ("image" as const) : ("file" as const),
        isUploading: true,
      };
    });

    setPendingAttachments((current) => [...current, ...newAttachments]);
    event.target.value = "";
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((current) => {
      const toDelete = current.find((attachment) => attachment.id === attachmentId);
      if (toDelete?.url.startsWith("blob:")) {
        URL.revokeObjectURL(toDelete.url);
      }
      return current.filter((attachment) => attachment.id !== attachmentId);
    });
  };

  const onDraftKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) {
      return;
    }

    const textarea = event.currentTarget;
    const selectionStart = textarea.selectionStart;
    const selectionEnd = textarea.selectionEnd;
    if (selectionStart !== selectionEnd) {
      return;
    }

    const lineStart = draft.lastIndexOf("\n", selectionStart - 1) + 1;
    const currentLine = draft.slice(lineStart, selectionStart);
    const numberedMatch = currentLine.match(/^(\d+)\.\s+/);
    if (!numberedMatch) {
      return;
    }

    event.preventDefault();
    const nextNumber = Number(numberedMatch[1]) + 1;
    const insertion = `\n${nextNumber}. `;
    const nextDraft =
      draft.slice(0, selectionStart) + insertion + draft.slice(selectionEnd);
    setDraft(nextDraft);
    requestAnimationFrame(() => {
      textarea.selectionStart = selectionStart + insertion.length;
      textarea.selectionEnd = selectionStart + insertion.length;
    });
  };

  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const lines = text.split("\n");
    return lines.map((line, lineIndex) => {
      const parts = line.split(urlRegex);
      return (
        <span key={`line-${lineIndex}`}>
          {parts.map((part, partIndex) =>
            /^https?:\/\//.test(part) ? (
              <a
                key={`part-${lineIndex}-${partIndex}`}
                href={part}
                target="_blank"
                rel="noreferrer noopener"
                className="ticket-message-link"
              >
                {part}
              </a>
            ) : (
              <span key={`part-${lineIndex}-${partIndex}`}>{part}</span>
            )
          )}
          {lineIndex < lines.length - 1 ? <br /> : null}
        </span>
      );
    });
  };

  const renderMessageBody = (body: string) => {
    const hasHtml = /<[a-z][\s\S]*>/i.test(body);
    if (hasHtml) {
      return (
        <div 
          className="ticket-message-html" 
          dangerouslySetInnerHTML={{ __html: body }} 
        />
      );
    }
    return renderTextWithLinks(body);
  };

  const ticketStatus: TicketStatus = isSessionCompleted ? "resolved" : ticket.status;

  const getStatusLabel = (status: TicketStatus) => {
    if (status === "resolved") return "Selesai";
    if (isAdminView) {
      // Sisi Admin: open = Menunggu Balasan (dari Admin), in_progress = Sudah Dibalas (oleh Admin)
      return status === "open" ? "Menunggu Balasan" : "Sudah Dibalas";
    } else {
      // Sisi Mahasiswa: open = Sudah Dibalas (Mahasiswa sudah kirim chat), in_progress = Menunggu Balasan (dari Konselor)
      return status === "open" ? "Sudah Dibalas" : "Menunggu Balasan";
    }
  };

  const getStatusClass = (status: TicketStatus) => {
    if (status === "resolved") return "resolved";
    if (isAdminView) {
      return status === "open" ? "open" : "in_progress";
    } else {
      return status === "open" ? "in_progress" : "open";
    }
  };

  const backHref = isAdminView ? "/admin/dashboard?tab=tickets" : "/my-counseling";
  const backLabel = isAdminView ? "Kembali ke Daftar Tiket" : "Kembali ke Tiket Saya";
  const completePrompt = isAdminView
    ? "Apakah tiket ini sudah selesai ditangani?"
    : "Apakah kamu mau menyelesaikan sesi konseling ini?";
  const confirmTitle = isAdminView
    ? "Tandai tiket ini selesai?"
    : "Selesaikan sesi konseling?";
  const confirmDescription = isAdminView
    ? "Setelah ditandai selesai, tiket akan dipindahkan ke riwayat tiket selesai."
    : "Setelah diselesaikan, status tiket akan berubah menjadi selesai. Kamu tetap bisa melihat riwayat chat.";
  const composerPlaceholder = isAdminView
    ? "Tulis balasan untuk mahasiswa..."
    : "Tulis pesan untuk konselor...";

  const openCompleteConfirm = () => {
    if (isSessionCompleted) return;
    setIsCompleteConfirmOpen(true);
  };

  const completeSession = async () => {
    try {
      const path = isAdminView ? `/api/admin/tickets/${ticketId}` : `/api/tickets/${ticketId}/resolve`;
      if (isAdminView) {
        await api.put(path, { status: "resolved" });
      } else {
        await api.put(path, {});
      }
      setIsSessionCompleted(true);
      setIsCompleteConfirmOpen(false);
    } catch (err) {
      console.error("Gagal menyelesaikan sesi konseling:", err);
    }
  };

  return (
    <section className="section site-width account-page">
      <div className="ticket-detail-top">
        <Link href={backHref} className="ticket-back-link">
          <ArrowLeft size={16} />
          {backLabel}
        </Link>
      </div>

      <div className="ticket-chat-layout">
        <div className="ticket-chat-main">
          <header className="ticket-chat-header">
            <p className="ticket-chat-id">Tiket ID: {ticket.code}</p>
            <div className={`ticket-status-banner ticket-status-banner-${getStatusClass(ticketStatus)}`}>
              <span className="ticket-status-banner-label">Status Tiket</span>
              <span className="ticket-status-banner-value">
                {getStatusLabel(ticketStatus)}
              </span>
            </div>
          </header>

          <div className="ticket-chat-subject">
            <h1>{ticket.title}</h1>
          </div>

          <div className="ticket-message-list" ref={messageListRef}>
            {messages.map((message) => {
              const isOwnMessage =
                (isAdminView && message.sender === "admin") ||
                (!isAdminView && message.sender === "mahasiswa");
              const senderDisplayName =
                !isAdminView && message.sender === "admin"
                  ? "Admin Konseling"
                  : message.senderName;

              const hasAttachments = message.attachments && message.attachments.length > 0;
              const hasBody = !!message.body && message.body.trim().length > 0;

              return (
                <div
                  key={message.id}
                  className={`ticket-message-group ticket-message-group-${message.sender} ${
                    isOwnMessage ? "ticket-message-group-self" : "ticket-message-group-other"
                  }`}
                  style={{ display: "flex", flexDirection: "column", gap: "4px", width: "100%" }}
                >
                  {hasBody && (
                    <article
                      className={`ticket-message-bubble ${
                        isOwnMessage ? "ticket-message-self" : "ticket-message-other"
                      } ticket-message-${message.sender}`}
                    >
                      <div className="ticket-message-head">
                        <strong>{senderDisplayName}</strong>
                        <span>{message.sentAt}</span>
                      </div>
                      <div className="ticket-message-body-wrap">
                        {renderMessageBody(message.body)}
                      </div>
                    </article>
                  )}
                  
                  {hasAttachments && (
                    <article
                      className={`ticket-message-bubble ticket-message-attachments-bubble ${
                        isOwnMessage ? "ticket-message-self" : "ticket-message-other"
                      } ticket-message-${message.sender}`}
                      style={{ padding: "6px", width: "fit-content", maxWidth: "332px" }}
                    >
                      {!hasBody && (
                        <div className="ticket-message-head" style={{ padding: "2px 6px 4px 6px" }}>
                          <strong>{senderDisplayName}</strong>
                          <span>{message.sentAt}</span>
                        </div>
                      )}
                      {(() => {
                        const images = message.attachments.filter(a => a.kind === "image");
                        const files = message.attachments.filter(a => a.kind === "file");
                        
                        return (
                          <div className="ticket-message-attachments-area">
                            {/* 1. Images Gallery (WhatsApp-style) */}
                            {images.length > 0 && (
                              <div className={`ticket-message-gallery ticket-message-gallery-${Math.min(images.length, 4)}`} style={{ marginTop: "0" }}>
                                {images.slice(0, 4).map((img, idx) => {
                                  const isLastItem = idx === 3 && images.length > 4;
                                  const remainingCount = images.length - 4;
                                  
                                  return (
                                    <div
                                      key={img.id}
                                      className="ticket-message-gallery-item"
                                      onClick={() => openLightbox(images.map(i => ({ name: i.name, url: i.url })), idx)}
                                    >
                                      <img src={img.url} alt={img.name} className="ticket-message-gallery-img" />
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
                              <div className="ticket-message-documents" style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: images.length > 0 ? "8px" : "0", padding: "4px" }}>
                                {files.map((file) => (
                                  <a
                                    key={file.id}
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="ticket-message-document-row"
                                    style={{ maxWidth: "100%" }}
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
                        );
                      })()}
                    </article>
                  )}
                </div>
              );
            })}
          </div>

          <div className="ticket-composer">
            <div className="ticket-composer-main">
              <textarea
                ref={composerTextareaRef}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={onDraftKeyDown}
                placeholder={composerPlaceholder}
                rows={1}
              />
              {pendingAttachments.length > 0 ? (
                <div className="ticket-pending-attachments">
                  {pendingAttachments.map((attachment) => (
                    <div
                      key={attachment.id}
                      className="ticket-pending-attachment-chip"
                      style={attachment.isUploading ? { opacity: 0.6 } : attachment.error ? { border: "1px solid #ef4444" } : undefined}
                    >
                      <span>{attachment.name}</span>
                      {attachment.isUploading && (
                        <span style={{ fontSize: "10px", color: "var(--text-secondary)", marginRight: "4px" }}>Mengunggah...</span>
                      )}
                      {attachment.error && (
                        <span style={{ fontSize: "10px", color: "#ef4444", marginRight: "4px" }} title={attachment.error}>Gagal</span>
                      )}
                      <button
                        type="button"
                        aria-label={`Hapus lampiran ${attachment.name}`}
                        onClick={() => removePendingAttachment(attachment.id)}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="ticket-composer-actions">
              <input
                ref={fileInputRef}
                type="file"
                className="ticket-attach-input"
                onChange={onAttachmentChange}
                multiple
              />
              <button
                type="button"
                className="ticket-attach-button"
                onClick={onPickAttachment}
                aria-label="Lampirkan file atau gambar"
              >
                <Paperclip size={16} />
              </button>
              <button type="button" onClick={sendMessage} className="button button-primary">
                <SendHorizontal size={16} />
                Kirim
              </button>
            </div>
          </div>
        </div>

        <aside className="ticket-chat-side">
          <h2>Detail Layanan</h2>
          <div className="ticket-side-info">
            <div className="ticket-side-row">
              <span>Jenis Layanan</span>
              <strong>{counselingMode}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Tahap Konseling</span>
              <strong>{counselingStage}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Topik Konseling</span>
              <strong>{ticket.category}</strong>
            </div>
            <div className="ticket-side-row">
              <span>Dibuat</span>
              <strong>{ticket ? new Date(ticket.created_at || ticket.createdAt).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "-"}</strong>
            </div>
            {isAdminView ? (
              <>
                <div className="ticket-side-divider" />
                <p className="ticket-side-subtitle">Detail Mahasiswa</p>
                <div className="ticket-side-row">
                  <span>Nama</span>
                  <strong>{student?.full_name || student?.fullName || "-"}</strong>
                </div>
                <div className="ticket-side-row">
                  <span>Jenis Kelamin</span>
                  <strong>{student?.gender ?? "-"}</strong>
                </div>
                <div className="ticket-side-row">
                  <span>Fakultas & Jurusan</span>
                  <strong>
                    {student
                      ? `${student.faculty} — ${student.department}`
                      : "-"}
                  </strong>
                </div>
                {student ? (
                  <Link href={`/admin/students/${student.id}`} className="ticket-side-student-link">
                    Lihat detail mahasiswa
                  </Link>
                ) : null}
              </>
            ) : null}
            <div className="ticket-side-action">
              <p>{completePrompt}</p>
              <button
                type="button"
                className="button button-primary ticket-finish-button"
                onClick={openCompleteConfirm}
                disabled={isSessionCompleted}
              >
                {isSessionCompleted ? "Sesi Selesai" : "Selesai"}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {isMounted && isCompleteConfirmOpen ? createPortal(
        <div className="ticket-confirm-modal" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Tutup konfirmasi"
            className="ticket-confirm-backdrop"
            onClick={() => setIsCompleteConfirmOpen(false)}
          />
          <div className="ticket-confirm-panel">
            <h3>{confirmTitle}</h3>
            <p>{confirmDescription}</p>
            <div className="ticket-confirm-actions">
              <button
                type="button"
                className="button button-secondary"
                onClick={() => setIsCompleteConfirmOpen(false)}
              >
                Batal
              </button>
              <button type="button" className="button button-primary" onClick={completeSession}>
                Selesaikan Sesi
              </button>
            </div>
          </div>
        </div>,
        document.body
      ) : null}

      {isMounted && activeLightbox ? createPortal(
        <div className="ticket-lightbox-backdrop" onClick={closeLightbox} role="dialog" aria-modal="true">
          <div className="ticket-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              className="ticket-lightbox-download"
              onClick={() => handleDownloadImage(activeLightbox.images[activeLightbox.index].url, activeLightbox.images[activeLightbox.index].name)}
              aria-label="Unduh"
              title="Unduh Gambar"
            >
              <Download size={20} />
            </button>
            <button className="ticket-lightbox-close" onClick={closeLightbox} aria-label="Tutup">
              <X size={24} />
            </button>
            
            {activeLightbox.images.length > 1 && (
              <>
                <button className="ticket-lightbox-nav ticket-lightbox-nav-prev" onClick={() => navigateLightbox("prev")} aria-label="Sebelumnya">
                  <ChevronLeft size={36} />
                </button>
                <button className="ticket-lightbox-nav ticket-lightbox-nav-next" onClick={() => navigateLightbox("next")} aria-label="Selanjutnya">
                  <ChevronRight size={36} />
                </button>
              </>
            )}
            
            <div className="ticket-lightbox-image-wrap">
              <img
                src={activeLightbox.images[activeLightbox.index].url}
                alt={activeLightbox.images[activeLightbox.index].name}
                className="ticket-lightbox-image"
              />
              <p className="ticket-lightbox-caption">{activeLightbox.images[activeLightbox.index].name}</p>
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  );
}
