"use client";

import { useEffect, useRef } from "react";
import { IconDots } from "@/components/create-image/icons";
import { threeDotsMenuTriggerButtonClassName } from "@/components/ui/three-dots-menu-trigger";
import { cn } from "@/lib/utils";

const ASSISTANT_MESSAGE_MENU_ITEMS = [
  "Like",
  "Save To Files",
  "Share",
  "Delete",
] as const;

export type AssistantMessageMenuAction =
  (typeof ASSISTANT_MESSAGE_MENU_ITEMS)[number];

const triggerClass = cn(
  "flex h-8 w-8 shrink-0 items-center justify-center",
  threeDotsMenuTriggerButtonClassName,
);

type ChatOptionsMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (action: AssistantMessageMenuAction) => void;
};

/**
 * 3-dots control: opens on hover over the control or click; closes on
 * mouse leave (with menu aligned under trigger) or click outside / item select.
 */
export function ChatOptionsMenu({
  open,
  onOpenChange,
  onSelect,
}: ChatOptionsMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) onOpenChange(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open, onOpenChange]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Chat options"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!open);
        }}
      >
        <IconDots className="h-4 w-4" />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] min-w-[200px] pt-1"
        >
          <div className="rounded-xl border border-edge-subtle bg-surface-card px-1 py-1.5 shadow-xl">
            {ASSISTANT_MESSAGE_MENU_ITEMS.map((label) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center rounded-full pl-3 pr-3 py-2 text-left text-[11px] text-tx-secondary transition-colors hover:bg-[#0d1d45] focus-visible:bg-[#0d1d45] active:bg-[#0d1d45]"
                onClick={() => {
                  onSelect?.(label);
                  onOpenChange(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
