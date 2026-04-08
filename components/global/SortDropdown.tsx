"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type SortDropdownProps<T extends string> = {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string }[];
  labelPrefix?: string;
  currentLabel: string;
};

export function SortDropdown<T extends string>({
  value,
  onChange,
  options,
  labelPrefix = "Sort by: ",
  currentLabel,
}: SortDropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const chipBtn = cn(
    "inline-flex h-[30px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 text-[11px] font-medium transition-colors duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-panel",
    "border-app-border bg-app-inset text-[#A1A1AA] hover:border-app-border-hover hover:text-white",
    open && "border-[#1EA7E1]/80 bg-[#3ABEFF] text-white hover:bg-[#0D8FD1]",
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className={chipBtn}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={`${labelPrefix}${currentLabel}`}
        onClick={() => setOpen((v) => !v)}
      >
        <span>{labelPrefix}{currentLabel}</span>
        <svg
          className={cn(
            "h-3 w-3 shrink-0 text-current opacity-90 transition-transform duration-150",
            open && "rotate-180",
          )}
          viewBox="0 0 12 12"
          fill="none"
          aria-hidden
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="listbox"
          className="absolute right-0 sm:left-0 sm:right-auto top-[calc(100%+6px)] z-50 min-w-[148px] rounded-lg border border-app-border/90 bg-app-card py-1 shadow-lg shadow-black/40"
        >
          {options.map((opt) => {
            const selected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "flex w-full cursor-pointer items-center px-3 py-2 text-left text-[11px] font-medium transition-colors duration-150",
                  selected
                    ? "bg-[#3ABEFF] text-white"
                    : "text-[#A1A1AA] hover:bg-app-hover-strong hover:text-white",
                )}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
