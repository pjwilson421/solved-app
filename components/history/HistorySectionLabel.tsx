"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function HistorySectionLabel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "text-left text-[10px] font-bold uppercase tracking-[0.08em] text-tx-muted",
        className,
      )}
    >
      {children}
    </h2>
  );
}
