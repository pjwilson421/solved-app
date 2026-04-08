"use client";

import { useEffect, useRef, useState } from "react";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import {
  CHAT_TOOLBAR_ICON_BUTTON_CLASS,
  CHAT_TOOLBAR_ICON_IMG_CLASS,
  CHAT_TOOLBAR_ICON_PX,
} from "./chat-toolbar-icons";

const CHAT_MENU_ITEMS = [
  "Move to files",
  "Rename",
  "Delete",
] as const;

export type ChatMenuAction = (typeof CHAT_MENU_ITEMS)[number];

type ChatOptionsMenuProps = {
  onSelect?: (action: ChatMenuAction) => void;
};

/**
 * 3-dots control: opens on hover over the control or click; closes on
 * mouse leave (with menu aligned under trigger) or click outside / item select.
 */
export function ChatOptionsMenu({ onSelect }: ChatOptionsMenuProps) {
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
        className={CHAT_TOOLBAR_ICON_BUTTON_CLASS}
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
          className={CHAT_TOOLBAR_ICON_IMG_CLASS}
        />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[60] min-w-[200px] pt-1"
        >
          <div className="rounded-card border border-app-border bg-app-card py-1.5 shadow-xl">
            {CHAT_MENU_ITEMS.map((label) => (
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
        </div>
      ) : null}
    </div>
  );
}
