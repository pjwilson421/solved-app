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

const MASK_STROKE = "rgba(96, 165, 250, 0.42)";
const MASK_STROKE_CORE = "rgba(191, 219, 254, 0.55)";

export type ImageEditorAddPaintOverlayHandle = {
  undo: () => void;
  redo: () => void;
  clearMask: () => void;
};

export type ImageEditorAddPaintOverlayProps = {
  /** When true, user can paint; mask stays visible when false if it has content. */
  interactive: boolean;
  brushRadiusPx: number;
  className?: string;
  /** Fired after stroke, undo, redo, clear, or resize reset — `null` when mask is fully empty. */
  onMaskExport?: (maskPngDataUrl: string | null) => void;
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
};

type StrokeOp =
  | { kind: "seg"; x0: number; y0: number; x1: number; y1: number; r: number }
  | { kind: "dot"; x: number; y: number; r: number };

type Stroke = StrokeOp[];

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
) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = MASK_STROKE;
  ctx.lineWidth = r * 2;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = MASK_STROKE_CORE;
  ctx.lineWidth = Math.max(1, r * 0.85);
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function paintDotWithR(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.save();
  ctx.globalCompositeOperation = "source-over";
  ctx.fillStyle = MASK_STROKE;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = MASK_STROKE_CORE;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function replayStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  for (const op of stroke) {
    if (op.kind === "seg") {
      paintSegmentWithR(ctx, op.x0, op.y0, op.x1, op.y1, op.r);
    } else {
      paintDotWithR(ctx, op.x, op.y, op.r);
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
    className,
    onMaskExport,
    onHistoryChange,
  },
  ref,
) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  /** Committed strokes in order; `visibleStrokeCount` is how many are drawn. */
  const strokesRef = useRef<Stroke[]>([]);
  const visibleStrokeCountRef = useRef(0);
  const paintingRef = useRef(false);
  const lastRef = useRef<{ x: number; y: number } | null>(null);
  const didPaintRef = useRef(false);
  /** Ops for the stroke in progress (pointer down → up). */
  const currentStrokeOpsRef = useRef<StrokeOp[]>([]);
  const brushRef = useRef(brushRadiusPx);
  brushRef.current = brushRadiusPx;

  const syncHistoryFlags = useCallback(() => {
    const n = visibleStrokeCountRef.current;
    const total = strokesRef.current.length;
    onHistoryChange?.({
      canUndo: n > 0,
      canRedo: n < total,
    });
  }, [onHistoryChange]);

  const notifyExport = useCallback(() => {
    const c = canvasRef.current;
    if (!c) {
      onMaskExport?.(null);
      return;
    }
    onMaskExport?.(exportMaskIfAny(c));
    syncHistoryFlags();
  }, [onMaskExport, syncHistoryFlags]);

  const redrawVisibleStrokes = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: w, height: h } = canvas;
    ctx.clearRect(0, 0, w, h);
    const strokes = strokesRef.current;
    const n = visibleStrokeCountRef.current;
    for (let i = 0; i < n; i++) {
      replayStroke(ctx, strokes[i]!);
    }
    notifyExport();
  }, [notifyExport]);

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
    strokesRef.current = [];
    visibleStrokeCountRef.current = 0;
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
      paintSegmentWithR(ctx, x0, y0, x1, y1, r);
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

  const paintDot = useCallback((x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const r = brushRadiusCanvas(canvas);
    paintDotWithR(ctx, x, y, r);
    currentStrokeOpsRef.current.push({ kind: "dot", x, y, r });
  }, [brushRadiusCanvas]);

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
    const strokes = strokesRef.current;
    const vis = visibleStrokeCountRef.current;
    strokes.splice(vis);
    strokes.push(ops);
    visibleStrokeCountRef.current = strokes.length;
    notifyExport();
  }, [notifyExport]);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive) return;
      if (e.button !== 0) return;
      const p = clientToCanvas(e.clientX, e.clientY);
      if (!p) return;
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      paintingRef.current = true;
      lastRef.current = p;
      didPaintRef.current = false;
      currentStrokeOpsRef.current = [];
    },
    [clientToCanvas, interactive],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!interactive || !paintingRef.current) return;
      const p = clientToCanvas(e.clientX, e.clientY);
      if (!p || !lastRef.current) return;
      e.preventDefault();
      paintSegment(lastRef.current.x, lastRef.current.y, p.x, p.y);
      lastRef.current = p;
      didPaintRef.current = true;
    },
    [clientToCanvas, interactive, paintSegment],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!paintingRef.current) return;
      const last = lastRef.current;
      const dotted = last != null && !didPaintRef.current;
      if (dotted) {
        paintDot(last.x, last.y);
        didPaintRef.current = true;
      }
      paintingRef.current = false;
      lastRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      commitStroke();
    },
    [commitStroke, paintDot],
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      if (paintingRef.current) {
        const last = lastRef.current;
        if (last != null && !didPaintRef.current) {
          paintDot(last.x, last.y);
          didPaintRef.current = true;
        }
      }
      paintingRef.current = false;
      lastRef.current = null;
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      commitStroke();
    },
    [commitStroke, paintDot],
  );

  const undo = useCallback(() => {
    if (visibleStrokeCountRef.current <= 0) return;
    visibleStrokeCountRef.current -= 1;
    redrawVisibleStrokes();
  }, [redrawVisibleStrokes]);

  const redo = useCallback(() => {
    const strokes = strokesRef.current;
    if (visibleStrokeCountRef.current >= strokes.length) return;
    visibleStrokeCountRef.current += 1;
    redrawVisibleStrokes();
  }, [redrawVisibleStrokes]);

  const clearMask = useCallback(() => {
    resetCanvasState();
  }, [resetCanvasState]);

  useImperativeHandle(
    ref,
    () => ({
      undo,
      redo,
      clearMask,
    }),
    [undo, redo, clearMask],
  );

  const stopClicks = useCallback((e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={cn("pointer-events-none absolute inset-0 z-[5]", className)}
      aria-hidden={!interactive}
    >
      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0 h-full w-full touch-none select-none",
          interactive && "pointer-events-auto",
        )}
        style={{
          cursor: interactive ? ADD_CURSOR : "default",
          touchAction: interactive ? "none" : "auto",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={stopClicks}
      />
    </div>
  );
});
