"use client";

import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import type { FileEntry } from "./types";

function iconSrcForEntry(
  entry: FileEntry,
  folderIsEmpty?: boolean,
): (typeof ICONS)[keyof typeof ICONS] {
  if (entry.kind === "folder") {
    return folderIsEmpty ? ICONS.filesEmptyFolder : ICONS.filesListFolder;
  }
  switch (entry.typeLabel) {
    case "Image":
      return ICONS.filesListImage;
    case "Video":
      return ICONS.filesListMovie;
    default:
      return ICONS.filesListFile;
  }
}

export function FileRowIcon({
  entry,
  className,
  size = 22,
  /** When `true`, folder row uses outlined empty-folder icon (no children). */
  folderIsEmpty,
}: {
  entry: FileEntry;
  className?: string;
  size?: number;
  folderIsEmpty?: boolean;
}) {
  return (
    <IconAsset
      src={iconSrcForEntry(entry, folderIsEmpty)}
      size={size}
      className={className}
    />
  );
}
