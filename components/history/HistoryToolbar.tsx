"use client";

import { SortDropdown } from "@/components/global/SortDropdown";
import { type SortOption, SORT_OPTIONS, SORT_LABEL_BY_VALUE } from "@/lib/app-data/sort-filter-utils";

export type HistoryActivityFilter = "all" | "chats" | "images" | "videos" | "edited";

type HistoryToolbarProps = {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  activityFilter: HistoryActivityFilter;
  onActivityFilterChange: (value: HistoryActivityFilter) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
};

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

export function HistoryToolbar({
  searchQuery,
  onSearchChange,
  activityFilter,
  onActivityFilterChange,
  sortOption,
  onSortChange,
}: HistoryToolbarProps) {
  const currentFilterLabel = LABEL_BY_VALUE[activityFilter];
  const currentSortLabel = SORT_LABEL_BY_VALUE[sortOption];

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor="history-search">
          Search history
        </label>
        <div className="flex h-[30px] min-w-0 max-w-full flex-[1_1_200px] items-center gap-2 rounded-input border border-app-border bg-app-input px-3 transition-[border-color,box-shadow] duration-150 hover:border-app-border-hover focus-within:border-[#1EA7E1]/55 focus-within:shadow-[0_0_0_1px_rgba(108,212,255,0.25)]">
          <svg
            className="h-3.5 w-3.5 shrink-0 text-[#8A8A93]"
            viewBox="0 0 12 12"
            fill="none"
            aria-hidden
          >
            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2" />
            <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
          <input
            id="history-search"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search assets..."
            className="min-w-0 flex-1 bg-transparent text-[11px] text-white placeholder:text-[#8A8A93] outline-none"
          />
        </div>
        <SortDropdown
          value={activityFilter}
          onChange={onActivityFilterChange}
          options={FILTER_OPTIONS}
          labelPrefix="Type: "
          currentLabel={currentFilterLabel}
        />
        <SortDropdown
          value={sortOption}
          onChange={onSortChange}
          options={SORT_OPTIONS}
          labelPrefix="Sort: "
          currentLabel={currentSortLabel}
        />
      </div>
    </div>
  );
}
