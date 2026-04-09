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
  /** Optional surface override so page rails can match nav panel styling exactly. */
  panelClassName?: string;
  /** Optional override for rail bottom clearance (defaults to settings+prompt clearance). */
  fixedDockClearancePx?: number;
  /** When true, removes extra rail bottom padding so panel can align with left nav. */
  flushBottom?: boolean;
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
  panelClassName,
  fixedDockClearancePx,
  flushBottom = false,
  fillParent = false,
  hideTitle = false,
}: HistoryPanelProps) {
  const bottomClearancePx =
    fixedDockClearancePx ?? SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX;

  /** Horizontal inset for list rows — drawer uses wider edge padding. */
  const rowPad = hideTitle ? "px-5" : "px-4";

  const listContent =
    items.length === 0 ? (
      <p
        className={cn(
          "py-8 text-left text-[11px] leading-[18px] text-tx-muted",
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
              "border-b border-edge-default/15 pb-3 pt-3 transition-colors last:border-b-0",
              rowPad,
              active ? "bg-primary/40" : "hover:bg-surface-hover/35",
            )}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="block w-full text-left"
              >
                <div className="relative aspect-[200/112.5] w-full overflow-hidden bg-surface-elevated">
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
                <p className="mt-[15px] line-clamp-2 text-left text-[11px] leading-[18px] text-tx-muted">
                  {item.prompt}
                </p>
                <p className="mt-1 text-left text-[10px] leading-none text-tx-disabled">
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
          "flex min-h-0 w-full min-w-0 flex-col bg-surface-base",
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
        "flex min-h-0 min-w-0 shrink-0 flex-col self-start bg-surface-base",
        "xl:w-[300px]",
        className,
      )}
      style={{
        height: `calc(100% - ${bottomClearancePx}px)`,
      }}
    >
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden pl-5 pr-5 pt-6",
          flushBottom ? "pb-0" : "pb-4",
        )}
      >
        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            "py-3",
            panelClassName,
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
