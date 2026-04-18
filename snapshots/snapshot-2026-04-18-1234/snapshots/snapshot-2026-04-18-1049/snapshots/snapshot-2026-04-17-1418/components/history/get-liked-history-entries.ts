import type { ActivityHistoryEntry } from "./types";

/** Subset of activity rows the user has liked (global store). */
export function getLikedHistoryEntries(
  entries: ActivityHistoryEntry[],
  isActivityLiked: (id: string) => boolean,
): ActivityHistoryEntry[] {
  return entries.filter((e) => isActivityLiked(e.id));
}
