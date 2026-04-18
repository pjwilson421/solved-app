import type { FileEntry } from "@/components/files/types";

export const DEMO_FILE_ENTRIES: FileEntry[] = [];

/** Fresh array + shallow row clone for mutable app catalog. */
export function createInitialFileEntries(): FileEntry[] {
  return DEMO_FILE_ENTRIES.map((e) => ({ ...e }));
}
