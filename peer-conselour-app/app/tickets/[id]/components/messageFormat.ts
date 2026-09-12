import DOMPurify from "dompurify";
import { formatDateTime } from "../../../_portal/format";
import type { ApiMessage, ChatMessage, TicketViewMode } from "./types";

// Mengubah isi editor WYSIWYG menjadi teks markdown ringan yang dipakai thread chat
// (*tebal*, _miring_, ~coret~, "- " untuk bullet, "1. " untuk numbering) sehingga
// pesan tetap tersimpan dalam satu format konsisten dan dirender oleh MessageBody.
function serializeEditorNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return (node.textContent || "").replace(/ /g, " ");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as HTMLElement;
  const tag = element.tagName.toLowerCase();
  const inner = Array.from(element.childNodes).map(serializeEditorNode).join("");

  switch (tag) {
    case "br":
      return "\n";
    case "b":
    case "strong":
      return inner.trim() ? `*${inner}*` : inner;
    case "i":
    case "em":
      return inner.trim() ? `_${inner}_` : inner;
    case "s":
    case "strike":
    case "del":
      return inner.trim() ? `~${inner}~` : inner;
    case "ul":
    case "ol": {
      const items = Array.from(element.children).filter(
        (child) => child.tagName.toLowerCase() === "li"
      );
      return items
        .map((item, index) => {
          const marker = tag === "ol" ? `${index + 1}. ` : "- ";
          const itemText = Array.from(item.childNodes).map(serializeEditorNode).join("").trim();
          return `\n${marker}${itemText}`;
        })
        .join("");
    }
    // <p> adalah paragraf: dipisahkan satu baris kosong (\n\n)
    case "p":
      return `\n\n${inner}`;
    // <div>/<li> adalah baris visual: cukup satu baris baru (soft line-break).
    // Baris kosong di editor berbentuk <div><br></div> sehingga otomatis
    // menghasilkan "\n" + "\n" = jeda paragraf.
    case "div":
    case "blockquote":
    case "li":
      return `\n${inner}`;
    default:
      return inner;
  }
}

export function serializeEditorToText(root: HTMLElement): string {
  const raw = Array.from(root.childNodes).map(serializeEditorNode).join("");
  return raw.replace(/\n{3,}/g, "\n\n").replace(/[ \t]+\n/g, "\n").trim();
}

// Tag yang boleh hidup di dalam editor: cukup untuk mempertahankan tebal, miring,
// coret, baris baru, dan kedua jenis list saat pesan lama dimuat untuk disunting.
const EDITOR_ALLOWED_TAGS = ["b", "strong", "i", "em", "s", "strike", "del", "br", "p", "div", "ul", "ol", "li"];

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Kebalikan dari serializeEditorToText: markdown ringan -> HTML untuk editor visual
function markdownToEditorHtml(text: string): string {
  const renderInline = (line: string): string =>
    escapeHtml(line)
      .replace(/\*([^*\n]+)\*/g, "<b>$1</b>")
      .replace(/_([^_\n]+)_/g, "<i>$1</i>")
      .replace(/~([^~\n]+)~/g, "<s>$1</s>");

  const lines = text.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (/^- /.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && /^- /.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].slice(2))}</li>`);
        i++;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }
    if (/^\d+\. /.test(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\. /.test(lines[i])) {
        items.push(`<li>${renderInline(lines[i].replace(/^\d+\. /, ""))}</li>`);
        i++;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }
    html.push(lines[i] === "" ? "<div><br></div>" : `<div>${renderInline(lines[i])}</div>`);
    i++;
  }

  return html.join("");
}

// HTML pesan lama (osTicket) dibaca lewat serializer yang sama dengan editor,
// sehingga <p>/<br><br> menjadi jeda paragraf "\n\n" yang teratur.
function htmlBodyToMarkdown(html: string): string {
  const holder = document.createElement("div");
  holder.innerHTML = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: EDITOR_ALLOWED_TAGS,
    ALLOWED_ATTR: [],
  });
  return serializeEditorToText(holder);
}

export const HTML_BODY_RE = /<[a-z][\s\S]*>/i;

// Memuat isi pesan ke editor composer tanpa kehilangan format. HTML mentah tidak
// pernah disuntikkan langsung ke innerHTML editor: semuanya dinormalisasi dulu
// menjadi markdown ringan, lalu dibangun ulang sebagai struktur baris seragam
// (<div>teks</div> untuk baris, <div><br></div> untuk baris kosong). Ini mencegah
// margin bawaan <p> browser membuat rongga raksasa di dalam composer.
export function bodyToEditorHtml(body: string): string {
  if (!body) return "";
  const markdown = HTML_BODY_RE.test(body) ? htmlBodyToMarkdown(body) : body;
  return markdownToEditorHtml(markdown);
}

export function placeCaretAtEnd(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) return;
  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  selection.removeAllRanges();
  selection.addRange(range);
}

// Pesan balasan disimpan dengan prefix ">>reply-to:<id>\n" — prefix ini harus
// dipertahankan saat pesan disunting agar kutipan balasan tidak hilang.
export const REPLY_PREFIX_RE = /^>>reply-to:[^\n]+\n/;
const REPLY_PARSE_RE = /^>>reply-to:([^\n]+)\n([\s\S]*)/;

export function parseReplyPrefix(body: string): { replyToId: string | null; displayBody: string } {
  const match = body.match(REPLY_PARSE_RE);
  if (!match) return { replyToId: null, displayBody: body };
  return { replyToId: match[1], displayBody: match[2] };
}

/** Teks polos tanpa prefix balasan, tag HTML, dan penanda markdown (untuk salin & preview). */
export function stripMessageMarkup(body: string): string {
  return body
    .replace(REPLY_PREFIX_RE, "")
    .replace(/<[^>]*>/g, "")
    .replace(/[*_~]/g, "");
}

/** Dirapatkan jadi satu baris agar muat di bilah composer / kutipan balasan. */
export function toPreview(text: string, maxLength = 80): string {
  const singleLine = text.replace(/\s+/g, " ").trim();
  return singleLine.length > maxLength ? `${singleLine.slice(0, maxLength)}...` : singleLine;
}

/** Mahasiswa tidak melihat nama konselor: pesan admin tampil sebagai "Admin Konseling". */
export function getSenderDisplayName(sender: string, senderName: string, viewer: TicketViewMode): string {
  return viewer === "student" && sender === "admin" ? "Admin Konseling" : senderName;
}

export function mapApiMessage(message: ApiMessage): ChatMessage {
  return {
    id: String(message.id),
    ticketId: String(message.ticket_id),
    sender: message.sender_role,
    senderName: message.sender_name,
    sentAt: formatDateTime(message.created_at),
    body: message.body ?? "",
    editedAt: message.edited_at || null,
    attachments: (message.attachments ?? []).map((attachment) => {
      const mimeType = attachment.mime_type ?? "";
      return {
        id: String(attachment.id),
        name: attachment.file_name,
        url: attachment.url,
        kind: mimeType.startsWith("image/") ? "image" : "file",
        mimeType,
      };
    }),
  };
}
