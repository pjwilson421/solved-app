"use client";

import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { LikeToggleButton } from "@/components/liked-items/LikeToggleButton";
import {
  FileRowActionsMenu,
  type FileRowMenuAction,
} from "../files/FileRowActionsMenu";
import { formatHistoryRowMeta } from "./history-meta";
import { HistoryGridTemplateThumb } from "./history-template-thumb";
import type { ActivityHistoryEntry } from "./types";

type HistoryGridCardProps = {
  entry: ActivityHistoryEntry;
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

export function HistoryGridCard({
  entry,
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
}: HistoryGridCardProps) {
  const meta = formatHistoryRowMeta(entry);
  const surface =
    rowIndex % 2 === 0
      ? "bg-[#18181B] border-[#2A2A2E]/80"
      : "bg-[#141418] border-[#2A2A2E]/80";

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
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border transition-[background-color,border-color,box-shadow] duration-150",
        surface,
        "hover:border-[#3F3F46] hover:bg-[#1c1c1f] hover:shadow-md",
      )}
    >
      <div className="relative">
        <HistoryGridTemplateThumb imageUrl={entry.thumbnailUrl} />
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-1"
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
      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        {enableTitleInlineRename ? (
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
              className="w-full rounded bg-transparent text-left text-[12px] font-medium leading-snug text-white sm:text-[13px] outline-none ring-1 ring-app-border-hover px-1 -mx-1"
              aria-label={`Rename ${entry.title}`}
            />
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onStartTitleRename?.();
              }}
              className="w-full truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]"
            >
              {entry.title}
            </button>
          )
        ) : (
          <p className="truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]">
            {entry.title}
          </p>
        )}
        <p className="mt-0.5 truncate text-left text-[11px] text-[#A1A1AA]">
          {entry.subtitle}
        </p>
        <p className="mt-1 truncate text-left text-[10px] text-[#8A8A93] sm:text-[11px]">
          {meta}
        </p>
      </div>
    </div>
  );
}
