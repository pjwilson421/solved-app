export type HistoryActivityKind = "image" | "video" | "editor" | "chat";

export type ActivityHistoryEntry = {
  id: string;
  kind: HistoryActivityKind;
  /** Primary label, e.g. "Generated Image", "Edited Image". */
  title: string;
  /** Secondary line: prompt or project snippet. */
  subtitle: string;
  occurredAt: Date;
  /** Full prompt (Create Image); `subtitle` may be shortened for display. */
  promptText?: string;
  /** Thumbnail for History grid/list (generated images). */
  thumbnailUrl?: string;
  /** All variation URLs for restoring Create Image preview. */
  imageUrls?: string[];
  /** Primary video URL for generated video (Create Video restore / playback). */
  videoUrl?: string;
  /** Rows from Create Image / Create Video / Image Editor (sidebar filtering). */
  origin?: "generated-image" | "generated-video" | "image-editor";
  /** File catalog id of the image that was open when this edit was saved (if known). */
  sourceFileEntryId?: string;
  /** Parent image identifier for editor lineage (history id or file id). */
  sourceImageId?: string;
  /** Prompt text used when applying a mock/real edit. */
  editPrompt?: string;
  /** Saved Image Editor output with mock/real visual transform applied. */
  edited?: boolean;
};

export type HistoryTimeBucket = "today" | "yesterday" | "older";
