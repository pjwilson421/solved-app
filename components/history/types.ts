export type HistoryActivityKind = "image" | "video" | "editor" | "chat";

export type ActivityHistoryEntry = {
  id: string;
  kind: HistoryActivityKind;
  /** Storage-friendly media type mirror (for compatibility with external/history payloads). */
  type?: "image" | "video" | "editor" | "chat";
  /** Primary label, e.g. "Generated Image", "Edited Image". */
  title: string;
  /** Secondary line: prompt or project snippet. */
  subtitle: string;
  occurredAt: Date;
  /** Full prompt (Create Image); `subtitle` may be shortened for display. */
  promptText?: string;
  /** Thumbnail for History grid/list (generated images). */
  thumbnailUrl?: string;
  /** Primary image URL (typically mirrors `thumbnailUrl` for generated image rows). */
  imageUrl?: string;
  /** All variation URLs for restoring Create Image preview. */
  imageUrls?: string[];
  /** Create Image generation setting snapshot. */
  aspectRatio?: "16:9" | "1:1" | "4:5" | "9:16";
  /** Create Image generation quality snapshot. */
  resolution?: "1K" | "4K" | "6K" | "8K";
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
