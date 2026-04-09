"use client";

import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { LikeToggleButton } from "@/components/liked-items/LikeToggleButton";
import {
  FileRowActionsMenu,
  type FileRowMenuAction,
} from "../files/FileRowActionsMenu";
import { formatHistoryRowMeta } from "./history-meta";
import { HistoryListTemplateThumb } from "./history-template-thumb";
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

function rowSurfaceClass(index: number) {
  return index % 2 === 0
    ? "bg-surface-elevated border-edge-default/80"
    : "bg-surface-panel border-edge-default/80";
}

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
  const meta = formatHistoryRowMeta(entry);
  const surface = rowSurfaceClass(rowIndex);

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
      <div className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5">
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
        <span className="shrink-0 text-[13px] text-tx-disabled">—</span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-tx-muted">
          {entry.subtitle}
        </span>
      </div>
    ) : (
      <div className="truncate text-left text-[13px] font-medium text-white">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onStartTitleRename?.();
          }}
          className="text-left font-medium text-white hover:underline"
        >
          {entry.title}
        </button>
        <span className="text-tx-disabled"> — </span>
        <span className="text-tx-muted">{entry.subtitle}</span>
      </div>
    )
  ) : (
    <p className="truncate text-left text-[13px] font-medium text-white">
      {entry.title} — {entry.subtitle}
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
          "group flex cursor-pointer gap-3 rounded-card border px-3 py-3 transition-[background-color,border-color] duration-150",
          surface,
          "hover:border-edge-strong hover:bg-surface-panel",
        )}
      >
        <HistoryListTemplateThumb
          variant="mobile"
          imageUrl={entry.thumbnailUrl}
        />
        <div className="min-w-0 flex-1">
          {titleNameBlockMobile}
          <p className="mt-0.5 truncate text-left text-[11px] text-tx-muted">
            {entry.subtitle}
          </p>
          <p className="mt-1 text-left text-[10px] leading-none text-tx-muted">
            {meta}
          </p>
        </div>
        <div
          className="flex shrink-0 flex-col items-end gap-1 self-start pt-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeToggleButton itemKey={likedKey.activity(entry.id)} />
          <FileRowActionsMenu
            align="right"
            menuAriaLabel="History item actions"
            onSelect={(a) => onMenuAction?.(entry.id, a)}
          />
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
        "group grid min-h-0 cursor-pointer grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 rounded-card border px-4 py-3 transition-[background-color,border-color] duration-150",
        surface,
        "hover:border-edge-strong hover:bg-surface-panel",
      )}
    >
      <HistoryListTemplateThumb
        variant="desktop"
        imageUrl={entry.thumbnailUrl}
      />
      <div className="min-w-0">
        {titleNameBlockDesktop}
        <p className="mt-1 truncate text-left text-[11px] text-tx-muted">
          {meta}
        </p>
      </div>
      <div
        className="flex items-center justify-end gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <LikeToggleButton itemKey={likedKey.activity(entry.id)} />
        <FileRowActionsMenu
          align="right"
          menuAriaLabel="History item actions"
          onSelect={(a) => onMenuAction?.(entry.id, a)}
        />
      </div>
    </div>
  );
}
