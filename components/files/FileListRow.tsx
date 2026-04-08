"use client";

import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { LikeToggleButton } from "@/components/liked-items/LikeToggleButton";
import type { FileEntry } from "./types";
import { fileEntryHasCatalogPreview } from "./file-entry-image-src";
import { FileRowIcon } from "./FileRowIcon";
import {
  FileRowActionsMenu,
  type FileRowMenuAction,
} from "./FileRowActionsMenu";

type FileListRowProps = {
  entry: FileEntry;
  depth?: number;
  variant: "desktop" | "mobile";
  rowIndex: number;
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  /** When set, clicking a folder row opens that folder (main column only; menu uses stopPropagation). */
  onFolderOpen?: (folderId: string) => void;
  /** Opens image preview when the file has a data or remote image src. */
  onFileOpen?: (entry: FileEntry) => void;
  /** When true, folder row uses empty-folder outlined icon. */
  folderIsEmpty?: boolean;
  isRenaming?: boolean;
  renameValue?: string;
  onStartRename?: (id: string) => void;
  onRenameValueChange?: (next: string) => void;
  onRenameSubmit?: () => void;
  onRenameCancel?: () => void;
};

function rowSurfaceClass(index: number, accent: FileEntry["accent"]) {
  if (accent === "highlight") {
    return "bg-[#3ABEFF]/35 border-[#1EA7E1]/50";
  }
  if (accent === "muted") {
    return "bg-app-hover-strong/40 border-app-border";
  }
  return index % 2 === 0
    ? "bg-app-card border-app-border/80"
    : "bg-app-panel border-app-border/80";
}

function rowHoverClass(accent: FileEntry["accent"]) {
  if (accent === "highlight") {
    return "hover:border-[#1EA7E1]/70 hover:bg-[#3ABEFF]/50";
  }
  if (accent === "muted") {
    return "hover:border-app-border-hover hover:bg-app-pressed/90";
  }
  return "hover:border-app-border-hover hover:bg-app-hover";
}

const rowIconHoverClass =
  "transition-opacity duration-150 opacity-[0.88] group-hover:opacity-100";

function TreeGuide({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex w-5 shrink-0 flex-col items-center pt-1", className)}
      aria-hidden
    >
      <div className="min-h-[8px] w-px flex-1 bg-app-hover-strong" />
      <div className="h-px w-full min-w-[12px] bg-app-hover-strong" />
    </div>
  );
}

export function FileListRow({
  entry,
  depth = 0,
  variant,
  rowIndex,
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
}: FileListRowProps) {
  const sizeDisplay = entry.sizeLabel ?? "—";
  const accent = entry.accent ?? "default";
  const showTree = depth > 0;
  const openFolder =
    entry.kind === "folder" && onFolderOpen
      ? () => onFolderOpen(entry.id)
      : undefined;
  const openPreviewFile =
    entry.kind === "file" && fileEntryHasCatalogPreview(entry) && onFileOpen
      ? () => onFileOpen(entry)
      : undefined;
  const rowActivate = openFolder ?? openPreviewFile;

  if (variant === "mobile") {
    return (
      <div
        role={rowActivate ? "button" : undefined}
        tabIndex={rowActivate ? 0 : undefined}
        onClick={rowActivate}
        onKeyDown={
          rowActivate
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  rowActivate();
                }
              }
            : undefined
        }
        className={cn(
          "group rounded-card border px-3 py-3 transition-[background-color,border-color] duration-150",
          rowActivate ? "cursor-pointer" : "cursor-default",
          rowSurfaceClass(rowIndex, accent),
          rowHoverClass(accent),
        )}
      >
        <div className="flex gap-2">
          {showTree ? <TreeGuide /> : null}
          <FileRowIcon
            entry={entry}
            folderIsEmpty={folderIsEmpty}
            className={cn("mt-0.5 shrink-0", rowIconHoverClass)}
          />
          <div className="min-w-0 flex-1">
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
                className="w-full rounded-menu-item bg-transparent text-left text-[12px] font-medium leading-snug text-white outline-none ring-1 ring-app-border-hover px-1 -mx-1"
                aria-label={`Rename ${entry.name}`}
              />
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onStartRename?.(entry.id);
                }}
                className="w-full truncate text-left text-[12px] font-medium leading-snug text-white"
              >
                {entry.name}
              </button>
            )}
            <p className="mt-1 text-left text-[10px] leading-none text-[#8A8A93]">
              {entry.dateModified}
            </p>
          </div>
          <div
            className="flex shrink-0 flex-col items-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-right">
              <p
                className={cn(
                  "text-[10px] leading-snug",
                  accent === "highlight" ? "text-white" : "text-[#A1A1AA]",
                )}
              >
                {entry.typeLabel}
              </p>
              <p
                className={cn(
                  "mt-0.5 text-[10px] leading-none",
                  accent === "highlight"
                    ? "text-[#E4E4E7]"
                    : "text-[#A1A1AA]",
                )}
              >
                {sizeDisplay}
              </p>
            </div>
            <LikeToggleButton itemKey={likedKey.file(entry.id)} />
            <FileRowActionsMenu
              align="right"
              onSelect={(a) => onMenuAction?.(entry.id, a)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role={rowActivate ? "button" : undefined}
      tabIndex={rowActivate ? 0 : undefined}
      onClick={rowActivate}
      onKeyDown={
        rowActivate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                rowActivate();
              }
            }
          : undefined
      }
      className={cn(
        "group grid min-h-[48px] items-center gap-2 rounded-card border px-3 py-2 transition-[background-color,border-color] duration-150 sm:gap-3 sm:px-4",
        "sm:grid-cols-[minmax(0,1fr)_72px_112px_64px_auto]",
        rowActivate ? "cursor-pointer" : "cursor-default",
        rowSurfaceClass(rowIndex, accent),
        rowHoverClass(accent),
      )}
    >
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {showTree ? <TreeGuide className="hidden sm:flex" /> : null}
        {showTree ? (
          <span
            className="flex w-4 shrink-0 flex-col items-center sm:hidden"
            aria-hidden
          >
            <span className="h-2 w-px bg-app-hover-strong" />
            <span className="h-px w-3 bg-app-hover-strong" />
          </span>
        ) : null}
        <FileRowIcon
          entry={entry}
          folderIsEmpty={folderIsEmpty}
          className={rowIconHoverClass}
        />
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
            className="min-w-0 w-full rounded-menu-item bg-transparent text-left text-[13px] font-medium text-white outline-none ring-1 ring-app-border-hover px-1 -mx-1"
            aria-label={`Rename ${entry.name}`}
          />
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStartRename?.(entry.id);
            }}
            className="min-w-0 w-full truncate text-left text-[13px] font-medium text-white"
          >
            {entry.name}
          </button>
        )}
      </div>
      <p
        className={cn(
          "hidden text-[11px] sm:block",
          accent === "highlight" ? "text-white" : "text-[#A1A1AA]",
        )}
      >
        {entry.typeLabel}
      </p>
      <p className="hidden text-[11px] text-[#A1A1AA] sm:block">
        {entry.dateModified}
      </p>
      <p
        className={cn(
          "hidden text-[11px] sm:block",
          accent === "highlight" ? "text-[#E4E4E7]" : "text-[#A1A1AA]",
        )}
      >
        {sizeDisplay}
      </p>
      <div
        className="hidden items-center justify-end gap-1 sm:flex"
        onClick={(e) => e.stopPropagation()}
      >
        <LikeToggleButton itemKey={likedKey.file(entry.id)} />
        <FileRowActionsMenu
          align="right"
          onSelect={(a) => onMenuAction?.(entry.id, a)}
        />
      </div>
    </div>
  );
}
