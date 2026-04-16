import type { FileEntry } from "./types";
import {
  formatFileDateModified,
  newUploadFileEntryId,
} from "./file-upload-entry";

function safeEditNameBase(prompt: string, maxLen: number): string {
  const t = prompt.replace(/[^\w\s.-]+/g, " ").replace(/\s+/g, " ").trim();
  if (!t) return "Edit";
  return t.length > maxLen ? `${t.slice(0, maxLen - 1)}…` : t;
}

/**
 * New Image Editor output row in Files (does not modify the source catalog file).
 */
export function createEditorSavedImageFileEntry(params: {
  /** `data:` JPEG from mock visual pipeline, or remote `https` fallback. */
  previewSrc: string;
  prompt: string;
  createdAt: Date;
  generationBatchId: string;
  /** Immediate parent file in the editor lineage, if known. */
  sourceFileEntryId?: string | null;
}): FileEntry {
  const base = safeEditNameBase(params.prompt, 40);
  const isData = params.previewSrc.startsWith("data:");
  return {
    id: newUploadFileEntryId(),
    name: isData ? `Edited · ${base}.jpg` : `Edited · ${base}.png`,
    kind: "file",
    typeLabel: "Image",
    dateModified: formatFileDateModified(params.createdAt),
    sizeLabel: "—",
    parentId: null,
    edited: true,
    editPrompt: params.prompt,
    generationBatchId: params.generationBatchId,
    ...(isData
      ? { previewDataUrl: params.previewSrc }
      : { previewRemoteUrl: params.previewSrc }),
    ...(params.sourceFileEntryId
      ? { sourceFileEntryId: params.sourceFileEntryId }
      : {}),
  };
}
