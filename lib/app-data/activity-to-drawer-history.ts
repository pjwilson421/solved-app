import type { HistoryItem } from "@/components/create-image/types";
import type { ActivityHistoryEntry } from "@/components/history/types";

/**
 * Maps catalog activity rows to `HistoryItem` for HistoryPanel and other history UIs.
 * Placeholder thumbs match prior mock behavior where non-chat rows had a preview image.
 */
export function activityEntryToHistoryItem(
  entry: ActivityHistoryEntry,
): HistoryItem {
  const prompt =
    entry.promptText?.trim() ||
    (entry.subtitle.trim() ? `${entry.title} — ${entry.subtitle}` : entry.title);
  const imageUrls =
    entry.kind === "chat"
      ? []
      : entry.imageUrls && entry.imageUrls.length > 0
        ? entry.imageUrls
        : entry.thumbnailUrl
          ? [entry.thumbnailUrl]
          : [
              `https://picsum.photos/seed/${encodeURIComponent(entry.id)}/400/225`,
            ];
  return {
    id: entry.id,
    prompt,
    createdAt: entry.occurredAt,
    imageUrls,
    ...(entry.videoUrl ? { videoUrl: entry.videoUrl } : {}),
  };
}

export function activityEntriesToDrawerHistoryItems(
  entries: ActivityHistoryEntry[],
): HistoryItem[] {
  return [...entries]
    .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
    .map(activityEntryToHistoryItem);
}
