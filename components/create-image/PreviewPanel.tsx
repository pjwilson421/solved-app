"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS, type IconPath } from "@/components/icons/icon-paths";
import type { AspectRatio, TemplateDef } from "./types";
import { formatCreatedAt } from "./types";
import { PreviewActionsMenu } from "./PreviewActionsMenu";

type PreviewPanelProps = {
  aspectRatio: AspectRatio;
  template: TemplateDef | null;
  /** Slot-ordered URLs; index 0 = Image 1 */
  slotImages: string[];
  promptText: string;
  createdAt: Date | null;
  isLoading: boolean;
  previewLabel?: string;
  /** When false, mobile does not show the preview title row. */
  showPreviewLabel?: boolean;
  /** Hide date + prompt snippet below the frame (e.g. mobile uses helper copy in parent). */
  hideMeta?: boolean;
  /** Mobile: tighter preview frame from MOBILE-image SVG */
  mobileFrame?: boolean;
  /** Explicit size from column + viewport (short-height screens); preserves aspect ratio */
  layoutFrame?: { width: number; height: number } | null;
  /** Override empty-state line under the date (e.g. Create Video). */
  previewPromptPlaceholder?: string;
  /** Icon in empty preview / empty template slots (default: image placeholder). */
  emptyStatePlaceholderIcon?: IconPath;
  className?: string;
  onPreviewClick?: () => void;
  onMenuAction?: (action: string) => void;
};

/** Desktop meta: copy when no prompt yet (replaces the old "—" empty state). */
const PREVIEW_PROMPT_PLACEHOLDER =
  "After you generate, the prompt you enter in the bar below will appear here.";

function ChevronExpandIcon({
  expanded,
  className,
}: {
  expanded: boolean;
  className?: string;
}) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0 transition-transform duration-200",
        className,
        expanded && "rotate-180",
      )}
      aria-hidden
    >
      <path
        d="M6 9l6 6 6-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PreviewDescriptionText({
  text,
  placeholder,
}: {
  text: string;
  placeholder: string;
}) {
  const display = text.trim() ? text : placeholder;
  const isPlaceholder = !text.trim();

  const pRef = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [display]);

  useLayoutEffect(() => {
    const el = pRef.current;
    if (!el) return;

    const measure = () => {
      if (expanded) return;
      setCanExpand(el.scrollHeight > el.clientHeight + 1);
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [display, expanded]);

  return (
    <div className="flex min-w-0 gap-1.5">
      <p
        ref={pRef}
        className={cn(
          "min-w-0 flex-1 break-words",
          !expanded && "line-clamp-1",
          "text-[10px] leading-4 xl:text-[13px] xl:leading-[18px]",
          isPlaceholder ? "text-[#71717A]" : "text-[#E4E4E7]",
        )}
      >
        {display}
      </p>
      {canExpand ? (
        <button
          type="button"
          className={cn(
            "mt-0.5 shrink-0 self-start rounded p-0.5 outline-none",
            "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-[#3ABEFF]",
          )}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse description" : "Expand description"}
          onClick={() => setExpanded((e) => !e)}
        >
          <ChevronExpandIcon
            expanded={expanded}
            className={
              isPlaceholder ? "text-[#71717A]" : "text-[#E4E4E7]"
            }
          />
        </button>
      ) : null}
    </div>
  );
}

/** Full-width 16:9 frame before layout measure — tablet unchanged; xl+ larger artboard. */
const desktop169Frame =
  "w-full aspect-video max-h-[min(496.16px,56vh)] max-w-[882.06px] xl:max-h-[min(562.5px,56vh)] xl:max-w-[1000px]";

/** Centered inner frame; outer column stays full width (matches 16:9 layout width). */
function desktopOtherAspectInnerClass(aspect: AspectRatio): string {
  switch (aspect) {
    case "1:1":
      return "w-full max-w-[563.97px] aspect-square max-h-[min(563.97px,56vh)]";
    case "4:5":
      return "w-full max-w-[451.18px] aspect-[451.18/563.97] max-h-[min(563.97px,56vh)]";
    case "9:16":
      return "w-full max-w-[317.23px] aspect-[317.23/563.97] max-h-[min(563.97px,56vh)]";
    default:
      return desktop169Frame;
  }
}

function mobileFrameClass(aspect: AspectRatio): string {
  switch (aspect) {
    case "16:9":
      return "w-full max-w-[311px] aspect-[311/175]";
    case "1:1":
      return "w-full max-w-[241px] aspect-square";
    case "4:5":
      return "w-full max-w-[215px] aspect-[215/269]";
    case "9:16":
      return "w-full max-w-[165px] aspect-[165/293]";
    default:
      return "w-full max-w-[311px] aspect-[311/175]";
  }
}

/** Matches preview frame max-width so meta never extends past the preview edges (unmeasured layouts). */
function metaWidthClassDesktop(aspect: AspectRatio): string {
  switch (aspect) {
    case "16:9":
      return "w-full max-w-[882.06px] xl:max-w-[1000px]";
    case "1:1":
      return "w-full max-w-[563.97px]";
    case "4:5":
      return "w-full max-w-[451.18px]";
    case "9:16":
      return "w-full max-w-[317.23px]";
    default:
      return "w-full max-w-[882.06px] xl:max-w-[1000px]";
  }
}

function metaWidthClassMobile(aspect: AspectRatio): string {
  switch (aspect) {
    case "16:9":
      return "w-full max-w-[311px]";
    case "1:1":
      return "w-full max-w-[241px]";
    case "4:5":
      return "w-full max-w-[215px]";
    case "9:16":
      return "w-full max-w-[165px]";
    default:
      return "w-full max-w-[311px]";
  }
}

function SlotBox({
  label,
  src,
  index,
  placeholderIcon,
}: {
  label: string;
  src?: string;
  index: number;
  placeholderIcon: IconPath;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#15151A]">
      <span className="absolute left-2 top-2 z-10 text-[9px] font-semibold uppercase tracking-wider text-[#8A8A93]">
        {label}
      </span>

      {src ? (
        <Image
          src={src}
          alt={`Generated ${index + 1}`}
          fill
          className="pointer-events-none object-contain"
          sizes="(min-width: 1280px) 1000px, 900px"
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <IconAsset
            src={placeholderIcon}
            size={32}
            className="opacity-90"
          />
        </div>
      )}
    </div>
  );
}

function NormalLayout({
  urls,
  placeholderIcon,
}: {
  urls: string[];
  placeholderIcon: IconPath;
}) {
  const n = urls.length;

  if (n === 0) {
    return (
      <div className="flex h-full min-h-[120px] w-full items-center justify-center p-6">
        <IconAsset
          src={placeholderIcon}
          size={76}
          className="shrink-0 opacity-100"
        />
      </div>
    );
  }

  if (n === 1) {
    return (
      <div className="relative h-full w-full">
        <Image
          src={urls[0]}
          alt="Preview"
          fill
          className="pointer-events-none object-contain"
          sizes="(min-width: 1280px) 1000px, 900px"
        />
      </div>
    );
  }

  if (n === 2) {
    return (
      <div className="grid h-full grid-cols-2 gap-2 p-2">
        <SlotBox
          label="Image 1"
          src={urls[0]}
          index={0}
          placeholderIcon={placeholderIcon}
        />
        <SlotBox
          label="Image 2"
          src={urls[1]}
          index={1}
          placeholderIcon={placeholderIcon}
        />
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2">
      {urls.slice(0, 4).map((u, i) => (
        <SlotBox
          key={i}
          label={`Image ${i + 1}`}
          src={u}
          index={i}
          placeholderIcon={placeholderIcon}
        />
      ))}
    </div>
  );
}

function TemplateLayout({
  template,
  urls,
  placeholderIcon,
}: {
  template: TemplateDef;
  urls: string[];
  placeholderIcon: IconPath;
}) {
  const slots = template.slots;
  const padded = Array.from({ length: slots }, (_, i) => urls[i]);

  if (template.layout === "single") {
    return (
      <div className="relative h-full w-full">
        {padded[0] ? (
          <Image
            src={padded[0]}
            alt="Preview"
            fill
            className="pointer-events-none object-contain"
            sizes="1000px"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <IconAsset src={placeholderIcon} size={76} />
          </div>
        )}
      </div>
    );
  }

  if (template.layout === "two-col") {
    return (
      <div className="grid h-full grid-cols-2 gap-2 p-2">
        {[0, 1].map((i) => (
          <SlotBox
            key={i}
            label={`Image ${i + 1}`}
            src={padded[i]}
            index={i}
            placeholderIcon={placeholderIcon}
          />
        ))}
      </div>
    );
  }

  if (template.layout === "two-row") {
    return (
      <div className="grid h-full grid-rows-2 gap-2 p-2">
        {[0, 1].map((i) => (
          <SlotBox
            key={i}
            label={`Image ${i + 1}`}
            src={padded[i]}
            index={i}
            placeholderIcon={placeholderIcon}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid h-full grid-cols-2 grid-rows-2 gap-2 p-2">
      <SlotBox
        label="Image 1"
        src={padded[0]}
        index={0}
        placeholderIcon={placeholderIcon}
      />
      <SlotBox
        label="Image 2"
        src={padded[1]}
        index={1}
        placeholderIcon={placeholderIcon}
      />

      <div className="relative col-span-2 flex min-h-0 overflow-hidden bg-[#15151A]">
        <span className="absolute left-2 top-2 z-10 text-[9px] font-semibold uppercase tracking-wider text-[#8A8A93]">
          Image 3
        </span>

        {padded[2] ? (
          <Image
            src={padded[2]}
            alt="Generated 3"
            fill
            className="pointer-events-none object-contain"
            sizes="1000px"
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <IconAsset src={placeholderIcon} size={32} />
          </div>
        )}
      </div>
    </div>
  );
}

const frameShell =
  "relative overflow-hidden border border-[#2A2A2E] bg-[#18181B]";

export function PreviewPanel({
  aspectRatio,
  template,
  slotImages,
  promptText,
  createdAt,
  isLoading,
  previewLabel,
  showPreviewLabel = true,
  hideMeta = false,
  mobileFrame = false,
  layoutFrame = null,
  previewPromptPlaceholder = PREVIEW_PROMPT_PLACEHOLDER,
  emptyStatePlaceholderIcon = ICONS.imagePlaceholder,
  className,
  onPreviewClick,
  onMenuAction,
}: PreviewPanelProps) {
  const validImages = slotImages.filter(Boolean);
  const hasImage = validImages.length > 0;
  const dateLine = createdAt ? formatCreatedAt(createdAt) : "";

  const measured =
    layoutFrame != null && layoutFrame.width > 0 && layoutFrame.height > 0;

  const previewBody = (
    <>
      <div
        role={hasImage ? "button" : undefined}
        tabIndex={hasImage ? 0 : undefined}
        className={cn("relative h-full w-full", hasImage && "cursor-pointer")}
        onClick={() => {
          if (hasImage) onPreviewClick?.();
        }}
        onKeyDown={(e) => {
          if (hasImage && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            onPreviewClick?.();
          }
        }}
      >
        {template ? (
          <TemplateLayout
            template={template}
            urls={slotImages}
            placeholderIcon={emptyStatePlaceholderIcon}
          />
        ) : (
          <NormalLayout
            urls={validImages}
            placeholderIcon={emptyStatePlaceholderIcon}
          />
        )}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0F0F10]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#3ABEFF] border-t-transparent" />
              <span className="text-[11px] font-medium tracking-wide text-[#A1A1AA]">
                Generating…
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="absolute right-3 top-3 z-20 xl:right-9 xl:top-6">
        <PreviewActionsMenu
          align="right"
          onSelect={(action) => onMenuAction?.(action)}
        />
      </div>
    </>
  );

  return (
    <div className={cn("flex min-w-0 flex-col items-stretch", className)}>
      {previewLabel && showPreviewLabel ? (
        <p
          className="mb-[14px] text-[11px] font-bold tracking-[0.09em] text-white xl:hidden"
          style={{ letterSpacing: "0.11em" }}
        >
          {previewLabel}
        </p>
      ) : null}

      {measured && layoutFrame ? (
        mobileFrame ? (
          <div
            className={cn("self-start", frameShell)}
            style={{
              width: layoutFrame.width,
              height: layoutFrame.height,
            }}
          >
            {previewBody}
          </div>
        ) : (
          <div className="flex w-full min-w-0 justify-center">
            <div
              className={frameShell}
              style={{
                width: layoutFrame.width,
                height: layoutFrame.height,
              }}
            >
              {previewBody}
            </div>
          </div>
        )
      ) : mobileFrame ? (
        <div
          className={cn(
            "relative mx-auto overflow-hidden border border-[#2A2A2E] bg-[#18181B]",
            mobileFrameClass(aspectRatio),
          )}
        >
          {previewBody}
        </div>
      ) : aspectRatio === "16:9" ? (
        <div className={cn(frameShell, desktop169Frame)}>
          {previewBody}
        </div>
      ) : (
        <div className="flex w-full min-w-0 justify-center">
          <div
            className={cn(
              frameShell,
              desktopOtherAspectInnerClass(aspectRatio),
            )}
          >
            {previewBody}
          </div>
        </div>
      )}

      {!hideMeta ? (
        <div
          className={cn(
            "mt-3 min-w-0 shrink-0 xl:mt-3",
            measured && layoutFrame
              ? mobileFrame
                ? "self-start"
                : "mx-auto"
              : cn(
                  "mx-auto",
                  mobileFrame
                    ? metaWidthClassMobile(aspectRatio)
                    : metaWidthClassDesktop(aspectRatio),
                ),
          )}
          style={
            measured && layoutFrame
              ? {
                  width: layoutFrame.width,
                  maxWidth: "100%",
                }
              : undefined
          }
        >
          <p className="w-full min-w-0 max-w-none text-[10px] leading-none text-[#A1A1AA]">
            {dateLine}
          </p>

          <div className="mt-1 w-full min-w-0 max-w-none xl:mt-0">
            <PreviewDescriptionText
              text={promptText}
              placeholder={previewPromptPlaceholder}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}