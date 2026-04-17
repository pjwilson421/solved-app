"use client";

import Image from "next/image";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { isDataImageSrc } from "@/lib/is-data-image-src";
import { ICONS, type IconPath } from "@/components/icons/icon-paths";
import type { AspectRatio, TemplateDef } from "./types";
import { formatCreatedAt } from "./types";
import { threeDotsMainPreviewFrameAnchorClassName } from "@/components/ui/three-dots-menu-trigger";
import { PreviewActionsMenu } from "./PreviewActionsMenu";
import type { PreviewMenuEvent, PreviewMenuPreset } from "./preview-menu-config";

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
  /** Hide date + prompt snippet below the frame. */
  hideMeta?: boolean;
  /**
   * Create Image: anchor prompt description to the preview width — single truncated line by
   * default, expand chevron pinned right, no horizontal shift (desktop + mobile).
   */
  promptDescriptionAnchoredToPreview?: boolean;
  /** Mobile: tighter preview frame from MOBILE-image SVG */
  mobileFrame?: boolean;
  /** Explicit size from column + viewport (short-height screens); preserves aspect ratio */
  layoutFrame?: { width: number; height: number } | null;
  /** Override empty-state line under the date (e.g. Create Video). */
  previewPromptPlaceholder?: string;
  /** Icon in empty preview / empty template slots (default: image placeholder). */
  emptyStatePlaceholderIcon?: IconPath;
  /** Optional generated video source to display in the primary preview frame. */
  previewVideoUrl?: string | null;
  /** Image fit behavior for generated preview media. */
  imageObjectFit?: "contain" | "cover";
  /**
   * Composed template preview (SVG + editable layers). When set, replaces template slot layout
   * and normal image layout for the frame body.
   */
  composedPreview?: ReactNode;
  /**
   * Rendered inside the meta column directly under the prompt description (same width as the
   * description block). Create Image mobile uses this for the inline 4-column history grid.
   */
  inlineAfterDescription?: ReactNode;
  /**
   * Create Image: content directly under the preview meta (or under the frame when meta is
   * hidden), with the same horizontal alignment as the date/description block.
   */
  afterPreviewStack?: ReactNode;
  /**
   * Rendered inside the preview frame above the image (or template) and below the loading
   * overlay — e.g. Image Editor paint mask.
   */
  previewBodyOverlay?: ReactNode;
  /**
   * When false, the preview media area is not a keyboard/click target for `onPreviewClick`
   * (e.g. while an editor paint tool owns pointer interaction).
   */
  previewMediaClickable?: boolean;
  className?: string;
  /** Slot index aligns with `slotImages` / Create Image `displaySlots` (variation index). */
  onPreviewClick?: (detail?: { slotIndex: number }) => void;
  onMenuEvent?: (event: PreviewMenuEvent) => void;
  /** Preview ⋮ menu: Create Image / Video (default) vs Image Editor (includes Save). */
  previewMenuPreset?: PreviewMenuPreset;
  /** Whether the current item is liked (heart icon). */
  previewMenuLikeActive?: boolean;
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
  anchoredToPreview = false,
}: {
  text: string;
  placeholder: string;
  /**
   * Create Image: one-line horizontal truncation to preview width; chevron in reserved gutter;
   * expanded = full text, vertical growth only.
   */
  anchoredToPreview?: boolean;
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
      if (anchoredToPreview) {
        setCanExpand(el.scrollWidth > el.clientWidth + 1);
      } else {
        setCanExpand(el.scrollHeight > el.clientHeight + 1);
      }
    };

    measure();
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [display, expanded, anchoredToPreview]);

  const typeClass =
    "text-[10px] leading-4 text-[#315790] xl:text-[13px] xl:leading-[18px]";

  if (anchoredToPreview) {
    const reserveChevronGutter = canExpand || expanded;
    return (
      <div className="relative min-w-0 w-full text-left">
        <p
          ref={pRef}
          className={cn(
            "min-w-0 w-full text-left",
            reserveChevronGutter && "pr-7",
            typeClass,
            expanded
              ? "whitespace-pre-wrap break-words"
              : "truncate",
          )}
        >
          {display}
        </p>
        {canExpand ? (
          <button
            type="button"
            className={cn(
              "absolute right-0 top-0 z-[1] flex h-5 w-5 items-center justify-center rounded outline-none",
              "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary",
            )}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse description" : "Expand description"}
            onClick={() => setExpanded((e) => !e)}
          >
            <ChevronExpandIcon
              expanded={expanded}
              className={
                isPlaceholder ? "text-tx-muted" : "text-tx-secondary"
              }
            />
          </button>
        ) : null}
      </div>
    );
  }

  const legacyTextClass = cn(
    "min-w-0 break-words",
    typeClass,
    !expanded && "line-clamp-1",
  );

  return (
    <div className="flex min-w-0 gap-1.5">
      <p ref={pRef} className={cn("min-w-0 flex-1", legacyTextClass)}>
        {display}
      </p>
      {canExpand ? (
        <button
          type="button"
          className={cn(
            "mt-0.5 shrink-0 self-start rounded p-0.5 outline-none",
            "hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-primary",
          )}
          aria-expanded={expanded}
          aria-label={expanded ? "Collapse description" : "Expand description"}
          onClick={() => setExpanded((e) => !e)}
        >
          <ChevronExpandIcon
            expanded={expanded}
            className={
              isPlaceholder ? "text-tx-muted" : "text-tx-secondary"
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

/** Preview-frame placeholders only — tints raster SVG as #315790 without changing global asset files. */
function PreviewPlaceholderIcon({
  src,
  size,
  className,
}: {
  src: IconPath;
  size: number;
  className?: string;
}) {
  const mask = `url("${src}")`;
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        width: size,
        height: size,
        backgroundColor: "#315790",
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

function SlotBox({
  label,
  src,
  index,
  placeholderIcon,
  imageObjectFit = "contain",
  onSlotClick,
}: {
  label: string;
  src?: string;
  index: number;
  placeholderIcon: IconPath;
  imageObjectFit?: "contain" | "cover";
  onSlotClick?: () => void;
}) {
  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#081030]">
      <span className="absolute left-2 top-2 z-10 text-[9px] font-semibold uppercase tracking-wider text-tx-secondary">
        {label}
      </span>

      {src ? (
        <Image
          src={src}
          alt={`Generated ${index + 1}`}
          fill
          className={cn(
            "pointer-events-none",
            imageObjectFit === "cover" ? "object-cover" : "object-contain",
          )}
          sizes="(min-width: 1280px) 1000px, 900px"
          unoptimized={isDataImageSrc(src)}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center p-4">
          <PreviewPlaceholderIcon
            src={placeholderIcon}
            size={32}
            className="opacity-90"
          />
        </div>
      )}
      {src && onSlotClick ? (
        <button
          type="button"
          className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
          aria-label={`Open image ${index + 1} in image editor`}
          onClick={(e) => {
            e.stopPropagation();
            onSlotClick();
          }}
        />
      ) : null}
    </div>
  );
}

function NormalLayout({
  urls,
  placeholderIcon,
  imageObjectFit = "contain",
  onSlotClick,
}: {
  urls: string[];
  placeholderIcon: IconPath;
  imageObjectFit?: "contain" | "cover";
  onSlotClick?: (slotIndex: number) => void;
}) {
  const n = urls.length;
  const slotHandler = (i: number) =>
    onSlotClick && urls[i] ? () => onSlotClick(i) : undefined;

  if (n === 0 || !urls.some((u) => typeof u === "string" && u.trim().length > 0)) {
    return (
      <div className="flex h-full min-h-[120px] w-full items-center justify-center p-6">
        <PreviewPlaceholderIcon
          src={placeholderIcon}
          size={76}
          className="opacity-100"
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
          className={cn(
            "pointer-events-none",
            imageObjectFit === "cover" ? "object-cover" : "object-contain",
          )}
          sizes="(min-width: 1280px) 1000px, 900px"
          unoptimized={isDataImageSrc(urls[0])}
        />
        {urls[0] && onSlotClick ? (
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            aria-label="Open image in image editor"
            onClick={(e) => {
              e.stopPropagation();
              onSlotClick(0);
            }}
          />
        ) : null}
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
          imageObjectFit={imageObjectFit}
          onSlotClick={slotHandler(0)}
        />
        <SlotBox
          label="Image 2"
          src={urls[1]}
          index={1}
          placeholderIcon={placeholderIcon}
          imageObjectFit={imageObjectFit}
          onSlotClick={slotHandler(1)}
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
          imageObjectFit={imageObjectFit}
          onSlotClick={slotHandler(i)}
        />
      ))}
    </div>
  );
}

function TemplateLayout({
  template,
  urls,
  placeholderIcon,
  imageObjectFit = "contain",
  onSlotClick,
}: {
  template: TemplateDef;
  urls: string[];
  placeholderIcon: IconPath;
  imageObjectFit?: "contain" | "cover";
  onSlotClick?: (slotIndex: number) => void;
}) {
  const slots = template.slots;
  const padded = Array.from({ length: slots }, (_, i) => urls[i]);
  const slotHandler = (i: number) =>
    onSlotClick && padded[i] ? () => onSlotClick(i) : undefined;

  if (template.layout === "single") {
    return (
      <div className="relative h-full w-full">
        {padded[0] ? (
          <Image
            src={padded[0]}
            alt="Preview"
            fill
            className={cn(
              "pointer-events-none",
              imageObjectFit === "cover" ? "object-cover" : "object-contain",
            )}
            sizes="1000px"
            unoptimized={isDataImageSrc(padded[0])}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <PreviewPlaceholderIcon src={placeholderIcon} size={76} />
          </div>
        )}
        {padded[0] && onSlotClick ? (
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            aria-label="Open image in image editor"
            onClick={(e) => {
              e.stopPropagation();
              onSlotClick(0);
            }}
          />
        ) : null}
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
            imageObjectFit={imageObjectFit}
            onSlotClick={slotHandler(i)}
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
            imageObjectFit={imageObjectFit}
            onSlotClick={slotHandler(i)}
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
        imageObjectFit={imageObjectFit}
        onSlotClick={slotHandler(0)}
      />
      <SlotBox
        label="Image 2"
        src={padded[1]}
        index={1}
        placeholderIcon={placeholderIcon}
        imageObjectFit={imageObjectFit}
        onSlotClick={slotHandler(1)}
      />

      <div className="relative col-span-2 flex min-h-0 overflow-hidden bg-[#081030]">
        <span className="absolute left-2 top-2 z-10 text-[9px] font-semibold uppercase tracking-wider text-tx-secondary">
          Image 3
        </span>

        {padded[2] ? (
          <Image
            src={padded[2]}
            alt="Generated 3"
            fill
            className={cn(
              "pointer-events-none",
              imageObjectFit === "cover" ? "object-cover" : "object-contain",
            )}
            sizes="1000px"
            unoptimized={isDataImageSrc(padded[2])}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <PreviewPlaceholderIcon src={placeholderIcon} size={32} />
          </div>
        )}
        {padded[2] && onSlotClick ? (
          <button
            type="button"
            className="absolute inset-0 z-[5] cursor-pointer border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
            aria-label="Open image 3 in image editor"
            onClick={(e) => {
              e.stopPropagation();
              onSlotClick(2);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Main preview window fill — shared Create Image / Video / Editor (not global `--panel-bg`). */
const frameShell =
  "relative overflow-hidden border border-edge-subtle bg-[#081030]";

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
  promptDescriptionAnchoredToPreview = false,
  mobileFrame = false,
  layoutFrame = null,
  previewPromptPlaceholder = PREVIEW_PROMPT_PLACEHOLDER,
  emptyStatePlaceholderIcon = ICONS.imagePlaceholder,
  previewVideoUrl = null,
  imageObjectFit = "contain",
  inlineAfterDescription,
  afterPreviewStack,
  previewBodyOverlay,
  previewMediaClickable = true,
  className,
  onPreviewClick,
  onMenuEvent,
  previewMenuPreset = "create-image",
  previewMenuLikeActive = false,
  composedPreview,
}: PreviewPanelProps) {
  const validImages = slotImages.filter(Boolean);
  const hasImage = validImages.length > 0;
  const hasVideo = typeof previewVideoUrl === "string" && previewVideoUrl.length > 0;
  const hasPreviewMedia = hasVideo || hasImage;
  const dateLine = createdAt ? formatCreatedAt(createdAt) : "";

  /**
   * Mobile card (`mobileFrame`) uses fixed CSS aspect/max-width tokens only.
   * Inline `layoutFrame` from the desktop scroll column can be wrong (e.g. zero-size or
   * oversized) when desktop refs are `display:none` — never apply it to the mobile preview shell.
   */
  const useMeasuredInlineFrame =
    !mobileFrame &&
    layoutFrame != null &&
    layoutFrame.width > 0 &&
    layoutFrame.height > 0;

  const afterStackOuterClassName = cn(
    "mt-3 min-w-0 shrink-0 xl:mt-3",
    useMeasuredInlineFrame && layoutFrame
      ? "mx-auto"
      : cn(
          "mx-auto",
          mobileFrame
            ? metaWidthClassMobile(aspectRatio)
            : metaWidthClassDesktop(aspectRatio),
        ),
  );
  const afterStackOuterStyle =
    useMeasuredInlineFrame && layoutFrame
      ? {
          width: layoutFrame.width,
          maxWidth: "100%",
        }
      : undefined;

  const mediaClickable = previewMediaClickable && hasPreviewMedia;

  const useInnerSlotClicks =
    !hasVideo && hasImage && composedPreview == null;

  const slotClickHandler =
    mediaClickable && onPreviewClick && useInnerSlotClicks
      ? (slotIndex: number) => onPreviewClick({ slotIndex })
      : undefined;

  const useOuterPreviewClick =
    mediaClickable && onPreviewClick && (hasVideo || composedPreview != null);

  const previewBody = (
    <>
      <div
        role={useOuterPreviewClick ? "button" : undefined}
        tabIndex={useOuterPreviewClick ? 0 : undefined}
        className={cn(
          "relative h-full w-full",
          useOuterPreviewClick && "cursor-pointer",
        )}
        onClick={
          useOuterPreviewClick
            ? () => onPreviewClick?.({ slotIndex: 0 })
            : undefined
        }
        onKeyDown={
          useOuterPreviewClick
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onPreviewClick?.({ slotIndex: 0 });
                }
              }
            : undefined
        }
      >
        {hasVideo ? (
          <video
            className="h-full w-full object-contain"
            controls
            playsInline
          >
            <source src={previewVideoUrl} type="video/mp4" />
          </video>
        ) : composedPreview != null ? (
          <div className="relative h-full w-full">{composedPreview}</div>
        ) : template ? (
          <TemplateLayout
            template={template}
            urls={slotImages}
            placeholderIcon={emptyStatePlaceholderIcon}
            imageObjectFit={imageObjectFit}
            onSlotClick={slotClickHandler}
          />
        ) : (
          <NormalLayout
            urls={slotImages}
            placeholderIcon={emptyStatePlaceholderIcon}
            imageObjectFit={imageObjectFit}
            onSlotClick={slotClickHandler}
          />
        )}

        {previewBodyOverlay}

        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-[#081030]/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <span
                className="h-9 w-9 shrink-0 rounded-full bg-primary animate-pulse"
                aria-hidden
              />
              <span className="text-[11px] font-medium tracking-wide text-tx-secondary">
                Generating…
              </span>
            </div>
          </div>
        ) : null}
      </div>

      <div className={threeDotsMainPreviewFrameAnchorClassName}>
        <PreviewActionsMenu
          align="right"
          menuPreset={previewMenuPreset}
          likeActive={previewMenuLikeActive}
          onMenuEvent={onMenuEvent}
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

      {useMeasuredInlineFrame && layoutFrame ? (
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
      ) : mobileFrame ? (
        <div className={cn("mx-auto", frameShell, mobileFrameClass(aspectRatio))}>
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

      {!hideMeta && (hasPreviewMedia || inlineAfterDescription) ? (
        <div
          className={cn(
            "mt-3 min-w-0 shrink-0 xl:mt-3",
            useMeasuredInlineFrame && layoutFrame
              ? "mx-auto"
              : cn(
                  "mx-auto",
                  mobileFrame
                    ? metaWidthClassMobile(aspectRatio)
                    : metaWidthClassDesktop(aspectRatio),
                ),
          )}
          style={
            useMeasuredInlineFrame && layoutFrame
              ? {
                  width: layoutFrame.width,
                  maxWidth: "100%",
                }
              : undefined
          }
        >
          <p className="w-full min-w-0 max-w-none text-[10px] leading-none text-tx-secondary">
            {dateLine}
          </p>

          <div className="mt-1 w-full min-w-0 max-w-none xl:mt-0">
            <PreviewDescriptionText
              text={promptText}
              placeholder={previewPromptPlaceholder}
              anchoredToPreview={promptDescriptionAnchoredToPreview}
            />
          </div>
          {inlineAfterDescription}
        </div>
      ) : null}

      {afterPreviewStack ? (
        <div className={afterStackOuterClassName} style={afterStackOuterStyle}>
          {afterPreviewStack}
        </div>
      ) : null}
    </div>
  );
}