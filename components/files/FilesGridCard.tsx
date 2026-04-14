"use client";

import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { LikeToggleButton } from "@/components/liked-items/LikeToggleButton";
import type { FileEntry } from "./types";
import {
  fileEntryHasCatalogPreview,
  fileEntryVisualThumbSrc,
} from "./file-entry-image-src";
import { FileRowIcon } from "./FileRowIcon";
import {
  FileRowActionsMenu,
  type FileRowMenuAction,
} from "./FileRowActionsMenu";
import { FileNameInlineEdit } from "./FileNameInlineEdit";
import type { FileRowNameEditProps } from "./FileListRow";

type FilesGridCardProps = {
  entry: FileEntry;
  /** Files page inline rename; omit for static title (e.g. Liked). */
  nameEdit?: FileRowNameEditProps;
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  onFolderOpen?: (folderId: string) => void;
  /** Opens image preview when the file has a data or remote image src. */
  onFileOpen?: (entry: FileEntry) => void;
  /** When true, folder uses empty-folder outlined icon. */
  folderIsEmpty?: boolean;
};

export function FilesGridCard({
  entry,
  nameEdit,
  onMenuAction,
  onFolderOpen,
  onFileOpen,
  folderIsEmpty,
}: FilesGridCardProps) {
  const sizeDisplay = entry.sizeLabel ?? "—";
  const meta = `${entry.typeLabel} • ${sizeDisplay}`;
  const accent = entry.accent ?? "default";
  const openFolder =
    entry.kind === "folder" && onFolderOpen
      ? () => onFolderOpen(entry.id)
      : undefined;
  const thumbSrc = fileEntryVisualThumbSrc(entry);
  const openPreviewFile =
    entry.kind === "file" && fileEntryHasCatalogPreview(entry) && onFileOpen
      ? () => onFileOpen(entry)
      : undefined;
  const cardActivate = openFolder ?? openPreviewFile;
  const showVisualThumb = entry.kind === "file" && !!thumbSrc;

  return (
    <div
      role={cardActivate ? "button" : undefined}
      tabIndex={cardActivate ? 0 : undefined}
      onClick={cardActivate}
      onKeyDown={
        cardActivate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cardActivate();
              }
            }
          : undefined
      }
      className={cn(
        "group flex h-full flex-col rounded-xl border border-edge-subtle bg-surface-card transition-colors duration-150",
        "hover:bg-ix-hover",
        cardActivate ? "cursor-pointer" : "cursor-default",
        accent === "highlight" && "bg-ix-selected",
      )}
    >
      <div
        className={cn(
          "relative w-full rounded-t-xl bg-panel-bg transition-colors duration-150 group-hover:bg-app-shade",
          "aspect-[148/118] sm:aspect-[8/5]",
        )}
      >
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeToggleButton
            itemKey={likedKey.file(entry.id)}
            filesHeartAppearance
          />
          <FileRowActionsMenu
            align="right"
            onSelect={(a) => onMenuAction?.(entry.id, a)}
          />
        </div>
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-t-xl">
          {showVisualThumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={thumbSrc}
              alt=""
              className="h-full w-full object-cover transition-opacity duration-150 group-hover:opacity-95"
            />
          ) : (
            <FileRowIcon
              entry={entry}
              size={46}
              folderIsEmpty={folderIsEmpty}
              className="opacity-85 transition-opacity duration-150 group-hover:opacity-100"
            />
          )}
        </div>
      </div>
      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        {nameEdit ? (
          <FileNameInlineEdit
            displayName={entry.name}
            isEditing={nameEdit.isEditing}
            draftValue={nameEdit.editedName}
            onDraftChange={nameEdit.onEditedNameChange}
            onRequestEdit={nameEdit.onStart}
            onCommit={nameEdit.onCommit}
            onCancelEdit={nameEdit.onCancel}
            textClassName="truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]"
          />
        ) : (
          <p className="truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]">
            {entry.name}
          </p>
        )}
        <p className="mt-1 truncate text-left text-[10px] leading-snug text-[#315790] sm:text-[11px]">
          {meta}
        </p>
      </div>
    </div>
  );
}
