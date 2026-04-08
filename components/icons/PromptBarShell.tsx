import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Fill matches preview frame surface; no border or focus ring. */
export function PromptBarShell({
  children,
  className,
  variant = "desktop",
}: {
  children: ReactNode;
  className?: string;
  variant?: "desktop" | "mobile";
}) {
  const shellClass = cn(
    "relative h-[76px] w-full shrink-0 overflow-visible rounded-[12px]",
    "bg-[#18181B]",
    "transition-[background-color] duration-200 ease-out",
    "hover:bg-[#1E1E22]",
    "focus-within:bg-[#18181B]",
  );

  if (variant === "mobile") {
    return (
      <div className={cn(shellClass, className)}>
        <div className="absolute inset-x-0 top-1/2 z-[1] flex -translate-y-1/2 items-center px-[23px]">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(shellClass, className)}>
      <div className="absolute inset-x-0 top-1/2 z-[1] flex -translate-y-1/2 items-center px-[23px]">
        {children}
      </div>
    </div>
  );
}
