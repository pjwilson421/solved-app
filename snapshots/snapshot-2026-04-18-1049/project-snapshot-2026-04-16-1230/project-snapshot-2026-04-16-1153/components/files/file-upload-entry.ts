import type { FileEntry } from "./types";

/** Stable unique id even when `crypto.randomUUID` is unavailable (non-secure context). */
export function newUploadFileEntryId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    try {
      return crypto.randomUUID();
    } catch {
      /* fall through */
    }
  }
  return `upload-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function extensionLower(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i).toLowerCase() : "";
}

/** Human-readable size for the Files list (matches mock style: `14 KB`, `2.4 MB`). */
export function formatFileSizeLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const v = bytes / Math.pow(1024, i);
  const s =
    i === 0 ? String(Math.round(v)) : v >= 10 ? v.toFixed(0) : v.toFixed(1);
  return `${s} ${units[i]}`;
}

/** Same style as seeded catalog (`Mar 28, 2026`). */
export function formatFileDateModified(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Display type for `FileEntry.typeLabel`: prefers MIME, then extension.
 * Aligns with demo labels: Image, Video, PDF, Text, Doc, Folder, etc.
 */
export function typeLabelFromFile(file: File): string {
  const mime = file.type.toLowerCase();
  const ext = extensionLower(file.name);

  if (mime.startsWith("image/")) return "Image";
  if (mime.startsWith("video/")) return "Video";
  if (mime.startsWith("audio/")) return "Audio";
  if (mime === "application/pdf" || ext === ".pdf") return "PDF";
  if (
    mime.startsWith("text/") ||
    [".txt", ".md", ".csv", ".json", ".xml", ".html", ".css", ".js", ".ts"].includes(
      ext,
    )
  ) {
    return "Text";
  }
  if (
    mime.includes("word") ||
    mime.includes("msword") ||
    mime.includes("wordprocessingml") ||
    [".doc", ".docx", ".odt", ".rtf"].includes(ext)
  ) {
    return "Doc";
  }
  if (
    mime.includes("sheet") ||
    mime.includes("excel") ||
    mime.includes("spreadsheetml") ||
    [".xls", ".xlsx", ".ods"].includes(ext)
  ) {
    return "Sheet";
  }
  if (
    mime.includes("presentation") ||
    mime.includes("powerpoint") ||
    [".ppt", ".pptx", ".odp"].includes(ext)
  ) {
    return "Slides";
  }
  if (mime.includes("zip") || mime.includes("compressed") || [".zip", ".rar", ".7z"].includes(ext)) {
    return "Archive";
  }

  if (
    [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".bmp", ".ico", ".heic"].includes(
      ext,
    )
  ) {
    return "Image";
  }
  if ([".mp4", ".mov", ".webm", ".mkv", ".avi", ".m4v"].includes(ext)) {
    return "Video";
  }
  if ([".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"].includes(ext)) {
    return "Audio";
  }

  return "File";
}

const IMAGE_EXT_PREVIEW = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".bmp",
  ".ico",
  ".heic",
]);

/** Raster / common image uploads get an embedded `data:` preview for grid + persistence. */
export function shouldEmbedImagePreview(file: File): boolean {
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/")) {
    if (file.size > 4 * 1024 * 1024) return false;
    return true;
  }
  const ext = extensionLower(file.name);
  if (IMAGE_EXT_PREVIEW.has(ext) && file.size <= 4 * 1024 * 1024) return true;
  return false;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const x = r.result;
      if (typeof x === "string") resolve(x);
      else reject(new Error("readAsDataURL: unexpected result"));
    };
    r.onerror = () => reject(r.error ?? new Error("FileReader error"));
    r.readAsDataURL(file);
  });
}

export function createUploadedFileEntry(
  file: File,
  parentId: string | null,
): FileEntry {
  const now = new Date();
  return {
    id: newUploadFileEntryId(),
    name: file.name,
    kind: "file",
    typeLabel: typeLabelFromFile(file),
    /** Upload time (catalog uses `dateModified` for display). */
    dateModified: formatFileDateModified(now),
    sizeLabel: formatFileSizeLabel(file.size),
    parentId,
  };
}

/** Like `createUploadedFileEntry` but embeds `previewDataUrl` for images (persisted in localStorage). */
export async function createUploadedFileEntryAsync(
  file: File,
  parentId: string | null,
): Promise<FileEntry> {
  const base = createUploadedFileEntry(file, parentId);
  if (!shouldEmbedImagePreview(file)) return base;
  try {
    const previewDataUrl = await readFileAsDataURL(file);
    return { ...base, previewDataUrl };
  } catch {
    return base;
  }
}
