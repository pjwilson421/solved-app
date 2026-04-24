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

const USE_IN_PROMPT_ITEMS = [
  "Chat",
  "Create Image",
  "Image Editor",
  "Create Video",
] as const;

type UseInPromptMenuItem = (typeof USE_IN_PROMPT_ITEMS)[number];

export type FileRowMenuAction =
  | (typeof FILE_MENU_ITEMS)[number]
  | `Use in prompt:${UseInPromptMenuItem}`;

type FileRowActionsMenuProps = {
  className?: string;
  onSelect?: (action: FileRowMenuAction) => void;
  align?: "left" | "right";
  menuAriaLabel?: string;
  showUseInPrompt?: boolean;
};

export function FileRowActionsMenu({
  className,
  onSelect,
  align = "right",
  menuAriaLabel = "File actions",
  showUseInPrompt = true,
}: FileRowActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [useInPromptOpen, setUseInPromptOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setUseInPromptOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (!next) setUseInPromptOpen(false);
            return next;
          });
        }}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-panel-bg text-tx-secondary transition-colors duration-150 hover:bg-panel-hover hover:text-white active:bg-panel-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg"
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
            "absolute top-10 z-50 min-w-[160px] rounded-xl border border-edge-subtle bg-panel-bg py-1.5 shadow-xl",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {FILE_MENU_ITEMS.map((label) => (
            <button
              key={label}
              type="button"
              role="menuitem"
              className="flex w-full cursor-pointer items-center rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-panel-pressed focus-visible:bg-[#0d1d45] focus-visible:outline-none"
              onClick={() => {
                onSelect?.(label);
                setOpen(false);
                setUseInPromptOpen(false);
              }}
            >
              {label}
            </button>
          ))}
          {showUseInPrompt ? (
            <>
              <div className="my-1 h-px w-full bg-edge-subtle" />
              <button
                type="button"
                role="menuitem"
                className="flex w-full cursor-pointer items-center justify-between rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-panel-pressed focus-visible:bg-[#0d1d45] focus-visible:outline-none"
                aria-expanded={useInPromptOpen}
                onClick={() => setUseInPromptOpen((v) => !v)}
              >
                <span>Use in prompt</span>
                <span aria-hidden>{useInPromptOpen ? "▾" : "▸"}</span>
              </button>
              {useInPromptOpen ? (
                <div className="mt-1 px-1 pb-1">
                  {USE_IN_PROMPT_ITEMS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      role="menuitem"
                      className="flex w-full cursor-pointer items-center rounded-lg px-3 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-panel-pressed focus-visible:bg-[#0d1d45] focus-visible:outline-none"
                      onClick={() => {
                        onSelect?.(`Use in prompt:${label}`);
                        setOpen(false);
                        setUseInPromptOpen(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
