"use client";

import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { LikeToggleButton } from "@/components/liked-items/LikeToggleButton";
import {
  FileRowActionsMenu,
  type FileRowMenuAction,
} from "../files/FileRowActionsMenu";
import type { FileRowNameEditProps } from "../files/FileListRow";
import { FileNameInlineEdit } from "../files/FileNameInlineEdit";
import { formatHistoryRowMeta } from "./history-meta";
import { HistoryGridTemplateThumb } from "./history-template-thumb";
import type { ActivityHistoryEntry } from "./types";

type HistoryGridCardProps = {
  entry: ActivityHistoryEntry;
  rowIndex: number;
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  onItemOpen?: (id: string) => void;
  titleEdit?: FileRowNameEditProps;
};

export function HistoryGridCard({
  entry,
  rowIndex: _rowIndex,
  onMenuAction,
  onItemOpen,
  titleEdit,
}: HistoryGridCardProps) {
  const meta = formatHistoryRowMeta(entry);
  const metaLine = `${entry.subtitle} • ${meta}`;
  const cardActivate = onItemOpen ? () => onItemOpen(entry.id) : undefined;

  return (
    <div
      role={cardActivate ? "button" : undefined}
      tabIndex={cardActivate ? 0 : undefined}
      onClick={cardActivate}
      onKeyDown={
        cardActivate
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                cardActivate();
              }
            }
          : undefined
      }
      className={cn(
        "group flex h-full flex-col rounded-xl border border-edge-subtle bg-surface-card transition-colors duration-150",
        "hover:bg-ix-hover",
        cardActivate ? "cursor-pointer" : "cursor-default",
      )}
    >
      <div
        className={cn(
          "relative w-full rounded-t-xl bg-panel-bg transition-colors duration-150 group-hover:bg-app-shade",
          "aspect-[148/118] sm:aspect-[8/5]",
        )}
      >
        <div
          className="absolute right-2 top-2 z-10 flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <LikeToggleButton
            itemKey={likedKey.activity(entry.id)}
            filesHeartAppearance
          />
          <FileRowActionsMenu
            align="right"
            menuAriaLabel="History item actions"
            onSelect={(a) => onMenuAction?.(entry.id, a)}
          />
        </div>
        <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-t-xl">
          <HistoryGridTemplateThumb
            imageUrl={entry.thumbnailUrl}
            className="h-full w-full rounded-t-xl"
          />
        </div>
      </div>
      <div className="min-w-0 px-2.5 pb-2.5 pt-2 sm:px-3 sm:pb-3 sm:pt-2.5">
        {titleEdit ? (
          <FileNameInlineEdit
            displayName={entry.title}
            isEditing={titleEdit.isEditing}
            draftValue={titleEdit.editedName}
            onDraftChange={titleEdit.onEditedNameChange}
            onRequestEdit={titleEdit.onStart}
            onCommit={titleEdit.onCommit}
            onCancelEdit={titleEdit.onCancel}
            textClassName="truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]"
          />
        ) : (
          <p className="truncate text-left text-[12px] font-medium leading-snug text-white sm:text-[13px]">
            {entry.title}
          </p>
        )}
        <p className="mt-1 truncate text-left text-[10px] leading-snug text-[#315790] sm:text-[11px]">
          {metaLine}
        </p>
      </div>
    </div>
  );
}
