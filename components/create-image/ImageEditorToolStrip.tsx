"use client";

import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
} from "react";
import { ICONS, type IconPath } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";
import { IMAGE_EDITOR_TEXT_COLORS } from "@/components/create-image/ImageEditorTextOverlay";

function UndoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M9 14 4 9l5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 9h11a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RedoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="m15 14 5-5-5-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20 9H9a5 5 0 0 0-5 5 5 5 0 0 0 5 5h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export type ImageEditorAddToolMenuProps = {
  open: boolean;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Desktop: open brush menu while pointer is over the Add control (incl. popover). */
  onHoverOpen?: () => void;
  /** Desktop: close after short delay so the pointer can cross the gap to the popover. */
  onHoverClose?: () => void;
};

/** Brightness / saturation as CSS filter percentages; 100 = unchanged image. */
export type ImageEditorEnhanceToolMenuProps = {
  open: boolean;
  brightness: number;
  saturation: number;
  onBrightnessChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  /** Reset brightness and saturation to defaults (100%). */
  onUndoEnhance: () => void;
  /** False when both sliders are already at default (100). */
  canUndoEnhance: boolean;
  onHoverOpen?: () => void;
  onHoverClose?: () => void;
};

/** Draw tool: brush + undo/redo + pen colors (hex). */
export type ImageEditorDrawToolMenuProps = {
  open: boolean;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  selectedDrawColor: string;
  onDrawColorSelect: (hex: string) => void;
  onHoverOpen?: () => void;
  onHoverClose?: () => void;
};

/** Exact draw palette for the Image Editor Draw tool. */
export const IMAGE_EDITOR_DRAW_COLORS = [
  "#ffffff",
  "#000000",
  "#159bff",
  "#0af215",
  "#f9ed10",
  "#ff910d",
  "#ff76bb",
  "#ef0000",
] as const;

/** Renders a public SVG as a tintable glyph via CSS mask (`backgroundColor: currentColor`). */
function ImageEditorToolIcon({ src }: { src: IconPath | string }) {
  const mask = `url("${src}")`;
  return (
    <span
      className="block shrink-0 select-none fill-current text-inherit"
      style={{
        width: ICON_PX,
        height: ICON_PX,
        backgroundColor: "currentColor",
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      aria-hidden
    />
  );
}

const TOOL_IDS = [
  "add",
  "remove",
  "enhance",
  "text",
  "draw",
] as const;

export type ImageEditorToolId = (typeof TOOL_IDS)[number] | "regenerate";

const LABELS: Record<ImageEditorToolId, string> = {
  add: "Add",
  remove: "Remove",
  enhance: "Enhance",
  regenerate: "Regenerate",
  text: "Text",
  draw: "Draw",
};

const ICONS_BY_TOOL: Record<
  ImageEditorToolId,
  readonly IconPath[]
> = {
  add: [ICONS.editorAdd],
  remove: [ICONS.editorRemove],
  enhance: [ICONS.editorEnhance],
  regenerate: [ICONS.editorRegenerate],
  /** Swatch rendered after label in the Text tool branch only. */
  text: [ICONS.editorTextTool],
  draw: [ICONS.editorDraw],
};

const ICON_PX = 16;

/** Layout + shape; default fill + `color` from globals (stroke-free); icons inherit `currentColor`. */
const toolBtnLayout = cn(
  "image-editor-tool-btn",
  "flex min-h-[38px] min-w-0 shrink-0 items-center justify-center gap-2 rounded-full",
  "appearance-none pl-2.5 pr-3 text-[11px] font-medium leading-none text-inherit",
  "focus-visible:outline-none focus-visible:ring-0",
  "opacity-100 transition-[background-color,color,opacity] duration-200 ease-in-out",
  "[@media(hover:hover)_and_(pointer:fine)]:hover:opacity-70",
);

export type ImageEditorTextToolMenuProps = {
  open: boolean;
  selectedColor: string;
  textSize: number;
  textSizeMin: number;
  textSizeMax: number;
  onTextSizeChange: (size: number) => void;
  onSelectColor: (hex: string) => void;
  onSwatchClick: (e: ReactMouseEvent) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Desktop: open color menu while pointer is over the Text control (incl. popover bridge). */
  onHoverOpen?: () => void;
  /** Desktop: close after short delay so the pointer can cross the gap to the popover. */
  onHoverClose?: () => void;
};

type ImageEditorToolStripProps = {
  activeId: ImageEditorToolId | null;
  onSelect: (id: ImageEditorToolId) => void;
  className?: string;
  /**
   * When true, a pointer down outside the active tool’s shell (button + dropdown)
   * calls `onDismissActiveTool`. Only one mounted strip should enable this (e.g. desktop vs mobile).
   */
  outsideDismissEnabled?: boolean;
  /** Close the active tool and its dropdown (outside click). */
  onDismissActiveTool?: () => void;
  /**
   * Preview + tool strip container: clicks here must not dismiss the tool (painting/drawing
   * targets the preview, which is outside the per-tool toolbar shell).
   */
  editorWorkAreaRef?: RefObject<HTMLElement | null>;
  /** Add-tool brush / history popover under the Add button (Image Editor). */
  addToolMenu?: ImageEditorAddToolMenuProps | null;
  /** Remove-tool brush / history popover (same UI pattern as Add). */
  removeToolMenu?: ImageEditorAddToolMenuProps | null;
  /** Enhance-tool adjustment popover (brightness / saturation). */
  enhanceToolMenu?: ImageEditorEnhanceToolMenuProps | null;
  /** Draw-tool brush, history, and color popover. */
  drawToolMenu?: ImageEditorDrawToolMenuProps | null;
  /** Text-tool color popover (circle swatch). */
  textToolMenu?: ImageEditorTextToolMenuProps | null;
};

const addToolPopoverClass =
  "absolute left-0 top-[calc(100%+10px)] z-50 min-w-[220px] max-w-[min(280px,calc(100vw-40px))] rounded-xl border border-edge-subtle bg-surface-card p-3 shadow-xl";

const BRUSH_SLIDER_MIN = 6;
const BRUSH_SLIDER_MAX = 72;

/** CSS `brightness()`: 100% = original. */
const ENHANCE_BRIGHTNESS_MIN = 50;
const ENHANCE_BRIGHTNESS_MAX = 150;
/** CSS `saturate()`: 100% = original. */
const ENHANCE_SATURATION_MIN = 0;
const ENHANCE_SATURATION_MAX = 200;

/** Preview diameter (px) inside the 32×32 control slot — maps linearly to brush slider. */
function brushPreviewDiameterPx(brushSize: number): number {
  const t =
    (brushSize - BRUSH_SLIDER_MIN) / (BRUSH_SLIDER_MAX - BRUSH_SLIDER_MIN);
  const clamped = Math.min(1, Math.max(0, t));
  return 6 + clamped * 14;
}

export function ImageEditorToolStrip({
  activeId,
  onSelect,
  className,
  outsideDismissEnabled = true,
  onDismissActiveTool,
  editorWorkAreaRef,
  addToolMenu = null,
  removeToolMenu = null,
  enhanceToolMenu = null,
  drawToolMenu = null,
  textToolMenu = null,
}: ImageEditorToolStripProps) {
  const [hoveredToolId, setHoveredToolId] = useState<ImageEditorToolId | null>(
    null,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  const addToolShellRef = useRef<HTMLDivElement | null>(null);
  const removeToolShellRef = useRef<HTMLDivElement | null>(null);
  const enhanceToolShellRef = useRef<HTMLDivElement | null>(null);
  const drawToolShellRef = useRef<HTMLDivElement | null>(null);
  const textToolShellRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!outsideDismissEnabled || !onDismissActiveTool) return;
    /** Add/Remove stay selected until toggled off or another tool is chosen — not dismissed by outside clicks. */
    if (activeId === "add" || activeId === "remove") return;

    const menuOpenForActive =
      activeId === "enhance"
          ? Boolean(enhanceToolMenu?.open)
          : activeId === "draw"
            ? Boolean(drawToolMenu?.open)
            : activeId === "text"
              ? Boolean(textToolMenu?.open)
              : false;
    if (
      activeId == null ||
      activeId === "regenerate" ||
      !menuOpenForActive
    ) {
      return;
    }

    const shellEl =
      activeId === "enhance"
          ? enhanceToolShellRef.current
          : activeId === "draw"
            ? drawToolShellRef.current
            : activeId === "text"
              ? textToolShellRef.current
              : null;
    if (!shellEl) return;

    const onPointerDown = (e: PointerEvent) => {
      const t = e.target;
      if (t instanceof Node && shellEl.contains(t)) return;
      const workArea = editorWorkAreaRef?.current;
      if (workArea && t instanceof Node && workArea.contains(t)) return;
      onDismissActiveTool();
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [
    activeId,
    addToolMenu?.open,
    removeToolMenu?.open,
    enhanceToolMenu?.open,
    drawToolMenu?.open,
    textToolMenu?.open,
    onDismissActiveTool,
    outsideDismissEnabled,
    editorWorkAreaRef,
  ]);

  const clearHoverIfLeavingToolbar = (e: ReactMouseEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setHoveredToolId(null);
  };

  if (!hydrated) {
    return (
      <div
        className={cn(
          "flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:gap-2.5",
          className,
        )}
        aria-label="Edit tools"
      />
    );
  }

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:gap-2.5",
        className,
      )}
      onMouseLeave={clearHoverIfLeavingToolbar}
    >
      {TOOL_IDS.map((id) => {
        const isSelected = activeId === id;
        const isHovered = hoveredToolId === id;
        /** Keep the real selection visible; hover is additive so tools don’t look inactive. */
        const activeVisual = isSelected || isHovered;
        const iconList = ICONS_BY_TOOL[id];
        const showAddMenu =
          id === "add" && addToolMenu != null && addToolMenu.open;

        const showRemoveMenu =
          id === "remove" && removeToolMenu != null && removeToolMenu.open;

        const showEnhanceMenu =
          id === "enhance" &&
          enhanceToolMenu != null &&
          enhanceToolMenu.open;

        const showTextColorMenu =
          id === "text" && textToolMenu != null && textToolMenu.open;

        const showDrawMenu =
          id === "draw" && drawToolMenu != null && drawToolMenu.open;

        const buttonInner = (
          <>
            <span
              className="flex shrink-0 items-center fill-current text-inherit"
              aria-hidden
            >
              {iconList.map((src) => (
                <ImageEditorToolIcon key={src} src={src} />
              ))}
            </span>
            <span className="min-w-0 text-inherit">{LABELS[id]}</span>
          </>
        );

        if (id === "text") {
          return (
            <div
              key={id}
              ref={textToolShellRef}
              className="relative"
              onMouseEnter={() => setHoveredToolId(id)}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
              }}
            >
              <div
                className={cn(
                  toolBtnLayout,
                  "min-w-0 gap-0 p-0",
                )}
                data-active-visual={activeVisual ? "true" : undefined}
              >
                <button
                  type="button"
                  className={cn(
                    "flex min-h-0 min-w-0 flex-1 items-center gap-2 rounded-l-full py-0 pl-2.5 pr-1.5",
                    "text-inherit focus-visible:outline-none focus-visible:ring-0",
                  )}
                  aria-pressed={isSelected}
                  aria-expanded={showTextColorMenu}
                  aria-haspopup={textToolMenu != null ? "dialog" : undefined}
                  onClick={() => onSelect(id)}
                >
                  <span
                    className="inline-flex shrink-0 fill-current text-inherit"
                    aria-hidden
                  >
                    <ImageEditorToolIcon src={ICONS.editorTextTool} />
                  </span>
                  <span className="min-w-0 shrink-0 text-inherit">
                    {LABELS.text}
                  </span>
                </button>
                <button
                  type="button"
                  className={cn(
                    "flex shrink-0 items-center rounded-r-full py-0 pl-1 pr-2.5 text-inherit",
                    "focus-visible:outline-none focus-visible:ring-0",
                  )}
                  aria-label="Text color"
                  aria-expanded={showTextColorMenu}
                  aria-haspopup={textToolMenu != null ? "dialog" : undefined}
                  onClick={(e) => textToolMenu?.onSwatchClick(e)}
                >
                  <span
                    className="inline-flex shrink-0 fill-current text-inherit"
                    aria-hidden
                  >
                    <ImageEditorToolIcon src={ICONS.editorColorSwatch} />
                  </span>
                </button>
              </div>
              {showTextColorMenu && textToolMenu ? (
                <div
                  role="dialog"
                  aria-label="Text tool settings"
                  className={addToolPopoverClass}
                >
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Text size
                  </div>
                  <input
                    type="range"
                    min={textToolMenu.textSizeMin}
                    max={textToolMenu.textSizeMax}
                    step={1}
                    value={textToolMenu.textSize}
                    onChange={(e) =>
                      textToolMenu.onTextSizeChange(Number(e.target.value))
                    }
                    className={cn(
                      "mb-2.5 box-border h-2 w-full cursor-pointer appearance-none bg-transparent p-0 leading-none outline-none",
                      "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                      "accent-primary",
                      "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#FFFFFF]",
                      "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-thumb]:mt-[calc((0.5rem-0.875rem)/2)]",
                      "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                      "[&::-moz-range-thumb]:bg-[#FFFFFF]",
                      "[&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15",
                      "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15",
                    )}
                    aria-valuemin={textToolMenu.textSizeMin}
                    aria-valuemax={textToolMenu.textSizeMax}
                    aria-valuenow={textToolMenu.textSize}
                    aria-label="Text size"
                  />
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Text color
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {IMAGE_EDITOR_TEXT_COLORS.map((hex) => {
                      const selected =
                        textToolMenu.selectedColor.toLowerCase() ===
                        hex.toLowerCase();
                      return (
                        <button
                          key={hex}
                          type="button"
                          className={cn(
                            "flex h-9 w-full items-center justify-center rounded-lg border-2 transition-colors",
                            selected
                              ? "border-white"
                              : "border-transparent hover:border-white/40",
                          )}
                          aria-label={`Color ${hex}`}
                          aria-pressed={selected}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            textToolMenu.onSelectColor(hex);
                          }}
                        >
                          <span
                            className="h-7 w-7 rounded-full border border-white/20 shadow-inner"
                            style={{ backgroundColor: hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex items-center justify-end gap-1 border-t border-white/10 pt-2">
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Undo text action"
                      disabled={!textToolMenu.canUndo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        textToolMenu.onUndo();
                      }}
                    >
                      <UndoIcon />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Redo text action"
                      disabled={!textToolMenu.canRedo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        textToolMenu.onRedo();
                      }}
                    >
                      <RedoIcon />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        if (id === "remove") {
          return (
            <div
              key={id}
              ref={removeToolShellRef}
              className="relative"
              onMouseEnter={() => setHoveredToolId(id)}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
              }}
            >
              <button
                type="button"
                className={toolBtnLayout}
                data-active-visual={activeVisual ? "true" : undefined}
                aria-pressed={isSelected}
                aria-expanded={showRemoveMenu}
                aria-haspopup={removeToolMenu != null ? "dialog" : undefined}
                onClick={() => onSelect(id)}
              >
                {buttonInner}
              </button>
              {showRemoveMenu && removeToolMenu ? (
                <div
                  role="dialog"
                  aria-label="Remove brush settings"
                  className={addToolPopoverClass}
                >
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Brush size
                  </div>
                  <input
                    type="range"
                    min={BRUSH_SLIDER_MIN}
                    max={BRUSH_SLIDER_MAX}
                    step={1}
                    value={removeToolMenu.brushSize}
                    onChange={(e) =>
                      removeToolMenu.onBrushSizeChange(Number(e.target.value))
                    }
                    className={cn(
                      "mb-2.5 box-border h-2 w-full cursor-pointer appearance-none bg-transparent p-0 leading-none outline-none",
                      "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                      "accent-primary",
                      "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#FFFFFF]",
                      "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-thumb]:mt-[calc((0.5rem-0.875rem)/2)]",
                      "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                      "[&::-moz-range-thumb]:bg-[#FFFFFF]",
                      "[&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15",
                      "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15",
                    )}
                    aria-valuemin={BRUSH_SLIDER_MIN}
                    aria-valuemax={BRUSH_SLIDER_MAX}
                    aria-valuenow={removeToolMenu.brushSize}
                    aria-label="Brush size"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      <span
                        className="rounded-full bg-[#FFFFFF] transition-[width,height] duration-75 ease-out"
                        style={{
                          width: brushPreviewDiameterPx(
                            removeToolMenu.brushSize,
                          ),
                          height: brushPreviewDiameterPx(
                            removeToolMenu.brushSize,
                          ),
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Undo brush stroke"
                      disabled={!removeToolMenu.canUndo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeToolMenu.onUndo();
                      }}
                    >
                      <UndoIcon />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Redo brush stroke"
                      disabled={!removeToolMenu.canRedo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeToolMenu.onRedo();
                      }}
                    >
                      <RedoIcon />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        if (id === "enhance") {
          const enhanceRangeClass = cn(
            "mb-2.5 box-border h-2 w-full cursor-pointer appearance-none bg-transparent p-0 leading-none outline-none last:mb-0",
            "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
            "accent-primary",
            "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
            "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#FFFFFF]",
            "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
            "[&::-webkit-slider-thumb]:mt-[calc((0.5rem-0.875rem)/2)]",
            "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
            "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:bg-[#FFFFFF]",
            "[&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
            "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15",
            "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15",
          );
          return (
            <div
              key={id}
              ref={enhanceToolShellRef}
              className="relative"
              onMouseEnter={() => setHoveredToolId(id)}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
              }}
            >
              <button
                type="button"
                className={toolBtnLayout}
                data-active-visual={activeVisual ? "true" : undefined}
                aria-pressed={isSelected}
                aria-expanded={showEnhanceMenu}
                aria-haspopup={enhanceToolMenu != null ? "dialog" : undefined}
                onClick={() => onSelect(id)}
              >
                {buttonInner}
              </button>
              {showEnhanceMenu && enhanceToolMenu ? (
                <div
                  role="dialog"
                  aria-label="Image enhancement"
                  className={addToolPopoverClass}
                >
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Brightness
                  </div>
                  <input
                    type="range"
                    min={ENHANCE_BRIGHTNESS_MIN}
                    max={ENHANCE_BRIGHTNESS_MAX}
                    step={1}
                    value={enhanceToolMenu.brightness}
                    onChange={(e) =>
                      enhanceToolMenu.onBrightnessChange(
                        Number(e.target.value),
                      )
                    }
                    className={enhanceRangeClass}
                    aria-valuemin={ENHANCE_BRIGHTNESS_MIN}
                    aria-valuemax={ENHANCE_BRIGHTNESS_MAX}
                    aria-valuenow={enhanceToolMenu.brightness}
                    aria-label="Brightness"
                  />
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Saturation
                  </div>
                  <input
                    type="range"
                    min={ENHANCE_SATURATION_MIN}
                    max={ENHANCE_SATURATION_MAX}
                    step={1}
                    value={enhanceToolMenu.saturation}
                    onChange={(e) =>
                      enhanceToolMenu.onSaturationChange(
                        Number(e.target.value),
                      )
                    }
                    className={enhanceRangeClass}
                    aria-valuemin={ENHANCE_SATURATION_MIN}
                    aria-valuemax={ENHANCE_SATURATION_MAX}
                    aria-valuenow={enhanceToolMenu.saturation}
                    aria-label="Saturation"
                  />
                  <div className="mt-2 flex items-center justify-end border-t border-white/10 pt-2">
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Undo brightness and saturation"
                      disabled={!enhanceToolMenu.canUndoEnhance}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        enhanceToolMenu.onUndoEnhance();
                      }}
                    >
                      <UndoIcon />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        if (id === "draw") {
          return (
            <div
              key={id}
              ref={drawToolShellRef}
              className="relative"
              onMouseEnter={() => setHoveredToolId(id)}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
              }}
            >
              <button
                type="button"
                className={toolBtnLayout}
                data-active-visual={activeVisual ? "true" : undefined}
                aria-pressed={isSelected}
                aria-expanded={showDrawMenu}
                aria-haspopup={drawToolMenu != null ? "dialog" : undefined}
                onClick={() => onSelect(id)}
              >
                {buttonInner}
              </button>
              {showDrawMenu && drawToolMenu ? (
                <div
                  role="dialog"
                  aria-label="Draw tool settings"
                  className={addToolPopoverClass}
                >
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Brush size
                  </div>
                  <input
                    type="range"
                    min={BRUSH_SLIDER_MIN}
                    max={BRUSH_SLIDER_MAX}
                    step={1}
                    value={drawToolMenu.brushSize}
                    onChange={(e) =>
                      drawToolMenu.onBrushSizeChange(Number(e.target.value))
                    }
                    className={cn(
                      "mb-2.5 box-border h-2 w-full cursor-pointer appearance-none bg-transparent p-0 leading-none outline-none",
                      "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                      "accent-primary",
                      "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#FFFFFF]",
                      "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-thumb]:mt-[calc((0.5rem-0.875rem)/2)]",
                      "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                      "[&::-moz-range-thumb]:bg-[#FFFFFF]",
                      "[&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15",
                      "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15",
                    )}
                    aria-valuemin={BRUSH_SLIDER_MIN}
                    aria-valuemax={BRUSH_SLIDER_MAX}
                    aria-valuenow={drawToolMenu.brushSize}
                    aria-label="Brush size"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      <span
                        className="rounded-full bg-[#FFFFFF] transition-[width,height] duration-75 ease-out"
                        style={{
                          width: brushPreviewDiameterPx(drawToolMenu.brushSize),
                          height: brushPreviewDiameterPx(drawToolMenu.brushSize),
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Undo draw stroke"
                      disabled={!drawToolMenu.canUndo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        drawToolMenu.onUndo();
                      }}
                    >
                      <UndoIcon />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Redo draw stroke"
                      disabled={!drawToolMenu.canRedo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        drawToolMenu.onRedo();
                      }}
                    >
                      <RedoIcon />
                    </button>
                  </div>
                  <div className="mb-2 mt-3 text-[11px] font-medium text-tx-secondary">
                    Color
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {IMAGE_EDITOR_DRAW_COLORS.map((hex) => {
                      const selected =
                        drawToolMenu.selectedDrawColor.toLowerCase() ===
                        hex.toLowerCase();
                      return (
                        <button
                          key={hex}
                          type="button"
                          className={cn(
                            "flex h-9 w-full items-center justify-center rounded-lg border-2 transition-colors",
                            selected
                              ? "border-white"
                              : "border-transparent hover:border-white/40",
                          )}
                          aria-label={`Draw color ${hex}`}
                          aria-pressed={selected}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            drawToolMenu.onDrawColorSelect(hex);
                          }}
                        >
                          <span
                            className="h-7 w-7 rounded-full border border-white/20 shadow-inner"
                            style={{ backgroundColor: hex }}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        if (id === "add") {
          return (
            <div
              key={id}
              ref={addToolShellRef}
              className="relative"
              onMouseEnter={() => setHoveredToolId(id)}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
              }}
            >
              <button
                type="button"
                className={toolBtnLayout}
                data-active-visual={activeVisual ? "true" : undefined}
                aria-pressed={isSelected}
                aria-expanded={showAddMenu}
                aria-haspopup={addToolMenu != null ? "dialog" : undefined}
                onClick={() => onSelect(id)}
              >
                {buttonInner}
              </button>
              {showAddMenu && addToolMenu ? (
                <div
                  role="dialog"
                  aria-label="Add brush settings"
                  className={addToolPopoverClass}
                >
                  <div className="mb-2 text-[11px] font-medium text-tx-secondary">
                    Brush size
                  </div>
                  <input
                    type="range"
                    min={BRUSH_SLIDER_MIN}
                    max={BRUSH_SLIDER_MAX}
                    step={1}
                    value={addToolMenu.brushSize}
                    onChange={(e) =>
                      addToolMenu.onBrushSizeChange(Number(e.target.value))
                    }
                    className={cn(
                      "mb-2.5 box-border h-2 w-full cursor-pointer appearance-none bg-transparent p-0 leading-none outline-none",
                      "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                      "accent-primary",
                      "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-[#FFFFFF]",
                      "[&::-webkit-slider-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-thumb]:mt-[calc((0.5rem-0.875rem)/2)]",
                      "[&::-moz-range-thumb]:box-border [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                      "[&::-moz-range-thumb]:bg-[#FFFFFF]",
                      "[&::-moz-range-thumb]:shadow-[0_0_0_1px_rgba(0,0,0,0.1)]",
                      "[&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-white/15",
                      "[&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-white/15",
                    )}
                    aria-valuemin={BRUSH_SLIDER_MIN}
                    aria-valuemax={BRUSH_SLIDER_MAX}
                    aria-valuenow={addToolMenu.brushSize}
                    aria-label="Brush size"
                  />
                  <div className="flex items-center justify-end gap-1">
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center"
                      aria-hidden
                    >
                      <span
                        className="rounded-full bg-[#FFFFFF] transition-[width,height] duration-75 ease-out"
                        style={{
                          width: brushPreviewDiameterPx(addToolMenu.brushSize),
                          height: brushPreviewDiameterPx(addToolMenu.brushSize),
                        }}
                      />
                    </div>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Undo brush stroke"
                      disabled={!addToolMenu.canUndo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToolMenu.onUndo();
                      }}
                    >
                      <UndoIcon />
                    </button>
                    <button
                      type="button"
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-tx-secondary transition-colors",
                        "hover:bg-[#0d1d45] hover:text-white",
                        "disabled:cursor-not-allowed disabled:opacity-40",
                      )}
                      aria-label="Redo brush stroke"
                      disabled={!addToolMenu.canRedo}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        addToolMenu.onRedo();
                      }}
                    >
                      <RedoIcon />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        }

        return (
          <button
            key={id}
            type="button"
            className={toolBtnLayout}
            data-active-visual={activeVisual ? "true" : undefined}
            aria-pressed={isSelected}
            onMouseEnter={() => setHoveredToolId(id)}
            onClick={() => onSelect(id)}
          >
            {buttonInner}
          </button>
        );
      })}
    </div>
  );
}
