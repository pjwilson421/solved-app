/**
 * Persists the image editor canvas preview across navigations (localStorage).
 * Separate from `pending-editor-image` (session handoff), which is cleared after load.
 */

import type { PendingEditorImagePayload } from "@/lib/create-image/pending-editor-image";

const URL_KEY = "solved-app-last-editor-preview-url-v1";
const META_KEY = "solved-app-last-editor-preview-meta-v1";

type StoredMeta = Omit<PendingEditorImagePayload, "imageUrl">;

function parsePayload(data: Record<string, unknown>): PendingEditorImagePayload | null {
  const imageUrl = data.imageUrl;
  if (typeof imageUrl !== "string" || imageUrl.length === 0) return null;

  const modeRaw = data.mode;
  const mode =
    modeRaw === "edit" || modeRaw === "upscale" ? modeRaw : undefined;

  const optStr = (k: string): string | null => {
    const v = data[k];
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  const fileId = optStr("fileId");
  const activityId = optStr("activityId");
  const fullResolutionUrl = optStr("fullResolutionUrl");
  const promptText = optStr("promptText");
  const createdAt = optStr("createdAt");
  const aspectRatio = optStr("aspectRatio");
  const resolution = optStr("resolution");

  const liked = data.liked === true ? true : data.liked === false ? false : undefined;

  return {
    ...(mode ? { mode } : {}),
    imageUrl,
    fileId,
    activityId,
    fullResolutionUrl,
    promptText,
    createdAt,
    aspectRatio,
    resolution,
    ...(liked !== undefined ? { liked } : {}),
  };
}

/** Blob URLs are not reliable after leaving the page; do not persist them. */
export function isPersistableEditorPreviewUrl(url: string): boolean {
  const t = url.trim();
  if (!t) return false;
  if (t.startsWith("blob:")) return false;
  return true;
}

export function writeLastEditorPreview(payload: PendingEditorImagePayload): void {
  if (typeof window === "undefined") return;
  const imageUrl = payload.imageUrl?.trim();
  if (!imageUrl || !isPersistableEditorPreviewUrl(imageUrl)) return;

  const meta: StoredMeta = {};
  if (payload.mode) meta.mode = payload.mode;
  if (payload.fileId) meta.fileId = payload.fileId;
  if (payload.activityId) meta.activityId = payload.activityId;
  if (payload.promptText) meta.promptText = payload.promptText;
  if (payload.createdAt) meta.createdAt = payload.createdAt;
  if (payload.aspectRatio) meta.aspectRatio = payload.aspectRatio;
  if (payload.resolution) meta.resolution = payload.resolution;
  if (payload.liked !== undefined) meta.liked = payload.liked;

  const fr = payload.fullResolutionUrl?.trim();
  if (fr && fr !== imageUrl) meta.fullResolutionUrl = fr;

  const metaJson = JSON.stringify(meta);

  try {
    window.localStorage.setItem(URL_KEY, imageUrl);
    window.localStorage.setItem(META_KEY, metaJson);
  } catch {
    /* quota / private mode */
  }
}

export function readLastEditorPreview(): PendingEditorImagePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const url = window.localStorage.getItem(URL_KEY);
    if (!url || url.length === 0) return null;
    const metaRaw = window.localStorage.getItem(META_KEY);
    if (metaRaw) {
      const meta = JSON.parse(metaRaw) as unknown;
      if (!meta || typeof meta !== "object") return null;
      return parsePayload({ ...(meta as Record<string, unknown>), imageUrl: url });
    }
    return parsePayload({ imageUrl: url });
  } catch {
    return null;
  }
}

export function clearLastEditorPreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(URL_KEY);
    window.localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
}
