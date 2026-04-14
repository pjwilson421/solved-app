"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { PromptBarDockGeometry } from "./prompt-bar-dock-geometry";

type FixedPromptBarDockProps = {
  geometry: PromptBarDockGeometry | null;
  /** `role="region"` label for the fixed dock (per page). */
  ariaLabel: string;
  className?: string;
  children: ReactNode;
};

/**
 * Fixed bottom dock shell used by Create Image and every other page with a prompt bar.
 * Do not add page-specific horizontal padding or max-width wrappers here.
 */
export function FixedPromptBarDock({
  geometry,
  ariaLabel,
  className,
  children,
}: FixedPromptBarDockProps) {
  return (
    <div
      className={cn(
        "fixed bottom-[var(--prompt-dock-viewport-bottom)] z-[1000] flex min-w-0 flex-col-reverse items-stretch gap-3 overflow-visible",
        className,
      )}
      role="region"
      aria-label={ariaLabel}
      style={
        geometry
          ? {
              left: geometry.left,
              width: geometry.width,
              transform: "none",
            }
          : {
              left: "50%",
              width:
                "min(100vw - 2rem, var(--create-image-prompt-max, 1000px))",
              transform: "translateX(-50%)",
            }
      }
    >
      {children}
    </div>
  );
}
