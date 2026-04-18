import type { ActivityHistoryEntry, HistoryTimeBucket } from "./types";

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function timeBucketForDate(
  d: Date,
  now = new Date(),
): HistoryTimeBucket {
  const day = startOfLocalDay(d).getTime();
  const today0 = startOfLocalDay(now).getTime();
  const yesterday0 = startOfLocalDay(
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1),
  ).getTime();
  if (day >= today0) return "today";
  if (day >= yesterday0) return "yesterday";
  return "older";
}

const BUCKET_ORDER: HistoryTimeBucket[] = ["today", "yesterday", "older"];

const BUCKET_LABEL: Record<HistoryTimeBucket, string> = {
  today: "Today",
  yesterday: "Yesterday",
  older: "Older",
};

export function groupEntriesByBucket(
  entries: ActivityHistoryEntry[],
  now = new Date(),
): { bucket: HistoryTimeBucket; label: string; items: ActivityHistoryEntry[] }[] {
  const map = new Map<HistoryTimeBucket, ActivityHistoryEntry[]>();
  for (const b of BUCKET_ORDER) map.set(b, []);
  for (const e of entries) {
    const b = timeBucketForDate(e.occurredAt, now);
    map.get(b)!.push(e);
  }
  return BUCKET_ORDER.filter((b) => (map.get(b)!.length > 0)).map((bucket) => ({
    bucket,
    label: BUCKET_LABEL[bucket],
    items: map.get(bucket)!,
  }));
}
