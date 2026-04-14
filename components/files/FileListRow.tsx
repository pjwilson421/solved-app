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
import { FileNameInlineEdit } from "./FileNameInlineEdit";

export type FileRowNameEditProps = {
  isEditing: boolean;
  editedName: string;
  onEditedNameChange: (value: string) => void;
  onStart: () => void;
  onCommit: (rawValue: string) => void;
  onCancel: () => void;
};

type FileListRowProps = {
  entry: FileEntry;
  depth?: number;
  variant: "desktop" | "mobile";
  /** When set, the file name is clickable and supports inline rename (Files page). */
  nameEdit?: FileRowNameEditProps;
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  /** When set, clicking a folder row opens that folder (main column only; menu uses stopPropagation). */
  onFolderOpen?: (folderId: string) => void;
  /** Opens image preview when the file has a data or remote image src. */
  onFileOpen?: (entry: FileEntry) => void;
  /** When true, folder row uses empty-folder outlined icon. */
  folderIsEmpty?: boolean;
};

function rowBaseBgClass(accent: FileEntry["accent"]) {
  if (accent === "highlight") {
    return "bg-ix-selected";
  }
  return "bg-transparent";
}

function rowInnerHoverClass(accent: FileEntry["accent"]) {
  if (accent === "highlight") {
    return "hover:bg-ix-hover";
  }
  return "hover:bg-ix-hover";
}

const rowIconHoverClass =
  "transition-opacity duration-150 opacity-[0.88] group-hover:opacity-100";

function TreeGuide({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex w-5 shrink-0 flex-col items-center pt-1", className)}
      aria-hidden
    >
      <div className="min-h-[8px] w-px flex-1 bg-panel-hover" />
      <div className="h-px w-full min-w-[12px] bg-panel-hover" />
    </div>
  );
}

export function FileListRow({
  entry,
  depth = 0,
  variant,
  nameEdit,
  onMenuAction,
  onFolderOpen,
  onFileOpen,
  folderIsEmpty,
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
  const rowDividerClass = "";

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
          "w-full min-w-0 overflow-hidden",
          rowDividerClass,
          rowActivate ? "cursor-pointer" : "cursor-default",
        )}
      >
        <div
          className={cn(
            "group flex w-full min-w-0 items-center gap-2 rounded-full px-3 py-2.5 transition-colors duration-150 sm:px-4 sm:py-3",
            rowBaseBgClass(accent),
            rowInnerHoverClass(accent),
          )}
        >
          {showTree ? (
            <span
              className="flex w-4 shrink-0 flex-col items-center self-start pt-1"
              aria-hidden
            >
              <span className="h-2 w-px bg-panel-hover" />
              <span className="h-px w-3 bg-panel-hover" />
            </span>
          ) : null}
          <FileRowIcon
            entry={entry}
            folderIsEmpty={folderIsEmpty}
            className={cn("shrink-0 self-start", rowIconHoverClass)}
          />
          <div className="min-w-0 flex-1 overflow-hidden">
            {nameEdit ? (
              <FileNameInlineEdit
                displayName={entry.name}
                isEditing={nameEdit.isEditing}
                draftValue={nameEdit.editedName}
                onDraftChange={nameEdit.onEditedNameChange}
                onRequestEdit={nameEdit.onStart}
                onCommit={nameEdit.onCommit}
                onCancelEdit={nameEdit.onCancel}
                textClassName="truncate text-left text-[12px] font-medium leading-snug text-white"
              />
            ) : (
              <p className="truncate text-left text-[12px] font-medium leading-snug text-white">
                {entry.name}
              </p>
            )}
            <p className="mt-0.5 truncate text-left text-[10px] leading-none text-[#315790]">
              {entry.dateModified}
            </p>
            <p className="mt-1 truncate text-left text-[10px] leading-snug text-[#315790]">
              <span className="text-[#315790]">{entry.typeLabel}</span>
              <span className="text-[#315790]/80" aria-hidden>
                {" "}
                ·{" "}
              </span>
              <span className="text-[#315790]">{sizeDisplay}</span>
            </p>
          </div>
          <div
            className="flex shrink-0 items-center gap-1.5 self-center"
            onClick={(e) => e.stopPropagation()}
          >
            <LikeToggleButton
              itemKey={likedKey.file(entry.id)}
              color="#315790"
            />
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
        "w-full",
        rowDividerClass,
        rowActivate ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div
        className={cn(
          "group grid min-h-[48px] w-full items-center gap-2 rounded-full px-4 py-3 transition-colors duration-150 sm:gap-3 sm:px-4",
          "sm:grid-cols-[minmax(0,1fr)_72px_112px_64px_68px]",
          rowBaseBgClass(accent),
          rowInnerHoverClass(accent),
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          {showTree ? <TreeGuide className="hidden sm:flex" /> : null}
          {showTree ? (
            <span
              className="flex w-4 shrink-0 flex-col items-center sm:hidden"
              aria-hidden
            >
              <span className="h-2 w-px bg-panel-hover" />
              <span className="h-px w-3 bg-panel-hover" />
            </span>
          ) : null}
          <FileRowIcon
            entry={entry}
            folderIsEmpty={folderIsEmpty}
            className={rowIconHoverClass}
          />
          {nameEdit ? (
            <FileNameInlineEdit
              displayName={entry.name}
              isEditing={nameEdit.isEditing}
              draftValue={nameEdit.editedName}
              onDraftChange={nameEdit.onEditedNameChange}
              onRequestEdit={nameEdit.onStart}
              onCommit={nameEdit.onCommit}
              onCancelEdit={nameEdit.onCancel}
              textClassName="min-w-0 truncate text-left text-[13px] font-medium text-white"
            />
          ) : (
            <p className="min-w-0 truncate text-left text-[13px] font-medium text-white">
              {entry.name}
            </p>
          )}
        </div>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {entry.typeLabel}
        </p>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {entry.dateModified}
        </p>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {sizeDisplay}
        </p>
        <div
          className="hidden items-center justify-end gap-1 sm:flex"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeToggleButton
            itemKey={likedKey.file(entry.id)}
            color="#315790"
          />
          <FileRowActionsMenu
            align="right"
            onSelect={(a) => onMenuAction?.(entry.id, a)}
          />
        </div>
      </div>
    </div>
  );
}
