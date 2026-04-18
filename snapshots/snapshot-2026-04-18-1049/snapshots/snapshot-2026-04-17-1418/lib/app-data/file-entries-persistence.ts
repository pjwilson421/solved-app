import type { FileEntry, FileEntryAccent } from "@/components/files/types";

export const FILE_ENTRIES_STORAGE_KEY = "solved-app-file-entries-v1";

function normalizeStoredFileEntry(item: unknown): FileEntry | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== "string" || typeof o.name !== "string") return null;
  if (o.kind !== "file" && o.kind !== "folder") return null;
  if (typeof o.typeLabel !== "string") return null;
  if (typeof o.dateModified !== "string") return null;
  const sizeLabel =
    o.sizeLabel === null || typeof o.sizeLabel === "string"
      ? o.sizeLabel
      : null;
  let parentId: string | null;
  if (o.parentId === null || o.parentId === undefined) {
    parentId = null;
  } else if (typeof o.parentId === "string") {
    parentId = o.parentId;
  } else {
    return null;
  }
  let accent: FileEntryAccent | undefined =
    o.accent === "muted" || o.accent === "highlight" || o.accent === "default"
      ? o.accent
      : undefined;
  /** Row highlight is interaction-only; never restore a persisted "selected" look on load. */
  if (accent === "highlight") accent = undefined;
  let previewDataUrl: string | undefined;
  if (
    typeof o.previewDataUrl === "string" &&
    o.previewDataUrl.startsWith("data:")
  ) {
    previewDataUrl = o.previewDataUrl;
  }
  const MAX_REMOTE = 4096;
  let previewRemoteUrl: string | undefined;
  if (
    typeof o.previewRemoteUrl === "string" &&
    (o.previewRemoteUrl.startsWith("https://") ||
      o.previewRemoteUrl.startsWith("http://")) &&
    o.previewRemoteUrl.length <= MAX_REMOTE
  ) {
    previewRemoteUrl = o.previewRemoteUrl;
  }
  let generationBatchId: string | undefined;
  if (typeof o.generationBatchId === "string" && o.generationBatchId.length > 0) {
    generationBatchId = o.generationBatchId;
  }
  let sourceFileEntryId: string | undefined;
  if (
    typeof o.sourceFileEntryId === "string" &&
    o.sourceFileEntryId.length > 0 &&
    o.sourceFileEntryId.length <= 200
  ) {
    sourceFileEntryId = o.sourceFileEntryId;
  }
  const edited = o.edited === true ? true : undefined;
  let editPrompt: string | undefined;
  if (typeof o.editPrompt === "string" && o.editPrompt.length > 0) {
    editPrompt =
      o.editPrompt.length > 100_000
        ? o.editPrompt.slice(0, 100_000)
        : o.editPrompt;
  }
  let videoRemoteUrl: string | undefined;
  if (
    typeof o.videoRemoteUrl === "string" &&
    (o.videoRemoteUrl.startsWith("https://") ||
      o.videoRemoteUrl.startsWith("http://")) &&
    o.videoRemoteUrl.length <= MAX_REMOTE
  ) {
    videoRemoteUrl = o.videoRemoteUrl;
  }
  return {
    id: o.id,
    name: o.name,
    kind: o.kind,
    typeLabel: o.typeLabel,
    dateModified: o.dateModified,
    sizeLabel,
    parentId,
    accent,
    ...(previewDataUrl ? { previewDataUrl } : {}),
    ...(previewRemoteUrl ? { previewRemoteUrl } : {}),
    ...(videoRemoteUrl ? { videoRemoteUrl } : {}),
    ...(generationBatchId ? { generationBatchId } : {}),
    ...(sourceFileEntryId ? { sourceFileEntryId } : {}),
    ...(edited ? { edited: true } : {}),
    ...(editPrompt ? { editPrompt } : {}),
  };
}

/** `null` = no saved catalog (use demo seed). Empty array is valid. */
export function loadFileEntriesFromStorage(): FileEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(FILE_ENTRIES_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: FileEntry[] = [];
    for (const item of parsed) {
      const e = normalizeStoredFileEntry(item);
      if (e) out.push(e);
    }
    return out;
  } catch {
    return null;
  }
}

export function saveFileEntriesToStorage(entries: FileEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FILE_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("[file-entries] localStorage save failed (quota?)", e);
  }
}
