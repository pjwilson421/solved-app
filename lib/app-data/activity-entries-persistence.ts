import type {
  ActivityHistoryEntry,
  HistoryActivityKind,
} from "@/components/history/types";

export const ACTIVITY_ENTRIES_STORAGE_KEY = "solved-app-activity-entries-v1";

const MAX_PROMPT = 100_000;
const MAX_TITLE_SUB = 2_000;
const MAX_URL = 4096;

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

function parseOccurredAt(v: unknown): Date | null {
  if (typeof v === "string" || typeof v === "number") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function optionalUrl(s: unknown): string | undefined {
  if (typeof s !== "string" || s.length > MAX_URL) return undefined;
  if (
    s.startsWith("https://") ||
    s.startsWith("http://") ||
    s.startsWith("data:")
  ) {
    return s;
  }
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
  const imageUrls = optionalImageUrls(o.imageUrls);
  const videoUrl = optionalUrl(o.videoUrl);

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
    ...(promptText ? { promptText } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    ...(imageUrls ? { imageUrls } : {}),
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
  try {
    localStorage.setItem(
      ACTIVITY_ENTRIES_STORAGE_KEY,
      JSON.stringify(entries),
    );
  } catch (e) {
    console.warn("[activity-entries] localStorage save failed (quota?)", e);
  }
}
