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
};

function rowSurfaceClass(index: number) {
  return index % 2 === 0
    ? "bg-app-card border-app-border/80"
    : "bg-app-panel border-app-border/80";
}

export function HistoryListRow({
  entry,
  variant,
  rowIndex,
  onMenuAction,
  onItemOpen,
}: HistoryListRowProps) {
  const meta = formatHistoryRowMeta(entry);
  const surface = rowSurfaceClass(rowIndex);

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
          "group flex cursor-pointer gap-3 rounded-xl border px-3 py-3 transition-[background-color,border-color] duration-150",
          surface,
          "hover:border-app-border-hover hover:bg-app-panel",
        )}
      >
        <HistoryListTemplateThumb
          variant="mobile"
          imageUrl={entry.thumbnailUrl}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-left text-[12px] font-medium text-white">
            {entry.title}
          </p>
          <p className="mt-0.5 truncate text-left text-[11px] text-[#A1A1AA]">
            {entry.subtitle}
          </p>
          <p className="mt-1 text-left text-[10px] leading-none text-[#8A8A93]">
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
        "group grid min-h-0 cursor-pointer grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] border px-4 py-3 transition-[background-color,border-color] duration-150",
        surface,
        "hover:border-app-border-hover hover:bg-app-panel",
      )}
    >
      <HistoryListTemplateThumb
        variant="desktop"
        imageUrl={entry.thumbnailUrl}
      />
      <div className="min-w-0">
        <p className="truncate text-left text-[13px] font-medium text-white">
          {entry.title} — {entry.subtitle}
        </p>
        <p className="mt-1 truncate text-left text-[11px] text-[#A1A1AA]">
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
