"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAppData } from "@/lib/app-data/app-data-context";
import { fileEntryDisplayImageSrc } from "@/components/files/file-entry-image-src";
import type { FileEntry } from "@/components/files/types";
import type { ActivityHistoryEntry } from "@/components/history/types";

export function GlobalPreviewModal() {
  const { previewItemRef, setPreviewItemRef, fileEntries, activityEntries } = useAppData();

  useEffect(() => {
    if (!previewItemRef) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewItemRef(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewItemRef, setPreviewItemRef]);

  if (!previewItemRef) return null;

  let name = "";
  let imageSrc: string | undefined;
  let videoSrc: string | undefined;
  let poster: string | undefined;

  if (previewItemRef.domain === "file") {
    const entry = fileEntries.find((e) => e.id === previewItemRef.id);
    if (entry) {
      name = entry.name;
      imageSrc = fileEntryDisplayImageSrc(entry);
      videoSrc =
        entry.kind === "file" && entry.typeLabel === "Video" && entry.videoRemoteUrl
          ? entry.videoRemoteUrl
          : undefined;
      poster = entry.previewRemoteUrl;
    }
  } else if (previewItemRef.domain === "activity") {
    const entry = activityEntries.find((e) => e.id === previewItemRef.id);
    if (entry) {
      name = entry.title;
      imageSrc = entry.imageUrls?.[0] || entry.thumbnailUrl;
      videoSrc = entry.videoUrl;
      poster = entry.thumbnailUrl;
    }
  }

  if (!imageSrc && !videoSrc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/80 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${name}`}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close preview"
        onClick={() => setPreviewItemRef(null)}
      />
      <div className="relative z-[1] flex max-h-[min(92dvh,920px)] max-w-[min(96vw,1200px)] flex-col gap-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <p className="min-w-0 truncate text-left text-[13px] font-medium text-white shadow-black drop-shadow-md">
            {name}
          </p>
          <button
            type="button"
            onClick={() => setPreviewItemRef(null)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium text-tx-secondary",
              "transition-colors hover:bg-panel-hover hover:text-white bg-panel-bg border border-edge-subtle",
            )}
          >
            Close
          </button>
        </div>
        <div className="overflow-hidden rounded-xl border border-edge-subtle bg-panel-bg shadow-xl shadow-black/40">
          {videoSrc ? (
            <video
              src={videoSrc}
              poster={poster}
              controls
              playsInline
              className="max-h-[min(85dvh,880px)] w-[min(90vw,1200px)] bg-black object-contain"
            />
          ) : imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt=""
              className="max-h-[min(85dvh,880px)] w-auto object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
