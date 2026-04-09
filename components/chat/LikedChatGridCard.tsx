"use client";

import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { likedChatTitle, type LikedChatRecord } from "./liked-chats-storage";

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

type LikedChatGridCardProps = {
  record: LikedChatRecord;
  rowIndex: number;
  onOpen: () => void;
  enableTitleInlineRename?: boolean;
  isTitleRenaming?: boolean;
  titleRenameValue?: string;
  onStartTitleRename?: () => void;
  onTitleRenameChange?: (next: string) => void;
  onTitleRenameSubmit?: () => void;
  onTitleRenameCancel?: () => void;
};

export function LikedChatGridCard({
  record,
  rowIndex,
  onOpen,
  enableTitleInlineRename = false,
  isTitleRenaming = false,
  titleRenameValue = "",
  onStartTitleRename,
  onTitleRenameChange,
  onTitleRenameSubmit,
  onTitleRenameCancel,
}: LikedChatGridCardProps) {
  const title = likedChatTitle(record);
  const meta = `${record.messages.length} message${record.messages.length === 1 ? "" : "s"} · ${formatSavedAt(record.savedAt)}`;
  const surface =
    rowIndex % 2 === 0
      ? "bg-surface-elevated border-edge-default/80"
      : "bg-surface-panel border-edge-default/80";

  const titleBlock = enableTitleInlineRename ? (
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
        className="line-clamp-2 w-full rounded-menu-item bg-transparent text-left text-[12px] font-medium leading-snug text-white sm:text-[13px] outline-none ring-1 ring-edge-strong px-1 -mx-1"
        aria-label={`Rename ${title}`}
      />
    ) : (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onStartTitleRename?.();
        }}
        className="line-clamp-2 w-full text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]"
      >
        {title}
      </button>
    )
  ) : (
    <p className="line-clamp-2 text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]">
      {title}
    </p>
  );

  const shellClass = cn(
    "group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-card border text-left transition-[background-color,border-color,box-shadow] duration-150",
    surface,
    "hover:border-edge-strong hover:bg-surface-hover hover:shadow-md",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel",
  );

  const body = (
    <>
      <div className="relative flex aspect-square w-full items-center justify-center bg-surface-hover transition-colors duration-150 group-hover:bg-surface-hover">
        <IconAsset src={ICONS.chat} size={40} className="opacity-90" />
        <span className="absolute left-2 top-2 text-[9px] font-semibold uppercase tracking-wider text-tx-muted">
          Chat file
        </span>
      </div>
      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        {titleBlock}
        <p className="mt-1 line-clamp-2 text-left text-[10px] text-tx-muted sm:text-[11px]">
          {meta}
        </p>
      </div>
    </>
  );

  if (enableTitleInlineRename) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onOpen}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpen();
          }
        }}
        className={shellClass}
      >
        {body}
      </div>
    );
  }

  return (
    <button type="button" onClick={onOpen} className={shellClass}>
      {body}
    </button>
  );
}
