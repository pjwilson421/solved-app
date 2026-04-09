"use client";

import { useRef } from "react";
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
};

/**
 * Sizes match Create Image template thumbnails:
 * - Mobile: `MOBILE.templateThumb` (92×64) / `gap-[17px]` like `TemplatesPanel`
 * - xl+: 120×120 square / `gap-3.5` like `DesktopTemplatesStrip`
 */
function FrameSlot({
  label,
  file,
  inputId,
  onPick,
  onRemove,
}: {
  label: string;
  file: ReferenceFile | null;
  inputId: string;
  onPick: (files: FileList | null) => void;
  onRemove: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-[92px] shrink-0 flex-col gap-1.5 xl:w-[120px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
        {label}
      </p>
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
      <div
        className={cn(
          "relative flex h-[64px] w-[92px] shrink-0 items-center justify-center overflow-hidden rounded-card border border-edge-default bg-surface-panel transition-colors",
          "xl:h-[120px] xl:w-[120px]",
          !file && "hover:border-edge-strong",
        )}
      >
        {file ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={file.url}
              alt=""
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              onClick={onRemove}
              className="absolute right-1.5 top-1.5 z-[1] flex h-6 w-6 items-center justify-center rounded-action bg-surface-base/90 text-[11px] text-white"
              aria-label={`Remove ${label}`}
            >
              ×
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="flex h-full w-full items-center justify-center outline-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            aria-label={`Add ${label}`}
          >
            <span className="text-2xl font-light text-tx-muted">+</span>
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
}: VideoFrameReferencesProps) {
  return (
    <section
      className={cn("min-w-0 w-full", className)}
      aria-label="Start and end frames"
    >
      <div className="flex w-full flex-nowrap justify-start gap-[17px] xl:gap-3.5">
        <FrameSlot
          label="Start Frame"
          file={startFrame}
          inputId="video-start-frame"
          onPick={onStartFrame}
          onRemove={onRemoveStart}
        />
        <FrameSlot
          label="End Frame"
          file={endFrame}
          inputId="video-end-frame"
          onPick={onEndFrame}
          onRemove={onRemoveEnd}
        />
      </div>
    </section>
  );
}
