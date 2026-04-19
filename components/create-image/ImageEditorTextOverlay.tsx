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

export type ImageEditorTextFontOption = {
  label: string;
  fontFamily: string;
};

export const IMAGE_EDITOR_TEXT_FONT_OPTIONS: readonly ImageEditorTextFontOption[] =
  [
    {
      label: "Helvetica Neue",
      fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    },
    {
      label: "Bricolage Grotesque",
      fontFamily:
        'var(--font-editor-bricolage), "Helvetica Neue", Arial, sans-serif',
    },
    {
      label: "SFMono-Regular",
      fontFamily:
        '"SFMono-Regular", Menlo, Monaco, Consolas, "Courier New", monospace',
    },
    {
      label: "Times New Roman",
      fontFamily: '"Times New Roman", Times, Georgia, serif',
    },
    {
      label: "Cormorant Garamond",
      fontFamily: 'var(--font-editor-cormorant), Georgia, serif',
    },
  ];

/** @deprecated Use `IMAGE_EDITOR_TEXT_FONT_OPTIONS[0].fontFamily` */
export const IMAGE_EDITOR_TEXT_FONT_FAMILY =
  IMAGE_EDITOR_TEXT_FONT_OPTIONS[0].fontFamily;

export type EditorTextItem = {
  id: string;
  /** 0–100, relative to overlay box */
  xPct: number;
  yPct: number;
  text: string;
  color: string;
  fontSizePx: number;
  fontFamily: string;
  /** 400 = normal, 700 = bold */
  fontWeight: number;
};

export type ImageEditorTextOverlayProps = {
  interactive: boolean;
  items: EditorTextItem[];
  activeTextColor: string;
  activeTextSize: number;
  /** `fontFamily` CSS value for new text boxes (when none focused). */
  activeTextFont: string;
  /** Default bold for new text when none focused. */
  activeTextBold: boolean;
  onItemsChange: React.Dispatch<React.SetStateAction<EditorTextItem[]>>;
  onFocusedIdChange?: (id: string | null) => void;
  className?: string;
};

const TEXT_EDGE_MARGIN_PX = 24;

function clampPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

export function ImageEditorTextOverlay({
  interactive,
  items,
  activeTextColor,
  activeTextSize,
  activeTextFont,
  activeTextBold,
  onItemsChange,
  onFocusedIdChange,
  className,
}: ImageEditorTextOverlayProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const pendingFocusIdRef = useRef<string | null>(null);
  const textareaRefs = useRef<Map<string, HTMLTextAreaElement>>(new Map());
  const draggingRef = useRef<{
    id: string;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startXPct: number;
    startYPct: number;
  } | null>(null);

  const textBoundsRect = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const width = Math.max(rect.width - TEXT_EDGE_MARGIN_PX * 2, 1);
    const height = Math.max(rect.height - TEXT_EDGE_MARGIN_PX * 2, 1);
    return {
      left: rect.left + TEXT_EDGE_MARGIN_PX,
      top: rect.top + TEXT_EDGE_MARGIN_PX,
      width,
      height,
    };
  }, []);

  const resizeTextarea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.max(el.scrollHeight, 20)}px`;
  }, []);

  const setTextareaRef = useCallback(
    (id: string, el: HTMLTextAreaElement | null) => {
      if (el) {
        textareaRefs.current.set(id, el);
        resizeTextarea(el);
      }
      else textareaRefs.current.delete(id);
    },
    [resizeTextarea],
  );

  useLayoutEffect(() => {
    const id = pendingFocusIdRef.current;
    if (!id) return;
    pendingFocusIdRef.current = null;
    textareaRefs.current.get(id)?.focus();
  }, [items]);

  useLayoutEffect(() => {
    textareaRefs.current.forEach((el) => resizeTextarea(el));
  }, [items, resizeTextarea]);

  const placeNewText = useCallback(
    (clientX: number, clientY: number) => {
      const rect = textBoundsRect();
      if (!rect) return;
      const yPct = clampPct(((clientY - rect.top) / rect.height) * 100);
      const newId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      pendingFocusIdRef.current = newId;
      onItemsChange((prev) => [
        ...prev,
        {
          id: newId,
          xPct: 0,
          yPct,
          text: "",
          color: activeTextColor,
          fontSizePx: activeTextSize,
          fontFamily: activeTextFont,
          fontWeight: activeTextBold ? 700 : 400,
        },
      ]);
    },
    [
      activeTextBold,
      activeTextColor,
      activeTextFont,
      activeTextSize,
      onItemsChange,
      textBoundsRect,
    ],
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

  const beginDragText = useCallback(
    (id: string, e: React.PointerEvent<HTMLButtonElement>) => {
      if (!interactive) return;
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const item = items.find((candidate) => candidate.id === id);
      if (!item) return;
      draggingRef.current = {
        id,
        pointerId: e.pointerId,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startXPct: item.xPct,
        startYPct: item.yPct,
      };
      e.currentTarget.setPointerCapture?.(e.pointerId);
    },
    [interactive, items],
  );

  const continueDragText = useCallback(
    (e: React.PointerEvent<HTMLButtonElement>) => {
      const dragging = draggingRef.current;
      if (!dragging) return;
      if (dragging.pointerId !== e.pointerId) return;
      const rect = textBoundsRect();
      if (!rect) return;
      const deltaYPct = ((e.clientY - dragging.startClientY) / rect.height) * 100;
      const nextY = clampPct(dragging.startYPct + deltaYPct);
      onItemsChange((prev) =>
        prev.map((item) =>
          item.id === dragging.id
            ? {
                ...item,
                xPct: 0,
                yPct: nextY,
              }
            : item,
        ),
      );
    },
    [onItemsChange, textBoundsRect],
  );

  const endDragText = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const dragging = draggingRef.current;
    if (!dragging) return;
    if (dragging.pointerId !== e.pointerId) return;
    draggingRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }, []);

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
      <div
        className="absolute"
        style={{
          left: TEXT_EDGE_MARGIN_PX,
          right: TEXT_EDGE_MARGIN_PX,
          top: TEXT_EDGE_MARGIN_PX,
          bottom: TEXT_EDGE_MARGIN_PX,
        }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute left-0 z-[7] w-full"
            style={{
              top: `${item.yPct}%`,
              transform: "translateY(-2px)",
            }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            {interactive ? (
              <button
                type="button"
                aria-label="Move text"
                className="pointer-events-auto absolute -left-2 -top-2 z-[8] flex h-4 w-4 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white/90"
                style={{ touchAction: "none", cursor: "grab" }}
                onPointerDown={(e) => beginDragText(item.id, e)}
                onPointerMove={continueDragText}
                onPointerUp={endDragText}
                onPointerCancel={endDragText}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
              </button>
            ) : null}
            <textarea
              ref={(el) => setTextareaRef(item.id, el)}
              value={item.text}
              onChange={(e) => {
                const v = e.target.value;
                resizeTextarea(e.currentTarget);
                onItemsChange((prev) =>
                  prev.map((t) => (t.id === item.id ? { ...t, text: v } : t)),
                );
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onFocus={() => onFocusedIdChange?.(item.id)}
              onBlur={() => onFocusedIdChange?.(null)}
              className={cn(
                "absolute left-0 top-0 min-h-[1.25em] w-full max-w-none resize-none overflow-hidden border-0 bg-transparent p-0 shadow-none outline-none",
                "text-[16px] leading-snug",
                "pointer-events-auto touch-auto",
              )}
              style={{
                color: item.color,
                fontSize: `${item.fontSizePx ?? 16}px`,
                fontFamily: item.fontFamily,
                fontWeight: item.fontWeight ?? 400,
                caretColor: item.color,
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
              }}
              rows={1}
              spellCheck={false}
              autoComplete="off"
              aria-label="Text on image"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
