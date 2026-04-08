import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Fill matches preview frame surface; blue 1px stroke with subtle focus ring. */
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
    "border border-[#3ABEFF] bg-[#18181B]",
    "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
    "hover:border-[#6CD4FF] hover:bg-[#1E1E22]",
    "focus-within:border-[#3ABEFF] focus-within:bg-[#18181B] focus-within:shadow-[0_0_0_2px_rgba(58,190,255,0.15)]",
    "focus-within:hover:border-[#3ABEFF]",
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
