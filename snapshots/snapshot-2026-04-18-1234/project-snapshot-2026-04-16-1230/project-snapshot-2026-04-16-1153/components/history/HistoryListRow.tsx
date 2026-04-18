"use client";

import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { LikeToggleButton } from "@/components/liked-items/LikeToggleButton";
import {
  FileRowActionsMenu,
  type FileRowMenuAction,
} from "../files/FileRowActionsMenu";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import type { ActivityHistoryEntry } from "./types";

type HistoryListRowProps = {
  entry: ActivityHistoryEntry;
  variant: "desktop" | "mobile";
  rowIndex: number;
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  onItemOpen?: (id: string) => void;
  enableTitleInlineRename?: boolean;
  isTitleRenaming?: boolean;
  titleRenameValue?: string;
  onStartTitleRename?: () => void;
  onTitleRenameChange?: (next: string) => void;
  onTitleRenameSubmit?: () => void;
  onTitleRenameCancel?: () => void;
};

const rowDividerClass =
  "relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/[0.18] first:before:hidden";

function iconForKind(kind: ActivityHistoryEntry["kind"]): string {
  switch (kind) {
    case "image":
    case "editor":
      return ICONS.filesListImage;
    case "video":
      return ICONS.filesListMovie;
    case "chat":
      return ICONS.filesListFile;
    default:
      return ICONS.filesListFile;
  }
}

function kindLabel(entry: ActivityHistoryEntry): string {
  if (entry.kind === "image") return entry.edited ? "Edited" : "Image";
  if (entry.kind === "video") return "Video";
  if (entry.kind === "chat") return "Chat";
  if (entry.kind === "editor") return entry.edited ? "Edited" : "Editor";
  return "File";
}

function formatEntryDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const rowIconHoverClass =
  "transition-opacity duration-150 opacity-[0.88] group-hover:opacity-100";

export function HistoryListRow({
  entry,
  variant,
  rowIndex,
  onMenuAction,
  onItemOpen,
  enableTitleInlineRename = false,
  isTitleRenaming = false,
  titleRenameValue = "",
  onStartTitleRename,
  onTitleRenameChange,
  onTitleRenameSubmit,
  onTitleRenameCancel,
}: HistoryListRowProps) {
  const type = kindLabel(entry);
  const dateDisplay = formatEntryDate(entry.occurredAt);

  const titleNameBlockMobile = enableTitleInlineRename ? (
    isTitleRenaming ? (
      <input
        autoFocus
        value={titleRenameValue}
        onChange={(e) => onTitleRenameChange?.(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onTitleRenameSubmit?.();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onTitleRenameCancel?.();
          }
        }}
        onBlur={() => onTitleRenameSubmit?.()}
        className="w-full rounded-menu-item bg-transparent text-left text-[12px] font-medium leading-snug text-white outline-none ring-1 ring-edge-strong px-1 -mx-1"
        aria-label={`Rename ${entry.title}`}
      />
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartTitleRename?.();
        }}
        className="w-full truncate text-left text-[12px] font-medium text-white"
      >
        {entry.title}
      </button>
    )
  ) : (
    <p className="truncate text-left text-[12px] font-medium text-white">
      {entry.title}
    </p>
  );

  const titleNameBlockDesktop = enableTitleInlineRename ? (
    isTitleRenaming ? (
      <input
        autoFocus
        value={titleRenameValue}
        onChange={(e) => onTitleRenameChange?.(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onTitleRenameSubmit?.();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onTitleRenameCancel?.();
          }
        }}
        onBlur={() => onTitleRenameSubmit?.()}
        className="min-w-0 max-w-full flex-1 rounded-menu-item bg-transparent text-left text-[13px] font-medium text-white outline-none ring-1 ring-edge-strong px-1 -mx-1"
        aria-label={`Rename ${entry.title}`}
      />
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartTitleRename?.();
        }}
        className="min-w-0 truncate text-left text-[13px] font-medium text-white hover:underline"
      >
        {entry.title}
      </button>
    )
  ) : (
    <p className="min-w-0 truncate text-left text-[13px] font-medium text-white">
      {entry.title}
    </p>
  );

  if (variant === "mobile") {
    return (
      <div
        role={onItemOpen ? "button" : undefined}
        tabIndex={onItemOpen ? 0 : undefined}
        onClick={() => onItemOpen?.(entry.id)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onItemOpen?.(entry.id);
          }
        }}
        className={cn(
          "w-full",
          rowDividerClass,
          onItemOpen ? "cursor-pointer" : "cursor-default",
        )}
      >
        <div
          className={cn(
            "group flex w-full items-stretch gap-2 rounded-full px-4 py-3 transition-colors duration-150",
            "bg-transparent",
            "hover:bg-panel-hover/40",
          )}
        >
          <IconAsset
            src={iconForKind(entry.kind)}
            size={22}
            className={cn("mt-0.5 shrink-0", rowIconHoverClass)}
          />
          <div className="min-w-0 flex-1">
            {titleNameBlockMobile}
            <p className="mt-1 text-left text-[10px] leading-none text-[#315790]">
              {dateDisplay}
            </p>
          </div>
          <div
            className="flex shrink-0 flex-col items-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-right">
              <p className="text-[10px] leading-snug text-[#315790]">
                {type}
              </p>
            </div>
            <LikeToggleButton
              itemKey={likedKey.activity(entry.id)}
              color="#315790"
            />
            <FileRowActionsMenu
              align="right"
              menuAriaLabel="History item actions"
              onSelect={(a) => onMenuAction?.(entry.id, a)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role={onItemOpen ? "button" : undefined}
      tabIndex={onItemOpen ? 0 : undefined}
      onClick={() => onItemOpen?.(entry.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onItemOpen?.(entry.id);
        }
      }}
      className={cn(
        "w-full",
        rowDividerClass,
        onItemOpen ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div
        className={cn(
          "group grid min-h-[48px] w-full items-center gap-2 rounded-full px-4 py-3 transition-colors duration-150 sm:gap-3 sm:px-4",
          "sm:grid-cols-[minmax(0,1fr)_72px_112px_64px_auto]",
          "bg-transparent",
          "hover:bg-panel-hover/40",
        )}
      >
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <IconAsset
            src={iconForKind(entry.kind)}
            size={22}
            className={rowIconHoverClass}
          />
          {titleNameBlockDesktop}
        </div>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {type}
        </p>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {dateDisplay}
        </p>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          —
        </p>
        <div
          className="hidden items-center justify-end gap-1 sm:flex"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeToggleButton
            itemKey={likedKey.activity(entry.id)}
            color="#315790"
          />
          <FileRowActionsMenu
            align="right"
            menuAriaLabel="History item actions"
            onSelect={(a) => onMenuAction?.(entry.id, a)}
          />
        </div>
      </div>
    </div>
  );
}
