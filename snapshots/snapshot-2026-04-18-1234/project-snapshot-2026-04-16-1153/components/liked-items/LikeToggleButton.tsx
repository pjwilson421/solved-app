"use client";

import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { useLikedItems } from "./liked-items-context";

const iconClass =
  "pointer-events-none [&_img]:block [&_img]:max-h-5 [&_img]:max-w-5 [&_img]:object-contain";

type LikeToggleButtonProps = {
  itemKey: string;
  className?: string;
  /** Optional override for the icon/text color (e.g. #315790 for Files). */
  color?: string;
};

/**
 * Heart toggle (global + localStorage via `LikedItemsProvider`):
 * - Outline heart = not liked. One click → filled solid heart; it stays filled across navigation
 *   and reloads until the same button is clicked again.
 * - Filled heart = liked. One click → removes like and shows outline again.
 */
export function LikeToggleButton({ itemKey, className, color }: LikeToggleButtonProps) {
  const { isLiked, toggle } = useLikedItems();
  const liked = isLiked(itemKey);

  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-[background-color,box-shadow,color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-panel-bg",
        liked
          ? "bg-primary/55 text-white ring-1 ring-inset ring-primary/35 hover:bg-primary-active active:bg-primary-active"
          : "text-tx-secondary hover:bg-panel-hover hover:text-white active:bg-panel-pressed",
        className,
      )}
      style={!liked && color ? { color } : undefined}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      data-state={liked ? "liked" : "unliked"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(itemKey);
      }}
    >
      <span
        key={liked ? "filled" : "outline"}
        className={cn(
          "pointer-events-none block h-5 w-5 shrink-0",
          liked ? "opacity-100" : "opacity-95",
        )}
        style={{
          backgroundColor: !liked && color ? color : "currentColor",
          maskImage: `url("${liked ? ICONS.likedFilled : ICONS.likedOutlined}")`,
          WebkitMaskImage: `url("${liked ? ICONS.likedFilled : ICONS.likedOutlined}")`,
          maskSize: "contain",
          WebkitMaskSize: "contain",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskPosition: "center",
          WebkitMaskPosition: "center",
        }}
        aria-hidden
      />
    </button>
  );
}
