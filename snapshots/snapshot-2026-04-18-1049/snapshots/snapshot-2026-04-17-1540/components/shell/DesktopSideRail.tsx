"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const TRACK =
  "flex h-full min-h-0 min-w-0 w-[300px] shrink-0 max-w-[300px] flex-col overflow-hidden";

/** Match root `<aside>` flex fill so it uses the full track height above the prompt dock offset. */
const ASIDE_FILL =
  "[&>aside]:flex [&>aside]:h-full [&>aside]:min-h-0 [&>aside]:w-full [&>aside]:min-w-0 [&>aside]:flex-1 [&>aside]:flex-col";

/** 300px desktop side column — bottom inset matches `--prompt-dock-viewport-bottom` (`globals.css`). */
export function DesktopSideRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(TRACK, ASIDE_FILL, className)}
      style={{ paddingBottom: "var(--prompt-dock-viewport-bottom)" }}
    >
      {children}
    </div>
  );
}
