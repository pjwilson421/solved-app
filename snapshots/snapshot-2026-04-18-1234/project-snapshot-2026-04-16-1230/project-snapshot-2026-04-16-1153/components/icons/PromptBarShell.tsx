import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Flat bar surface; fixed height for pill curvature; content row vertically centered. */
export function PromptBarShell({
  children,
  className,
  variant = "desktop",
  allowDesktopOverflowVisible = false,
}: {
  children: ReactNode;
  className?: string;
  variant?: "desktop" | "mobile";
  allowDesktopOverflowVisible?: boolean;
}) {
  return (
    <div
      suppressHydrationWarning
      className={cn(
        "relative z-[1] flex h-[76px] w-full shrink-0 items-center rounded-full bg-[#07195b] px-[23px] pointer-events-auto",
        variant === "desktop"
          ? allowDesktopOverflowVisible
            ? "overflow-visible"
            : "overflow-hidden"
          : "overflow-visible",
        className,
      )}
    >
      {children}
    </div>
  );
}
