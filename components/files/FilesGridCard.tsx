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

type FilesGridCardProps = {
  entry: FileEntry;
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  onFolderOpen?: (folderId: string) => void;
  /** Opens image preview when the file has a data or remote image src. */
  onFileOpen?: (entry: FileEntry) => void;
  /** When true, folder uses empty-folder outlined icon. */
  folderIsEmpty?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onStartRename?: (id: string) => void;
  onRenameValueChange?: (next: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
};

export function FilesGridCard({
  entry,
  onMenuAction,
  onFolderOpen,
  onFileOpen,
  folderIsEmpty,
  isRenaming = false,
  renameValue = "",
  onStartRename,
  onRenameValueChange,
  onRenameSubmit,
  onRenameCancel,
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
        "group flex h-full flex-col rounded-xl border border-app-border bg-app-card transition-[background-color,border-color,box-shadow] duration-150",
        "hover:border-app-border-hover hover:bg-app-panel hover:shadow-md",
        cardActivate ? "cursor-pointer" : "cursor-default",
        accent === "highlight" &&
          "border-[#1EA7E1]/60 bg-[#1e1a2e]/90 hover:border-[#1EA7E1]/80 hover:bg-[#252038]/95",
      )}
    >
      <div
        className={cn(
          "relative w-full rounded-t-xl bg-app-panel transition-colors duration-150 group-hover:bg-app-shade",
          "aspect-[148/118] sm:aspect-[8/5]",
        )}
      >
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeToggleButton itemKey={likedKey.file(entry.id)} />
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
        {isRenaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => onRenameValueChange?.(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onRenameSubmit?.();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onRenameCancel?.();
              }
            }}
            onBlur={() => onRenameSubmit?.()}
            className="w-full rounded bg-transparent text-left text-[12px] font-medium leading-snug text-white sm:text-[13px] outline-none ring-1 ring-app-border-hover px-1 -mx-1"
            aria-label={`Rename ${entry.name}`}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename?.(entry.id);
            }}
            className="w-full truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]"
          >
            {entry.name}
          </button>
        )}
        <p
          className={cn(
            "mt-1 truncate text-left text-[10px] leading-snug sm:text-[11px]",
            accent === "highlight" ? "text-[#E4E4E7]" : "text-[#8A8A93]",
          )}
        >
          {meta}
        </p>
      </div>
    </div>
  );
}
