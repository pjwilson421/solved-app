"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { IconMenu } from "../create-image/icons";
import { SortDropdown } from "@/components/global/SortDropdown";
import { type SortOption, SORT_OPTIONS, SORT_LABEL_BY_VALUE } from "@/lib/app-data/sort-filter-utils";

const filesToolbarPrimaryBtnClass =
  "inline-flex h-[30px] shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-control bg-primary px-3 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel";

const filterIconBtnClass = (active: boolean) =>
  cn(
    "inline-flex h-[30px] w-[30px] shrink-0 cursor-pointer items-center justify-center rounded-control border transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel",
    active
      ? "border-primary-hover/80 bg-primary hover:bg-primary-active"
      : "border-edge-default bg-surface-hover hover:border-edge-strong hover:bg-surface-hover",
  );

/** Menu, grid, and account controls — share row with page title on desktop. */
export function FilesDesktopHeaderActions({
  className,
  onListViewClick,
  listViewActive,
  onGridViewClick,
  gridViewActive,
  showGridButton = true,
  /** History / Liked: first control uses list-view-icon.svg instead of the burger glyph. */
  menuButtonVariant = "burger",
}: {
  className?: string;
  /** Switches to list view (e.g. Files: `?view=list`). */
  onListViewClick?: () => void;
  listViewActive?: boolean;
  /** Switches to grid view (e.g. Files: default URL without `view=list`). */
  onGridViewClick?: () => void;
  gridViewActive?: boolean;
  showGridButton?: boolean;
  menuButtonVariant?: "burger" | "list";
}) {
  return (
    <div
      className={cn(
        "hidden shrink-0 items-center gap-2 md:flex",
        className,
      )}
    >
      <button
        type="button"
        onClick={onListViewClick}
        aria-label="List view"
        aria-pressed={listViewActive}
        className={cn(
          "flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel",
          onListViewClick ? "" : "cursor-default",
          listViewActive
            ? "bg-primary hover:bg-primary-active active:bg-primary-active"
            : "hover:bg-surface-hover active:bg-surface-pressed",
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
            "flex h-9 w-9 cursor-pointer items-center justify-center rounded-control text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel",
            gridViewActive
              ? "bg-primary hover:bg-primary-active active:bg-primary-active"
              : "hover:bg-surface-hover active:bg-surface-pressed",
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
      <button
        type="button"
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-action bg-surface-hover transition-colors duration-150 hover:bg-surface-pressed active:bg-surface-pressed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel"
        aria-label="Add user"
      >
        <IconAsset
          src={ICONS.filesHeaderAddUser}
          size={16}
          className="[&_img]:block [&_img]:shrink-0"
        />
      </button>
    </div>
  );
}

type FilesToolbarProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  filterOpen: boolean;
  onToggleFilter: () => void;
  variant: "desktop" | "mobile";
  showDesktopExtras?: boolean;
  /** When true, mobile layout omits the filter icon (e.g. filter lives in view toggle row). */
  omitMobileFilterButton?: boolean;
  onFilesUpload: (files: File[]) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
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
  filterOpen,
  onToggleFilter,
  variant,
  showDesktopExtras = true,
  omitMobileFilterButton = false,
  onFilesUpload,
  sortOption,
  onSortChange,
}: FilesToolbarProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const currentSortLabel = SORT_LABEL_BY_VALUE[sortOption];

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
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
            if (files.length) onFilesUpload(files);
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
            <FilesFilterIconButton
              filterOpen={filterOpen}
              onToggleFilter={onToggleFilter}
            />
            <SortDropdown
              value={sortOption}
              onChange={onSortChange}
              options={SORT_OPTIONS}
              labelPrefix="Sort: "
              currentLabel={currentSortLabel}
            />
          </>
        ) : (
          <>
            <button
              type="button"
              className="inline-flex h-[30px] shrink-0 cursor-pointer items-center justify-center rounded-control bg-primary px-3 text-[11px] font-medium text-white transition-colors duration-150 hover:bg-primary-hover active:bg-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-panel"
            >
              + New
            </button>
            {omitMobileFilterButton ? null : (
              <FilesFilterIconButton
                filterOpen={filterOpen}
                onToggleFilter={onToggleFilter}
              />
            )}
            <SortDropdown
              value={sortOption}
              onChange={onSortChange}
              options={SORT_OPTIONS}
              labelPrefix="Sort: "
              currentLabel={currentSortLabel}
            />
          </>
        )}
      </div>

      <div className="w-full min-w-0">
        <label className="sr-only" htmlFor="files-search">
          Search files
        </label>
        <div className="flex h-[30px] w-full min-w-0 items-center gap-2 rounded-input border border-edge-default bg-surface-panel px-3 transition-[border-color,box-shadow] duration-150 hover:border-edge-strong focus-within:border-primary-hover/55 focus-within:ring-2 focus-within:ring-primary/30">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-tx-muted"
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
            id="files-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files"
            className="min-w-0 flex-1 bg-transparent text-[11px] text-white placeholder:text-tx-muted outline-none"
          />
        </div>
      </div>
    </div>
  );
}
