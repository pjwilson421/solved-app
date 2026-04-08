"use client";

import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS, type IconPath } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";

const TOOL_IDS = [
  "templates",
  "add",
  "remove",
  "enhance",
  "regenerate",
  "text",
  "draw",
] as const;

export type ImageEditorToolId = (typeof TOOL_IDS)[number];

const LABELS: Record<ImageEditorToolId, string> = {
  templates: "Templates",
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
  templates: [ICONS.templates],
  add: [ICONS.editorAdd],
  remove: [ICONS.editorRemove],
  enhance: [ICONS.editorEnhance],
  regenerate: [ICONS.editorRegenerate],
  text: [ICONS.editorTextTool, ICONS.editorColorSwatch],
  draw: [ICONS.editorDraw],
};

const ICON_PX = 16;

const chip = cn(
  "flex min-h-[38px] min-w-0 shrink-0 items-center justify-center gap-2 rounded-lg border border-app-border/90",
  "bg-app-inset pl-2.5 pr-3 text-[11px] font-medium leading-none text-white transition-colors",
  "hover:bg-app-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3ABEFF]/60",
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
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:gap-2.5",
        className,
      )}
      role="toolbar"
      aria-label="Edit tools"
    >
      {TOOL_IDS.map((id) => {
        const active = activeId === id;
        const iconList = ICONS_BY_TOOL[id];
        return (
          <button
            key={id}
            type="button"
            className={cn(
              chip,
              active &&
                "border-[#1EA7E1] bg-[#3ABEFF] text-white shadow-[0_0_0_1px_rgba(108,212,255,0.25)]",
            )}
            onClick={() => onSelect(id)}
          >
            <span
              className={cn(
                "flex shrink-0 items-center",
                id === "text" && "gap-0.5",
              )}
              aria-hidden
            >
              {iconList.map((src) => (
                <IconAsset
                  key={src}
                  src={src}
                  size={ICON_PX}
                  className={cn(
                    "[&_img]:block",
                    active ? "[&_img]:opacity-100" : "[&_img]:opacity-90",
                  )}
                />
              ))}
            </span>
            <span className="min-w-0">{LABELS[id]}</span>
          </button>
        );
      })}
    </div>
  );
}
