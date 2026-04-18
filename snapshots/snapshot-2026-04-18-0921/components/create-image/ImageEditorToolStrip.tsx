"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
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
  "regenerate",
  "text",
  "draw",
] as const;

export type ImageEditorToolId = (typeof TOOL_IDS)[number];

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
  onSelectColor: (hex: string) => void;
  onSwatchClick: (e: ReactMouseEvent) => void;
  /** Desktop: open color menu while pointer is over the Text control (incl. popover bridge). */
  onHoverOpen?: () => void;
  /** Desktop: close after short delay so the pointer can cross the gap to the popover. */
  onHoverClose?: () => void;
};

type ImageEditorToolStripProps = {
  activeId: ImageEditorToolId | null;
  onSelect: (id: ImageEditorToolId) => void;
  className?: string;
  /** Add-tool brush / history popover under the Add button (Image Editor). */
  addToolMenu?: ImageEditorAddToolMenuProps | null;
  /** Text-tool color popover (circle swatch). */
  textToolMenu?: ImageEditorTextToolMenuProps | null;
};

const addToolPopoverClass =
  "absolute left-0 top-[calc(100%+10px)] z-50 min-w-[220px] max-w-[min(280px,calc(100vw-40px))] rounded-xl border border-edge-subtle bg-surface-card p-3 shadow-xl";

const BRUSH_SLIDER_MIN = 6;
const BRUSH_SLIDER_MAX = 72;

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
  addToolMenu = null,
  textToolMenu = null,
}: ImageEditorToolStripProps) {
  const [hoveredToolId, setHoveredToolId] = useState<ImageEditorToolId | null>(
    null,
  );

  const textMenuLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const textToolMenuRef = useRef(textToolMenu);
  textToolMenuRef.current = textToolMenu;

  const clearTextMenuLeaveTimer = useCallback(() => {
    if (textMenuLeaveTimerRef.current != null) {
      clearTimeout(textMenuLeaveTimerRef.current);
      textMenuLeaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearTextMenuLeaveTimer(), [clearTextMenuLeaveTimer]);

  const onTextToolWrapMouseEnter = useCallback(() => {
    clearTextMenuLeaveTimer();
    textToolMenuRef.current?.onHoverOpen?.();
  }, [clearTextMenuLeaveTimer]);

  const onTextToolWrapMouseLeave = useCallback(() => {
    if (!textToolMenuRef.current?.onHoverClose) return;
    clearTextMenuLeaveTimer();
    textMenuLeaveTimerRef.current = setTimeout(() => {
      textMenuLeaveTimerRef.current = null;
      textToolMenuRef.current?.onHoverClose?.();
    }, 180);
  }, [clearTextMenuLeaveTimer]);

  const addMenuLeaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const addToolMenuRef = useRef(addToolMenu);
  addToolMenuRef.current = addToolMenu;

  const clearAddMenuLeaveTimer = useCallback(() => {
    if (addMenuLeaveTimerRef.current != null) {
      clearTimeout(addMenuLeaveTimerRef.current);
      addMenuLeaveTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearAddMenuLeaveTimer(), [clearAddMenuLeaveTimer]);

  const onAddToolWrapMouseEnter = useCallback(() => {
    clearAddMenuLeaveTimer();
    addToolMenuRef.current?.onHoverOpen?.();
  }, [clearAddMenuLeaveTimer]);

  const onAddToolWrapMouseLeave = useCallback(() => {
    if (!addToolMenuRef.current?.onHoverClose) return;
    clearAddMenuLeaveTimer();
    addMenuLeaveTimerRef.current = setTimeout(() => {
      addMenuLeaveTimerRef.current = null;
      addToolMenuRef.current?.onHoverClose?.();
    }, 180);
  }, [clearAddMenuLeaveTimer]);

  const clearHoverIfLeavingToolbar = (e: MouseEvent<HTMLDivElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setHoveredToolId(null);
  };

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
        const activeVisual =
          hoveredToolId !== null ? isHovered : isSelected;
        const iconList = ICONS_BY_TOOL[id];
        const showAddMenu =
          id === "add" && addToolMenu != null && addToolMenu.open;

        const showTextColorMenu =
          id === "text" && textToolMenu != null && textToolMenu.open;

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
              className="relative"
              onMouseEnter={() => {
                setHoveredToolId(id);
                if (textToolMenu != null) onTextToolWrapMouseEnter();
              }}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
                if (textToolMenu != null) onTextToolWrapMouseLeave();
              }}
            >
              <div
                className={cn(
                  toolBtnLayout,
                  "min-w-0 gap-0 p-0",
                )}
                data-active-visual={activeVisual ? "true" : undefined}
                onMouseEnter={() => {
                  if (textToolMenu != null) onTextToolWrapMouseEnter();
                }}
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
                  aria-label="Text color"
                  className={addToolPopoverClass}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => {
                    if (textToolMenu != null) onTextToolWrapMouseEnter();
                  }}
                  onMouseLeave={(e) => {
                    if (textToolMenu == null) return;
                    const next = e.relatedTarget;
                    const shell = e.currentTarget.parentElement;
                    if (next instanceof Node && shell?.contains(next)) return;
                    onTextToolWrapMouseLeave();
                  }}
                >
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
                </div>
              ) : null}
            </div>
          );
        }

        if (id === "add") {
          return (
            <div
              key={id}
              className="relative"
              onMouseEnter={() => {
                setHoveredToolId(id);
                if (addToolMenu != null) onAddToolWrapMouseEnter();
              }}
              onMouseLeave={(e) => {
                const next = e.relatedTarget;
                if (next instanceof Node && e.currentTarget.contains(next)) {
                  return;
                }
                setHoveredToolId(null);
                if (addToolMenu != null) onAddToolWrapMouseLeave();
              }}
            >
              <button
                type="button"
                className={toolBtnLayout}
                data-active-visual={activeVisual ? "true" : undefined}
                aria-pressed={isSelected}
                aria-expanded={showAddMenu}
                aria-haspopup={addToolMenu != null ? "dialog" : undefined}
                onMouseEnter={() => {
                  if (addToolMenu != null) onAddToolWrapMouseEnter();
                }}
                onClick={() => onSelect(id)}
              >
                {buttonInner}
              </button>
              {showAddMenu && addToolMenu ? (
                <div
                  role="dialog"
                  aria-label="Add brush settings"
                  className={addToolPopoverClass}
                  onMouseDown={(e) => e.stopPropagation()}
                  onMouseEnter={() => {
                    if (addToolMenu != null) onAddToolWrapMouseEnter();
                  }}
                  onMouseLeave={(e) => {
                    if (addToolMenu == null) return;
                    const next = e.relatedTarget;
                    const shell = e.currentTarget.parentElement;
                    if (next instanceof Node && shell?.contains(next)) return;
                    onAddToolWrapMouseLeave();
                  }}
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
