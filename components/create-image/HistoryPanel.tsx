"use client";

import { useId, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  historyPanelRailDesktopTitleAreaWrapperClassName,
  historyPanelRailHeaderButtonClassName,
  historyPanelRailInnerClassName,
  historyPanelRailTitleRowClassName,
  historyPanelRailTitleSurfaceClassName,
  historyPanelRailTitleToggleLabelClassName,
  historyPanelRightRailUnifiedShellClassName,
  historyPanelRightRailUnifiedShellCollapsedClassName,
  railHistoryDropdownPanelSurfaceClassName,
  RightRailPanelChevron,
} from "@/components/ui/right-rail-collapsible";
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
  /** Omit the history heading (mobile drawer aligns with nav labels). */
  hideTitle?: boolean;
  /** Section label above thumbnails (e.g. Create Image vs Create Video). */
  title?: string;
};

export function HistoryPanel({
  items,
  activeId,
  onSelect,
  onMenuAction,
  className,
  fillParent = false,
  hideTitle = false,
  title = "IMAGE HISTORY",
}: HistoryPanelProps) {
  /** Horizontal inset for list rows — drawer uses wider edge padding. */
  const rowPad = hideTitle ? "px-5" : "px-4";
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const bodyId = useId();

  const listContent =
    items.length === 0 ? (
      <p
        className={cn(
          "py-8 text-left text-[11px] leading-[18px] text-tx-secondary",
          rowPad,
        )}
      >
        No generations yet.
      </p>
    ) : (
      items.map((item, idx) => {
        const thumb = item.imageUrls[0];
        const highlighted = hoveredId
          ? item.id === hoveredId
          : activeId
            ? item.id === activeId
            : idx === 0;
        return (
          <div
            key={item.id}
            className={cn(
              "border-b border-edge-subtle/15 pb-3 pt-3 transition-[opacity] duration-150 last:border-b-0",
              rowPad,
              highlighted ? "opacity-100" : "opacity-50",
            )}
            onMouseEnter={() => setHoveredId(item.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div className="relative">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="block w-full text-left"
              >
                <div className="relative aspect-[200/112.5] w-full overflow-hidden rounded-[11px] bg-panel-bg">
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
                <p className="mt-[15px] line-clamp-2 text-left text-[11px] leading-[18px] text-tx-secondary">
                  {item.prompt}
                </p>
                <p className="mt-1 text-left text-[10px] leading-none text-tx-muted">
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

  const titleToggle = (
    <div className={historyPanelRailTitleRowClassName}>
      <div
        className={cn(historyPanelRailTitleSurfaceClassName, "w-full min-w-0")}
      >
        <button
          type="button"
          id={`${bodyId}-toggle`}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-controls={menuOpen ? bodyId : undefined}
          onClick={() => setMenuOpen((o) => !o)}
          className={historyPanelRailHeaderButtonClassName}
        >
          <span className={historyPanelRailTitleToggleLabelClassName}>
            {title}
          </span>
          <RightRailPanelChevron expanded={menuOpen} />
        </button>
      </div>
    </div>
  );

  if (fillParent) {
    return (
      <aside
        className={cn(
          "flex min-h-0 w-full min-w-0 flex-col bg-app-bg",
          "flex-1",
          className,
        )}
      >
        {!hideTitle ? (
          <div className="shrink-0 px-3 pb-3 pt-4">
            <h2 className="text-left text-[10px] font-bold tracking-[0.08em] text-white">
              {title}
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
        "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-app-bg xl:w-[300px]",
        className,
      )}
    >
      <div
        className={cn(
          historyPanelRailInnerClassName,
          "flex min-h-0 min-w-0 flex-1 flex-col",
        )}
      >
        <div
          className={cn(
            menuOpen
              ? historyPanelRightRailUnifiedShellClassName
              : historyPanelRightRailUnifiedShellCollapsedClassName,
            "relative z-[1]",
          )}
        >
          <div className={historyPanelRailDesktopTitleAreaWrapperClassName}>
            {titleToggle}
          </div>

          {menuOpen ? (
            <div
              id={bodyId}
              role="listbox"
              aria-labelledby={`${bodyId}-toggle`}
              className={cn(
                "relative z-10 min-h-0 flex-1",
                railHistoryDropdownPanelSurfaceClassName,
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">{listContent}</div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
