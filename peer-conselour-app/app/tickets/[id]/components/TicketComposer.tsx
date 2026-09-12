import { useCallback, useEffect, useRef, useState } from "react";
import type { ChangeEvent, ClipboardEvent, DragEvent, KeyboardEvent } from "react";
import { Bold, Check, Italic, List, ListOrdered, Paperclip, Pencil, SendHorizontal, X } from "lucide-react";
import { api } from "@/utils/api";
import { bodyToEditorHtml, placeCaretAtEnd, serializeEditorToText } from "./messageFormat";
import type { EditTarget, PendingAttachment, ReplyTarget, TicketViewMode } from "./types";

// Batasi ukuran file maksimal 10 MB
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const NO_ACTIVE_FORMATS = { bold: false, italic: false };

type FormatType = "bold" | "italic" | "bullet" | "number";

type TicketComposerProps = {
  viewer: TicketViewMode;
  replyTo: ReplyTarget | null;
  editing: EditTarget | null;
  /** true saat modal/lightbox terbuka: Escape tidak membatalkan mode edit. */
  shortcutsSuspended: boolean;
  onCancelReply: () => void;
  onCancelEdit: () => void;
  /** Resolve true bila pesan terkirim; composer lalu dikosongkan. */
  onSend: (message: { body: string; attachmentIds: number[] }) => Promise<boolean>;
  /** Resolve true bila perubahan tersimpan; parent keluar dari mode edit. */
  onSaveEdit: (messageId: string, body: string) => Promise<boolean>;
};

function isEditorEmpty(editor: HTMLElement) {
  return (editor.textContent ?? "").trim().length === 0;
}

function hasDraggedFiles(event: DragEvent<HTMLElement>) {
  return event.dataTransfer.types.includes("Files");
}

export function TicketComposer({
  viewer,
  replyTo,
  editing,
  shortcutsSuspended,
  onCancelReply,
  onCancelEdit,
  onSend,
  onSaveEdit,
}: TicketComposerProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);
  const isSubmittingRef = useRef(false);
  const dragDepthRef = useRef(0);
  // Menyimpan draf pesan baru yang sedang diketik saat pengguna masuk mode edit,
  // supaya dapat dikembalikan setelah edit selesai/dibatalkan (seperti WhatsApp).
  const savedDraftHtmlRef = useRef("");
  const previousEditIdRef = useRef<string | null>(null);

  // Hanya status "kosong" yang disimpan di state (bukan isi draf), sehingga
  // mengetik tidak memicu re-render selama status ini tidak berubah.
  const [isEmpty, setIsEmpty] = useState(true);
  const [activeFormats, setActiveFormats] = useState(NO_ACTIVE_FORMATS);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const isEditing = editing !== null;
  const composerPlaceholder = viewer === "admin" ? "Tulis balasan untuk mahasiswa..." : "Tulis pesan untuk konselor...";

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const refreshActiveFormats = useCallback(() => {
    try {
      const bold = document.queryCommandState("bold");
      const italic = document.queryCommandState("italic");
      setActiveFormats((current) =>
        current.bold === bold && current.italic === italic ? current : { bold, italic }
      );
    } catch {
      // queryCommandState bisa melempar bila tidak ada selection aktif — abaikan.
    }
  }, []);

  const syncFromEditor = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    setIsEmpty(isEditorEmpty(editor));
    refreshActiveFormats();
  }, [refreshActiveFormats]);

  const clearEditor = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    setIsEmpty(true);
    setActiveFormats(NO_ACTIVE_FORMATS);
  }, []);

  // Mode edit dipindahkan ke composer bawah (pola WhatsApp Web): isi pesan dimuat
  // ke editor visual, chat list diredupkan, dan tombol kirim berubah jadi centang.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const previousEditId = previousEditIdRef.current;
    previousEditIdRef.current = editing?.id ?? null;

    if (editing) {
      // Simpan draf pesan baru hanya sekali, saat pertama kali masuk mode edit
      if (!previousEditId) {
        savedDraftHtmlRef.current = editor.innerHTML;
      }
      editor.innerHTML = bodyToEditorHtml(editing.body);
      setIsEmpty(isEditorEmpty(editor));
      const frame = requestAnimationFrame(() => {
        editor.focus();
        placeCaretAtEnd(editor);
      });
      return () => cancelAnimationFrame(frame);
    }

    if (previousEditId) {
      // Kembalikan draf pesan baru yang tersimpan sebelum masuk mode edit
      editor.innerHTML = savedDraftHtmlRef.current;
      savedDraftHtmlRef.current = "";
      setIsEmpty(isEditorEmpty(editor));
      setActiveFormats(NO_ACTIVE_FORMATS);
    }
  }, [editing]);

  useEffect(() => {
    if (!isEditing || shortcutsSuspended) return;

    const onEscape = (event: globalThis.KeyboardEvent) => {
      // Escape ditangani modal bila ada modal yang sedang terbuka (shortcutsSuspended)
      if (event.key !== "Escape") return;
      event.preventDefault();
      onCancelEdit();
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [isEditing, shortcutsSuspended, onCancelEdit]);

  // Format diterapkan langsung secara visual di dalam editor (bukan simbol mentah)
  const applyFormat = (formatType: FormatType) => {
    const editor = editorRef.current;
    if (!editor) return;

    if (!editor.contains(document.getSelection()?.anchorNode ?? null)) {
      editor.focus();
    }

    const commandByFormat = {
      bold: "bold",
      italic: "italic",
      bullet: "insertUnorderedList",
      number: "insertOrderedList",
    } as const;

    try {
      // Pastikan browser menghasilkan tag semantik (<b>/<i>), bukan inline style
      document.execCommand("styleWithCSS", false, "false");
      document.execCommand(commandByFormat[formatType], false);
    } catch (err) {
      console.error("Gagal menerapkan format teks:", err);
    }

    syncFromEditor();
  };

  // Enter di dalam list dibiarkan agar browser melanjutkan/menutup list secara alami
  const isSelectionInsideList = () => {
    const anchorNode = window.getSelection()?.anchorNode;
    if (!anchorNode) return false;
    const element =
      anchorNode.nodeType === Node.ELEMENT_NODE ? (anchorNode as HTMLElement) : anchorNode.parentElement;
    return !!element?.closest("li");
  };

  const submit = async () => {
    const editor = editorRef.current;
    if (!editor || isSubmittingRef.current) return;

    const text = serializeEditorToText(editor).trim();
    if (!text) return;

    if (!editing && pendingAttachments.some((attachment) => attachment.isUploading)) {
      alert("Harap tunggu hingga semua berkas selesai diunggah.");
      return;
    }

    // Penjaga double-submit: Enter beruntun tidak boleh mengirim pesan ganda.
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      if (editing) {
        await onSaveEdit(editing.id, text);
        return;
      }

      const attachmentIds = pendingAttachments
        .map((attachment) => attachment.dbId)
        .filter((id): id is number => id !== undefined);
      const sent = await onSend({ body: text, attachmentIds });
      if (sent && isMountedRef.current) {
        clearEditor();
        setPendingAttachments([]);
      }
    } finally {
      isSubmittingRef.current = false;
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  const onEditorKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
    const hasMeta = isMac ? event.metaKey : event.ctrlKey;

    if (hasMeta && event.key.toLowerCase() === "b") {
      event.preventDefault();
      applyFormat("bold");
      return;
    }
    if (hasMeta && event.key.toLowerCase() === "i") {
      event.preventDefault();
      applyFormat("italic");
      return;
    }

    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      if (isSelectionInsideList()) return;
      event.preventDefault();
      void submit();
    }
  };

  // Tempel sebagai teks polos supaya HTML dari sumber luar tidak masuk ke editor
  const onEditorPaste = (event: ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const text = event.clipboardData.getData("text/plain");
    try {
      document.execCommand("insertText", false, text);
    } catch (err) {
      console.error("Gagal menempelkan teks:", err);
    }
    syncFromEditor();
  };

  const uploadAttachment = (file: File, tempId: string) => {
    const formData = new FormData();
    formData.append("file", file);

    api
      .upload("/api/uploads", formData)
      .then((uploaded: { id: number; file_name?: string }) => {
        if (!isMountedRef.current) return;
        setPendingAttachments((current) =>
          current.map((item) =>
            item.id === tempId
              ? { ...item, dbId: uploaded.id, name: uploaded.file_name || item.name, isUploading: false }
              : item
          )
        );
      })
      .catch((err: unknown) => {
        if (!isMountedRef.current) return;
        const errorMsg = err instanceof Error && err.message ? err.message : "Gagal mengunggah file";
        setPendingAttachments((current) =>
          current.map((item) => (item.id === tempId ? { ...item, isUploading: false, error: errorMsg } : item))
        );
      });
  };

  // Lampiran tidak lagi dibuatkan Object URL (blob:) karena tidak pernah
  // dipratinjau di composer — tidak ada URL yang perlu di-revoke atau bocor.
  const addFiles = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    const validFiles = files.filter((file) => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        alert(`File "${file.name}" melebihi batas ukuran maksimal (10 MB).`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    const batchId = Date.now();
    const created = validFiles.map<PendingAttachment>((file, index) => ({
      id: `${batchId}-${index}-${file.name}`,
      name: file.name,
      kind: file.type.startsWith("image/") ? "image" : "file",
      isUploading: true,
    }));

    setPendingAttachments((current) => [...current, ...created]);
    validFiles.forEach((file, index) => uploadAttachment(file, created[index].id));
  };

  const onAttachmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const removePendingAttachment = (attachmentId: string) => {
    setPendingAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
  };

  const onDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (isEditing || !hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragActive(true);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (isEditing || !hasDraggedFiles(event)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragActive(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!hasDraggedFiles(event)) return;
    event.preventDefault();
    dragDepthRef.current = 0;
    setIsDragActive(false);
    if (!isEditing) addFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`ticket-composer${isDragActive ? " is-drag-active" : ""}`}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="ticket-composer-main">
        {editing ? (
          <div className="ticket-reply-bar ticket-edit-bar">
            <div className="ticket-reply-bar-content">
              <div className="ticket-reply-bar-name">
                <Pencil size={12} aria-hidden="true" /> Mengedit Pesan
              </div>
              <div className="ticket-reply-bar-text">{editing.preview || "Pesan"}</div>
            </div>
            <button
              type="button"
              className="ticket-reply-bar-close"
              onClick={onCancelEdit}
              aria-label="Batalkan edit pesan"
              title="Batalkan edit (Esc)"
            >
              <X size={14} />
            </button>
          </div>
        ) : replyTo ? (
          <div className="ticket-reply-bar">
            <div className="ticket-reply-bar-content">
              <div className="ticket-reply-bar-name">{replyTo.name}</div>
              <div className="ticket-reply-bar-text">{replyTo.body}</div>
            </div>
            <button type="button" className="ticket-reply-bar-close" onClick={onCancelReply} aria-label="Batalkan balasan">
              <X size={14} />
            </button>
          </div>
        ) : null}

        {/* Formatting toolbar */}
        <div className="ticket-composer-toolbar">
          <button
            type="button"
            className={`ticket-format-btn${activeFormats.bold ? " ticket-format-btn-active" : ""}`}
            title="Bold (Ctrl+B)"
            aria-label="Tebal"
            aria-pressed={activeFormats.bold}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("bold")}
          >
            <Bold size={13} />
          </button>
          <button
            type="button"
            className={`ticket-format-btn${activeFormats.italic ? " ticket-format-btn-active" : ""}`}
            title="Italic (Ctrl+I)"
            aria-label="Miring"
            aria-pressed={activeFormats.italic}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("italic")}
          >
            <Italic size={13} />
          </button>
          <div className="ticket-format-divider" />
          <button
            type="button"
            className="ticket-format-btn"
            title="Bullet list"
            aria-label="Daftar berpoin"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("bullet")}
          >
            <List size={13} />
          </button>
          <button
            type="button"
            className="ticket-format-btn"
            title="Numbered list"
            aria-label="Daftar bernomor"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applyFormat("number")}
          >
            <ListOrdered size={13} />
          </button>
        </div>

        <div
          ref={editorRef}
          className={`ticket-composer-editor${isEmpty ? " is-empty" : ""}`}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={composerPlaceholder}
          data-placeholder={composerPlaceholder}
          onInput={syncFromEditor}
          onKeyDown={onEditorKeyDown}
          onKeyUp={refreshActiveFormats}
          onMouseUp={refreshActiveFormats}
          onFocus={refreshActiveFormats}
          onPaste={onEditorPaste}
        />

        {pendingAttachments.length > 0 ? (
          <div className="ticket-pending-attachments">
            {pendingAttachments.map((attachment) => (
              <div
                key={attachment.id}
                className={`ticket-pending-attachment-chip${attachment.isUploading ? " is-uploading" : ""}${
                  attachment.error ? " has-error" : ""
                }`}
              >
                <span className="ticket-pending-attachment-name">{attachment.name}</span>
                {attachment.isUploading ? (
                  <span className="ticket-pending-attachment-status">Mengunggah...</span>
                ) : null}
                {attachment.error ? (
                  <span className="ticket-pending-attachment-status is-error" title={attachment.error}>
                    Gagal
                  </span>
                ) : null}
                <button
                  type="button"
                  aria-label={`Hapus lampiran ${attachment.name}`}
                  onClick={() => removePendingAttachment(attachment.id)}
                >
                  <X size={14} />
                </button>
                {attachment.isUploading ? <span className="ticket-upload-progress" aria-hidden="true" /> : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="ticket-composer-actions">
        <input ref={fileInputRef} type="file" className="ticket-attach-input" onChange={onAttachmentChange} multiple />
        <button
          type="button"
          className="ticket-attach-button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Lampirkan file atau gambar"
          title={isEditing ? "Lampiran tidak dapat diubah saat mengedit pesan" : "Lampirkan file atau gambar (atau seret ke sini)"}
          disabled={isEditing}
        >
          <Paperclip size={16} />
        </button>
        {isEditing ? (
          <button
            type="button"
            onClick={() => void submit()}
            className="button button-primary ticket-composer-save-btn"
            title="Simpan Perubahan"
            aria-label="Simpan Perubahan"
            disabled={isSubmitting || isEmpty}
          >
            <Check size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void submit()}
            className="button button-primary"
            disabled={isSubmitting}
          >
            <SendHorizontal size={16} />
            {isSubmitting ? "Mengirim..." : "Kirim"}
          </button>
        )}
      </div>
    </div>
  );
}
