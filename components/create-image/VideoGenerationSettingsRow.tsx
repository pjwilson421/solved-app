"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import type { AspectRatio, Quality, VideoDuration } from "./types";
import { ASPECT_RATIOS, QUALITIES, VIDEO_DURATIONS } from "./types";

const CONTROL_ICON_SIZE = 16;

const templatesControlStyle =
  "rounded-control bg-surface-hover/90 px-3 text-[11px] font-normal leading-8 text-white transition-colors hover:bg-surface-pressed/95 outline-none focus:outline-none";

const selectBase = cn(
  "h-8 min-w-0 cursor-pointer appearance-none py-0 pr-7 text-[11px] font-normal leading-8 outline-none focus:outline-none",
  templatesControlStyle,
);

function aspectIconSrc(ratio: AspectRatio): string {
  switch (ratio) {
    case "16:9":
      return ICONS.aspect16x9;
    case "1:1":
      return ICONS.aspect1x1;
    case "4:5":
      return ICONS.aspect4x5;
    case "9:16":
      return ICONS.aspect9x16;
    default:
      return ICONS.aspect16x9;
  }
}

function SelectChevron({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-y-0 right-3 z-[2] flex w-2 shrink-0 items-center justify-center text-[10px] leading-none text-tx-muted",
        className,
      )}
      aria-hidden
    >
      ▾
    </span>
  );
}

function SelectShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("relative min-w-0 shrink-0", className)}>{children}</div>
  );
}

export type VideoGenerationSettingsRowProps = {
  aspectRatio: AspectRatio;
  onAspectRatio: (v: AspectRatio) => void;
  quality: Quality;
  onQuality: (v: Quality) => void;
  duration: VideoDuration;
  onDuration: (v: VideoDuration) => void;
  variant?: "desktop" | "mobile";
  className?: string;
};

export function VideoGenerationSettingsRow({
  aspectRatio,
  onAspectRatio,
  quality,
  onQuality,
  duration,
  onDuration,
  variant = "desktop",
  className,
}: VideoGenerationSettingsRowProps) {
  const isDesktop = variant === "desktop";
  const selectWithIcon = cn(selectBase, "pl-9");

  const aspectSelect = (
    <SelectShell
      className={cn(isDesktop ? "w-[5.5rem]" : "min-w-0 w-full")}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-3 z-[1] flex h-8 w-4 items-center justify-center"
        aria-hidden
      >
        <IconAsset
          src={aspectIconSrc(aspectRatio)}
          size={CONTROL_ICON_SIZE}
          className="size-4 [&_img]:block"
        />
      </span>
      <select
        aria-label="Aspect ratio"
        value={aspectRatio}
        onChange={(e) => onAspectRatio(e.target.value as AspectRatio)}
        className={cn(selectWithIcon, "box-border h-8 w-full leading-8")}
      >
        {ASPECT_RATIOS.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>
      <SelectChevron />
    </SelectShell>
  );

  const qualitySelect = (
    <SelectShell
      className={cn(isDesktop ? "w-[5.625rem]" : "min-w-0 w-full")}
    >
      <span
        className="pointer-events-none absolute inset-y-0 left-3 z-[1] flex h-8 w-4 items-center justify-center"
        aria-hidden
      >
        <IconAsset
          src={ICONS.resolutionDiamond}
          size={CONTROL_ICON_SIZE}
          className="size-4 [&_img]:block"
        />
      </span>
      <select
        aria-label="Quality"
        value={quality}
        onChange={(e) => onQuality(e.target.value as Quality)}
        className={cn(
          selectWithIcon,
          "box-border h-8 w-full text-left tabular-nums leading-8",
        )}
      >
        {QUALITIES.map((q) => (
          <option key={q} value={q}>
            {q}
          </option>
        ))}
      </select>
      <SelectChevron />
    </SelectShell>
  );

  const durationSelect = (
    <SelectShell className={cn(isDesktop ? "w-[4.5rem]" : "min-w-0 w-full")}>
      <select
        aria-label="Duration"
        value={duration}
        onChange={(e) => onDuration(e.target.value as VideoDuration)}
        className={cn(selectBase, "box-border h-8 w-full pl-3 leading-8")}
      >
        {VIDEO_DURATIONS.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>
      <SelectChevron />
    </SelectShell>
  );

  return (
    <div
      className={cn("w-fit max-w-full shrink-0", className)}
      role="group"
      aria-label="Video generation settings"
    >
      {isDesktop ? (
        <div className="flex flex-nowrap items-center justify-start gap-x-3">
          {aspectSelect}
          {qualitySelect}
          {durationSelect}
        </div>
      ) : (
        <div className="inline-grid w-fit max-w-full grid-cols-2 justify-items-stretch gap-x-3 gap-y-1.5">
          {aspectSelect}
          {qualitySelect}
          <div className="col-span-2 w-full">{durationSelect}</div>
        </div>
      )}
    </div>
  );
}
