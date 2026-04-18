"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LeftNavRail } from "./LeftNavRail";
import { RightHistoryRail } from "./RightHistoryRail";

/**
 * Desktop (`xl+`) row used by Chat, Create Image, Create Video, and Image Editor.
 *
 * There is no shared route layout in `app/` for these pages — each page renders its own `*Client`.
 * Side rails must **never** use `display: none` on the outer track: that drops the 300px from
 * layout and shifts the center. These wrappers stay in the flow and use `invisible` below `xl`
 * so the center column always sits between two 300px gutters, matching `xl` when panels show.
 */
export function DesktopThreeColumnShell({
  sidebar,
  children,
  rail,
  className,
}: {
  sidebar: ReactNode;
  children: ReactNode;
  rail: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "box-border flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden",
        /* Equal viewport L/R gutters; inner row is still left 300 + flex-1 center + right 300. */
        "xl:pl-[var(--desktop-shell-viewport-gutter-x)] xl:pr-[var(--desktop-shell-viewport-gutter-x)]",
        className,
      )}
    >
      <LeftNavRail className="invisible xl:visible">{sidebar}</LeftNavRail>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </div>
      <RightHistoryRail className="invisible xl:visible">{rail}</RightHistoryRail>
    </div>
  );
}
