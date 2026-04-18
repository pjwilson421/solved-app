import type { ReferenceFile } from "@/components/create-image/types";

export type ReferenceImageApiPart = {
  mimeType: string;
  /** Raw base64 (no `data:` prefix). */
  data: string;
};

const MAX_REFERENCE_IMAGES = 8;
const MAX_BYTES_PER_IMAGE = 12 * 1024 * 1024;

function base64FromArrayBuffer(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Re-use for client-composed editor images (PNG data URLs). */
export function referenceImagePartFromDataUrl(
  dataUrl: string,
): ReferenceImageApiPart | null {
  return parseDataUrl(dataUrl);
}

function parseDataUrl(dataUrl: string): ReferenceImageApiPart | null {
  if (!dataUrl.startsWith("data:")) return null;
  const comma = dataUrl.indexOf(",");
  if (comma === -1) return null;
  const header = dataUrl.slice(5, comma).toLowerCase();
  const body = dataUrl.slice(comma + 1);
  const mimeType = header.split(";")[0].trim();
  if (!mimeType.startsWith("image/")) return null;
  if (header.includes(";base64")) {
    const data = body.replace(/\s/g, "");
    if (!data.length) return null;
    return { mimeType, data };
  }
  try {
    const decoded = decodeURIComponent(body);
    return {
      mimeType,
      data: base64FromArrayBuffer(new TextEncoder().encode(decoded).buffer),
    };
  } catch {
    return null;
  }
}

async function blobToPart(blob: Blob): Promise<ReferenceImageApiPart | null> {
  if (blob.size > MAX_BYTES_PER_IMAGE) return null;
  const mimeType = (blob.type || "image/png").split(";")[0].trim().toLowerCase();
  if (!mimeType.startsWith("image/")) return null;
  const buf = await blob.arrayBuffer();
  if (buf.byteLength > MAX_BYTES_PER_IMAGE) return null;
  return { mimeType, data: base64FromArrayBuffer(buf) };
}

/**
 * Load prompt-bar reference attachments as base64 payloads for `/api/ai/generate-image`.
 */
export async function encodeReferenceFilesForApi(
  refs: ReferenceFile[],
): Promise<ReferenceImageApiPart[]> {
  const out: ReferenceImageApiPart[] = [];
  for (const ref of refs) {
    if (out.length >= MAX_REFERENCE_IMAGES) break;
    const u = ref.url?.trim() ?? "";
    if (!u) continue;

    if (u.startsWith("data:")) {
      const part = parseDataUrl(u);
      if (part) out.push(part);
      continue;
    }

    try {
      const res = await fetch(u);
      if (!res.ok) continue;
      const blob = await res.blob();
      const part = await blobToPart(blob);
      if (part) out.push(part);
    } catch {
      /* skip unreadable reference */
    }
  }
  return out;
}
