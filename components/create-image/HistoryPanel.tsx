"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX } from "./preview-frame-layout";
import type { HistoryItem } from "./types";
import { formatCreatedAt } from "./types";
import { PreviewActionsMenu } from "./PreviewActionsMenu";

type HistoryPanelProps = {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMenuAction?: (itemId: string, action: string) => void;
  className?: string;
  /** List grows and scrolls within a flex parent (e.g. mobile slide-out menu). */
  fillParent?: boolean;
  /** Omit the “HISTORY” heading (mobile drawer aligns with nav labels). */
  hideTitle?: boolean;
};

export function HistoryPanel({
  items,
  activeId,
  onSelect,
  onMenuAction,
  className,
  fillParent = false,
  hideTitle = false,
}: HistoryPanelProps) {
  /** Horizontal inset for list rows — drawer uses wider edge padding. */
  const rowPad = hideTitle ? "px-5" : "px-4";

  const listContent =
    items.length === 0 ? (
      <p
        className={cn(
          "py-8 text-left text-[11px] leading-[18px] text-[#8A8A93]",
          rowPad,
        )}
      >
        No generations yet.
      </p>
    ) : (
      items.map((item) => {
        const thumb = item.imageUrls[0];
        const active = item.id === activeId;
        return (
          <div
            key={item.id}
            className={cn(
              "border-b border-[#2A2A2E]/15 pb-3 pt-3 transition-colors last:border-b-0",
              rowPad,
              active ? "bg-[#3ABEFF]/40" : "hover:bg-[#1E1E22]/35",
            )}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="block w-full text-left"
              >
                <div className="relative aspect-[200/112.5] w-full overflow-hidden bg-[#18181B]">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="300px"
                    />
                  ) : null}
                </div>
                <p className="mt-[15px] line-clamp-2 text-left text-[11px] leading-[18px] text-[#A1A1AA]">
                  {item.prompt}
                </p>
                <p className="mt-1 text-left text-[10px] leading-none text-[#71717A]">
                  {formatCreatedAt(item.createdAt)}
                </p>
              </button>
              <div className="absolute right-2 top-2 z-20">
                <PreviewActionsMenu
                  align="right"
                  onSelect={(a) => onMenuAction?.(item.id, a)}
                />
              </div>
            </div>
          </div>
        );
      })
    );

  if (fillParent) {
    return (
      <aside
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-col bg-[#0F0F10]",
          "flex-1",
          className,
        )}
      >
        {!hideTitle ? (
          <div className="shrink-0 px-3 pb-3 pt-4">
            <h2 className="text-left text-[10px] font-bold tracking-[0.08em] text-white">
              HISTORY
            </h2>
          </div>
        ) : null}
        <div
          className={cn(
            "flex min-h-0 flex-col gap-0 overflow-y-auto",
            hideTitle && "pt-1",
            "max-h-[320px] xl:max-h-none xl:flex-1",
          )}
        >
          {listContent}
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 shrink-0 flex-col self-start bg-[#0F0F10]",
        "xl:w-[300px]",
        className,
      )}
      style={{
        height: `calc(100% - ${SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX}px)`,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-4 pl-5 pr-5 pt-6">
        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            "py-3",
          )}
        >
          {!hideTitle ? (
            <div className="shrink-0 px-4 pb-3">
              <h2 className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                HISTORY
              </h2>
            </div>
          ) : null}
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto",
              hideTitle && "pt-1",
            )}
          >
            {listContent}
          </div>
        </section>
      </div>
    </aside>
  );
}
