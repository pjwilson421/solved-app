"use client";

import { cn } from "@/lib/utils";
import { SortDropdown } from "@/components/global/SortDropdown";
import { type SortOption, SORT_OPTIONS, SORT_LABEL_BY_VALUE } from "@/lib/app-data/sort-filter-utils";

export type HistoryActivityFilter = "all" | "chats" | "images" | "videos" | "edited";

type HistoryToolbarFiltersProps = {
  activityFilter: HistoryActivityFilter;
  onActivityFilterChange: (value: HistoryActivityFilter) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  /** History/Liked mobile: full-width Type/Sort chips inside `FilesToolbar` filter grid. */
  compactLayout?: boolean;
};

const sortDropdownFullWidthProps = {
  rootClassName: "relative min-w-0 w-full",
  triggerClassName:
    "flex w-full min-w-0 max-w-full shrink justify-between",
} as const;

/** Type + Sort — shared with `FilesToolbar` via `customFilterSortSlot` on History / Liked. */
export function HistoryToolbarFilters({
  activityFilter,
  onActivityFilterChange,
  sortOption,
  onSortChange,
  compactLayout = false,
}: HistoryToolbarFiltersProps) {
  const currentFilterLabel = LABEL_BY_VALUE[activityFilter];
  const currentSortLabel = SORT_LABEL_BY_VALUE[sortOption];

  return (
    <div
      className={cn(
        compactLayout
          ? "flex flex-col gap-2 bg-[#07195b] p-2 rounded-2xl"
          : "flex flex-row items-center gap-2",
      )}
    >
      <SortDropdown
        value={activityFilter}
        onChange={onActivityFilterChange}
        options={FILTER_OPTIONS}
        labelPrefix="Type: "
        currentLabel={currentFilterLabel}
        {...(compactLayout ? sortDropdownFullWidthProps : {})}
      />
      <SortDropdown
        value={sortOption}
        onChange={onSortChange}
        options={SORT_OPTIONS}
        labelPrefix="Sort: "
        currentLabel={currentSortLabel}
        {...(compactLayout ? sortDropdownFullWidthProps : {})}
      />
    </div>
  );
}

const FILTER_OPTIONS: { value: HistoryActivityFilter; label: string }[] = [
  { value: "all", label: "All Types" },
  { value: "chats", label: "Chats" },
  { value: "images", label: "Mock Images" },
  { value: "videos", label: "Videos" },
  { value: "edited", label: "Edited Images" },
];

const LABEL_BY_VALUE: Record<HistoryActivityFilter, string> = {
  all: "All Types",
  chats: "Chats",
  images: "Mock Images",
  videos: "Videos",
  edited: "Edited Images",
};
