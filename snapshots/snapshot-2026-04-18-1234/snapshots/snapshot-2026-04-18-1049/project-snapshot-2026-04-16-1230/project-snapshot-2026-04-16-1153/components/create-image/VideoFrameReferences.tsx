"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { FRAME_SLOT_ROUNDED } from "./layout-tokens";
import type { ReferenceFile } from "./types";

type VideoFrameReferencesProps = {
  startFrame: ReferenceFile | null;
  endFrame: ReferenceFile | null;
  onStartFrame: (files: FileList | null) => void;
  onEndFrame: (files: FileList | null) => void;
  onRemoveStart: () => void;
  onRemoveEnd: () => void;
  className?: string;
  /**
   * `compact` — 184×184 under desktop preview (Create Video).
   * `default` — mobile Create Video; row `gap-3` matches preview→buttons `mt-3`.
   */
  variant?: "default" | "compact";
};

/**
 * Sizes:
 * - `variant="default"`: below-desktop Create Video — fixed 115×115 square + `gap-3` (no `md:`/`lg:` shrink steps).
 * - `variant="compact"`: desktop (`xl+`) Create Video — 184×184 + `gap-[17px]`.
 */
function FrameSlot({
  label,
  labelInside,
  file,
  inputId,
  onPick,
  onRemove,
  sizeVariant,
}: {
  label: string;
  /** Uppercase line inside the box bottom (e.g. START FRAME). */
  labelInside: string;
  file: ReferenceFile | null;
  inputId: string;
  onPick: (files: FileList | null) => void;
  onRemove: () => void;
  sizeVariant: "default" | "compact";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const isCompact = sizeVariant === "compact";

  const labelBarClass =
    "w-full shrink-0 px-2 pb-2.5 pt-1 text-center text-[8.25px] font-semibold uppercase leading-[1.2] tracking-[0.08em] text-[#FFFFFF] group-hover:text-[#FFFFFF] group-active:text-[#FFFFFF] group-focus-visible:text-[#FFFFFF] -translate-y-[12px]";

  const wrapClass = cn(
    "flex shrink-0 flex-col",
    isCompact ? "w-[184px]" : "w-[115px]",
  );

  const boxClass = cn(
    "relative flex shrink-0 flex-col items-stretch overflow-hidden border border-edge-subtle bg-[#081030] transition-colors",
    FRAME_SLOT_ROUNDED,
    isCompact ? "h-[184px] w-[184px]" : "h-[115px] w-[115px]",
    !file && "hover:border-primary/50",
  );

  const plusSizeClass = isCompact ? "text-4xl" : "text-3xl";
  const removeBtnClass =
    "absolute right-2 top-2 z-[1] flex h-7 w-7 items-center justify-center rounded-full bg-app-bg/90 text-[12px] text-white";

  return (
    <div className={wrapClass}>
      <input
        id={inputId}
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          onPick(e.target.files);
          e.target.value = "";
        }}
      />
      <div className={boxClass}>
        {file ? (
          <>
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={file.url}
                alt=""
                className="h-full w-full min-h-0 flex-1 object-cover"
              />
              <button
                type="button"
                onClick={onRemove}
                className={removeBtnClass}
                aria-label={`Remove ${label}`}
              >
                ×
              </button>
            </div>
            <p className={labelBarClass}>{labelInside}</p>
          </>
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="group flex h-full min-h-0 w-full flex-1 flex-col items-center justify-between outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Add ${label}`}
          >
            <span className="flex min-h-0 w-full flex-1 flex-col items-center justify-center">
              <span
                className={cn(
                  "font-light leading-none text-[#315790]",
                  plusSizeClass,
                )}
              >
                +
              </span>
            </span>
            <span className={labelBarClass}>{labelInside}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export function VideoFrameReferences({
  startFrame,
  endFrame,
  onStartFrame,
  onEndFrame,
  onRemoveStart,
  onRemoveEnd,
  className,
  variant = "default",
}: VideoFrameReferencesProps) {
  const sizeVariant = variant;
  const startInputId =
    variant === "compact" ? "video-start-frame-desktop" : "video-start-frame";
  const endInputId =
    variant === "compact" ? "video-end-frame-desktop" : "video-end-frame";

  return (
    <section
      className={cn("min-w-0 w-full", className)}
      aria-label="Start and end frames"
    >
      <div
        className={cn(
          "flex w-full flex-nowrap justify-start",
          sizeVariant === "default" ? "gap-3" : "gap-[17px]",
        )}
      >
        <FrameSlot
          label="Start Frame"
          labelInside="START FRAME"
          file={startFrame}
          inputId={startInputId}
          onPick={onStartFrame}
          onRemove={onRemoveStart}
          sizeVariant={sizeVariant}
        />
        <FrameSlot
          label="End Frame"
          labelInside="END FRAME"
          file={endFrame}
          inputId={endInputId}
          onPick={onEndFrame}
          onRemove={onRemoveEnd}
          sizeVariant={sizeVariant}
        />
      </div>
    </section>
  );
}
