"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShellNav } from "@/lib/use-shell-nav";
import { useShellNavReset } from "@/lib/shell-nav-reset-context";
import { Header } from "../create-image/Header";
import {
  Sidebar,
  SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS,
} from "../create-image/Sidebar";
import { LeftNavRail } from "@/components/shell/LeftNavRail";
import type { HistoryItem } from "../create-image/types";
import { MOCK_TEMPLATES } from "../create-image/types";
import { cn } from "@/lib/utils";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import { FilesDropZone } from "./FilesDropZone";
import { FileListRow } from "./FileListRow";
import { FilesGrid } from "./FilesGrid";
import { FilesListHeader } from "./FilesListHeader";
import { FilesDesktopHeaderActions, FilesToolbar } from "./FilesToolbar";
import { FilesToolbarFilters } from "./FilesToolbarFilters";
import { FileMoveDialog } from "./FileMoveDialog";
import { createUploadedFileEntryAsync } from "./file-upload-entry";
import {
  fileEntryHasCatalogPreview,
  fileEntryVisualThumbSrc,
} from "./file-entry-image-src";
import type { FileEntry, FilesViewMode } from "./types";
import type { FileRowMenuAction } from "./FileRowActionsMenu";
import { type SortOption, genericSort } from "@/lib/app-data/sort-filter-utils";
import { writePendingPromptAttachment } from "@/lib/prompt-attachment-handoff";

const EMPTY_HISTORY: HistoryItem[] = [];

function filterEntries(entries: FileEntry[], query: string): FileEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.typeLabel.toLowerCase().includes(q),
  );
}

function depthForEntry(
  entries: FileEntry[],
  id: string,
  memo = new Map<string, number>(),
): number {
  if (memo.has(id)) return memo.get(id)!;
  const e = entries.find((x) => x.id === id);
  if (!e || !e.parentId) {
    memo.set(id, 0);
    return 0;
  }
  const d = 1 + depthForEntry(entries, e.parentId, memo);
  memo.set(id, d);
  return d;
}

/** Ancestors from root to `folderId` (inclusive). */
function folderPathFromRoot(entries: FileEntry[], folderId: string): FileEntry[] {
  const rev: FileEntry[] = [];
  let id: string | null = folderId;
  while (id) {
    const e = entries.find((x) => x.id === id);
    if (!e) break;
    rev.push(e);
    id = e.parentId;
  }
  return rev.reverse();
}

function viewModeFromSearchParams(
  params: ReturnType<typeof useSearchParams>,
): FilesViewMode {
  return params.get("view") === "grid" ? "grid" : "list";
}

export function FilesClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, activeMainNav } = useShellNav();
  const { filesResetVersion } = useShellNavReset();
  const viewFromUrl = viewModeFromSearchParams(searchParams);
  const [viewMode, setViewMode] = useState<FilesViewMode>(viewFromUrl);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [moveTargetId, setMoveTargetId] = useState<string | null>(null);
  const [movePortalReady, setMovePortalReady] = useState(false);
  /** `null` = root (only `parentId == null` items). Otherwise show direct children of this folder. */
  const [folderScopeId, setFolderScopeId] = useState<string | null>(null);

  useEffect(() => {
    setViewMode(viewFromUrl);
  }, [viewFromUrl]);

  useEffect(() => {
    setMovePortalReady(true);
  }, []);

  const setFilesViewMode = useCallback(
    (next: FilesViewMode) => {
      setViewMode(next);
      const q = new URLSearchParams(searchParams.toString());
      if (next === "list") q.delete("view");
      else q.set("view", "grid");
      const qs = q.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const desktopMiddleColumnRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileColumnRef = useRef<HTMLElement>(null);

  const desktopScrollBottomPadPx = 0;
  const mobileScrollBottomPadPx = 0;

  const { fileEntries, updateFileEntries } = useAppData();
  const {
    renameFile,
    deleteCatalogItem,
    moveFile,
    downloadItem,
    openItem,
  } = useAppItemActions();

  useEffect(() => {
    if (filesResetVersion === 0) return;
    setSearchQuery("");
    setFilterOpen(false);
    setTypeFilter(null);
    setSortOption("date-desc");
    setFolderScopeId(null);
    setMoveTargetId(null);
  }, [filesResetVersion]);

  const folderHasChildItems = useCallback(
    (folderId: string) => fileEntries.some((e) => e.parentId === folderId),
    [fileEntries],
  );

  const moveFileRef = useRef(moveFile);
  moveFileRef.current = moveFile;

  const handleMoveConfirm = useCallback(
    (fileId: string, parentId: string | null, _folderLabel: string) => {
      moveFileRef.current(fileId, parentId);
    },
    [],
  );

  const moveItem = useMemo(
    () =>
      moveTargetId
        ? (fileEntries.find((e) => e.id === moveTargetId) ?? null)
        : null,
    [moveTargetId, fileEntries],
  );

  useEffect(() => {
    if (!folderScopeId) return;
    const folder = fileEntries.find(
      (e) => e.id === folderScopeId && e.kind === "folder",
    );
    if (!folder) setFolderScopeId(null);
  }, [fileEntries, folderScopeId]);

  const scopedEntries = useMemo(() => {
    return fileEntries.filter((e) =>
      folderScopeId === null
        ? e.parentId == null
        : e.parentId === folderScopeId,
    );
  }, [fileEntries, folderScopeId]);

  const breadcrumbFolders = useMemo(() => {
    if (!folderScopeId) return [];
    return folderPathFromRoot(fileEntries, folderScopeId);
  }, [fileEntries, folderScopeId]);

  const currentFolder = useMemo(() => {
    return folderScopeId ? fileEntries.find((e) => e.id === folderScopeId) : null;
  }, [fileEntries, folderScopeId]);

  const visibleEntries = useMemo(() => {
    let list = filterEntries(scopedEntries, searchQuery);
    if (typeFilter) {
      list = list.filter((e) => e.typeLabel === typeFilter);
    }
    return genericSort(
      list,
      sortOption,
      (e) => e.name,
      (e) => new Date(e.dateModified).getTime(),
      // Preserve folder behavior: folders always ordered first
      (e) => e.kind === "folder"
    );
  }, [scopedEntries, searchQuery, typeFilter, sortOption]);

  const handleFolderOpen = useCallback((folderId: string) => {
    setFolderScopeId(folderId);
  }, []);

  const handleFileOpenPreview = useCallback((entry: FileEntry) => {
    openItem(appItemRef.file(entry.id));
  }, [openItem]);

  const goFolderUp = useCallback(() => {
    if (!folderScopeId) return;
    const cur = fileEntries.find((e) => e.id === folderScopeId);
    setFolderScopeId(cur?.parentId ?? null);
  }, [folderScopeId, fileEntries]);

  /**
   * Shared catalog upload: `FilesDropZone` calls this with `File[]` from the picker or drop.
   * `parentId` is `folderScopeId` when inside a folder, else `null` (root).
   * `FileEntry` uses `dateModified` for the upload timestamp (no separate `createdAt` field).
   */
  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      if (!files.length) return;

      const parentId = folderScopeId;

      let newEntries: FileEntry[];
      try {
        newEntries = await Promise.all(
          files.map((f) => createUploadedFileEntryAsync(f, parentId)),
        );
      } catch (err) {
        console.error("[FilesClient] handleFilesUpload failed", err);
        return;
      }
      updateFileEntries((prev) => [...prev, ...newEntries]);

      setSearchQuery("");
      setTypeFilter(null);
    },
    [folderScopeId, updateFileEntries],
  );

  const handleFileMenu = useCallback(
    (id: string, action: FileRowMenuAction) => {
      const ref = appItemRef.file(id);
      const entry = fileEntries.find((e) => e.id === id);
      if (!entry) return;

      if (action.startsWith("Use in prompt:")) {
        if (entry.kind !== "file") return;
        const url = fileEntryVisualThumbSrc(entry);
        if (!url) return;
        const destination = action.slice("Use in prompt:".length);
        const target =
          destination === "Chat"
            ? "chat"
            : destination === "Create Image"
              ? "create-image"
              : destination === "Image Editor"
                ? "image-editor"
                : destination === "Create Video"
                  ? "create-video"
                  : null;
        if (!target) return;
        writePendingPromptAttachment({
          target,
          fileId: entry.id,
          name: entry.name,
          url,
        });
        navigate(target);
        return;
      }

      switch (action) {
        case "Open":
          openItem(ref);
          break;
        case "Rename": {
          const next = window.prompt("Rename", entry.name);
          if (next == null) return;
          const trimmed = next.trim();
          if (!trimmed || trimmed === entry.name) return;
          renameFile(id, trimmed);
          break;
        }
        case "Download":
          if (entry.kind === "folder") return;
          downloadItem(ref);
          break;
        case "Move":
          setMoveTargetId(id);
          break;
        case "Delete":
          deleteCatalogItem(ref);
          break;
        default:
          break;
      }
    },
    [
      fileEntries,
      renameFile,
      deleteCatalogItem,
      downloadItem,
      openItem,
      navigate,
    ],
  );

  const filterTypes = useMemo(() => {
    const s = new Set<string>();
    for (const e of fileEntries) s.add(e.typeLabel);
    return [...s].sort();
  }, [fileEntries]);

  const filesMainInner = (
    toolbarVariant: "desktop" | "mobile",
    showDesktopChrome: boolean,
  ) => (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1
          className={cn(
            "min-w-0 flex-1 truncate text-left",
            SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS,
          )}
        >
          {currentFolder ? currentFolder.name : (toolbarVariant === "mobile" ? "All files" : "All files")}
        </h1>

      </div>

      {folderScopeId !== null ? (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-2">
          <button
            type="button"
            onClick={goFolderUp}
            className="shrink-0 flex items-center gap-1 rounded-full py-1 pr-2 text-[11px] font-medium text-tx-secondary transition-colors hover:text-white"
          >
            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M7.5 9L4.5 6L7.5 3" />
            </svg>
            Back
          </button>
          <div className="h-3 w-px bg-panel-hover/80 shrink-0" aria-hidden />
          <nav
            className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-tx-secondary ml-1"
            aria-label="Folder path"
          >
            <button
              type="button"
              onClick={() => setFolderScopeId(null)}
              className="shrink-0 hover:text-white"
            >
              All files
            </button>
            {breadcrumbFolders.map((f, i) => (
              <span key={f.id} className="flex min-w-0 items-center gap-1">
                <span className="shrink-0 text-tx-muted" aria-hidden>
                  /
                </span>
                {i < breadcrumbFolders.length - 1 ? (
                  <button
                    type="button"
                    onClick={() => setFolderScopeId(f.id)}
                    className="min-w-0 truncate text-left transition-colors hover:text-white hover:underline"
                  >
                    {f.name}
                  </button>
                ) : (
                  <span className="min-w-0 truncate text-white">{f.name}</span>
                )}
              </span>
            ))}
          </nav>
        </div>
      ) : null}

      <FilesToolbar
        variant={toolbarVariant}
        showDesktopExtras={showDesktopChrome}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onFilesUpload={handleFilesUpload}
        desktopPrimaryRightSlot={
          showDesktopChrome && toolbarVariant === "desktop" ? (
            <div className="flex items-center gap-2">
              <FilesToolbarFilters
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                sortOption={sortOption}
                onSortChange={setSortOption}
                availableTypes={filterTypes}
                compactLayout={false}
              />
              <FilesDesktopHeaderActions
                menuButtonVariant="list"
                showAddUserButton={true}
                onListViewClick={() => setFilesViewMode("list")}
                listViewActive={viewMode === "list"}
                onGridViewClick={() => setFilesViewMode("grid")}
                gridViewActive={viewMode === "grid"}
              />
            </div>
          ) : undefined
        }
      />

      {filterOpen ? (
        <div
          className="flex w-full min-w-0 flex-col gap-0.5 bg-[#07195b] px-1 py-1 rounded-2xl mt-1 shadow-lg"
          role="listbox"
          aria-label="Filter by file type"
        >
          <button
            type="button"
            role="option"
            aria-selected={typeFilter === null}
            onClick={() => setTypeFilter(null)}
            className={cn(
              "w-full cursor-pointer rounded-full px-3 py-2 text-left text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-panel-hover",
              typeFilter === null
                ? "bg-panel-pressed text-white hover:bg-panel-hover active:bg-panel-pressed"
                : "text-tx-secondary hover:bg-panel-hover hover:text-white active:bg-panel-pressed focus-visible:text-white",
            )}
          >
            All Types
          </button>
          {filterTypes.map((t) => (
            <button
              key={t}
              type="button"
              role="option"
              aria-selected={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              className={cn(
                "w-full cursor-pointer rounded-full px-3 py-2 text-left text-[11px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-panel-hover",
                typeFilter === t
                  ? "bg-panel-pressed text-white hover:bg-panel-hover active:bg-panel-pressed"
                  : "text-tx-secondary hover:bg-panel-hover hover:text-white active:bg-panel-pressed focus-visible:text-white",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      ) : null}

      <>
        {viewMode === "list" ? <FilesListHeader /> : null}
        {visibleEntries.length === 0 ? (
          <p className="py-6 text-left text-[12px] leading-relaxed text-tx-secondary sm:text-[13px]">
            {!searchQuery.trim() && !typeFilter && scopedEntries.length === 0
              ? folderScopeId === null
                ? "No files yet."
                : "This folder is empty."
              : "No files match your search or filters."}
          </p>
        ) : viewMode === "list" ? (
          <div className="flex flex-col">
            {visibleEntries.map((entry) => (
              <FileListRow
                key={entry.id}
                entry={entry}
                depth={
                  folderScopeId === null
                    ? depthForEntry(fileEntries, entry.id)
                    : 0
                }
                variant={toolbarVariant}
                onMenuAction={handleFileMenu}
                onFolderOpen={handleFolderOpen}
                onFileOpen={handleFileOpenPreview}
                folderIsEmpty={
                  entry.kind === "folder"
                    ? !folderHasChildItems(entry.id)
                    : undefined
                }
              />
            ))}
          </div>
        ) : (
          <FilesGrid
            entries={visibleEntries}
            onMenuAction={handleFileMenu}
            onFolderOpen={handleFolderOpen}
            onFileOpen={handleFileOpenPreview}
            folderHasChildItems={folderHasChildItems}
          />
        )}
      </>
    </>
  );

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-tx-primary",
        "xl:[--create-image-prompt-max:1000px]",
      )}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden xl:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header
            variant="mobile"
            mobileTitle="ALL FILES"
            mobileNavTriggerSide="end"
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <LeftNavRail className="hidden shrink-0 xl:flex">
            <Sidebar
              className="flex min-h-0 min-w-0 w-full flex-1 flex-col"
              activeId={activeMainNav}
              onNavigate={navigate}
            />
          </LeftNavRail>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-hidden px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:flex-1 xl:overflow-hidden xl:px-0 xl:pr-[40px]">
            <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
              <div
                ref={desktopScrollRef}
                className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto"
                style={{
                  scrollPaddingBottom: desktopScrollBottomPadPx,
                }}
              >
                <div
                  ref={desktopMiddleColumnRef}
                  className="flex w-full min-w-0 flex-col items-stretch pt-3 text-left"
                  style={{
                    paddingBottom: desktopScrollBottomPadPx,
                  }}
                >
                  <div className="px-4 md:px-6">
                    <div className="rounded-[18px] bg-transparent">
                      <div className="flex w-full min-w-0 flex-col gap-4 p-4 md:p-6">
                        {filesMainInner("desktop", true)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg xl:hidden">
        <Header
          variant="mobile"
          mobileTitle="ALL FILES"
          mobileNavTriggerSide="end"
        />
        <div className="mx-4 mt-2 mb-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] bg-transparent">
          <div
            ref={mobileScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            style={{
              scrollPaddingBottom: mobileScrollBottomPadPx,
            }}
          >
            <main
              ref={mobileColumnRef}
              className="flex w-full min-w-0 flex-col px-4 pt-3"
              style={{
                paddingBottom: mobileScrollBottomPadPx,
              }}
            >
              <div className="flex w-full min-w-0 flex-col gap-4">
                {filesMainInner("mobile", false)}
              </div>
            </main>
          </div>
        </div>
      </div>

      {movePortalReady
        ? createPortal(
            <FileMoveDialog
              open={moveTargetId !== null && moveItem !== null}
              movingFileId={moveTargetId}
              item={moveItem}
              allEntries={fileEntries}
              onClose={() => setMoveTargetId(null)}
              onConfirm={handleMoveConfirm}
            />,
            document.body,
          )
        : null}
    </div>
  );
}
