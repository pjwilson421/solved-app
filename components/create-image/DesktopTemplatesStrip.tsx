"use client";

import { cn } from "@/lib/utils";
import type { TemplateDef } from "./types";
import { DESKTOP_TEMPLATE_TILE_PX, FRAME_SLOT_ROUNDED } from "./layout-tokens";

const TILE = DESKTOP_TEMPLATE_TILE_PX;

type DesktopTemplatesStripProps = {
  templates: TemplateDef[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

/**
 * xl+ only: horizontal scrolling row of square template tiles (replaces dropdown).
 */
export function DesktopTemplatesStrip({
  templates,
  selectedId,
  onSelect,
  className,
}: DesktopTemplatesStripProps) {
  return (
    <div className={cn("w-full min-w-0 pt-2", className)}>
      <div className="flex min-w-0 w-full flex-col gap-1">
        <div
          role="listbox"
          aria-label="Templates"
          className={cn(
            "min-h-0 w-full min-w-0 max-w-full flex flex-nowrap gap-3.5 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-3",
            "templates-strip-scrollbar",
            /* Instant scroll — required so thumb drag matches pointer (no smooth-scroll lag). */
            "[scroll-behavior:auto]",
          )}
        >
          <button
            type="button"
            role="option"
            aria-selected={selectedId === null}
            onClick={() => onSelect(null)}
            className={cn(
              "flex shrink-0 items-center justify-center text-[11px] font-medium transition-colors",
              FRAME_SLOT_ROUNDED,
              "bg-rail-navy text-tx-secondary hover:bg-panel-hover hover:text-white",
              "focus-visible:bg-panel-hover focus-visible:text-white focus-visible:outline-none focus-visible:ring-0",
              selectedId === null && "bg-primary text-white",
            )}
            style={{ width: TILE, height: TILE }}
          >
            None
          </button>
          {templates.map((t) => {
            const selected = selectedId === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={selected}
                title={t.name}
                onClick={() => onSelect(t.id)}
                className={cn(
                  "group relative flex shrink-0 flex-col overflow-hidden text-left transition-colors",
                  FRAME_SLOT_ROUNDED,
                  "bg-rail-navy text-tx-secondary hover:bg-panel-hover hover:text-white",
                  "focus-visible:bg-panel-hover focus-visible:text-white focus-visible:outline-none focus-visible:ring-0",
                  selected && "bg-primary text-white",
                )}
                style={{ width: TILE, height: TILE }}
              >
                <div
                  className="flex min-h-0 flex-1 flex-col items-center justify-center p-2"
                  aria-hidden
                >
                  <span className="select-none text-center text-[9px] font-medium uppercase tracking-wider text-tx-muted group-hover:text-white/80">
                    Template
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
