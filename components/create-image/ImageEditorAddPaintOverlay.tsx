"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

const ADD_CURSOR = `url("/icons/editor-tool-add-icon.svg") 2 2, crosshair`;
const REMOVE_CURSOR = `url("/icons/editor-tool-remove-icon.svg") 2 2, crosshair`;

const MASK_STROKE_ADD = "rgba(96, 165, 250, 0.42)";
const MASK_STROKE_CORE_ADD = "rgba(191, 219, 254, 0.55)";
/** Distinct warm mask so Remove strokes are obvious vs Add (blue). */
const MASK_STROKE_REMOVE = "rgba(248, 113, 113, 0.5)";
const MASK_STROKE_CORE_REMOVE = "rgba(254, 202, 202, 0.65)";

export type ImageEditorAddPaintOverlayHandle = {
  undo: () => void;
  redo: () => void;
  clearMask: () => void;
  /** Current mask as PNG data URL, or null if empty (call before generate to avoid stale React state). */
  exportPngDataUrl: () => string | null;
};

export type ImageEditorPaintMaskVariant = "add" | "remove";

export type ImageEditorAddPaintOverlayProps = {
  /** When true, user can paint; mask stays visible when false if it has content. */
  interactive: boolean;
  brushRadiusPx: number;
  /** Add vs Remove tool: cursor and mask tint. Default `add`. */
  variant?: ImageEditorPaintMaskVariant;
  className?: string;
  /** Fired after stroke, undo, redo, clear, or resize reset — `null` when mask is fully empty. */
  onMaskExport?: (maskPngDataUrl: string | null) => void;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
};

type StrokeOp =
  | { kind: "seg"; x0: number; y0: number; x1: number; y1: number; r: number }
  | { kind: "dot"; x: number; y: number; r: number };

/** One completed brush stroke (pointer down → up), replayable on the mask canvas. */
type AddPaintStroke = StrokeOp[];

function isImageDataEmpty(data: ImageData): boolean {
  const { data: buf } = data;
  for (let i = 3; i < buf.length; i += 4) {
    if (buf[i] !== 0) return false;
  }
  return true;
}

function exportMaskIfAny(canvas: HTMLCanvasElement): string | null {
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const { width: w, height: h } = canvas;
  if (w === 0 || h === 0) return null;
  try {
    const snap = ctx.getImageData(0, 0, w, h);
    if (isImageDataEmpty(snap)) return null;
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function paintSegmentWithR(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  strokeOuter: string,
  strokeInner: string,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = strokeOuter;
  ctx.lineWidth = r * 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = strokeInner;
  ctx.lineWidth = Math.max(1, r * 0.85);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function paintDotWithR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  fillOuter: string,
  fillInner: string,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = fillOuter;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = fillInner;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function replayStroke(
  ctx: CanvasRenderingContext2D,
  stroke: AddPaintStroke,
  strokeOuter: string,
  strokeInner: string,
) {
  for (const op of stroke) {
    if (op.kind === "seg") {
      paintSegmentWithR(
        ctx,
        op.x0,
        op.y0,
        op.x1,
        op.y1,
        op.r,
        strokeOuter,
        strokeInner,
      );
    } else {
      paintDotWithR(ctx, op.x, op.y, op.r, strokeOuter, strokeInner);
    }
  }
}

export const ImageEditorAddPaintOverlay = forwardRef<
  ImageEditorAddPaintOverlayHandle,
  ImageEditorAddPaintOverlayProps
>(function ImageEditorAddPaintOverlay(
  {
    interactive,
    brushRadiusPx,
    variant = "add",
    className,
    onMaskExport,
    onHistoryChange,
  },
  ref,
) {
  const strokeOuter =
    variant === "remove" ? MASK_STROKE_REMOVE : MASK_STROKE_ADD;
  const strokeInner =
    variant === "remove" ? MASK_STROKE_CORE_REMOVE : MASK_STROKE_CORE_ADD;
  const cursorCss = variant === "remove" ? REMOVE_CURSOR : ADD_CURSOR;
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Strokes currently visible on the mask (oldest → newest). */
  const activeStrokesRef = useRef<AddPaintStroke[]>([]);
  /** Strokes removed by undo; LIFO redo pops from the end. */
  const redoStrokesRef = useRef<AddPaintStroke[]>([]);
  const paintingRef = useRef(false);
  const activePaintPointerIdRef = useRef<number | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const didPaintRef = useRef(false);
  /** Ops for the stroke in progress (pointer down → up). */
  const currentStrokeOpsRef = useRef<StrokeOp[]>([]);
  const brushRef = useRef(brushRadiusPx);
  brushRef.current = brushRadiusPx;
  /** Detach window-level pointer listeners for the stroke in progress. */
  const detachWindowPaintListenersRef = useRef<(() => void) | null>(null);

  const syncHistoryFlags = useCallback(() => {
    onHistoryChange?.({
      canUndo: activeStrokesRef.current.length > 0,
      canRedo: redoStrokesRef.current.length > 0,
    });
  }, [onHistoryChange]);

  const notifyExport = useCallback(() => {
    const c = canvasRef.current;
    if (!c) {
      onMaskExport?.(null);
      syncHistoryFlags();
      return;
    }
    onMaskExport?.(exportMaskIfAny(c));
    syncHistoryFlags();
  }, [onMaskExport, syncHistoryFlags]);

  const redrawFromActiveStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    for (const stroke of activeStrokesRef.current) {
      replayStroke(ctx, stroke, strokeOuter, strokeInner);
    }
    notifyExport();
  }, [notifyExport, strokeInner, strokeOuter]);

  const resetCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wrap = wrapRef.current;
    if (wrap) {
      const dpr =
        typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
      const w = Math.max(1, Math.floor(wrap.clientWidth * dpr));
      const h = Math.max(1, Math.floor(wrap.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.clearRect(0, 0, w, h);
    } else {
      /** Parent may call `clearMask` before the overlay wrapper is measured (e.g. hidden column). */
      const w = canvas.width;
      const h = canvas.height;
      const ctx = canvas.getContext("2d");
      if (ctx && w > 0 && h > 0) ctx.clearRect(0, 0, w, h);
    }
    activeStrokesRef.current = [];
    redoStrokesRef.current = [];
    currentStrokeOpsRef.current = [];
    notifyExport();
  }, [notifyExport]);

  const fitCanvas = useCallback(() => {
    resetCanvasState();
  }, [resetCanvasState]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      fitCanvas();
    });
    ro.observe(wrap);
    fitCanvas();
    return () => ro.disconnect();
  }, [fitCanvas]);

  useEffect(
    () => () => {
      detachWindowPaintListenersRef.current?.();
      detachWindowPaintListenersRef.current = null;
    },
    [],
  );

  const brushRadiusCanvas = useCallback((canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return brushRef.current;
    return brushRef.current * (canvas.width / rect.width);
  }, []);

  const paintSegment = useCallback(
    (x0: number, y0: number, x1: number, y1: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const r = brushRadiusCanvas(canvas);
      paintSegmentWithR(ctx, x0, y0, x1, y1, r, strokeOuter, strokeInner);
      currentStrokeOpsRef.current.push({
        kind: "seg",
        x0,
        y0,
        x1,
        y1,
        r,
      });
    },
    [brushRadiusCanvas, strokeInner, strokeOuter],
  );

  const paintDot = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = brushRadiusCanvas(canvas);
    paintDotWithR(ctx, x, y, r, strokeOuter, strokeInner);
    currentStrokeOpsRef.current.push({ kind: "dot", x, y, r });
  }, [brushRadiusCanvas, strokeInner, strokeOuter]);

  const clientToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  const commitStroke = useCallback(() => {
    const ops = currentStrokeOpsRef.current;
    currentStrokeOpsRef.current = [];
    if (ops.length === 0) {
      didPaintRef.current = false;
      return;
    }
    didPaintRef.current = false;
    /* New committed stroke invalidates redo branch (only after real paint ops). */
    redoStrokesRef.current = [];
    activeStrokesRef.current.push(ops);
    /* Replay from history so the canvas always matches stroke list (keeps undo in sync). */
    redrawFromActiveStrokes();
  }, [redrawFromActiveStrokes]);

  const finishPainting = useCallback(() => {
    if (!paintingRef.current) return;
    const last = lastRef.current;
    const dotted = last != null && !didPaintRef.current;
    if (dotted) {
      paintDot(last.x, last.y);
      didPaintRef.current = true;
    }
    paintingRef.current = false;
    lastRef.current = null;
    const pid = activePaintPointerIdRef.current;
    activePaintPointerIdRef.current = null;
    const canvas = canvasRef.current;
    if (canvas != null && pid != null) {
      try {
        canvas.releasePointerCapture(pid);
      } catch {
        /* ignore */
      }
    }
    detachWindowPaintListenersRef.current?.();
    detachWindowPaintListenersRef.current = null;
    commitStroke();
  }, [commitStroke, paintDot]);

  const attachWindowPaintListeners = useCallback(
    (pointerId: number) => {
      detachWindowPaintListenersRef.current?.();
      detachWindowPaintListenersRef.current = null;

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        if (!paintingRef.current) return;
        const p = clientToCanvas(ev.clientX, ev.clientY);
        if (!p || !lastRef.current) return;
        ev.preventDefault();
        paintSegment(lastRef.current.x, lastRef.current.y, p.x, p.y);
        lastRef.current = p;
        didPaintRef.current = true;
      };

      const onEnd = (ev: PointerEvent) => {
        if (ev.pointerId !== pointerId) return;
        finishPainting();
      };

      window.addEventListener("pointermove", onMove, true);
      window.addEventListener("pointerup", onEnd, true);
      window.addEventListener("pointercancel", onEnd, true);

      const detach = () => {
        window.removeEventListener("pointermove", onMove, true);
        window.removeEventListener("pointerup", onEnd, true);
        window.removeEventListener("pointercancel", onEnd, true);
      };
      detachWindowPaintListenersRef.current = detach;
    },
    [clientToCanvas, finishPainting, paintSegment],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      if (e.button !== 0) return;
      const p = clientToCanvas(e.clientX, e.clientY);
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      activePaintPointerIdRef.current = e.pointerId;
      paintingRef.current = true;
      lastRef.current = p;
      didPaintRef.current = false;
      currentStrokeOpsRef.current = [];
      attachWindowPaintListeners(e.pointerId);
    },
    [attachWindowPaintListeners, clientToCanvas, interactive],
  );

  const undo = useCallback(() => {
    const active = activeStrokesRef.current;
    if (active.length === 0) return;
    const removed = active.pop()!;
    redoStrokesRef.current.push(removed);
    redrawFromActiveStrokes();
  }, [redrawFromActiveStrokes]);

  const redo = useCallback(() => {
    const redoStack = redoStrokesRef.current;
    if (redoStack.length === 0) return;
    const restored = redoStack.pop()!;
    activeStrokesRef.current.push(restored);
    redrawFromActiveStrokes();
  }, [redrawFromActiveStrokes]);

  const clearMask = useCallback(() => {
    resetCanvasState();
  }, [resetCanvasState]);

  const exportPngDataUrl = useCallback((): string | null => {
    const c = canvasRef.current;
    if (!c) return null;
    return exportMaskIfAny(c);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clearMask,
      exportPngDataUrl,
    }),
    [undo, redo, clearMask, exportPngDataUrl],
  );

  const stopClicks = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[5]",
        variant === "remove" && "z-[6]",
        className,
      )}
      aria-hidden={!interactive}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full touch-none select-none",
          interactive && "pointer-events-auto",
        )}
        style={{
          cursor: interactive ? cursorCss : "default",
          touchAction: interactive ? "none" : "auto",
        }}
        onPointerDown={onPointerDown}
        onClick={stopClicks}
      />
    </div>
  );
});
