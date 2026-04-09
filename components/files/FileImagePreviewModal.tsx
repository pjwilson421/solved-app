"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import type { FileEntry } from "./types";
import { fileEntryDisplayImageSrc } from "./file-entry-image-src";

type FileImagePreviewModalProps = {
  entry: FileEntry | null;
  onClose: () => void;
};

export function FileImagePreviewModal({
  entry,
  onClose,
}: FileImagePreviewModalProps) {
  useEffect(() => {
    if (!entry) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [entry, onClose]);

  const imageSrc = entry ? fileEntryDisplayImageSrc(entry) : undefined;
  const videoSrc =
    entry?.kind === "file" &&
    entry.typeLabel === "Video" &&
    entry.videoRemoteUrl
      ? entry.videoRemoteUrl
      : undefined;
  const poster = entry?.previewRemoteUrl;
  if (!entry || (!imageSrc && !videoSrc)) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-surface-base/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${entry.name}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close preview"
        onClick={onClose}
      />
      <div className="relative z-[1] flex max-h-[min(92dvh,920px)] max-w-[min(96vw,1200px)] flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="min-w-0 truncate text-left text-[13px] font-medium text-white">
            {entry.name}
          </p>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "shrink-0 rounded-control px-3 py-1.5 text-[11px] font-medium text-tx-muted",
              "transition-colors hover:bg-surface-hover hover:text-white",
            )}
          >
            Close
          </button>
        </div>
        <div className="overflow-hidden rounded-card border border-edge-default bg-surface-panel shadow-xl shadow-primary-glow/30">
          {videoSrc ? (
            <video
              src={videoSrc}
              poster={poster}
              controls
              playsInline
              className="max-h-[min(85dvh,880px)] w-full bg-surface-base object-contain"
            />
          ) : imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className="max-h-[min(85dvh,880px)] w-full object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
