"use client";

import type { ReactNode } from "react";
import { DesktopSideRail } from "./DesktopSideRail";

/** Right history / file-info column — same track + `--prompt-dock-viewport-bottom` as `LeftNavRail`. */
export function RightHistoryRail({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <DesktopSideRail className={className}>{children}</DesktopSideRail>;
}
