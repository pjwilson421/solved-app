"use client";

import { cn } from "@/lib/utils";
import { SortDropdown } from "@/components/global/SortDropdown";
import {
  type SortOption,
  SORT_OPTIONS,
  SORT_LABEL_BY_VALUE,
} from "@/lib/app-data/sort-filter-utils";

type FilesToolbarFiltersProps = {
  typeFilter: string | null;
  onTypeFilterChange: (value: string | null) => void;
  sortOption: SortOption;
  onSortChange: (value: SortOption) => void;
  availableTypes: string[];
  /** Mobile: full-width chips inside drawer. */
  compactLayout?: boolean;
};

export function FilesToolbarFilters({
  typeFilter,
  onTypeFilterChange,
  sortOption,
  onSortChange,
  availableTypes,
  compactLayout = false,
}: FilesToolbarFiltersProps) {
  const currentSortLabel = SORT_LABEL_BY_VALUE[sortOption];
  
  const typeOptions = [
    { value: "all", label: "All Types" },
    ...availableTypes.map((t) => ({ value: t, label: t })),
  ];
  
  const currentTypeLabel = typeFilter ?? "All Types";

  return (
    <div
      className={cn(
        compactLayout
          ? "flex flex-col gap-2"
          : "flex flex-row items-center gap-2",
      )}
    >
      <SortDropdown
        value={typeFilter ?? "all"}
        onChange={(val) => onTypeFilterChange(val === "all" ? null : val)}
        options={typeOptions}
        labelPrefix="Type: "
        currentLabel={currentTypeLabel}
      />
      <SortDropdown
        value={sortOption}
        onChange={onSortChange}
        options={SORT_OPTIONS}
        labelPrefix="Sort: "
        currentLabel={currentSortLabel}
      />
    </div>
  );
}
