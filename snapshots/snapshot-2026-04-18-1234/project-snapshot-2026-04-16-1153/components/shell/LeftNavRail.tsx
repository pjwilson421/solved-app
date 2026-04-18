"use client";

import type { ReactNode } from "react";
import { DesktopSideRail } from "./DesktopSideRail";

/** Left navigation column — same track + `--prompt-dock-viewport-bottom` as `RightHistoryRail`. */
export function LeftNavRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <DesktopSideRail className={className}>{children}</DesktopSideRail>;
}
