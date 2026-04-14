"use client";

import { cn } from "@/lib/utils";

type FilesListHeaderProps = {
  className?: string;
};

export function FilesListHeader({ className }: FilesListHeaderProps) {
  return (
    <div className={cn("w-full min-w-0 shrink-0", className)}>
      <div
        className={cn(
          "w-full min-w-0 rounded-full bg-[#07195b]/90 px-3 py-3 sm:px-4",
          "text-[10px] font-bold uppercase tracking-[0.08em]",
          "sm:hidden",
        )}
      >
        <span className="block min-w-0 truncate text-left text-white">
          Name
        </span>
      </div>
      <div
        className={cn(
          "hidden w-full min-w-0 rounded-full bg-[#07195b]/90 sm:grid sm:grid-cols-[minmax(0,1fr)_72px_112px_64px_68px] sm:gap-3 sm:px-4 sm:py-3",
          "text-[10px] font-bold uppercase tracking-[0.08em]",
        )}
      >
        <span className="pl-[30px] text-left text-white sm:pl-[34px]">Name</span>
        <span className="text-left text-[#315790]">Type</span>
        <span className="text-left text-[#315790]">Date modified</span>
        <span className="text-left text-[#315790]">Size</span>
        <span className="sr-only">Actions</span>
      </div>
    </div>
  );
}
