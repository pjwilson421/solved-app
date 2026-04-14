"use client";

import { useEffect, useRef, useState } from "react";
import { historyPanelRailRowActionsTriggerButtonClassName } from "@/components/ui/right-rail-collapsible";
import { threeDotsMenuTriggerButtonClassName } from "@/components/ui/three-dots-menu-trigger";
import { cn } from "@/lib/utils";
import { IconDots } from "./icons";

const MENU_ITEMS = [
  "Full Screen Preview",
  "Download",
  "Share",
  "Edit image",
  "Upscale",
  "Save",
  "Like",
  "Delete",
] as const;

type PreviewActionsMenuProps = {
  className?: string;
  onSelect?: (action: (typeof MENU_ITEMS)[number]) => void;
  align?: "left" | "right";
  /**
   * Right-rail history rows: align the 16×16 dots with the header chevron (same right column).
   * Leave false for center preview and other surfaces.
   */
  alignWithRailHeaderChevron?: boolean;
};

export function PreviewActionsMenu({
  className,
  onSelect,
  align = "right",
  alignWithRailHeaderChevron = false,
}: PreviewActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
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
            "absolute top-10 z-50 min-w-[180px] rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {MENU_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-ix-pressed"
              onClick={() => {
                onSelect?.(label);
                setOpen(false);
              }}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
