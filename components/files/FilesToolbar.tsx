"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { IconMenu } from "../create-image/icons";

const filesToolbarPrimaryBtnClass =
  "inline-flex h-[30px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-[#07195b] px-3 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-[#0a256e] active:bg-[#082050] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg";

const filterIconBtnClass = (active: boolean) =>
  cn(
    "inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
    active
      ? "bg-[#07195b] hover:bg-[#0a256e]"
      : "bg-[#07195b] hover:bg-[#0a256e] active:bg-[#082050]",
  );

/** Menu, grid, and account controls — share row with page title on desktop. */
export function FilesDesktopHeaderActions({
  className,
  filterOpen,
  onToggleFilter,
  onListViewClick,
  listViewActive,
  onGridViewClick,
  gridViewActive,
  showGridButton = true,
  showAddUserButton = true,
  /** History / Liked: first control uses list-view-icon.svg instead of the burger glyph. */
  menuButtonVariant = "burger",
}: {
  className?: string;
  /** Files: filter control to the left of list/grid (omit on History / Liked). */
  filterOpen?: boolean;
  onToggleFilter?: () => void;
  /** Switches to list view (e.g. Files: `?view=list`). */
  onListViewClick?: () => void;
  listViewActive?: boolean;
  /** Switches to grid view (e.g. Files: default URL without `view=list`). */
  onGridViewClick?: () => void;
  gridViewActive?: boolean;
  showGridButton?: boolean;
  showAddUserButton?: boolean;
  menuButtonVariant?: "burger" | "list";
}) {
  return (
    <div
      className={cn(
        "hidden shrink-0 items-center gap-2 md:flex",
        className,
      )}
    >
      {onToggleFilter ? (
        <FilesFilterIconButton
          filterOpen={filterOpen ?? false}
          onToggleFilter={onToggleFilter}
        />
      ) : null}
      <button
        type="button"
        onClick={onListViewClick}
        aria-label="List view"
        aria-pressed={listViewActive}
        className={cn(
          "flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
          onListViewClick ? "" : "cursor-default",
          listViewActive
            ? "bg-[#07195b] ring-1 ring-inset ring-white/10"
            : "bg-transparent hover:bg-[#0a256e] active:bg-[#082050]",
        )}
      >
        {menuButtonVariant === "list" ? (
          <IconAsset
            src={ICONS.listView}
            size={20}
            className="[&_img]:block [&_img]:shrink-0 [&_img]:opacity-95"
          />
        ) : (
          <IconMenu className="h-5 w-5" />
        )}
      </button>
      {showGridButton ? (
        <button
          type="button"
          onClick={onGridViewClick}
          aria-label="Grid view"
          aria-pressed={gridViewActive}
          className={cn(
            "flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
            gridViewActive
              ? "bg-[#07195b] ring-1 ring-inset ring-white/10"
              : "bg-transparent hover:bg-[#0a256e] active:bg-[#082050]",
          )}
        >
          <span className="grid grid-cols-2 gap-0.5" aria-hidden>
            <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
            <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
            <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
            <span className="h-1.5 w-1.5 rounded-[1px] bg-current" />
          </span>
        </button>
      ) : null}
      {showAddUserButton ? (
        <button
          type="button"
          className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-md bg-transparent text-white transition-colors duration-150 hover:bg-[#0a256e] active:bg-[#082050] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
          aria-label="Add user"
        >
          <IconAsset
            src={ICONS.filesHeaderAddUser}
            size={16}
            className="[&_img]:block [&_img]:shrink-0"
          />
        </button>
      ) : null}
    </div>
  );
}

type FilesToolbarProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  /** Files: filter state (omit on History / Liked — use `customFilterSortSlot`). */
  filterOpen?: boolean;
  onToggleFilter?: () => void;
  variant: "desktop" | "mobile";
  showDesktopExtras?: boolean;
  /** When true, mobile layout omits the filter icon (e.g. filter lives in view toggle row). */
  omitMobileFilterButton?: boolean;
  onFilesUpload?: (files: File[]) => void;
  /** History / Liked: custom filters (Type / Sort) passed as a slot. */
  customFilterSortSlot?: React.ReactNode;
  /** History / Liked: hide the top Upload / New row. */
  omitPrimaryFileActions?: boolean;
  searchPlaceholder?: string;
  searchLabel?: string;
  searchInputId?: string;
  /** Desktop: Grid/List toggle row (Files) or custom actions (History). */
  desktopTrailingSlot?: React.ReactNode;
  /** Files: align right actions on the same row as Upload/New. */
  desktopPrimaryRightSlot?: React.ReactNode;
  sortOption?: string;
  onSortChange?: (val: any) => void;
  typeFilter?: string | null;
  onTypeFilterChange?: (val: any) => void;
  fileTypeLabelsForFilter?: string[];
};

function FilesFilterIconButton({
  filterOpen,
  onToggleFilter,
}: {
  filterOpen: boolean;
  onToggleFilter: () => void;
}) {
  return (
    <button
      type="button"
      className={filterIconBtnClass(filterOpen)}
      onClick={onToggleFilter}
      aria-label={filterOpen ? "Close filters" : "Open filters"}
      aria-pressed={filterOpen}
    >
      <IconAsset
        src={ICONS.filter}
        size={18}
        className="[&_img]:block [&_img]:opacity-95"
      />
    </button>
  );
}

export function FilesToolbar({
  searchQuery,
  onSearchChange,
  filterOpen = false,
  onToggleFilter,
  variant,
  showDesktopExtras = true,
  omitMobileFilterButton = false,
  onFilesUpload,
  customFilterSortSlot,
  omitPrimaryFileActions = false,
  searchPlaceholder = "Search files",
  searchLabel = "Search files",
  searchInputId = "files-search",
  desktopTrailingSlot,
  desktopPrimaryRightSlot,
  sortOption,
  onSortChange,
  typeFilter,
  onTypeFilterChange,
  fileTypeLabelsForFilter,
}: FilesToolbarProps) {
  const uploadRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      {(!omitPrimaryFileActions || (variant === "desktop" && !!desktopPrimaryRightSlot)) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {!omitPrimaryFileActions && (
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => uploadRef.current?.click()}
                className={filesToolbarPrimaryBtnClass}
              >
                <IconAsset
                  src={ICONS.filesToolbarUpload}
                  size={15}
                  className="[&_img]:block [&_img]:shrink-0"
                />
                Upload
              </button>
              <input
                ref={uploadRef}
                type="file"
                className="sr-only"
                multiple
                aria-hidden
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length) onFilesUpload?.(files);
                  e.target.value = "";
                }}
              />
              {variant === "desktop" && showDesktopExtras ? (
                <>
                  <button
                    type="button"
                    className={cn(
                      "hidden sm:inline-flex",
                      filesToolbarPrimaryBtnClass,
                    )}
                  >
                    <IconAsset
                      src={ICONS.filesToolbarAddFolder}
                      size={15}
                      className="[&_img]:block [&_img]:shrink-0"
                    />
                    New Folder
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "hidden sm:inline-flex",
                      filesToolbarPrimaryBtnClass,
                    )}
                  >
                    <IconAsset
                      src={ICONS.filesToolbarNewFile}
                      size={15}
                      className="[&_img]:block [&_img]:shrink-0"
                    />
                    New File
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-[30px] shrink-0 cursor-pointer items-center justify-center rounded-full px-3 text-[11px] font-medium text-white transition-colors duration-150",
                      "bg-[#07195b] hover:bg-[#0a256e] active:bg-[#082050] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg"
                    )}
                  >
                    + New
                  </button>
                  {omitMobileFilterButton || !onToggleFilter ? null : (
                    <FilesFilterIconButton
                      filterOpen={filterOpen}
                      onToggleFilter={onToggleFilter}
                    />
                  )}
                </>
              )}
            </div>
          )}
          {variant === "desktop" && !!desktopPrimaryRightSlot && (
            <div className={cn("hidden shrink-0 md:flex items-center ml-auto")}>
              {desktopPrimaryRightSlot}
            </div>
          )}
        </div>
      )}

      {customFilterSortSlot && (
        <div className="flex w-full min-w-0 flex-col gap-2">
          {customFilterSortSlot}
        </div>
      )}

      <div className="flex w-full min-w-0 items-center gap-3">
        <div className="min-w-0 flex-1">
          <label className="sr-only" htmlFor={searchInputId}>
            {searchLabel}
          </label>
          <div className="flex h-[30px] w-full min-w-0 items-center gap-2 rounded-full border border-edge-subtle bg-transparent px-3 transition-[border-color,background-color] duration-150 hover:bg-panel-hover/40 focus-within:border-white">
            <svg
              className="h-3.5 w-3.5 shrink-0 text-tx-secondary"
              viewBox="0 0 12 12"
              fill="none"
              aria-hidden
              >
              <circle
                cx="5"
                cy="5"
                r="3.5"
                stroke="currentColor"
                strokeWidth="1.2"
                />
              <path
                d="M7.5 7.5L10 10"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
                />
            </svg>
            <input
              id={searchInputId}
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 bg-transparent text-[11px] text-white placeholder:text-tx-secondary outline-none ring-0 focus:outline-none focus:ring-0"
              />
          </div>
        </div>
        {desktopTrailingSlot && (
          <div className="hidden shrink-0 md:block">
            {desktopTrailingSlot}
          </div>
        )}
      </div>
    </div>
  );
}
