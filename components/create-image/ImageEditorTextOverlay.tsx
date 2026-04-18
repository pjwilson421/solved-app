"use client";

import {
  useCallback,
  useLayoutEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

/** Exact palette for the image editor Text tool (order preserved for the menu). */
export const IMAGE_EDITOR_TEXT_COLORS = [
  "#ffffff",
  "#000000",
  "#159bff",
  "#0af215",
  "#f9ed10",
  "#ff910d",
  "#ff76bb",
  "#ef0000",
] as const;

export type ImageEditorTextColor = (typeof IMAGE_EDITOR_TEXT_COLORS)[number];

export const IMAGE_EDITOR_TEXT_FONT_FAMILY =
  '"Helvetica Neue", Helvetica, Arial, sans-serif';

export type EditorTextItem = {
  id: string;
  /** 0–100, relative to overlay box */
  xPct: number;
  yPct: number;
  text: string;
  color: string;
  fontFamily: string;
};

export type ImageEditorTextOverlayProps = {
  interactive: boolean;
  items: EditorTextItem[];
  activeTextColor: string;
  onItemsChange: React.Dispatch<React.SetStateAction<EditorTextItem[]>>;
  onFocusedIdChange?: (id: string | null) => void;
  className?: string;
};

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function ImageEditorTextOverlay({
  interactive,
  items,
  activeTextColor,
  onItemsChange,
  onFocusedIdChange,
  className,
}: ImageEditorTextOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());

  const setTextareaRef = useCallback(
    (id: string, el: HTMLTextAreaElement | null) => {
      if (el) textareaRefs.current.set(id, el);
      else textareaRefs.current.delete(id);
    },
    [],
  );

  useLayoutEffect(() => {
    const id = pendingFocusIdRef.current;
    if (!id) return;
    pendingFocusIdRef.current = null;
    textareaRefs.current.get(id)?.focus();
  }, [items]);

  const placeNewText = useCallback(
    (clientX: number, clientY: number) => {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const rect = wrap.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const xPct = clampPct(((clientX - rect.left) / rect.width) * 100);
      const yPct = clampPct(((clientY - rect.top) / rect.height) * 100);
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      pendingFocusIdRef.current = newId;
      onItemsChange((prev) => [
        ...prev,
        {
          id: newId,
          xPct,
          yPct,
          text: "",
          color: activeTextColor,
          fontFamily: IMAGE_EDITOR_TEXT_FONT_FAMILY,
        },
      ]);
    },
    [activeTextColor, onItemsChange],
  );

  const onBackdropPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      placeNewText(e.clientX, e.clientY);
    },
    [interactive, placeNewText],
  );

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[6]",
        className,
      )}
    >
      <div
        className={cn(
          "absolute inset-0 select-none",
          interactive && "pointer-events-auto touch-none",
        )}
        style={{
          cursor: interactive ? "text" : "default",
        }}
        aria-hidden={!interactive}
        onPointerDown={onBackdropPointerDown}
      />
      {items.map((item) => (
        <textarea
          key={item.id}
          ref={(el) => setTextareaRef(item.id, el)}
          value={item.text}
          onChange={(e) => {
            const v = e.target.value;
            onItemsChange((prev) =>
              prev.map((t) => (t.id === item.id ? { ...t, text: v } : t)),
            );
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onFocus={() => onFocusedIdChange?.(item.id)}
          onBlur={() => onFocusedIdChange?.(null)}
          className={cn(
            "absolute z-[7] min-h-[1.25em] min-w-[80px] max-w-[min(90%,360px)] resize-none border-0 bg-transparent p-0 shadow-none outline-none",
            "text-[16px] leading-snug",
            interactive ? "pointer-events-auto touch-auto" : "pointer-events-none",
          )}
          style={{
            left: `${item.xPct}%`,
            top: `${item.yPct}%`,
            transform: "translate(-2px, -2px)",
            color: item.color,
            fontFamily: item.fontFamily,
            caretColor: item.color,
          }}
          rows={1}
          spellCheck={false}
          autoComplete="off"
          aria-label="Text on image"
        />
      ))}
    </div>
  );
}
