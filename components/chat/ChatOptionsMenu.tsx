"use client";

import { useEffect, useRef, useState } from "react";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";

const CHAT_MENU_ITEMS = [
  "Move to files",
  "Rename",
  "Delete",
] as const;

export type ChatMenuAction = (typeof CHAT_MENU_ITEMS)[number];

const CHAT_TOOLBAR_ICON_PX = 24;
const CHAT_TOOLBAR_ICON_CLASS =
  "pointer-events-none [&_img]:!h-6 [&_img]:!w-6 [&_img]:!max-h-6 [&_img]:!max-w-6 [&_img]:object-contain [&_img]:opacity-100";

const triggerClass = cn(
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
  "text-tx-secondary transition-colors hover:bg-panel-hover hover:text-white",
);

type ChatOptionsMenuProps = {
  onSelect?: (action: ChatMenuAction) => void;
  onToggleLike?: () => void;
};

/**
 * 3-dots control: opens on hover over the control or click; closes on
 * mouse leave (with menu aligned under trigger) or click outside / item select.
 */
export function ChatOptionsMenu({ onSelect, onToggleLike }: ChatOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleMouseDown(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative shrink-0"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Chat options"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <IconAsset
          src={ICONS.threeDots}
          size={CHAT_TOOLBAR_ICON_PX}
          className={CHAT_TOOLBAR_ICON_CLASS}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] min-w-[200px] pt-1"
        >
          <div className="rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl">
            {onToggleLike ? (
              <button
                key="Like"
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-full px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors hover:bg-panel-hover"
                onClick={() => {
                  onToggleLike();
                  setOpen(false);
                }}
              >
                Like
              </button>
            ) : null}
            {CHAT_MENU_ITEMS.map((label) => (
              <button
                key={label}
                type="button"
                role="menuitem"
                className="flex w-full items-center rounded-full px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors hover:bg-panel-hover"
                onClick={() => {
                  onSelect?.(label);
                  setOpen(false);
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
