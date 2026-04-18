const KEY = "solved-app-pending-editor-image-v2";

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

export function writePendingEditorImage(
  payload: PendingEditorImagePayload,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

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

export function readPendingEditorImage(): PendingEditorImagePayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
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
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
