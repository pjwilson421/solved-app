"use client";

import { useRef, useState, type DragEvent } from "react";
import { cn } from "@/lib/utils";
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
   * `compact` — 92×92 under desktop preview (Create Video); label below.
   * `default` — mobile Create Video — 58×58; row `gap-3` matches preview→buttons `mt-3`.
   */
  variant?: "default" | "compact";
};

/**
 * Sizes (50% of prior 184 / 115):
 * - `variant="default"`: below-desktop Create Video — 58×58 + label below + `gap-3`.
 * - `variant="compact"`: desktop (`xl+`) Create Video — 92×92 + label below + `gap-[17px]`.
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
  /** Uppercase line below the slot (e.g. START FRAME). */
  labelInside: string;
  file: ReferenceFile | null;
  inputId: string;
  onPick: (files: FileList | null) => void;
  onRemove: () => void;
  sizeVariant: "default" | "compact";
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const isCompact = sizeVariant === "compact";

  /** Centered under the button; ~half prior 11px radius → 6px for these slots only. */
  const slotRounded = "rounded-[6px]";

  const labelBelowClass =
    "mt-1.5 w-full max-w-full shrink-0 px-0.5 text-center text-[8.25px] font-semibold uppercase leading-[1.2] tracking-[0.08em] text-[#FFFFFF]";

  const wrapClass = cn(
    "flex shrink-0 flex-col items-center",
    isCompact ? "w-[92px]" : "w-[58px]",
  );

  const boxClass = cn(
    "relative flex shrink-0 flex-col items-stretch overflow-hidden border border-edge-subtle bg-[#081030] transition-colors",
    slotRounded,
    isCompact ? "h-[92px] w-[92px]" : "h-[58px] w-[58px]",
    !file && "hover:border-primary/50",
    !file && dragOver && "border-primary/70",
  );

  const applyDroppedFiles = (files: FileList | null) => {
    if (!files?.length) return;
    const f = files[0];
    if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    onPick(dt.files);
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types?.includes("Files")) setDragOver(true);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types?.includes("Files")) {
      e.dataTransfer.dropEffect = "copy";
      setDragOver(true);
    }
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOver(false);
    }
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    applyDroppedFiles(e.dataTransfer.files);
  };

  const plusSizeClass = isCompact ? "text-2xl" : "text-lg";
  const removeBtnClass =
    "absolute right-1 top-1 z-[1] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-app-bg/90 text-[10px] leading-none text-white";

  return (
    <div
      className={wrapClass}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
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
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="group flex h-full min-h-0 w-full flex-1 flex-col items-center justify-center outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Add ${label}`}
          >
            <span
              className={cn(
                "font-light leading-none text-[#315790]",
                plusSizeClass,
              )}
            >
              +
            </span>
          </button>
        )}
      </div>
      <p className={labelBelowClass}>{labelInside}</p>
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
