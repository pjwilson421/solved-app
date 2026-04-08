"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import type { AspectRatio, AssetContentType, Quality } from "./types";
import {
  ASPECT_RATIOS,
  ASSET_CONTENT_TYPES,
  QUALITIES,
  VARIATION_OPTIONS,
} from "./types";

const CONTROL_ICON_SIZE = 16;

/** Aligned with Templates trigger; slightly softer fill so settings read secondary. */
const templatesControlStyle =
  "rounded-lg bg-[#2A2A2E]/90 px-3 text-[11px] font-normal leading-8 text-white transition-colors hover:bg-[#323238]/95 outline-none focus:outline-none";

const assetTypeBtn = cn(
  "flex h-8 min-w-0 cursor-pointer items-center gap-2 text-left",
  templatesControlStyle,
);

const selectBase = cn(
  "h-8 min-w-0 cursor-pointer appearance-none py-0 pr-7 text-[11px] font-normal leading-8 outline-none focus:outline-none",
  templatesControlStyle,
);

function assetContentTypeIconSrc(type: AssetContentType): string {
  switch (type) {
    case "Social Media":
      return ICONS.socialMedia;
    case "Email":
      return ICONS.email;
    case "Digital Media":
      return ICONS.digitalMedia;
    default:
      return ICONS.socialMedia;
  }
}

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
        "pointer-events-none absolute inset-y-0 right-3 z-[2] flex w-2 shrink-0 items-center justify-center text-[10px] leading-none text-[#8A8A93]",
        className,
      )}
      aria-hidden
    >
      ▾
    </span>
  );
}

function AssetContentTypeMenu({
  value,
  onChange,
  isDesktop,
}: {
  value: AssetContentType;
  onChange: (v: AssetContentType) => void;
  isDesktop: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative z-30 min-w-0 shrink-0",
        isDesktop ? "w-[min(100%,8.5rem)]" : "min-w-0 w-full",
      )}
    >
      <button
        type="button"
        className={cn(assetTypeBtn, "w-full")}
        aria-haspopup="listbox"
        aria-label="Content type"
      >
        <IconAsset
          src={assetContentTypeIconSrc(value)}
          size={CONTROL_ICON_SIZE}
          className="size-4 shrink-0 opacity-90 [&_img]:block"
        />
        <span className="min-w-0 flex-1 truncate leading-8">{value}</span>
        <span
          className="shrink-0 text-[10px] leading-none text-[#8A8A93]"
          aria-hidden
        >
          ▾
        </span>
      </button>
      <div
        className={cn(
          "pointer-events-none invisible absolute left-0 top-full z-[60] min-w-full pt-1 opacity-0 transition-opacity duration-100",
          "group-hover:visible group-hover:pointer-events-auto group-hover:opacity-100",
          "group-focus-within:visible group-focus-within:pointer-events-auto group-focus-within:opacity-100",
        )}
      >
        <ul
          role="listbox"
          aria-label="Content type"
          className="rounded-lg border border-[#2A2A2E] bg-[#1E1E22] py-1 text-[11px] shadow-lg"
        >
          {ASSET_CONTENT_TYPES.map((opt) => (
            <li key={opt} role="none">
              <button
                type="button"
                role="option"
                aria-selected={value === opt}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-white transition-colors hover:bg-[#2A2A2E]",
                  value === opt && "bg-[#3ABEFF]/60",
                )}
                onClick={() => onChange(opt)}
              >
                <IconAsset
                  src={assetContentTypeIconSrc(opt)}
                  size={CONTROL_ICON_SIZE}
                  className="size-4 shrink-0 opacity-90 [&_img]:block"
                />
                <span className="min-w-0">{opt}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
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

export type GenerationSettingsRowProps = {
  assetContentType: AssetContentType;
  onAssetContentType: (v: AssetContentType) => void;
  aspectRatio: AspectRatio;
  onAspectRatio: (v: AspectRatio) => void;
  quality: Quality;
  onQuality: (v: Quality) => void;
  variations: number;
  onVariations: (v: number) => void;
  variant?: "desktop" | "mobile";
  className?: string;
};

export function GenerationSettingsRow({
  assetContentType,
  onAssetContentType,
  aspectRatio,
  onAspectRatio,
  quality,
  onQuality,
  variations,
  onVariations,
  variant = "desktop",
  className,
}: GenerationSettingsRowProps) {
  const isDesktop = variant === "desktop";
  const selectWithIcon = cn(selectBase, "pl-9");
  const selectTextOnly = cn(selectBase, "pl-3");

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

  const variationsSelect = (
    <SelectShell className={cn(isDesktop ? "w-14" : "min-w-0 w-full")}>
      <select
        aria-label="Variations"
        value={variations}
        onChange={(e) => onVariations(Number(e.target.value))}
        className={cn(selectTextOnly, "box-border h-8 w-full leading-8")}
      >
        {VARIATION_OPTIONS.map((n) => (
          <option key={n} value={n}>
            {n}/4
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
      aria-label="Generation settings"
    >
      {isDesktop ? (
        <div className="flex flex-nowrap items-center justify-start gap-x-3">
          <AssetContentTypeMenu
            value={assetContentType}
            onChange={onAssetContentType}
            isDesktop={isDesktop}
          />
          {aspectSelect}
          {qualitySelect}
          {variationsSelect}
        </div>
      ) : (
        <div className="inline-grid w-fit max-w-full grid-cols-2 justify-items-stretch gap-x-3 gap-y-1.5">
          <AssetContentTypeMenu
            value={assetContentType}
            onChange={onAssetContentType}
            isDesktop={isDesktop}
          />
          {aspectSelect}
          {qualitySelect}
          {variationsSelect}
        </div>
      )}
    </div>
  );
}
