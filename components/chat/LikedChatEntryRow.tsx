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

function rowSurfaceClass(index: number) {
  return index % 2 === 0
    ? "bg-app-card border-app-border/80"
    : "bg-app-panel border-app-border/80";
}

/** List row shaped like a saved “chat file” on the Liked page (opens Chat when clicked). */
export function LikedChatEntryRow({
  record,
  variant,
  rowIndex,
  onOpen,
}: LikedChatEntryRowProps) {
  const title = likedChatTitle(record);
  const meta = `${record.messages.length} message${record.messages.length === 1 ? "" : "s"} · ${formatSavedAt(record.savedAt)}`;
  const surface = rowSurfaceClass(rowIndex);

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "group flex w-full cursor-pointer gap-3 rounded-xl border px-3 py-3 text-left transition-[background-color,border-color] duration-150",
          surface,
          "hover:border-app-border-hover hover:bg-app-panel",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel",
        )}
      >
        <div
          className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-app-border bg-app-inset"
          aria-hidden
        >
          <IconAsset src={ICONS.chat} size={22} className="opacity-90" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[#8A8A93]">
            Chat file
          </p>
          <p className="mt-0.5 truncate text-left text-[12px] font-medium text-white">
            {title}
          </p>
          <p className="mt-1 text-left text-[10px] leading-relaxed text-[#A1A1AA]">
            {meta}
          </p>
        </div>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group grid w-full cursor-pointer grid-cols-[48px_minmax(0,1fr)] items-center gap-3 rounded-[10px] border px-4 py-3 text-left transition-[background-color,border-color] duration-150",
        surface,
        "hover:border-app-border-hover hover:bg-app-panel",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel",
      )}
    >
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-app-border bg-app-inset"
        aria-hidden
      >
        <IconAsset src={ICONS.chat} size={22} className="opacity-90" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-[#8A8A93]">
          Chat file
        </p>
        <p className="mt-0.5 truncate text-left text-[13px] font-medium text-white">
          {title}
        </p>
        <p className="mt-1 truncate text-left text-[11px] text-[#A1A1AA]">
          {meta}
        </p>
      </div>
    </button>
  );
}
