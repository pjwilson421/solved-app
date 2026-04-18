"use client";

import { useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAppData } from "@/lib/app-data/app-data-context";
import { fileEntryDisplayImageSrc } from "@/components/files/file-entry-image-src";
import { bestFullscreenImageUrlForEntry } from "@/lib/create-image/media-actions";

export function GlobalPreviewModal() {
  const {
    previewItemRef,
    setPreviewItemRef,
    directImagePreview,
    fileEntries,
    activityEntries,
  } = useAppData();

  /** Clears catalog preview and direct URL preview (see `setPreviewItemRef` wrapper). */
  const dismiss = useCallback(() => {
    setPreviewItemRef(null);
  }, [setPreviewItemRef]);

  useEffect(() => {
    if (!previewItemRef && !directImagePreview) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [previewItemRef, directImagePreview, dismiss]);

  let name = "";
  let imageSrc: string | undefined;
  let videoSrc: string | undefined;
  let poster: string | undefined;

  if (directImagePreview) {
    name = directImagePreview.title;
    imageSrc = directImagePreview.imageSrc;
  } else if (previewItemRef) {
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
        imageSrc = bestFullscreenImageUrlForEntry(entry);
        videoSrc = entry.videoUrl;
        poster = entry.thumbnailUrl;
      }
    }
  }

  if (!imageSrc && !videoSrc) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1400] h-[100dvh] w-screen overflow-hidden bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${name}`}
      onClick={dismiss}
    >
      <div className="absolute inset-0 z-10 flex items-center justify-center p-[2vh]">
        {videoSrc ? (
          <video
            src={videoSrc}
            poster={poster}
            controls
            playsInline
            className="block max-h-[96vh] max-w-[96vw] bg-black object-contain"
            style={{ width: "auto", height: "auto" }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt=""
            className="block max-h-[96vh] max-w-[96vw] object-contain"
            style={{ width: "auto", height: "auto" }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : null}
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4"
        aria-hidden
      >
        <div className="min-w-0 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
          <p className="min-w-0 truncate text-left text-[13px] font-medium text-white drop-shadow-sm">
            {name}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            dismiss();
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
