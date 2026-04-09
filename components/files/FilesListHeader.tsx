"use client";

import { cn } from "@/lib/utils";

type FilesListHeaderProps = {
  className?: string;
};

export function FilesListHeader({ className }: FilesListHeaderProps) {
  return (
    <div className={cn("w-full shrink-0", className)}>
      <div
        className={cn(
          "grid grid-cols-[minmax(0,1fr)_48px_40px] gap-2 rounded-card border border-edge-default bg-surface-panel px-3 py-2",
          "text-[10px] font-bold uppercase tracking-[0.08em] text-tx-muted",
          "sm:hidden",
        )}
      >
        <span className="text-left">Name</span>
        <span className="text-center">Type</span>
        <span className="text-right">Size</span>
      </div>
      <div
        className={cn(
          "hidden sm:grid sm:grid-cols-[minmax(0,1fr)_72px_112px_64px_40px] sm:gap-3 sm:rounded-card sm:border sm:border-edge-default sm:bg-surface-panel sm:px-4 sm:py-2.5",
          "text-[10px] font-bold uppercase tracking-[0.08em] text-tx-muted",
        )}
      >
        <span className="pl-8 text-left sm:pl-9">Name</span>
        <span className="text-left">Type</span>
        <span className="text-left">Date modified</span>
        <span className="text-left">Size</span>
        <span className="sr-only">Actions</span>
      </div>
    </div>
  );
}
