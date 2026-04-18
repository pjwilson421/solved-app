import type { FileEntry } from "./types";

/** Resolved image src for grid/list preview and modal (data URL or remote). */
export function fileEntryDisplayImageSrc(entry: FileEntry): string | undefined {
  if (entry.kind !== "file" || entry.typeLabel !== "Image") return undefined;
  return entry.previewDataUrl ?? entry.previewRemoteUrl;
}

export function fileEntryHasImagePreview(entry: FileEntry): boolean {
  return fileEntryDisplayImageSrc(entry) !== undefined;
}

/** Poster / thumbnail for Files grid & list (images + video posters). */
export function fileEntryVisualThumbSrc(entry: FileEntry): string | undefined {
  if (entry.kind !== "file") return undefined;
  if (entry.typeLabel === "Image") {
    return entry.previewDataUrl ?? entry.previewRemoteUrl;
  }
  if (entry.typeLabel === "Video") {
    return entry.previewRemoteUrl;
  }
  return undefined;
}

export function fileEntryHasVisualThumb(entry: FileEntry): boolean {
  return fileEntryVisualThumbSrc(entry) !== undefined;
}

/** Opens in-app preview modal (image and/or playable video). */
export function fileEntryHasCatalogPreview(entry: FileEntry): boolean {
  if (entry.kind !== "file") return false;
  if (entry.typeLabel === "Image") {
    return !!(entry.previewDataUrl ?? entry.previewRemoteUrl);
  }
  if (entry.typeLabel === "Video") {
    return !!entry.videoRemoteUrl;
  }
  return false;
}
