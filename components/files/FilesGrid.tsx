"use client";

import type { FileEntry } from "./types";
import { FilesGridCard } from "./FilesGridCard";
import type { FileRowMenuAction } from "./FileRowActionsMenu";

type FilesGridProps = {
  entries: FileEntry[];
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  onFolderOpen?: (folderId: string) => void;
  onFileOpen?: (entry: FileEntry) => void;
  /** Catalog lookup: folder has at least one direct child. */
  folderHasChildItems?: (folderId: string) => boolean;
};

/**
 * Responsive file grid: 2 columns on narrow viewports (mobile reference),
 * scaling up to 4 columns on wide desktop (desktop grid reference).
 */
export function FilesGrid({
  entries,
  onMenuAction,
  onFolderOpen,
  onFileOpen,
  folderHasChildItems,
}: FilesGridProps) {
  return (
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 sm:gap-y-8 md:grid-cols-3 xl:grid-cols-4"
      role="list"
    >
      {entries.map((entry) => (
        <li key={entry.id} className="min-w-0">
          <FilesGridCard
            entry={entry}
            onMenuAction={onMenuAction}
            onFolderOpen={onFolderOpen}
            onFileOpen={onFileOpen}
            folderIsEmpty={
              entry.kind === "folder" && folderHasChildItems
                ? !folderHasChildItems(entry.id)
                : undefined
            }
          />
        </li>
      ))}
    </ul>
  );
}
