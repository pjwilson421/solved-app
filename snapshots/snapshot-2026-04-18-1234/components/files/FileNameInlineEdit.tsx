"use client";

import { cn } from "@/lib/utils";

type FileNameInlineEditProps = {
  displayName: string;
  isEditing: boolean;
  draftValue: string;
  onDraftChange: (value: string) => void;
  onRequestEdit: () => void;
  /** Blur and Enter (via blur) finalize with the raw input value. */
  onCommit: (rawValue: string) => void;
  /** Escape: discard draft; parent must set skip flag so blur does not commit. */
  onCancelEdit: () => void;
  /** Match the non-editing line: size, weight, leading, color. */
  textClassName: string;
};

export function FileNameInlineEdit({
  displayName,
  isEditing,
  draftValue,
  onDraftChange,
  onRequestEdit,
  onCommit,
  onCancelEdit,
  textClassName,
}: FileNameInlineEditProps) {
  if (isEditing) {
    return (
      <input
        autoFocus
        aria-label="File name"
        value={draftValue}
        onChange={(e) => onDraftChange(e.target.value)}
        onBlur={(e) => onCommit(e.currentTarget.value)}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            onCancelEdit();
          }
        }}
        className={cn(
          textClassName,
          "m-0 box-border w-full min-w-0 max-w-full cursor-text border-0 bg-transparent p-0 shadow-none outline-none ring-0",
          "focus:outline-none focus:ring-0",
        )}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRequestEdit();
      }}
      className={cn(
        textClassName,
        "block w-full min-w-0 max-w-full cursor-text truncate rounded-none border-0 bg-transparent p-0 text-left shadow-none outline-none ring-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25",
      )}
    >
      {displayName}
    </button>
  );
}
