"use client";

import DOMPurify from "dompurify";
import { memo, type ReactNode } from "react";
import { HTML_BODY_RE } from "./messageFormat";

const INLINE_RE = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;

function renderInline(str: string, keyPrefix: string): ReactNode[] {
  const result: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;

  while ((match = INLINE_RE.exec(str)) !== null) {
    const [token] = match;
    const start = match.index;

    if (start > last) {
      result.push(<span key={`${keyPrefix}-t${last}`}>{str.slice(last, start)}</span>);
    }

    if (token.startsWith("*") && token.endsWith("*") && token.length > 2) {
      result.push(<strong key={`${keyPrefix}-b${start}`}>{token.slice(1, -1)}</strong>);
    } else if (token.startsWith("_") && token.endsWith("_") && token.length > 2) {
      result.push(<em key={`${keyPrefix}-i${start}`}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("~") && token.endsWith("~") && token.length > 2) {
      result.push(<s key={`${keyPrefix}-s${start}`}>{token.slice(1, -1)}</s>);
    } else if (/^https?:\/\//.test(token)) {
      result.push(
        <a key={`${keyPrefix}-u${start}`} href={token} target="_blank" rel="noreferrer noopener" className="ticket-message-link">
          {token}
        </a>
      );
    } else {
      result.push(<span key={`${keyPrefix}-x${start}`}>{token}</span>);
    }

    last = start + token.length;
  }

  if (last < str.length) {
    result.push(<span key={`${keyPrefix}-tail`}>{str.slice(last)}</span>);
  }

  return result;
}

// Baris tunggal di dalam satu paragraf disambung dengan <br />
function renderLines(lines: string[], keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  lines.forEach((line, index) => {
    if (index > 0) {
      nodes.push(<br key={`${keyPrefix}-br${index}`} />);
    }
    nodes.push(...renderInline(line, `${keyPrefix}-l${index}`));
  });
  return nodes;
}

function renderMarkdown(text: string): ReactNode {
  // Jeda paragraf (satu baris kosong atau lebih) memisahkan blok <p>,
  // bukan <br /> yang tinggi box-nya bisa collapse di Safari/WebKit.
  const result: ReactNode[] = [];

  text.split(/\n{2,}/).forEach((block, blockIndex) => {
    if (!block.trim()) return;

    const lines = block.split("\n");
    let buffer: string[] = [];
    let i = 0;

    const flushParagraph = (key: string) => {
      if (buffer.length === 0) return;
      const paragraphLines = buffer;
      buffer = [];
      result.push(
        <p key={key} className="ticket-markdown-p">
          {renderLines(paragraphLines, key)}
        </p>
      );
    };

    while (i < lines.length) {
      const line = lines[i];

      if (/^- /.test(line)) {
        flushParagraph(`p-${blockIndex}-${i}`);
        const items: ReactNode[] = [];
        while (i < lines.length && /^- /.test(lines[i])) {
          items.push(
            <li key={`${blockIndex}-${i}`}>{renderInline(lines[i].slice(2), `li-${blockIndex}-${i}`)}</li>
          );
          i++;
        }
        result.push(<ul key={`ul-${blockIndex}-${i}`}>{items}</ul>);
        continue;
      }

      if (/^\d+\. /.test(line)) {
        flushParagraph(`p-${blockIndex}-${i}`);
        const items: ReactNode[] = [];
        while (i < lines.length && /^\d+\. /.test(lines[i])) {
          items.push(
            <li key={`${blockIndex}-${i}`}>
              {renderInline(lines[i].replace(/^\d+\. /, ""), `oli-${blockIndex}-${i}`)}
            </li>
          );
          i++;
        }
        result.push(<ol key={`ol-${blockIndex}-${i}`}>{items}</ol>);
        continue;
      }

      buffer.push(line);
      i++;
    }

    flushParagraph(`p-${blockIndex}-end`);
  });

  return <div className="ticket-message-md ticket-message-markdown">{result}</div>;
}

/**
 * Isi bubble chat. Pesan hasil migrasi osTicket (HTML) dirender native setelah
 * disanitasi; pesan baru (markdown ringan) dirender lewat renderMarkdown.
 * Di-memo per isi pesan supaya DOMPurify tidak berjalan ulang di setiap render.
 */
export const MessageBody = memo(function MessageBody({ body }: { body: string }) {
  if (HTML_BODY_RE.test(body)) {
    // Membersihkan HTML dari tag berbahaya seperti <script>, event handlers dll.
    const cleanHtml = DOMPurify.sanitize(body);
    return <div className="ticket-message-html" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
  }
  return <>{renderMarkdown(body)}</>;
});
