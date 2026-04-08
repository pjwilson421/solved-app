"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { TemplateDef } from "./types";
import { DESKTOP_TEMPLATE_TILE_PX } from "./layout-tokens";

const TILE = DESKTOP_TEMPLATE_TILE_PX;

/** Circular scroll thumb — diameter in px (track travel = track width − this). */
const THUMB_SIZE = 12;

type DesktopTemplatesStripProps = {
  templates: TemplateDef[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  className?: string;
};

/**
 * xl+ only: horizontal scrolling row of square template tiles (replaces dropdown).
 * Native scrollbar is hidden; a dedicated track + thumb below the row stays visible on all platforms.
 */
export function DesktopTemplatesStrip({
  templates,
  selectedId,
  onSelect,
  className,
}: DesktopTemplatesStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [bar, setBar] = useState({
    show: false,
    thumbLeftPx: 0,
  });

  const updateBar = useCallback(() => {
    const el = scrollRef.current;
    const track = trackRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    if (scrollWidth <= clientWidth + 1) {
      setBar({ show: false, thumbLeftPx: 0 });
      return;
    }
    const trackW =
      track && track.clientWidth > 0 ? track.clientWidth : el.clientWidth;
    const range = scrollWidth - clientWidth;
    const ratio = range <= 0 ? 0 : scrollLeft / range;
    const maxLeft = Math.max(0, trackW - THUMB_SIZE);
    const thumbLeftPx = ratio * maxLeft;
    setBar({ show: true, thumbLeftPx });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateBar();
    el.addEventListener("scroll", updateBar, { passive: true });
    const ro = new ResizeObserver(updateBar);
    ro.observe(el);
    const tr = trackRef.current;
    if (tr) ro.observe(tr);
    return () => {
      el.removeEventListener("scroll", updateBar);
      ro.disconnect();
    };
  }, [updateBar, templates.length, bar.show]);

  const onTrackPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).closest("[data-thumb]")) return;
      const el = scrollRef.current;
      const track = trackRef.current;
      if (!el || !track || !bar.show) return;
      const rect = track.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const trackW = rect.width;
      const range = el.scrollWidth - el.clientWidth;
      const pct = Math.min(1, Math.max(0, x / trackW));
      el.scrollLeft = pct * range;
    },
    [bar.show],
  );

  const onThumbPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      const el = scrollRef.current;
      const track = trackRef.current;
      const thumb = e.currentTarget;
      if (!el || !track) return;

      const pointerId = e.pointerId;
      thumb.setPointerCapture(pointerId);

      const startX = e.clientX;
      const startScroll = el.scrollLeft;

      const metrics = () => {
        const range = Math.max(0, el.scrollWidth - el.clientWidth);
        const trackW = track.getBoundingClientRect().width;
        const travel = Math.max(0, trackW - THUMB_SIZE);
        return { range, travel };
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        const { range, travel } = metrics();
        if (travel <= 0 || range <= 0) return;
        const dx = ev.clientX - startX;
        const next = startScroll + (dx / travel) * range;
        el.scrollLeft = Math.max(0, Math.min(range, next));
      };

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        try {
          thumb.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onEnd);
        window.removeEventListener("pointercancel", onEnd);
      };

      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("pointerup", onEnd);
      window.addEventListener("pointercancel", onEnd);
    },
    [],
  );

  return (
    <div className={cn("w-full min-w-0", className)}>
      <div className="flex min-w-0 w-full flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
          TEMPLATES
        </p>
        <div
          ref={scrollRef}
          role="listbox"
          aria-label="Templates"
          className={cn(
            "min-h-0 w-full min-w-0 max-w-full flex flex-nowrap gap-3.5 overflow-x-auto overflow-y-hidden overscroll-x-contain",
            /* Instant scroll — required so thumb drag matches pointer (no smooth-scroll lag). */
            "[scroll-behavior:auto]",
            "[scrollbar-width:none] [-ms-overflow-style:none]",
            "[&::-webkit-scrollbar]:h-0 [&::-webkit-scrollbar]:w-0",
          )}
        >
          <button
            type="button"
            role="option"
            aria-selected={selectedId === null}
            onClick={() => onSelect(null)}
            className={cn(
              "flex shrink-0 items-center justify-center rounded-[10px] border text-[11px] font-medium transition-all",
              "outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF] focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas",
              "border-app-border bg-app-inset text-[#A1A1AA] hover:border-app-border-hover hover:bg-app-elevated hover:text-white",
              selectedId === null &&
                "border-[#3ABEFF] bg-[#E6F7FF] text-white shadow-[0_0_0_1px_rgba(108,212,255,0.45)] ring-1 ring-[#3ABEFF]/30",
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
                  "group relative flex shrink-0 flex-col overflow-hidden rounded-[10px] border text-left transition-all",
                  "outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF] focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas",
                  "border-app-border bg-app-inset hover:border-app-border-hover",
                  selected &&
                    "border-[#3ABEFF] bg-[#222228] shadow-[0_0_16px_rgba(108,212,255,0.22)] ring-1 ring-[#3ABEFF]/35",
                )}
                style={{ width: TILE, height: TILE }}
              >
                <div
                  className="flex min-h-0 flex-1 flex-col border-b border-app-border bg-app-thumb"
                  aria-hidden
                >
                  <div className="flex flex-1 items-center justify-center bg-app-hover-strong/80">
                    <span className="select-none text-[9px] font-medium uppercase tracking-wider text-[#52525B]">
                      Template
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center justify-center bg-app-card px-1 py-1.5">
                  <span className="line-clamp-2 w-full text-center text-[9px] font-medium leading-tight text-[#A1A1AA] group-hover:text-[#D4D4D8]">
                    {t.name}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {bar.show ? (
          <div
            className="mt-1.5 w-full min-w-0 shrink-0 px-0.5"
            data-scroll-track
            onPointerDown={onTrackPointerDown}
          >
            <div
              ref={trackRef}
              className="relative flex min-h-3 w-full cursor-pointer items-center"
              role="presentation"
              aria-hidden
            >
              <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full border border-app-inset bg-app-canvas" />
              <div
                data-thumb
                className={cn(
                  "absolute top-1/2 z-[1] -translate-y-1/2 cursor-grab touch-none rounded-full bg-[#3ABEFF] shadow-[0_0_8px_rgba(108,212,255,0.45)]",
                  "hover:brightness-110 active:cursor-grabbing",
                )}
                style={{
                  left: bar.thumbLeftPx,
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                }}
                onPointerDown={onThumbPointerDown}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
