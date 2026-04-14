"use client";

import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { likedChatTitle, type LikedChatRecord } from "./liked-chats-storage";

function formatSavedAt(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type LikedChatEntryRowProps = {
  record: LikedChatRecord;
  variant: "desktop" | "mobile";
  rowIndex: number;
  onOpen: () => void;
};

const rowDividerClass =
  "relative before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-white/[0.18] first:before:hidden";

const rowIconHoverClass =
  "transition-opacity duration-150 opacity-[0.88] group-hover:opacity-100";

/** List row shaped like a saved “chat file” on the Liked page (opens Chat when clicked). */
export function LikedChatEntryRow({
  record,
  variant,
  rowIndex,
  onOpen,
}: LikedChatEntryRowProps) {
  const title = likedChatTitle(record);
  const dateDisplay = formatSavedAt(record.savedAt);
  const msgCount = `${record.messages.length} msg${record.messages.length === 1 ? "" : "s"}`;

  if (variant === "mobile") {
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
        className={cn(
          "w-full cursor-pointer",
          rowDividerClass,
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
            src={ICONS.chat}
            size={22}
            className={cn("mt-0.5 shrink-0", rowIconHoverClass)}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-left text-[12px] font-medium leading-snug text-white">
              {title}
            </p>
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
                Chat
              </p>
              <p className="mt-0.5 text-[10px] leading-none text-[#315790]">
                {msgCount}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
      className={cn(
        "w-full cursor-pointer",
        rowDividerClass,
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
            src={ICONS.chat}
            size={22}
            className={rowIconHoverClass}
          />
          <p className="min-w-0 truncate text-left text-[13px] font-medium text-white">
            {title}
          </p>
        </div>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          Chat
        </p>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {dateDisplay}
        </p>
        <p className="hidden text-[11px] text-[#315790] sm:block">
          {msgCount}
        </p>
        <div className="hidden items-center justify-end gap-1 sm:flex" />
      </div>
    </div>
  );
}
