"use client";

import { useEffect, useRef, useState } from "react";
import { IconAsset } from "@/components/icons/IconAsset";
import { historyPanelRailRowActionsTriggerButtonClassName } from "@/components/ui/right-rail-collapsible";
import { threeDotsMenuTriggerButtonClassName } from "@/components/ui/three-dots-menu-trigger";
import { cn } from "@/lib/utils";
import {
  getPreviewMenuItems,
  PREVIEW_MENU_LIKE_ICONS,
  SHARE_SUBMENU_ITEMS,
  type PreviewMenuEvent,
  type PreviewMenuPreset,
} from "./preview-menu-config";
import { IconDots } from "./icons";

const ROW_CLASS =
  "flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-ix-pressed";

type PreviewActionsMenuProps = {
  className?: string;
  onMenuEvent?: (event: PreviewMenuEvent) => void;
  align?: "left" | "right";
  menuPreset?: PreviewMenuPreset;
  /** Main preview: whether the current generation is liked (fills heart icon). */
  likeActive?: boolean;
  /**
   * Right-rail history rows: align the 16×16 dots with the header chevron (same right column).
   */
  alignWithRailHeaderChevron?: boolean;
};

export function PreviewActionsMenu({
  className,
  onMenuEvent,
  align = "right",
  menuPreset = "create-image",
  likeActive = false,
  alignWithRailHeaderChevron = false,
}: PreviewActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const items = getPreviewMenuItems(menuPreset);

  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setShareOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const submenuShell =
    "absolute z-[60] min-w-[200px] rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl";
  const submenuPosition =
    align === "right" ? "right-full top-0 mr-1" : "left-full top-0 ml-1";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => {
            const next = !o;
            if (!next) setShareOpen(false);
            return next;
          });
        }}
        className={cn(
          alignWithRailHeaderChevron
            ? historyPanelRailRowActionsTriggerButtonClassName
            : "flex h-8 w-8 shrink-0 items-center justify-center",
          threeDotsMenuTriggerButtonClassName,
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Preview actions"
      >
        <IconDots className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-10 z-50 min-w-[200px] rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {items.map((item) => {
            if (item.id === "share") {
              return (
                <div key={item.id} className="relative">
                  <button
                    type="button"
                    role="menuitem"
                    aria-expanded={shareOpen}
                    className={cn(ROW_CLASS, "pr-3")}
                    onClick={(e) => {
                      e.stopPropagation();
                      setShareOpen((s) => !s);
                    }}
                  >
                    <IconAsset
                      src={item.iconSrc}
                      size={16}
                      className="opacity-90 [&_img]:block"
                    />
                    <span className="min-w-0 flex-1 leading-normal">
                      {item.label}
                    </span>
                    <span className="shrink-0 text-[10px] opacity-60" aria-hidden>
                      ›
                    </span>
                  </button>
                  {shareOpen ? (
                    <div
                      role="menu"
                      className={cn(submenuShell, submenuPosition)}
                    >
                      {SHARE_SUBMENU_ITEMS.map((row) => (
                        <button
                          key={row.target}
                          type="button"
                          role="menuitem"
                          className={ROW_CLASS}
                          onClick={(e) => {
                            e.stopPropagation();
                            onMenuEvent?.({
                              type: "share",
                              target: row.target,
                            });
                            setOpen(false);
                            setShareOpen(false);
                          }}
                        >
                          <span className="min-w-0 flex-1 pl-1 leading-normal">
                            {row.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            }

            const isLike = item.id === "like";
            const iconSrc = isLike
              ? likeActive
                ? PREVIEW_MENU_LIKE_ICONS.filled
                : PREVIEW_MENU_LIKE_ICONS.outline
              : item.iconSrc;

            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className={ROW_CLASS}
                onClick={(e) => {
                  e.stopPropagation();
                  const id = item.id;
                  if (id === "share") return;
                  onMenuEvent?.({ type: id });
                  setOpen(false);
                  setShareOpen(false);
                }}
              >
                <IconAsset
                  src={iconSrc}
                  size={16}
                  className="opacity-90 [&_img]:block"
                />
                <span className="min-w-0 flex-1 leading-normal">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
