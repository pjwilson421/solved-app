"use client";

import {
  useCallback,
  useEffect,
  useRef,
  type DragEvent,
  type ChangeEvent,
} from "react";
import { cn } from "@/lib/utils";
import { PromptBarShell } from "@/components/icons/PromptBarShell";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";

type FilesDropZoneProps = {
  className?: string;
  variant?: "desktop" | "mobile";
  onFilesUpload: (files: File[]) => void;
};

export function FilesDropZone({
  className,
  variant = "desktop",
  onFilesUpload,
}: FilesDropZoneProps) {
  const onFilesUploadRef = useRef(onFilesUpload);
  useEffect(() => {
    onFilesUploadRef.current = onFilesUpload;
  }, [onFilesUpload]);

  const forwardFiles = useCallback((files: File[]) => {
    if (!files.length) return;
    onFilesUploadRef.current(files);
  }, []);

  const onInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    forwardFiles(files);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
    forwardFiles(files);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div
      className={cn(className)}
      onDrop={onDrop}
      onDragOver={onDragOver}
      data-files-dropzone="catalog"
    >
      <PromptBarShell variant={variant}>
        <label className="flex items-center gap-3 cursor-pointer w-full">
          <input
            type="file"
            multiple
            className="sr-only"
            onChange={onInputChange}
          />
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-app-bg">
            <IconAsset src={ICONS.attachPrompt} size={28} />
          </span>
          <span>
            <p className="text-white text-[16px]">Drop files or click to upload</p>
            <p className="text-tx-muted text-[11px]">Images, video, docs</p>
          </span>
        </label>
      </PromptBarShell>
    </div>
  );
}