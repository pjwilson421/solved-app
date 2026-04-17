"use client";

import { useState, type MouseEvent } from "react";
import { ICONS, type IconPath } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";

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

type ImageEditorToolStripProps = {
  activeId: ImageEditorToolId | null;
  onSelect: (id: ImageEditorToolId) => void;
  className?: string;
  /** Add-tool brush / history popover under the Add button (Image Editor). */
  addToolMenu?: ImageEditorAddToolMenuProps | null;
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
}: ImageEditorToolStripProps) {
  const [hoveredToolId, setHoveredToolId] = useState<ImageEditorToolId | null>(
    null,
  );

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
          id === "add" &&
          addToolMenu != null &&
          isSelected &&
          addToolMenu.open;

        const buttonInner =
          id === "text" ? (
            <>
              <span
                className="inline-flex shrink-0 fill-current text-inherit"
                aria-hidden
              >
                <ImageEditorToolIcon src={ICONS.editorTextTool} />
              </span>
              <span className="min-w-0 shrink-0 text-inherit">
                {LABELS.text}
              </span>
              <span
                className="inline-flex shrink-0 fill-current text-inherit"
                aria-hidden
              >
                <ImageEditorToolIcon src={ICONS.editorColorSwatch} />
              </span>
            </>
          ) : (
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

        if (id === "add") {
          return (
            <div key={id} className="relative">
              <button
                type="button"
                className={toolBtnLayout}
                data-active-visual={activeVisual ? "true" : undefined}
                aria-pressed={isSelected}
                aria-expanded={showAddMenu}
                aria-haspopup={addToolMenu != null ? "dialog" : undefined}
                onMouseEnter={() => setHoveredToolId(id)}
                onClick={() => onSelect(id)}
              >
                {buttonInner}
              </button>
              {showAddMenu ? (
                <div
                  role="dialog"
                  aria-label="Add brush settings"
                  className={addToolPopoverClass}
                  onMouseDown={(e) => e.stopPropagation()}
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
                      "mb-2.5 h-2 w-full cursor-pointer appearance-none outline-none",
                      "focus:outline-none focus-visible:outline-none focus-visible:ring-0",
                      "accent-primary",
                      "[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5",
                      "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full",
                      "[&::-webkit-slider-thumb]:border-0 [&::-webkit-slider-thumb]:bg-primary",
                      "[&::-webkit-slider-thumb]:shadow-none",
                      "[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5",
                      "[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0",
                      "[&::-moz-range-thumb]:bg-primary",
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
                        className="rounded-full bg-[rgba(96,165,250,0.55)] transition-[width,height] duration-75 ease-out"
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
                      onClick={() => addToolMenu.onUndo()}
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
                      onClick={() => addToolMenu.onRedo()}
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
