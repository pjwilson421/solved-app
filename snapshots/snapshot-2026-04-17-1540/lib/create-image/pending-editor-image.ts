const LEGACY_KEY = "solved-app-pending-editor-image-v2";
/** Raw image URL (often a large data URL) — stored alone to avoid JSON escaping + duplicate blobs in one key. */
const URL_KEY = "solved-app-pending-editor-image-url-v3";
/** JSON metadata only (no imageUrl field). */
const META_KEY = "solved-app-pending-editor-image-meta-v3";

export type EditorHandoffMode = "edit" | "upscale";

export type PendingEditorImagePayload = {
  mode?: EditorHandoffMode;
  imageUrl: string;
  fullResolutionUrl?: string | null;
  fileId?: string | null;
  activityId?: string | null;
  promptText?: string | null;
  /** ISO 8601 */
  createdAt?: string | null;
  aspectRatio?: string | null;
  resolution?: string | null;
  liked?: boolean;
};

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

export function writePendingEditorImage(
  payload: PendingEditorImagePayload,
): void {
  if (typeof window === "undefined") return;
  const imageUrl = payload.imageUrl?.trim();
  if (!imageUrl) return;

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

  const writeSplit = (): boolean => {
    try {
      window.sessionStorage.setItem(URL_KEY, imageUrl);
      window.sessionStorage.setItem(META_KEY, metaJson);
      try {
        window.sessionStorage.removeItem(LEGACY_KEY);
      } catch {
        /* ignore */
      }
      return true;
    } catch {
      return false;
    }
  };

  if (writeSplit()) return;

  try {
    window.sessionStorage.removeItem(URL_KEY);
    window.sessionStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }

  try {
    window.sessionStorage.setItem(
      URL_KEY,
      imageUrl,
    );
    window.sessionStorage.setItem(
      META_KEY,
      JSON.stringify({
        ...(payload.mode ? { mode: payload.mode } : {}),
        ...(payload.activityId ? { activityId: payload.activityId } : {}),
        ...(payload.fileId ? { fileId: payload.fileId } : {}),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function readPendingEditorImage(): PendingEditorImagePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const url = window.sessionStorage.getItem(URL_KEY);
    const metaRaw = window.sessionStorage.getItem(META_KEY);
    if (url && url.length > 0 && metaRaw) {
      const meta = JSON.parse(metaRaw) as unknown;
      if (!meta || typeof meta !== "object") return null;
      return parsePayload({ ...(meta as Record<string, unknown>), imageUrl: url });
    }

    const raw = window.sessionStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    return parsePayload(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export function clearPendingEditorImage(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(URL_KEY);
    window.sessionStorage.removeItem(META_KEY);
    window.sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}
