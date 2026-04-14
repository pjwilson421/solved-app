import type { FileEntry } from "@/components/files/types";

/** Canonical demo tree (was `components/files/demo-data`). */
export const DEMO_FILE_ENTRIES: FileEntry[] = [
  {
    id: "f1",
    name: "Campaign Assets",
    kind: "folder",
    typeLabel: "Folder",
    dateModified: "Mar 28, 2026",
    sizeLabel: null,
    parentId: null,
    accent: "muted",
  },
  {
    id: "f2",
    name: "Launch_Concept_01.txt",
    kind: "file",
    typeLabel: "Text",
    dateModified: "Mar 28, 2026",
    sizeLabel: "14 KB",
    parentId: null,
  },
  {
    id: "f3",
    name: "Moodboard_A_v3.pdf",
    kind: "file",
    typeLabel: "PDF",
    dateModified: "Mar 27, 2026",
    sizeLabel: "2.4 MB",
    parentId: null,
  },
  {
    id: "f4",
    name: "Hero_Render_Final.png",
    kind: "file",
    typeLabel: "Image",
    dateModified: "Mar 26, 2026",
    sizeLabel: "8.1 MB",
    parentId: null,
  },
  {
    id: "f5",
    name: "Storyboard_Notes.doc",
    kind: "file",
    typeLabel: "Doc",
    dateModified: "Mar 25, 2026",
    sizeLabel: "486 KB",
    parentId: null,
  },
  {
    id: "f6",
    name: "Source Footage",
    kind: "folder",
    typeLabel: "Folder",
    dateModified: "Mar 24, 2026",
    sizeLabel: null,
    parentId: null,
  },
  {
    id: "f7",
    name: "Clip_Select_03.mov",
    kind: "file",
    typeLabel: "Video",
    dateModified: "Mar 23, 2026",
    sizeLabel: "128 MB",
    parentId: "f6",
  },
];

/** Fresh array + shallow row clone for mutable app catalog. */
export function createInitialFileEntries(): FileEntry[] {
  return DEMO_FILE_ENTRIES.map((e) => ({ ...e }));
}
