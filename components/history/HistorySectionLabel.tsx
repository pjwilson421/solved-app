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
        "min-w-0 truncate text-left text-[10px] font-bold uppercase tracking-[0.08em] text-[#315790]",
        /* Match `FilesListHeader` “Name”: mobile = pill `px-4`; sm+ = `px-4` + `pl-[34px]` on Name. */
        "pl-4 sm:pl-[50px]",
        className,
      )}
    >
      {children}
    </h2>
  );
}
