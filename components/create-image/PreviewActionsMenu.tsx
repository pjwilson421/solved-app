"use client";

import { useEffect, useRef, useState } from "react";
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
};

export function PreviewActionsMenu({
  className,
  onSelect,
  align = "right",
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
        onClick={() => setOpen((o) => !o)}
        className="flex h-8 w-8 items-center justify-center rounded-menu-item bg-app-menu-trigger text-[#A1A1AA] transition-colors hover:bg-app-menu-trigger-hover active:bg-app-menu-trigger-active hover:text-white"
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
            "absolute top-10 z-50 min-w-[180px] rounded-card border border-app-border bg-app-card py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {MENU_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="w-full px-4 py-2 text-left text-[11px] text-[#E4E4E7] transition-colors hover:bg-app-hover-strong"
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
