import fs from "node:fs";
import path from "node:path";

export interface ImageDimensions {
  width: number;
  height: number;
}

/** Fallback 16:9 dipakai bila header gambar tidak bisa dibaca. */
const FALLBACK: ImageDimensions = { width: 1280, height: 720 };

function readPng(buf: Buffer): ImageDimensions | null {
  // Signature 8 byte, lalu chunk IHDR: width & height sebagai uint32 BE.
  if (buf.length < 24) return null;
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

function readJpeg(buf: Buffer): ImageDimensions | null {
  if (buf.length < 4 || buf.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buf[offset + 1];

    // SOF0-SOF3 dan SOF5-SOF15 membawa dimensi; DHT/DAC/RST/SOS tidak.
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }

    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    if (marker === 0xda || marker === 0xd9) break; // mulai scan data / akhir

    const segmentLength = buf.readUInt16BE(offset + 2);
    if (segmentLength < 2) break;
    offset += 2 + segmentLength;
  }
  return null;
}

/**
 * Membaca dimensi asli gambar di dalam `public/` langsung dari header file.
 * Dipakai di Server Component saat build (SSG) supaya `next/image` menerima
 * rasio yang persis sama dengan gambar aslinya — render jadi identik dengan
 * `<img>` biasa, tanpa layout shift, tapi tetap dapat srcset + AVIF/WebP.
 */
export function getPublicImageSize(publicPath: string): ImageDimensions {
  try {
    const clean = publicPath.split("?")[0].split("#")[0];
    const filePath = path.join(process.cwd(), "public", clean.replace(/^\//, ""));
    // Header cukup dibaca dari beberapa KB pertama.
    const fd = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(65536);
    const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
    fs.closeSync(fd);
    const head = buf.subarray(0, bytesRead);

    return readPng(head) ?? readJpeg(head) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
