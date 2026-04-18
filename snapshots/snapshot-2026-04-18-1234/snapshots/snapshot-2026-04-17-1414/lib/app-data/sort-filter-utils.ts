export type SortOption = "date-desc" | "date-asc" | "name-asc" | "name-desc";

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "name-asc", label: "Name A-Z" },
  { value: "name-desc", label: "Name Z-A" },
];

export const SORT_LABEL_BY_VALUE: Record<SortOption, string> = {
  "date-desc": "Newest first",
  "date-asc": "Oldest first",
  "name-asc": "Name A-Z",
  "name-desc": "Name Z-A",
};

export function genericSort<T>(
  items: T[],
  sortOption: SortOption,
  getName: (item: T) => string,
  getDateMs: (item: T) => number,
  isFolder?: (item: T) => boolean,
): T[] {
  return [...items].sort((a, b) => {
    if (isFolder) {
      const aFolder = isFolder(a);
      const bFolder = isFolder(b);
      if (aFolder && !bFolder) return -1;
      if (!aFolder && bFolder) return 1;
    }

    if (sortOption === "name-asc") {
      return getName(a).localeCompare(getName(b), undefined, { sensitivity: "base" });
    }
    if (sortOption === "name-desc") {
      return getName(b).localeCompare(getName(a), undefined, { sensitivity: "base" });
    }
    if (sortOption === "date-asc") {
      return getDateMs(a) - getDateMs(b);
    }
    // Default to date-desc
    return getDateMs(b) - getDateMs(a);
  });
}
