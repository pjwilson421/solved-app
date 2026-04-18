"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

const DRAW_CURSOR = `url("/icons/editor-draw-icon.svg") 2 2, crosshair`;

export type ImageEditorDrawOverlayHandle = {
  undo: () => void;
  redo: () => void;
  clearDrawing: () => void;
  /** PNG data URL of non-empty drawing layer, or null. */
  exportPngDataUrl: () => string | null;
};

export type ImageEditorDrawOverlayProps = {
  interactive: boolean;
  brushRadiusPx: number;
  /** Active pen color for new strokes (each committed stroke stores its own color). */
  drawColor: string;
  className?: string;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
};

type StrokeOp =
  | { kind: "seg"; x0: number; y0: number; x1: number; y1: number; r: number }
  | { kind: "dot"; x: number; y: number; r: number };

type DrawPaintStroke = { color: string; ops: StrokeOp[] };

function isImageDataEmpty(data: ImageData): boolean {
  const { data: buf } = data;
  for (let i = 3; i < buf.length; i += 4) {
    if (buf[i] !== 0) return false;
  }
  return true;
}

function paintSegmentSolid(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function paintDotSolid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function replayDrawStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawPaintStroke,
) {
  const { color, ops } = stroke;
  for (const op of ops) {
    if (op.kind === "seg") {
      paintSegmentSolid(
        ctx,
        op.x0,
        op.y0,
        op.x1,
        op.y1,
        op.r,
        color,
      );
    } else {
      paintDotSolid(ctx, op.x, op.y, op.r, color);
    }
  }
}

export const ImageEditorDrawOverlay = forwardRef<
  ImageEditorDrawOverlayHandle,
  ImageEditorDrawOverlayProps
>(function ImageEditorDrawOverlay(
  { interactive, brushRadiusPx, drawColor, className, onHistoryChange },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const activeStrokesRef = useRef<DrawPaintStroke[]>([]);
  const redoStrokesRef = useRef<DrawPaintStroke[]>([]);
  const paintingRef = useRef(false);
  const activePaintPointerIdRef = useRef<number | null>(null);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const didPaintRef = useRef(false);
  const currentStrokeOpsRef = useRef<StrokeOp[]>([]);
  /** Color locked at pointer down for the stroke in progress. */
  const currentStrokeColorRef = useRef(drawColor);
  const colorHexRef = useRef(drawColor);
  colorHexRef.current = drawColor;
  const brushRef = useRef(brushRadiusPx);
  brushRef.current = brushRadiusPx;
  const detachWindowPaintListenersRef = useRef<(() => void) | null>(null);

  const syncHistoryFlags = useCallback(() => {
    onHistoryChange?.({
      canUndo: activeStrokesRef.current.length > 0,
      canRedo: redoStrokesRef.current.length > 0,
    });
  }, [onHistoryChange]);

  const notify = useCallback(() => {
    syncHistoryFlags();
  }, [syncHistoryFlags]);

  const redrawFromActiveStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    for (const stroke of activeStrokesRef.current) {
      replayDrawStroke(ctx, stroke);
    }
    notify();
  }, [notify]);

  const resetCanvasState = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const w = Math.max(1, Math.floor(wrap.clientWidth * dpr));
    const h = Math.max(1, Math.floor(wrap.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    activeStrokesRef.current = [];
    redoStrokesRef.current = [];
    currentStrokeOpsRef.current = [];
    notify();
  }, [notify]);

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
      const color = currentStrokeColorRef.current;
      paintSegmentSolid(ctx, x0, y0, x1, y1, r, color);
      currentStrokeOpsRef.current.push({
        kind: "seg",
        x0,
        y0,
        x1,
        y1,
        r,
      });
    },
    [brushRadiusCanvas],
  );

  const paintDot = useCallback(
    (x: number, y: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const r = brushRadiusCanvas(canvas);
      const color = currentStrokeColorRef.current;
      paintDotSolid(ctx, x, y, r, color);
      currentStrokeOpsRef.current.push({ kind: "dot", x, y, r });
    },
    [brushRadiusCanvas],
  );

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
    redoStrokesRef.current = [];
    activeStrokesRef.current.push({
      color: currentStrokeColorRef.current,
      ops,
    });
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
      currentStrokeColorRef.current = colorHexRef.current;
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

  const clearDrawing = useCallback(() => {
    resetCanvasState();
  }, [resetCanvasState]);

  const exportPngDataUrl = useCallback((): string | null => {
    const c = canvasRef.current;
    if (!c) return null;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    try {
      const snap = ctx.getImageData(0, 0, c.width, c.height);
      if (isImageDataEmpty(snap)) return null;
      return c.toDataURL("image/png");
    } catch {
      return null;
    }
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clearDrawing,
      exportPngDataUrl,
    }),
    [undo, redo, clearDrawing, exportPngDataUrl],
  );

  const stopClicks = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn(
        "pointer-events-none absolute inset-0 z-[8]",
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
          cursor: interactive ? DRAW_CURSOR : "default",
          touchAction: interactive ? "none" : "auto",
        }}
        onPointerDown={onPointerDown}
        onClick={stopClicks}
      />
    </div>
  );
});
