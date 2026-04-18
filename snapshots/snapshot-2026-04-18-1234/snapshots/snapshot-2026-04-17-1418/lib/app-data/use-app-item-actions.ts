"use client";

import { useCallback, useMemo } from "react";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { likedKey } from "@/lib/liked-item-keys";
import type { AppItemRef } from "./item-ref";
import { toLikedItemStorageKey } from "./item-ref";
import { useAppData } from "./app-data-context";
import { useRouter } from "next/navigation";

/**
 * Composable item operations (mock catalog + liked keys).
 * Chat likes use the same storage keys as other domains (`chat:id`).
 */
export function useAppItemActions() {
  const {
    fileEntries,
    updateFileEntries,
    updateActivityEntries,
    updateChatThreads,
    setPreviewItemRef,
  } = useAppData();
  const { toggle: toggleLikedKey, removeKeys: removeLikedKeys } = useLikedItems();

  const toggleLike = useCallback(
    (ref: AppItemRef) => {
      toggleLikedKey(toLikedItemStorageKey(ref));
    },
    [toggleLikedKey],
  );

  const deleteCatalogItem = useCallback(
    (ref: AppItemRef) => {
      if (ref.domain === "file") {
        updateFileEntries((prev) => prev.filter((e) => e.id !== ref.id));
        return;
      }
      if (ref.domain === "activity") {
        removeLikedKeys([likedKey.activity(ref.id), likedKey.generation(ref.id)]);
        updateActivityEntries((prev) => prev.filter((e) => e.id !== ref.id));
        return;
      }
      if (ref.domain === "chat") {
        updateChatThreads((prev) => prev.filter((t) => t.id !== ref.id));
      }
    },
    [removeLikedKeys, updateFileEntries, updateActivityEntries, updateChatThreads],
  );

  const renameFile = useCallback(
    (id: string, name: string) => {
      updateFileEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, name } : e)),
      );
    },
    [updateFileEntries],
  );

  const moveFile = useCallback(
    (id: string, parentId: string | null) => {
      updateFileEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, parentId } : e)),
      );
    },
    [updateFileEntries],
  );

  const router = useRouter();

  const openItem = useCallback(
    (ref: AppItemRef) => {
      if (ref.domain === "chat") {
        router.push(`/chat?openChat=${encodeURIComponent(ref.id)}`);
        return;
      }
      if (ref.domain === "file" || ref.domain === "activity") {
        setPreviewItemRef(ref);
      }
    },
    [router, setPreviewItemRef],
  );

  const downloadItem = useCallback(
    (ref: AppItemRef) => {
      if (ref.domain !== "file") return;
      const entry = fileEntries.find((e) => e.id === ref.id);
      if (!entry || entry.kind === "folder") return;
      const safeName = entry.name.replace(/[^\w.\-()\s]+/g, "_").trim() || "download";
      const blob = new Blob([`Mock download: ${entry.name}\n`], {
        type: "text/plain;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = safeName;
      a.rel = "noopener noreferrer";
      a.click();
      URL.revokeObjectURL(url);
    },
    [fileEntries],
  );

  return useMemo(
    () => ({
      toggleLike,
      deleteCatalogItem,
      renameFile,
      moveFile,
      openItem,
      downloadItem,
    }),
    [
      toggleLike,
      deleteCatalogItem,
      renameFile,
      moveFile,
      openItem,
      downloadItem,
    ],
  );
}
