"use client";

import { useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { FileEntry } from "./types";
import { destinationFoldersForMove } from "./file-move-helpers";

type FileMoveDialogProps = {
  open: boolean;
  /** Id captured when user chose Move (should match `item.id` when open). */
  movingFileId: string | null;
  item: FileEntry | null;
  allEntries: FileEntry[];
  onClose: () => void;
  /** `fileId` is always the open item’s id. `parentId` null = root. */
  onConfirm: (
    fileId: string,
    parentId: string | null,
    folderLabel: string,
  ) => void;
};

export function FileMoveDialog({
  open,
  movingFileId,
  item,
  allEntries,
  onClose,
  onConfirm,
}: FileMoveDialogProps) {
  const folders = useMemo(
    () => (item ? destinationFoldersForMove(allEntries, item) : []),
    [allEntries, item],
  );

  const currentParentId = item?.parentId ?? null;

  const pick = useCallback(
    (parentId: string | null, folderLabel: string) => {
      if (!item) return;
      if (parentId === currentParentId) {
        onClose();
        return;
      }
      onConfirm(item.id, parentId, folderLabel);
      onClose();
    },
    [item, currentParentId, onConfirm, onClose],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !item) return null;

  return (
    <div className="fixed inset-0 z-[1300] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-move-title"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "relative z-10 w-full max-w-[360px] rounded-xl border border-edge-subtle bg-surface-card shadow-xl shadow-black/50",
          "max-h-[min(420px,70vh)] flex flex-col",
        )}
      >
        <div className="shrink-0 border-b border-edge-subtle/80 px-4 py-3">
          <h2
            id="file-move-title"
            className="text-left text-[12px] font-semibold text-white"
          >
            Move “{item.name}”
          </h2>
          <p className="mt-1 text-left text-[10px] leading-snug text-tx-secondary">
            Choose a folder or move to the top level.
          </p>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <button
            type="button"
            className={cn(
              "flex w-full cursor-pointer items-center gap-2 rounded-full px-3 py-2.5 text-left text-[11px] font-medium transition-colors duration-150",
              currentParentId === null
                ? "bg-primary/50 text-white"
                : "text-tx-secondary hover:bg-panel-hover",
            )}
            onClick={(e) => {
              e.stopPropagation();
              pick(null, "All files (root)");
            }}
          >
            <div className="flex items-center justify-center w-5 h-5 rounded overflow-hidden bg-panel-hover/50 shrink-0 text-tx-secondary">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                <polyline points="9 22 9 12 15 12 15 22"></polyline>
              </svg>
            </div>
            <span className="font-semibold text-[12px]">All files (root)</span>
          </button>
          {folders.length === 0 ? (
            <p className="px-3 py-2 text-left text-[10px] text-tx-muted">
              No other folders available.
            </p>
          ) : (
            <ul className="mt-1 flex flex-col gap-0.5" role="listbox">
              {folders.map((f) => {
                const selected = currentParentId === f.id;
                return (
                  <li key={f.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        "flex w-full cursor-pointer rounded-full px-3 py-2.5 text-left text-[11px] font-medium transition-colors duration-150",
                        selected
                          ? "bg-primary/50 text-white"
                          : "text-tx-secondary hover:bg-panel-hover",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        pick(f.id, f.name);
                      }}
                    >
                      <span className="truncate">{f.name}</span>
                      <span className="ml-2 shrink-0 text-[10px] font-normal text-tx-muted">
                        Folder
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="shrink-0 border-t border-edge-subtle/80 px-3 py-2.5">
          <button
            type="button"
            className="w-full cursor-pointer rounded-full py-2 text-center text-[11px] font-medium text-tx-secondary transition-colors hover:bg-panel-hover hover:text-white"
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
