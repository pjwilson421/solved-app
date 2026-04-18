import type { ActivityHistoryEntry } from "./types";
import { timeBucketForDate } from "./history-buckets";

export function formatHistoryRowMeta(
  entry: ActivityHistoryEntry,
  now = new Date(),
): string {
  const kindLabel =
    entry.kind === "image"
      ? "Image"
      : entry.kind === "video"
        ? "Video"
        : entry.kind === "chat"
          ? "Chat"
          : entry.kind === "editor" && entry.edited
            ? "Edited image"
            : "Editor";
  const bucket = timeBucketForDate(entry.occurredAt, now);
  if (bucket === "today" || bucket === "yesterday") {
    const t = entry.occurredAt.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${kindLabel} • ${t}`;
  }
  const d = entry.occurredAt.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  return `${kindLabel} • ${d}`;
}
