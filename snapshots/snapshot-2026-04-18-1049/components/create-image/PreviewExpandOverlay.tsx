"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export type PreviewExpandOverlayPreview = {
  src: string;
  title: string;
};

/**
 * Full-screen image preview (Create Image + Image Editor history / preview expand).
 */
export function PreviewExpandOverlay({
  preview,
  onClose,
}: {
  preview: PreviewExpandOverlayPreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1600] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${preview.title}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 flex items-center justify-center p-[2vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.src}
          alt=""
          className="block h-auto max-h-[96vh] w-auto max-w-[96vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
          <p className="min-w-0 truncate text-left text-[13px] font-medium text-white drop-shadow-sm">
            {preview.title}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "pointer-events-auto shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium text-tx-secondary",
            "border border-edge-subtle bg-panel-bg transition-colors hover:bg-panel-hover hover:text-white",
          )}
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
}
