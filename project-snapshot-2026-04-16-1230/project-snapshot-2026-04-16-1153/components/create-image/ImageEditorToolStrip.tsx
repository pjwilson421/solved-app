"use client";

import { useState, type MouseEvent } from "react";
import { ICONS, type IconPath } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";

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
);

type ImageEditorToolStripProps = {
  activeId: ImageEditorToolId | null;
  onSelect: (id: ImageEditorToolId) => void;
  className?: string;
};

export function ImageEditorToolStrip({
  activeId,
  onSelect,
  className,
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
            {id === "text" ? (
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
            )}
          </button>
        );
      })}
    </div>
  );
}
