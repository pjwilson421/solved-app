"use client";

import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { likedChatTitle, type LikedChatRecord } from "./liked-chats-storage";

function ChatPinnedIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-white/70"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 3h8v1.5l-1.5 2v4.5l2 1.5V14h-3.5L12 21l-1-7H7.5v-1.5l2-1.5V6.5L8 4.5V3Z"
        fill="currentColor"
      />
    </svg>
  );
}

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
  onOpen: () => void;
};

export function LikedChatGridCard({
  record,
  onOpen,
}: LikedChatGridCardProps) {
  const title = likedChatTitle(record);
  const meta = `${record.messages.length} message${record.messages.length === 1 ? "" : "s"} · ${formatSavedAt(record.savedAt)}`;
  const surface = "bg-panel-bg";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl text-left transition-colors duration-150",
        surface,
        "hover:bg-panel-hover",
        "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-panel-hover/90",
      )}
    >
      <div className="relative flex aspect-square w-full items-center justify-center bg-surface-card transition-colors duration-150 group-hover:bg-panel-hover">
        <IconAsset src={ICONS.chat} size={40} className="opacity-90" />
        <span className="absolute left-2 top-2 text-[9px] font-semibold uppercase tracking-wider text-tx-secondary">
          Chat file
        </span>
      </div>
      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        <p className="line-clamp-2 flex items-center gap-1.5 text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]">
          {record.pinnedAt ? <ChatPinnedIcon /> : null}
          <span className="min-w-0 line-clamp-2">{title}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-left text-[10px] text-tx-secondary sm:text-[11px]">
          {meta}
        </p>
      </div>
    </button>
  );
}
