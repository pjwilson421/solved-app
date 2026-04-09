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
};

/**
 * Heart toggle (global + localStorage via `LikedItemsProvider`):
 * - Outline heart = not liked. One click → filled solid heart; it stays filled across navigation
 *   and reloads until the same button is clicked again.
 * - Filled heart = liked. One click → removes like and shows outline again.
 */
export function LikeToggleButton({ itemKey, className }: LikeToggleButtonProps) {
  const { isLiked, toggle } = useLikedItems();
  const liked = isLiked(itemKey);

  return (
    <button
      type="button"
      className={cn(
        "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-menu-item transition-[background-color,color] duration-150",
        liked
          ? "bg-primary/55 text-white hover:bg-primary-active active:bg-primary-active focus-visible:brightness-110"
          : "text-tx-muted hover:bg-surface-hover hover:text-white active:bg-surface-pressed focus-visible:bg-white/10",
        className,
      )}
      aria-label={liked ? "Unlike" : "Like"}
      aria-pressed={liked}
      data-state={liked ? "liked" : "unliked"}
      onClick={(e) => {
        e.stopPropagation();
        toggle(itemKey);
      }}
    >
      <IconAsset
        key={liked ? "filled" : "outline"}
        src={liked ? ICONS.likedFilled : ICONS.likedOutlined}
        size={20}
        className={cn(
          iconClass,
          liked
            ? "[&_img]:opacity-100"
            : "[&_img]:opacity-95",
        )}
      />
    </button>
  );
}
