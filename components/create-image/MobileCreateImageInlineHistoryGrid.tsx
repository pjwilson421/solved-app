"use client";

import Image from "next/image";
import { useCallback, type KeyboardEvent } from "react";
import { cn } from "@/lib/utils";
import { isDataImageSrc } from "@/lib/is-data-image-src";
import type { HistoryItem } from "./types";
import { PreviewActionsMenu } from "./PreviewActionsMenu";
import { threeDotsHistoryThumbnailAnchorClassName } from "@/components/ui/three-dots-menu-trigger";

type MobileCreateImageInlineHistoryGridProps = {
  items: HistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onMenuAction?: (itemId: string, action: string) => void;
};

export function MobileCreateImageInlineHistoryGrid({
  items,
  activeId,
  onSelect,
  onMenuAction,
}: MobileCreateImageInlineHistoryGridProps) {
  const handleKeyActivate = useCallback(
    (e: KeyboardEvent, id: string) => {
      if (
        (e.target as HTMLElement).closest("[data-inline-history-actions]")
      ) {
        return;
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!e.repeat) onSelect(id);
      }
    },
    [onSelect],
  );

  if (items.length === 0) return null;

  return (
    <div className="mt-3 w-full min-w-0 overflow-x-hidden">
      <div className="grid w-full min-w-0 grid-cols-4 gap-1">
        {items.map((item) => {
          const thumb = item.imageUrls[0];
          const isActive = activeId != null && item.id === activeId;

          return (
            <div key={item.id} className="relative min-w-0">
              <div
                role="button"
                tabIndex={0}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "group relative w-full cursor-pointer outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
                )}
                onClick={(e) => {
                  if (
                    (e.target as HTMLElement).closest(
                      "[data-inline-history-actions]",
                    )
                  ) {
                    return;
                  }
                  onSelect(item.id);
                }}
                onKeyDown={(e) => handleKeyActivate(e, item.id)}
              >
                <div
                  className={cn(
                    "relative w-full overflow-hidden rounded-[11px] transition-[box-shadow] duration-150",
                    isActive && "history-panel-thumb-frame--selected",
                  )}
                >
                  <div className="relative aspect-square w-full rounded-[11px]">
                    <div className="absolute inset-0 overflow-hidden rounded-[11px]">
                      {thumb ? (
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          className={cn(
                            "rounded-[11px] object-cover transition-opacity duration-150",
                            "group-hover:opacity-[0.92]",
                          )}
                          sizes="25vw"
                          unoptimized={isDataImageSrc(thumb)}
                        />
                      ) : null}
                    </div>
                    <div
                      data-inline-history-actions
                      className={threeDotsHistoryThumbnailAnchorClassName}
                    >
                      <PreviewActionsMenu
                        align="right"
                        onSelect={(a) => onMenuAction?.(item.id, a)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
