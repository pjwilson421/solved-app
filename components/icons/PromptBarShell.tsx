import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Flat bar surface; fixed height for pill curvature; content row vertically centered. */
export function PromptBarShell({
  children,
  className,
  variant: _variant = "desktop",
}: {
  children: ReactNode;
  className?: string;
  variant?: "desktop" | "mobile";
}) {
  return (
    <div
      className={cn(
        "relative flex h-[76px] w-full shrink-0 items-center overflow-hidden rounded-full bg-[#07195b] px-[23px]",
        className,
      )}
    >
      {children}
    </div>
  );
}
