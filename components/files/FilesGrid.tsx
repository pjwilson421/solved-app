"use client";

import type { FileEntry } from "./types";
import { FilesGridCard } from "./FilesGridCard";
import type { FileRowMenuAction } from "./FileRowActionsMenu";

type FilesGridNameEditConfig = {
  editingFileId: string | null;
  editedName: string;
  onEditedNameChange: (value: string) => void;
  onStart: (id: string, name: string) => void;
  onCommit: (id: string, rawValue: string) => void;
  onCancel: () => void;
};

type FilesGridProps = {
  entries: FileEntry[];
  /** When set (Files page), grid titles support inline rename. */
  nameEdit?: FilesGridNameEditConfig;
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
  nameEdit,
  onMenuAction,
  onFolderOpen,
  onFileOpen,
  folderHasChildItems,
}: FilesGridProps) {
  return (
    <ul
      className="grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 sm:gap-y-8 xl:grid-cols-4"
      role="list"
    >
      {entries.map((entry) => (
        <li key={entry.id} className="min-w-0">
          <FilesGridCard
            entry={entry}
            nameEdit={
              nameEdit
                ? {
                    isEditing: nameEdit.editingFileId === entry.id,
                    editedName: nameEdit.editedName,
                    onEditedNameChange: nameEdit.onEditedNameChange,
                    onStart: () => nameEdit.onStart(entry.id, entry.name),
                    onCommit: (raw) => nameEdit.onCommit(entry.id, raw),
                    onCancel: nameEdit.onCancel,
                  }
                : undefined
            }
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
