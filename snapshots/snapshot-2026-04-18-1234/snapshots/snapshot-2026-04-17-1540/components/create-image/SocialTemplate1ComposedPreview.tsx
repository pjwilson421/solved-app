"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type Dispatch,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from "react";
import { cn } from "@/lib/utils";
import {
  clampTemplate1Box,
  isSplitHeroLayout,
  isTextTemplateElement,
  SOCIAL_TEMPLATE_1_SVG,
  TEMPLATE_1_DESIGN_CANVAS,
  TEMPLATE_1_TEXT_STYLES,
  type SocialTemplate1Box,
  type SocialTemplate1ElementId,
  type SocialTemplate1State,
  type SocialTemplate1TextKey,
} from "@/lib/create-image/composed-templates/social-template-1";

type DragSession =
  | {
      mode: "move";
      id: SocialTemplate1ElementId;
      startClientX: number;
      startClientY: number;
      startBox: SocialTemplate1Box;
      scale: number;
    }
  | {
      mode: "resize";
      id: SocialTemplate1ElementId;
      corner: "nw" | "ne" | "sw" | "se";
      startClientX: number;
      startClientY: number;
      startBox: SocialTemplate1Box;
      scale: number;
    };

function ResizeHandle({
  corner,
  onPointerDown,
}: {
  corner: "nw" | "ne" | "sw" | "se";
  onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => void;
}) {
  const pos =
    corner === "nw"
      ? "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize"
      : corner === "ne"
        ? "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize"
        : corner === "sw"
          ? "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize"
          : "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize";
  return (
    <button
      type="button"
      aria-label={`Resize ${corner}`}
      className={cn(
        "absolute z-[3] size-3 rounded-sm border border-white/90 bg-primary shadow touch-none",
        pos,
      )}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onPointerDown(e);
      }}
    />
  );
}

type SocialTemplate1ComposedPreviewProps = {
  state: SocialTemplate1State;
  onChange: Dispatch<SetStateAction<SocialTemplate1State>>;
  className?: string;
};

function useDesignScale(
  aspect: SocialTemplate1State["aspectRatio"],
  viewportRef: React.RefObject<HTMLDivElement | null>,
) {
  const [scale, setScale] = useState(1);
  const { width: baseW, height: baseH } = TEMPLATE_1_DESIGN_CANVAS[aspect];

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const s = Math.min(r.width / baseW, r.height / baseH);
      setScale(s > 0 && Number.isFinite(s) ? s : 1);
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect, baseW, baseH, viewportRef]);

  return { scale, baseW, baseH };
}

function AutoHeightTextarea({
  value,
  onChange,
  minHeightPx,
  className,
  style,
  onFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  minHeightPx: number;
  className?: string;
  style?: React.CSSProperties;
  onFocus?: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = "0px";
    const next = Math.max(minHeightPx, ta.scrollHeight);
    ta.style.height = `${next}px`;
  }, [value, minHeightPx]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      spellCheck={false}
      rows={1}
      className={className}
      style={style}
    />
  );
}

export function SocialTemplate1ComposedPreview({
  state,
  onChange,
  className,
}: SocialTemplate1ComposedPreviewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);

  const ar = state.aspectRatio;
  const { scale, baseW, baseH } = useDesignScale(ar, viewportRef);
  scaleRef.current = scale;

  const [selectedId, setSelectedId] = useState<SocialTemplate1ElementId | null>(
    null,
  );
  const dragRef = useRef<DragSession | null>(null);
  const fileHeroRef = useRef<HTMLInputElement>(null);
  const fileLogoRef = useRef<HTMLInputElement>(null);

  const svgSrc = SOCIAL_TEMPLATE_1_SVG[ar];
  const split = isSplitHeroLayout(ar);

  const setBox = useCallback(
    (id: SocialTemplate1ElementId, box: SocialTemplate1Box) => {
      onChange((prev) => {
        const aspect = prev.aspectRatio;
        return {
          ...prev,
          boxes: {
            ...prev.boxes,
            [id]: clampTemplate1Box(aspect, id, box),
          },
        };
      });
    },
    [onChange],
  );

  const beginDrag = useCallback(
    (id: SocialTemplate1ElementId, e: ReactPointerEvent) => {
      dragRef.current = {
        mode: "move",
        id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBox: state.boxes[id],
        scale: scaleRef.current,
      };
    },
    [state.boxes],
  );

  const beginResize = useCallback(
    (
      id: SocialTemplate1ElementId,
      corner: "nw" | "ne" | "sw" | "se",
      e: ReactPointerEvent,
    ) => {
      dragRef.current = {
        mode: "resize",
        id,
        corner,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startBox: state.boxes[id],
        scale: scaleRef.current,
      };
    },
    [state.boxes],
  );

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const sess = dragRef.current;
      if (!sess) return;
      const s = sess.scale;
      if (s < 1e-8) return;

      const dx = (e.clientX - sess.startClientX) / s;
      const dy = (e.clientY - sess.startClientY) / s;
      const sb = sess.startBox;

      if (sess.mode === "move") {
        setBox(sess.id, {
          ...sb,
          x: sb.x + dx,
          y: sb.y + dy,
        });
        return;
      }

      const { corner } = sess;
      let next = { ...sb };
      if (corner === "se") {
        next = { ...sb, w: sb.w + dx, h: sb.h + dy };
      } else if (corner === "ne") {
        next = {
          ...sb,
          y: sb.y + dy,
          w: sb.w + dx,
          h: sb.h - dy,
        };
      } else if (corner === "sw") {
        next = {
          ...sb,
          x: sb.x + dx,
          w: sb.w - dx,
          h: sb.h + dy,
        };
      } else {
        next = {
          ...sb,
          x: sb.x + dx,
          y: sb.y + dy,
          w: sb.w - dx,
          h: sb.h - dy,
        };
      }
      setBox(sess.id, next);
    };

    const onUp = () => {
      dragRef.current = null;
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [setBox]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const updateText = (key: SocialTemplate1TextKey, value: string) => {
    onChange((prev) => ({
      ...prev,
      texts: { ...prev.texts, [key]: value },
    }));
  };

  const onPickHero = (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !/^image\//i.test(f.type)) return;
    const url = URL.createObjectURL(f);
    onChange((prev) => {
      if (prev.heroUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.heroUrl);
      return { ...prev, heroUrl: url };
    });
  };

  const onPickLogo = (files: FileList | null) => {
    const f = files?.[0];
    if (!f || !/^image\//i.test(f.type)) return;
    const url = URL.createObjectURL(f);
    onChange((prev) => {
      if (prev.logoUrl?.startsWith("blob:")) URL.revokeObjectURL(prev.logoUrl);
      return { ...prev, logoUrl: url };
    });
  };

  const layerChrome = (id: SocialTemplate1ElementId) =>
    selectedId === id &&
    "ring-2 ring-primary ring-offset-0 ring-offset-transparent";

  const textStyle = (key: SocialTemplate1TextKey): React.CSSProperties => {
    const t = TEMPLATE_1_TEXT_STYLES[ar][key];
    return {
      fontSize: t.fontSize,
      lineHeight: t.lineHeight,
      fontWeight: t.fontWeight,
      ...(t.letterSpacing ? { letterSpacing: t.letterSpacing } : {}),
      fontFamily:
        "Helvetica Neue, Helvetica, system-ui, -apple-system, sans-serif",
    };
  };

  const renderTextLayer = (
    id: Exclude<SocialTemplate1ElementId, "hero" | "logo">,
    textKey: SocialTemplate1TextKey,
    alignClass: string,
  ) => {
    const b = state.boxes[id];
    const selected = selectedId === id;
    const typo = textStyle(textKey);
    const dragHit = 14;

    return (
      <div
        key={id}
        className={cn(
          "absolute z-[2] touch-none overflow-visible rounded-sm",
          layerChrome(id),
        )}
        style={{
          left: b.x,
          top: b.y,
          width: b.w,
          minHeight: b.h,
          height: "auto",
          touchAction: "none",
        }}
      >
        <div
          aria-hidden
          className="absolute left-0 right-0 top-0 z-[1] cursor-grab bg-transparent"
          style={{ height: dragHit }}
          onPointerDown={(e) => {
            setSelectedId(id);
            beginDrag(id, e);
          }}
        />
        <AutoHeightTextarea
          value={state.texts[textKey]}
          onChange={(v) => updateText(textKey, v)}
          minHeightPx={Math.max(24, b.h - dragHit - 4)}
          onFocus={() => setSelectedId(id)}
          className={cn(
            "relative z-0 box-border w-full resize-none border-0 bg-transparent px-1 pb-1 text-white outline-none",
            "placeholder:text-white/30",
            alignClass,
          )}
          style={{
            ...typo,
            marginTop: dragHit,
            overflow: "visible",
            WebkitUserSelect: "text",
            userSelect: "text",
            wordBreak: "break-word",
            whiteSpace: "pre-wrap",
          }}
        />
        {selected ? (
          <>
            <ResizeHandle
              corner="nw"
              onPointerDown={(e) => beginResize(id, "nw", e)}
            />
            <ResizeHandle
              corner="ne"
              onPointerDown={(e) => beginResize(id, "ne", e)}
            />
            <ResizeHandle
              corner="sw"
              onPointerDown={(e) => beginResize(id, "sw", e)}
            />
            <ResizeHandle
              corner="se"
              onPointerDown={(e) => beginResize(id, "se", e)}
            />
          </>
        ) : null}
      </div>
    );
  };

  const renderImageLayer = (
    id: "hero" | "logo",
    url: string | null,
    fit: "cover" | "contain",
  ) => {
    const b = state.boxes[id];
    const selected = selectedId === id;
    return (
      <div
        key={id}
        className={cn(
          "absolute z-[1] touch-none overflow-hidden rounded-sm bg-black/15",
          layerChrome(id),
        )}
        style={{
          left: b.x,
          top: b.y,
          width: b.w,
          height: b.h,
          touchAction: "none",
        }}
        onPointerDown={(e) => {
          if (e.target instanceof HTMLElement && e.target.closest("button")) {
            return;
          }
          setSelectedId(id);
          beginDrag(id, e);
        }}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt=""
            className={cn(
              "pointer-events-none h-full w-full select-none",
              fit === "cover" ? "object-cover" : "object-contain p-1",
            )}
            draggable={false}
          />
        ) : (
          <button
            type="button"
            className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-medium text-white/50"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() =>
              id === "hero"
                ? fileHeroRef.current?.click()
                : fileLogoRef.current?.click()
            }
          >
            {id === "hero" ? "Tap to add main image" : "Tap to add logo"}
          </button>
        )}
        {selected ? (
          <div className="absolute bottom-1 left-1/2 z-[4] flex -translate-x-1/2 gap-1">
            <button
              type="button"
              className="rounded-full border border-white/30 bg-black/70 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() =>
                id === "hero"
                  ? fileHeroRef.current?.click()
                  : fileLogoRef.current?.click()
              }
            >
              Replace
            </button>
          </div>
        ) : null}
        {selected ? (
          <>
            <ResizeHandle
              corner="nw"
              onPointerDown={(e) => beginResize(id, "nw", e)}
            />
            <ResizeHandle
              corner="ne"
              onPointerDown={(e) => beginResize(id, "ne", e)}
            />
            <ResizeHandle
              corner="sw"
              onPointerDown={(e) => beginResize(id, "sw", e)}
            />
            <ResizeHandle
              corner="se"
              onPointerDown={(e) => beginResize(id, "se", e)}
            />
          </>
        ) : null}
      </div>
    );
  };

  const scaledW = baseW * scale;
  const scaledH = baseH * scale;

  return (
    <div
      ref={viewportRef}
      className={cn(
        "relative flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden bg-[#030a14]",
        className,
      )}
      onPointerDown={(e) => {
        if (e.target === viewportRef.current) setSelectedId(null);
      }}
    >
      <input
        ref={fileHeroRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPickHero(e.target.files)}
      />
      <input
        ref={fileLogoRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => onPickLogo(e.target.files)}
      />

      <div
        className="relative shrink-0 overflow-visible"
        style={{ width: scaledW, height: scaledH }}
      >
        <div
          ref={canvasRef}
          className="absolute left-0 top-0 overflow-visible bg-[#030a14]"
          style={{
            width: baseW,
            height: baseH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {/* Full-canvas hit layer (below overlays) for deselect — no visible stroke */}
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className="st1-bg-hit pointer-events-auto absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0"
            onPointerDown={(e) => {
              e.stopPropagation();
              setSelectedId(null);
            }}
          />

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={svgSrc}
            alt=""
            className="pointer-events-none absolute inset-0 z-0 h-full w-full select-none object-cover opacity-[0.96]"
            draggable={false}
          />

          {split ? (
            <div
              className="pointer-events-none absolute right-0 top-0 z-0 h-full w-1/2 bg-[#030a14]/[0.97]"
              aria-hidden
            />
          ) : (
            <div
              className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/15 via-transparent to-black/35"
              aria-hidden
            />
          )}

          {renderImageLayer("hero", state.heroUrl, "cover")}
          {renderImageLayer("logo", state.logoUrl, "contain")}

          {renderTextLayer("label", "label", "text-left uppercase")}
          {renderTextLayer("heading", "heading", "text-left")}
          {renderTextLayer("subheading", "subheading", "text-left")}
          {renderTextLayer("body", "body", "text-left")}
          {renderTextLayer("footer", "footer", "text-left")}
        </div>
      </div>
    </div>
  );
}
