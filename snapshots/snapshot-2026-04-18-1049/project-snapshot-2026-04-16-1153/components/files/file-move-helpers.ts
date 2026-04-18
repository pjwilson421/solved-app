import type { FileEntry } from "./types";

/** True if `nodeId` is `ancestorFolderId` or nested under it. */
export function isInFolderTree(
  entries: FileEntry[],
  ancestorFolderId: string,
  nodeId: string,
): boolean {
  let cur: FileEntry | undefined = entries.find((e) => e.id === nodeId);
  while (cur) {
    if (cur.id === ancestorFolderId) return true;
    const parentId = cur.parentId;
    if (!parentId) break;
    cur = entries.find((e) => e.id === parentId);
  }
  return false;
}

/** Destination folders for moving `item` (excludes self and descendants when moving a folder). */
export function destinationFoldersForMove(
  entries: FileEntry[],
  item: FileEntry,
): FileEntry[] {
  return entries
    .filter((e) => {
      if (e.kind !== "folder" || e.id === item.id) return false;
      if (item.kind === "folder" && isInFolderTree(entries, item.id, e.id)) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
}
