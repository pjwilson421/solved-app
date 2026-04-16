import type {
  ActivityHistoryEntry,
  HistoryActivityKind,
} from "@/components/history/types";

export const ACTIVITY_ENTRIES_STORAGE_KEY = "solved-app-activity-entries-v1";

const MAX_PROMPT = 100_000;
const MAX_TITLE_SUB = 2_000;
const MAX_URL = 2_000_000;

/**
 * localStorage is small (~5-10MB in many browsers). Persisting base64 data URLs quickly
 * exhausts quota and crashes writes, so storage must stay metadata-only.
 */
const MAX_PERSISTED_ENTRIES = 20;
const PERSIST_RETRY_ENTRY_COUNTS = [20, 10, 5, 1] as const;
const MAX_PERSISTED_TEXT = MAX_TITLE_SUB;
const MAX_PERSISTED_PROMPT = 12_000;
const MAX_PERSISTED_URL = 4_096;
const MAX_PERSISTED_THUMBNAIL_DATA_URL = 350_000;

const KINDS: HistoryActivityKind[] = [
  "image",
  "video",
  "editor",
  "chat",
];

const ORIGINS: NonNullable<ActivityHistoryEntry["origin"]>[] = [
  "generated-image",
  "generated-video",
  "image-editor",
];

const TYPES: NonNullable<ActivityHistoryEntry["type"]>[] = [
  "image",
  "video",
  "editor",
  "chat",
];

const ASPECT_RATIOS: NonNullable<ActivityHistoryEntry["aspectRatio"]>[] = [
  "16:9",
  "1:1",
  "4:5",
  "9:16",
];

const RESOLUTIONS: NonNullable<ActivityHistoryEntry["resolution"]>[] = [
  "1K",
  "2K",
  "4K",
  "8K",
];

function parseOccurredAt(v: unknown): Date | null {
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function optionalUrl(s: unknown): string | undefined {
  if (typeof s !== "string") return undefined;
  if (s.length > MAX_URL) return undefined;
  if (s.startsWith("data:")) return s;
  if (s.startsWith("https://") || s.startsWith("http://")) return s;
  return undefined;
}

function optionalString(s: unknown, max: number): string | undefined {
  if (typeof s !== "string") return undefined;
  if (s.length > max) return s.slice(0, max);
  return s;
}

function optionalImageUrls(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const x of v) {
    const u = optionalUrl(x);
    if (u) out.push(u);
  }
  return out.length ? out : undefined;
}

export function isDataUrl(value: string): boolean {
  return /^\s*data:/i.test(value);
}

function sanitizePersistedText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  if (isDataUrl(value)) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

function sanitizePersistedThumbnailUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (isDataUrl(value)) {
    if (value.length > MAX_PERSISTED_THUMBNAIL_DATA_URL) return undefined;
    return value;
  }
  if (value.length > MAX_PERSISTED_URL) return undefined;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return undefined;
}

function sanitizePersistedUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (isDataUrl(value)) return undefined;
  if (value.length > MAX_PERSISTED_URL) return undefined;
  if (value.startsWith("https://") || value.startsWith("http://")) return value;
  return undefined;
}

function sanitizePersistedUrlList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const urls: string[] = [];
  for (const item of value) {
    const url = sanitizePersistedUrl(item);
    if (url) urls.push(url);
  }
  return urls.length > 0 ? urls : undefined;
}

function toOccurredAtMs(value: unknown): number {
  if (value instanceof Date) {
    return value.getTime();
  }
  const parsed = parseOccurredAt(value);
  return parsed ? parsed.getTime() : Number.NaN;
}

function hasValidOccurredAt(value: unknown): boolean {
  return Number.isFinite(toOccurredAtMs(value));
}

/**
 * Build a metadata-only entry for localStorage.
 * Unknown/heavy fields (e.g. image/src/thumbnail blobs) are intentionally dropped.
 */
export function sanitizeActivityEntryForStorage(
  entry: ActivityHistoryEntry,
): ActivityHistoryEntry | null {
  if (!entry || typeof entry.id !== "string" || entry.id.length === 0) return null;
  if (!hasValidOccurredAt(entry.occurredAt)) return null;
  if (!KINDS.includes(entry.kind)) return null;

  const title = sanitizePersistedText(entry.title, MAX_PERSISTED_TEXT);
  const subtitle = sanitizePersistedText(entry.subtitle, MAX_PERSISTED_TEXT);
  if (!title || !subtitle) return null;

  const promptText = sanitizePersistedText(entry.promptText, MAX_PERSISTED_PROMPT);
  const thumbnailUrl = sanitizePersistedThumbnailUrl(entry.thumbnailUrl);
  const imageUrl = sanitizePersistedUrl(entry.imageUrl);
  const fullResolutionUrl = sanitizePersistedUrl(entry.fullResolutionUrl);
  const imageUrls = sanitizePersistedUrlList(entry.imageUrls);
  const videoUrl = sanitizePersistedUrl(entry.videoUrl);
  const editPrompt = sanitizePersistedText(entry.editPrompt, MAX_PERSISTED_PROMPT);
  const sourceFileEntryId = sanitizePersistedText(entry.sourceFileEntryId, 200);
  const sourceImageId = sanitizePersistedText(entry.sourceImageId, 200);

  return {
    id: entry.id,
    kind: entry.kind,
    title,
    subtitle,
    occurredAt: entry.occurredAt,
    ...(entry.type ? { type: entry.type } : {}),
    ...(promptText ? { promptText } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(fullResolutionUrl ? { fullResolutionUrl } : {}),
    ...(imageUrls ? { imageUrls } : {}),
    ...(entry.aspectRatio ? { aspectRatio: entry.aspectRatio } : {}),
    ...(entry.resolution ? { resolution: entry.resolution } : {}),
    ...(videoUrl ? { videoUrl } : {}),
    ...(entry.origin ? { origin: entry.origin } : {}),
    ...(sourceFileEntryId ? { sourceFileEntryId } : {}),
    ...(sourceImageId ? { sourceImageId } : {}),
    ...(editPrompt ? { editPrompt } : {}),
    ...(entry.edited ? { edited: true } : {}),
  };
}

/**
 * Keep persistence intentionally small: only recent metadata entries are saved.
 */
export function sanitizeActivityEntriesForStorage(
  entries: ActivityHistoryEntry[],
): ActivityHistoryEntry[] {
  return entries
    .map((entry, index) => ({
      entry: sanitizeActivityEntryForStorage(entry),
      index,
      occurredAtMs: toOccurredAtMs(entry.occurredAt),
    }))
    .filter(
      (
        item,
      ): item is {
        entry: ActivityHistoryEntry;
        index: number;
        occurredAtMs: number;
      } => item.entry !== null && Number.isFinite(item.occurredAtMs),
    )
    .sort((a, b) => b.occurredAtMs - a.occurredAtMs || a.index - b.index)
    .slice(0, MAX_PERSISTED_ENTRIES)
    .map((item) => item.entry);
}

function tryPersistEntries(entries: ActivityHistoryEntry[]): boolean {
  try {
    localStorage.setItem(ACTIVITY_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
    return true;
  } catch {
    return false;
  }
}

function normalizeStoredActivityEntry(
  item: unknown,
): ActivityHistoryEntry | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  if (typeof o.id !== "string" || !o.id) return null;
  if (typeof o.title !== "string" || typeof o.subtitle !== "string")
    return null;
  if (o.title.length > MAX_TITLE_SUB || o.subtitle.length > MAX_TITLE_SUB) {
    return null;
  }
  if (!KINDS.includes(o.kind as HistoryActivityKind)) return null;
  const occurredAt = parseOccurredAt(o.occurredAt);
  if (!occurredAt) return null;

  const promptText = optionalString(o.promptText, MAX_PROMPT);
  const thumbnailUrl = optionalUrl(o.thumbnailUrl);
  const imageUrl = optionalUrl(o.imageUrl);
  const fullResolutionUrl = optionalUrl(o.fullResolutionUrl);
  const imageUrls = optionalImageUrls(o.imageUrls);
  const videoUrl = optionalUrl(o.videoUrl);

  let type: ActivityHistoryEntry["type"];
  if (
    typeof o.type === "string" &&
    TYPES.includes(o.type as (typeof TYPES)[number])
  ) {
    type = o.type as ActivityHistoryEntry["type"];
  } else {
    type = undefined;
  }

  let aspectRatio: ActivityHistoryEntry["aspectRatio"];
  if (
    typeof o.aspectRatio === "string" &&
    ASPECT_RATIOS.includes(o.aspectRatio as (typeof ASPECT_RATIOS)[number])
  ) {
    aspectRatio = o.aspectRatio as ActivityHistoryEntry["aspectRatio"];
  } else {
    aspectRatio = undefined;
  }

  let resolution: ActivityHistoryEntry["resolution"];
  if (typeof o.resolution === "string") {
    const u = o.resolution.trim().toUpperCase();
    const mapped: ActivityHistoryEntry["resolution"] | null =
      u === "6K"
        ? "4K"
        : u === "1K" || u === "2K" || u === "4K" || u === "8K"
          ? u
          : null;
    if (mapped && RESOLUTIONS.includes(mapped)) {
      resolution = mapped;
    } else {
      resolution = undefined;
    }
  } else {
    resolution = undefined;
  }

  let origin: ActivityHistoryEntry["origin"];
  if (o.origin === undefined || o.origin === null) {
    origin = undefined;
  } else if (
    typeof o.origin === "string" &&
    ORIGINS.includes(o.origin as (typeof ORIGINS)[number])
  ) {
    origin = o.origin as ActivityHistoryEntry["origin"];
  } else {
    origin = undefined;
  }

  let sourceFileEntryId: string | undefined;
  if (
    typeof o.sourceFileEntryId === "string" &&
    o.sourceFileEntryId.length > 0 &&
    o.sourceFileEntryId.length <= 200
  ) {
    sourceFileEntryId = o.sourceFileEntryId;
  }

  let sourceImageId: string | undefined;
  if (
    typeof o.sourceImageId === "string" &&
    o.sourceImageId.length > 0 &&
    o.sourceImageId.length <= 200
  ) {
    sourceImageId = o.sourceImageId;
  }

  const editPrompt = optionalString(o.editPrompt, MAX_PROMPT);
  const edited = o.edited === true ? true : undefined;

  return {
    id: o.id,
    kind: o.kind as HistoryActivityKind,
    title: o.title,
    subtitle: o.subtitle,
    occurredAt,
    ...(type ? { type } : {}),
    ...(promptText ? { promptText } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(fullResolutionUrl ? { fullResolutionUrl } : {}),
    ...(imageUrls ? { imageUrls } : {}),
    ...(aspectRatio ? { aspectRatio } : {}),
    ...(resolution ? { resolution } : {}),
    ...(videoUrl ? { videoUrl } : {}),
    ...(origin ? { origin } : {}),
    ...(sourceFileEntryId ? { sourceFileEntryId } : {}),
    ...(sourceImageId ? { sourceImageId } : {}),
    ...(editPrompt ? { editPrompt } : {}),
    ...(edited ? { edited: true } : {}),
  };
}

/** `null` = no saved catalog (keep initial seed from code). Empty array is valid. */
export function loadActivityEntriesFromStorage(): ActivityHistoryEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVITY_ENTRIES_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: ActivityHistoryEntry[] = [];
    for (const item of parsed) {
      const e = normalizeStoredActivityEntry(item);
      if (e) out.push(e);
    }
    return out;
  } catch {
    return null;
  }
}

export function saveActivityEntriesToStorage(
  entries: ActivityHistoryEntry[],
): void {
  if (typeof window === "undefined") return;

  const sanitized = sanitizeActivityEntriesForStorage(entries);

  for (const count of PERSIST_RETRY_ENTRY_COUNTS) {
    const candidate = sanitized.slice(0, Math.min(count, sanitized.length));
    if (tryPersistEntries(candidate)) return;
  }

  if (tryPersistEntries([])) {
    console.warn(
      "[activity-entries] localStorage quota pressure; saved empty safe list",
    );
    return;
  }

  try {
    localStorage.removeItem(ACTIVITY_ENTRIES_STORAGE_KEY);
  } catch {
    /* no-op */
  }

  console.warn(
    "[activity-entries] localStorage save failed after fallback attempts",
  );
}
