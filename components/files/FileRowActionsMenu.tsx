"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconDots } from "../create-image/icons";

const FILE_MENU_ITEMS = [
  "Open",
  "Rename",
  "Download",
  "Move",
  "Delete",
] as const;

export type FileRowMenuAction = (typeof FILE_MENU_ITEMS)[number];

type FileRowActionsMenuProps = {
  className?: string;
  onSelect?: (action: FileRowMenuAction) => void;
  align?: "left" | "right";
  menuAriaLabel?: string;
};

export function FileRowActionsMenu({
  className,
  onSelect,
  align = "right",
  menuAriaLabel = "File actions",
}: FileRowActionsMenuProps) {
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
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-menu-item bg-surface-panel text-tx-muted transition-colors duration-150 hover:bg-surface-hover hover:text-white active:bg-surface-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={menuAriaLabel}
      >
        <IconDots className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className={cn(
            "absolute top-10 z-50 min-w-[160px] rounded-card border border-edge-default bg-surface-elevated py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {FILE_MENU_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="w-full cursor-pointer px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-white active:bg-surface-pressed focus-visible:bg-surface-hover focus-visible:outline-none"
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
