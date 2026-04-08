"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  DESKTOP_TEMPLATE_TILE_PX,
  MOBILE,
} from "../create-image/layout-tokens";

type HistoryListTemplateThumbProps = {
  variant: "desktop" | "mobile";
  className?: string;
  /** When set, shows the generated (or real) image instead of the placeholder tile. */
  imageUrl?: string;
};

/**
 * Square placeholder matching xl+ `DesktopTemplatesStrip` template tiles:
 * `rounded-card`, `border-app-border`, preview `bg-app-thumb` / `bg-app-hover-strong/80`.
 */
export function HistoryListTemplateThumb({
  variant,
  className,
  imageUrl,
}: HistoryListTemplateThumbProps) {
  const px =
    variant === "desktop"
      ? DESKTOP_TEMPLATE_TILE_PX
      : MOBILE.templateThumb.w;

  return (
    <div
      className={cn(
        "relative flex shrink-0 flex-col overflow-hidden rounded-card border border-app-border bg-app-inset",
        className,
      )}
      style={{ width: px, height: px }}
      aria-hidden
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes={`${px}px`}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col bg-app-thumb">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-app-hover-strong/80" />
        </div>
      )}
    </div>
  );
}

type HistoryGridTemplateThumbProps = {
  className?: string;
  imageUrl?: string;
};

/** Full-width square preview area; same colors as strip tile image block. */
export function HistoryGridTemplateThumb({
  className,
  imageUrl,
}: HistoryGridTemplateThumbProps) {
  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-t-card bg-app-inset",
        "aspect-square",
        className,
      )}
      aria-hidden
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt=""
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 280px"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col bg-app-thumb">
          <div className="flex min-h-0 flex-1 items-center justify-center bg-app-hover-strong/80" />
        </div>
      )}
    </div>
  );
}
