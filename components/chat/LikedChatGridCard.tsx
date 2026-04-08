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
};

export function LikedChatGridCard({
  record,
  rowIndex,
  onOpen,
}: LikedChatGridCardProps) {
  const title = likedChatTitle(record);
  const meta = `${record.messages.length} message${record.messages.length === 1 ? "" : "s"} · ${formatSavedAt(record.savedAt)}`;
  const surface =
    rowIndex % 2 === 0
      ? "bg-[#18181B] border-[#2A2A2E]/80"
      : "bg-[#141418] border-[#2A2A2E]/80";

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group flex h-full w-full cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-[background-color,border-color,box-shadow] duration-150",
        surface,
        "hover:border-[#3F3F46] hover:bg-[#1c1c1f] hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#141418]",
      )}
    >
      <div className="relative flex aspect-square w-full items-center justify-center bg-[#1E1E22] transition-colors duration-150 group-hover:bg-[#25252b]">
        <IconAsset src={ICONS.chat} size={40} className="opacity-90" />
        <span className="absolute left-2 top-2 text-[9px] font-semibold uppercase tracking-wider text-[#8A8A93]">
          Chat file
        </span>
      </div>
      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        <p className="line-clamp-2 text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]">
          {title}
        </p>
        <p className="mt-1 line-clamp-2 text-left text-[10px] text-[#8A8A93] sm:text-[11px]">
          {meta}
        </p>
      </div>
    </button>
  );
}
