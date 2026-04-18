import type { FileEntry } from "./types";

/** Aligns catalog file ids to URL order (generated images: one file per variation URL). */
export function fileIdsForImageUrls(
  fileEntries: FileEntry[],
  urls: string[],
): string[] {
  return urls.map((url) => {
    const hit = fileEntries.find(
      (f) =>
        f.kind === "file" &&
        f.typeLabel === "Image" &&
        (f.previewRemoteUrl === url || f.previewDataUrl === url),
    );
    return hit?.id ?? "";
  });
}

export function firstDisplaySlotFileId(
  displaySlots: string[],
  slotFileIds: string[],
): string | undefined {
  const idx = displaySlots.findIndex(
    (u) => typeof u === "string" && u.length > 0,
  );
  if (idx < 0) return undefined;
  const id = slotFileIds[idx];
  return id && id.length > 0 ? id : undefined;
}

/** First matching file in a Create Image batch, optionally pinned to a thumbnail URL. */
export function firstFileIdForImageBatch(
  fileEntries: FileEntry[],
  batchId: string,
  preferredUrl?: string,
): string | undefined {
  const batchFiles = fileEntries.filter(
    (f) =>
      f.kind === "file" &&
      f.typeLabel === "Image" &&
      f.generationBatchId === batchId,
  );
  if (preferredUrl) {
    const match = batchFiles.find(
      (f) =>
        f.previewRemoteUrl === preferredUrl ||
        f.previewDataUrl === preferredUrl,
    );
    if (match) return match.id;
  }
  return batchFiles[0]?.id;
}

export function imageSrcFromFileEntry(entry: FileEntry | undefined): string | null {
  if (!entry || entry.kind !== "file" || entry.typeLabel !== "Image") {
    return null;
  }
  return entry.previewDataUrl ?? entry.previewRemoteUrl ?? null;
}
