import { cn } from "@/lib/utils";

/**
 * Shared 3-dots / overflow menu trigger (Chat toolbar, preview card, file/history rows).
 * `IconDots` uses `currentColor` → keep `text-[#ffffff]` on the button for all states.
 */
export const threeDotsMenuTriggerButtonClassName = cn(
  "appearance-none bg-transparent text-[#ffffff]",
  "hover:bg-transparent hover:text-[#ffffff]",
  "active:bg-transparent active:text-[#ffffff]",
  "focus:bg-transparent focus:text-[#ffffff]",
  "focus-visible:bg-transparent",
  "transition-colors duration-150 ease-out",
);

/** Top-right anchor for the main preview frame overflow control — keep in sync with Chat overlay. */
export const threeDotsMainPreviewFrameAnchorClassName =
  "absolute right-3 top-3 z-20 xl:right-9 xl:top-6";

/** Create Image / Create Video history thumbnails — inset from the thumb image box. */
export const threeDotsHistoryThumbnailAnchorClassName =
  "absolute right-[8px] top-[8px] z-20";
