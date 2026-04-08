"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { IconMenu } from "./icons";

type HeaderProps = {
  className?: string;
  variant?: "desktop" | "mobile";
  onMenuClick?: () => void;
  /**
   * Mobile: primary label beside logo (MOBILE layout SVG uses “CREATE”).
   * Omit to show “SOLVED” with desktop-style tracking.
   */
  mobileTitle?: string;
};

export function Header({
  className,
  variant = "desktop",
  onMenuClick,
  mobileTitle,
}: HeaderProps) {
  const showCreateStyle = variant === "mobile" && mobileTitle != null;

  return (
    <header
      className={cn(
        "flex shrink-0 items-center bg-app-canvas px-5",
        variant === "desktop" ? "h-16" : "h-[72px]",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="shrink-0 rounded-md outline-none transition-opacity duration-150 hover:opacity-90 focus-visible:ring-2 focus-visible:ring-[#3ABEFF]/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-canvas"
            aria-label="Go to chat"
          >
            <IconAsset
              src={ICONS.solvedLogo}
              size={36}
              className="pointer-events-none shrink-0"
            />
          </Link>
          {mobileTitle != null ? (
            <span
              className={cn(
                "text-white",
                showCreateStyle
                  ? "text-[13px] font-semibold tracking-[0.08em]"
                  : "text-sm font-bold tracking-[0.14em]",
              )}
            >
              {mobileTitle}
            </span>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src="/icons/SOLVED-LOGOTYPE.svg"
              alt=""
              width={71}
              height={21}
              className="pointer-events-none h-[21px] w-auto shrink-0 select-none"
              draggable={false}
            />
          )}
        </div>
        {variant === "mobile" ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="mr-2 flex h-8 w-8 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-app-hover-strong hover:text-white"
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        ) : (
          <div className="w-10" aria-hidden />
        )}
      </div>
    </header>
  );
}
