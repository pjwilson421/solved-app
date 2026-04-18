/** Files main column: list table vs grid cards (`?view=grid`). */
export type FilesViewMode = "list" | "grid";

export type FileEntryKind = "folder" | "file";

export type FileEntryAccent = "default" | "muted" | "highlight";

export type FileEntry = {
  id: string;
  name: string;
  kind: FileEntryKind;
  /** Display type: Folder, Text, PDF, Image, Doc, Video */
  typeLabel: string;
  dateModified: string;
  /** Folders use em dash in design */
  sizeLabel: string | null;
  parentId: string | null;
  accent?: FileEntryAccent;
  /**
   * Persisted image preview (`data:` URL) for uploaded raster images.
   * Survives refresh when stored in localStorage with the catalog.
   */
  previewDataUrl?: string;
  /**
   * Remote image URL (e.g. generated mock CDN). Persisted when allowed by storage normalizer.
   * Takes precedence after `previewDataUrl` is absent for display.
   * For **Video** files, use as poster/thumbnail in Files grid/list.
   */
  previewRemoteUrl?: string;
  /** Remote video URL (mp4, etc.) for generated or linked video files. */
  videoRemoteUrl?: string;
  /** When set, file was created from a Create Image / Create Video batch; used when deleting the batch. */
  generationBatchId?: string;
  /** Catalog id of the file this row was edited from (Image Editor lineage). */
  sourceFileEntryId?: string;
  /** Image Editor (or future) saved output — not the pre-edit original. */
  edited?: boolean;
  /** Prompt used when this edited file was produced (Image Editor apply). */
  editPrompt?: string;
};
