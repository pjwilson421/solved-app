"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShellNav } from "@/lib/use-shell-nav";
import { useShellNavReset } from "@/lib/shell-nav-reset-context";
import { Header } from "../create-image/Header";
import {
  Sidebar,
  SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS,
} from "../create-image/Sidebar";
import { LeftNavRail } from "@/components/shell/LeftNavRail";
import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { FileListRow } from "../files/FileListRow";
import { FilesGrid } from "../files/FilesGrid";
import { FilesDesktopHeaderActions, FilesToolbar } from "../files/FilesToolbar";
import type { FileRowMenuAction } from "../files/FileRowActionsMenu";
import { likedChatTitle } from "../chat/liked-chats-storage";
import { LikedChatEntryRow } from "../chat/LikedChatEntryRow";
import { LikedChatGridCard } from "../chat/LikedChatGridCard";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import { getLikedHistoryEntries } from "./get-liked-history-entries";
import { groupEntriesByBucket } from "./history-buckets";
import { FilesListHeader } from "../files/FilesListHeader";
import { HistoryGrid } from "./HistoryGrid";
import { HistoryListRow } from "./HistoryListRow";
import { HistorySectionLabel } from "./HistorySectionLabel";
import {
  HistoryToolbarFilters,
  type HistoryActivityFilter,
} from "./HistoryToolbar";
import type { ActivityHistoryEntry, HistoryActivityKind } from "./types";
import { type SortOption, genericSort } from "@/lib/app-data/sort-filter-utils";

type HistoryViewMode = "grid" | "list";

function historyViewModeFromSearchParams(
  params: ReturnType<typeof useSearchParams>,
): HistoryViewMode {
  return params.get("view") === "grid" ? "grid" : "list";
}

function activityKindFromFilter(
  f: HistoryActivityFilter,
): HistoryActivityKind | null {
  if (f === "chats") return "chat";
  if (f === "images") return "image";
  if (f === "videos") return "video";
  return null;
}

function filterByQuery(
  entries: ActivityHistoryEntry[],
  q: string,
): ActivityHistoryEntry[] {
  const s = q.trim().toLowerCase();
  if (!s) return entries;
  return entries.filter(
    (e) =>
      e.title.toLowerCase().includes(s) ||
      e.subtitle.toLowerCase().includes(s),
  );
}

export type HistoryClientPage = "history" | "liked";

export type HistoryClientProps = {
  page?: HistoryClientPage;
};

type EditingNameTarget =
  | null
  | { domain: "activity"; id: string }
  | { domain: "file"; id: string };

export function HistoryClient({ page = "history" }: HistoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, activeMainNav } = useShellNav();
  const { historyResetVersion, likedResetVersion } = useShellNavReset();
  const viewFromUrl = historyViewModeFromSearchParams(searchParams);
  const [historyViewMode, setHistoryViewMode] =
    useState<HistoryViewMode>(viewFromUrl);

  useEffect(() => {
    setHistoryViewMode(viewFromUrl);
  }, [viewFromUrl]);

  useEffect(() => {
    if (historyResetVersion === 0 || page !== "history") return;
    setSearchQuery("");
    setActivityFilter("all");
    setSortOption("date-desc");
    setEditingNameTarget(null);
    setEditedName("");
  }, [historyResetVersion, page]);

  useEffect(() => {
    if (likedResetVersion === 0 || page !== "liked") return;
    setSearchQuery("");
    setActivityFilter("all");
    setSortOption("date-desc");
    setEditingNameTarget(null);
    setEditedName("");
  }, [likedResetVersion, page]);

  const setHistoryGridView = useCallback(() => {
    setHistoryViewMode("grid");
    const q = new URLSearchParams(searchParams.toString());
    q.set("view", "grid");
    const qs = q.toString();
    router.replace(`${pathname}?${qs}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const setHistoryListView = useCallback(() => {
    setHistoryViewMode("list");
    const q = new URLSearchParams(searchParams.toString());
    q.delete("view");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const isGridView = historyViewMode === "grid";

  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] =
    useState<HistoryActivityFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");

  const {
    deleteCatalogItem,
    openItem,
    renameFile,
    downloadItem,
  } = useAppItemActions();

  const { isLiked } = useLikedItems();
  const isActivityLiked = useCallback(
    (id: string) => isLiked(likedKey.activity(id)),
    [isLiked],
  );

  const { activityEntries, fileEntries, chatThreads, updateActivityEntries } =
    useAppData();

  const [editingNameTarget, setEditingNameTarget] =
    useState<EditingNameTarget>(null);
  const [editedName, setEditedName] = useState("");
  const skipBlurCommitRef = useRef(false);

  useEffect(() => {
    if (!editingNameTarget) return;
    if (editingNameTarget.domain === "activity") {
      if (!activityEntries.some((e) => e.id === editingNameTarget.id)) {
        setEditingNameTarget(null);
        setEditedName("");
      }
    } else if (!fileEntries.some((e) => e.id === editingNameTarget.id)) {
      setEditingNameTarget(null);
      setEditedName("");
    }
  }, [activityEntries, fileEntries, editingNameTarget]);

  const folderHasChildItems = useCallback(
    (folderId: string) => fileEntries.some((e) => e.parentId === folderId),
    [fileEntries],
  );
  const allEntries = useMemo(() => {
    const completedChatThreads = chatThreads.filter((t) =>
      t.messages.some((m) => m.role === "user" && m.text.trim().length > 0),
    );
    const chatActivityEntries: ActivityHistoryEntry[] = completedChatThreads.map((t) => {
      const title = likedChatTitle(t);
      return {
        id: t.id,
        kind: "chat" as const,
        title,
        subtitle: "Chat",
        occurredAt: new Date(t.savedAt),
      };
    });
    return [
      ...activityEntries.filter((e) => e.kind !== "chat"),
      ...chatActivityEntries,
    ];
  }, [activityEntries, chatThreads]);

  const sourceEntries = useMemo(
    () =>
      page === "liked"
        ? getLikedHistoryEntries(allEntries, isActivityLiked)
        : allEntries,
    [page, allEntries, isActivityLiked],
  );

  const likedFileEntries = useMemo(() => {
    if (page !== "liked") return [];
    if (activityFilter === "chats") return [];
    if (activityFilter === "videos") return [];

    const q = searchQuery.trim().toLowerCase();
    let list = fileEntries.filter((e) => isLiked(likedKey.file(e.id)));
    
    // Explicitly enforce Images/Edited type matching from files catalog
    if (activityFilter === "images" || activityFilter === "edited") {
      list = list.filter((e) => e.typeLabel === "Image");
    }

    if (q) {
      list = list.filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.typeLabel.toLowerCase().includes(q),
      );
    }
    
    return genericSort(
      list,
      sortOption,
      (e) => e.name,
      (e) => new Date(e.dateModified).getTime()
    );
  }, [page, isLiked, searchQuery, fileEntries, activityFilter, sortOption]);

  const filteredLikedChats = useMemo(() => {
    if (page !== "liked") return [];
    if (activityFilter !== "all" && activityFilter !== "chats") return [];

    let list = chatThreads.filter((t) => isLiked(likedKey.chat(t.id)));
    
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        if (likedChatTitle(r).toLowerCase().includes(q)) return true;
        return r.messages.some((m) => m.text.toLowerCase().includes(q));
      });
    }

    return genericSort(
      list,
      sortOption,
      (t) => likedChatTitle(t),
      (t) => new Date(t.savedAt).getTime()
    );
  }, [page, chatThreads, isLiked, searchQuery, activityFilter, sortOption]);

  const visibleEntries = useMemo(() => {
    let list = filterByQuery(sourceEntries, searchQuery);
    const kindFilter = activityKindFromFilter(activityFilter);
    if (kindFilter) {
      list = list.filter((e) => {
        if (kindFilter === "image" && activityFilter === "edited") {
          return e.kind === "image" && e.edited === true;
        }
        if (kindFilter === "image") {
          return e.kind === "image" && e.edited !== true;
        }
        return e.kind === kindFilter;
      });
    }

    const sorted = genericSort(
      list,
      sortOption,
      (e) => e.title,
      (e) => e.occurredAt.getTime(),
    );
    /*
     * History (not Liked): omit `kind === "chat"` entries — they render via
     * LikedChatEntryRow / LikedChatGridCard, which still use `text-tx-secondary`
     * (legacy violet). Activity rows use the Files-aligned #315790 metadata.
     */
    if (page !== "history") return sorted;
    return sorted.filter((e) => e.kind !== "chat");
  }, [page, sourceEntries, searchQuery, activityFilter, sortOption]);

  const grouped = useMemo(
    () => groupEntriesByBucket(visibleEntries),
    [visibleEntries],
  );

  const handleNameCancelEdit = useCallback(() => {
    skipBlurCommitRef.current = true;
    setEditingNameTarget(null);
    setEditedName("");
  }, []);

  const handleActivityTitleCommit = useCallback(
    (id: string, rawValue: string) => {
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        return;
      }
      const entry = activityEntries.find((e) => e.id === id);
      if (!entry) {
        setEditingNameTarget(null);
        setEditedName("");
        return;
      }
      let next = rawValue.trim();
      if (!next) next = entry.title;
      if (next !== entry.title) {
        updateActivityEntries((prev) =>
          prev.map((e) => (e.id === id ? { ...e, title: next } : e)),
        );
      }
      setEditingNameTarget(null);
      setEditedName("");
    },
    [activityEntries, updateActivityEntries],
  );

  const handleFileNameCommit = useCallback(
    (id: string, rawValue: string) => {
      if (skipBlurCommitRef.current) {
        skipBlurCommitRef.current = false;
        return;
      }
      const entry = fileEntries.find((e) => e.id === id);
      if (!entry) {
        setEditingNameTarget(null);
        setEditedName("");
        return;
      }
      let next = rawValue.trim();
      if (!next) next = entry.name;
      if (next !== entry.name) renameFile(id, next);
      setEditingNameTarget(null);
      setEditedName("");
    },
    [fileEntries, renameFile],
  );

  const handleActivityMenu = useCallback(
    (id: string, action: FileRowMenuAction) => {
      if (action === "Delete") {
        deleteCatalogItem(appItemRef.activity(id));
        return;
      }
      if (action === "Open") {
        openItem(appItemRef.activity(id));
        return;
      }
      if (action === "Rename") {
        const act = allEntries.find((e) => e.id === id && e.kind !== "chat");
        if (!act) return;
        setEditingNameTarget({ domain: "activity", id });
        setEditedName(act.title);
      }
    },
    [allEntries, deleteCatalogItem, openItem],
  );

  const handleLikedFileMenu = useCallback(
    (id: string, action: FileRowMenuAction) => {
      const ref = appItemRef.file(id);
      const entry = fileEntries.find((e) => e.id === id);
      if (!entry) return;
      switch (action) {
        case "Open":
          openItem(ref);
          break;
        case "Rename":
          setEditingNameTarget({ domain: "file", id });
          setEditedName(entry.name);
          break;
        case "Download":
          if (entry.kind === "folder") return;
          downloadItem(ref);
          break;
        case "Move":
          break;
        case "Delete":
          deleteCatalogItem(ref);
          break;
        default:
          break;
      }
    },
    [fileEntries, deleteCatalogItem, downloadItem, openItem],
  );

  const handleItemOpen = useCallback((id: string) => {
    openItem(appItemRef.activity(id));
  }, [openItem]);

  const emptyListCopy =
    page === "liked"
      ? searchQuery.trim() || activityFilter !== "all"
        ? "No liked items match your search or filters."
        : "No liked items yet."
      : searchQuery.trim() || activityFilter !== "all"
        ? "No history matches your search or filters."
        : "No history yet.";

  const emptyPrimarySlotHidden =
    page === "liked" &&
    (likedFileEntries.length > 0 || filteredLikedChats.length > 0);

  const historyEmptyUnfiltered =
    visibleEntries.length === 0 &&
    !emptyPrimarySlotHidden &&
    !searchQuery.trim() &&
    activityFilter === "all";

  const scrollableInner = (
    toolbarVariant: "desktop" | "mobile",
    showDesktopChrome: boolean,
    gridView: boolean,
  ) => {
    let globalIndex = 0;
    return (
      <>
        <div className="flex min-w-0 w-full items-center gap-4">
          <h1
            className={cn(
              "min-w-0 flex-1 truncate text-left",
              SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS,
            )}
          >
            {page === "liked" ? "ALL LIKED" : "ALL HISTORY"}
          </h1>
        </div>

        <FilesToolbar
          variant={toolbarVariant}
          showDesktopExtras={showDesktopChrome}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          typeFilter={null}
          onTypeFilterChange={() => {}}
          fileTypeLabelsForFilter={[]}
          desktopPrimaryRightSlot={
            showDesktopChrome && toolbarVariant === "desktop" ? (
              <div className="flex items-center gap-2">
                <HistoryToolbarFilters
                  activityFilter={activityFilter}
                  onActivityFilterChange={setActivityFilter}
                  sortOption={sortOption}
                  onSortChange={setSortOption}
                  compactLayout={false}
                />
                <FilesDesktopHeaderActions
                  menuButtonVariant="list"
                  onListViewClick={setHistoryListView}
                  listViewActive={!gridView}
                  onGridViewClick={setHistoryGridView}
                  gridViewActive={gridView}
                />
              </div>
            ) : undefined
          }
          customFilterSortSlot={
            toolbarVariant === "mobile" ? (
              <HistoryToolbarFilters
                activityFilter={activityFilter}
                onActivityFilterChange={setActivityFilter}
                sortOption={sortOption}
                onSortChange={setSortOption}
                compactLayout={true}
              />
            ) : undefined
          }
          searchPlaceholder={
            page === "liked" ? "Search liked assets..." : "Search assets..."
          }
          searchLabel={page === "liked" ? "Search liked" : "Search history"}
          searchInputId={
            page === "liked" ? "liked-assets-search" : "history-search"
          }
        />

        {visibleEntries.length === 0 ? (
          emptyPrimarySlotHidden ? null : (
            <p
              className={cn(
                "py-6 text-left text-[12px] leading-relaxed sm:text-[13px]",
                historyEmptyUnfiltered ? "text-[#ffffff]" : "text-tx-secondary",
              )}
            >
              {emptyListCopy}
            </p>
          )
        ) : gridView ? (
          <HistoryGrid
            entries={visibleEntries}
            onMenuAction={handleActivityMenu}
            onItemOpen={handleItemOpen}
            titleEdit={{
              editingActivityId:
                editingNameTarget?.domain === "activity"
                  ? editingNameTarget.id
                  : null,
              editedName,
              onEditedNameChange: setEditedName,
              onStart: (id, title) => {
                setEditingNameTarget({ domain: "activity", id });
                setEditedName(title);
              },
              onCommit: handleActivityTitleCommit,
              onCancel: handleNameCancelEdit,
            }}
          />
        ) : (
          <div className="flex min-w-0 flex-col gap-6">
            <FilesListHeader />
            {grouped.map((group, gi) => (
              <div key={group.bucket} className="min-w-0">
                <HistorySectionLabel
                  className={cn(gi > 0 && "mt-1 border-t border-edge-subtle pt-6")}
                >
                  {group.label}
                </HistorySectionLabel>
                <ul
                  className="mt-3 flex min-w-0 flex-col"
                  role="list"
                >
                  {group.items.map((entry) => {
                    const i = globalIndex++;
                    if (entry.kind === "chat") {
                      const record = chatThreads.find((t) => t.id === entry.id);
                      if (!record) return null;
                      return (
                        <li key={entry.id} className="min-w-0">
                          <LikedChatEntryRow
                            record={record}
                            variant={toolbarVariant}
                            rowIndex={i}
                            onOpen={() =>
                              router.push(
                                `/chat?openChat=${encodeURIComponent(record.id)}`
                              )
                            }
                          />
                        </li>
                      );
                    }
                    return (
                      <li key={entry.id} className="min-w-0">
                        <HistoryListRow
                          entry={entry}
                          variant={toolbarVariant}
                          rowIndex={i}
                          enableTitleInlineRename
                          isTitleRenaming={
                            editingNameTarget?.domain === "activity" &&
                            editingNameTarget.id === entry.id
                          }
                          titleRenameValue={editedName}
                          onTitleRenameChange={setEditedName}
                          onStartTitleRename={() => {
                            setEditingNameTarget({
                              domain: "activity",
                              id: entry.id,
                            });
                            setEditedName(entry.title);
                          }}
                          onTitleRenameSubmit={() =>
                            handleActivityTitleCommit(entry.id, editedName)
                          }
                          onTitleRenameCancel={handleNameCancelEdit}
                          onMenuAction={handleActivityMenu}
                          onItemOpen={handleItemOpen}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}

        {page === "liked" && likedFileEntries.length > 0 ? (
          /*
           * List + liked-files-only: same shell as History time buckets — `flex flex-col gap-6`,
           * `FilesListHeader`, then one group `<div>` with `HistorySectionLabel` + `mt-3` list (matches "Older" etc.).
           * After activity / grid: outer `mt-6` (= inter-bucket `gap-6`) + label `mt-1 border-t pt-6` like `gi > 0`.
           */
          !gridView && visibleEntries.length === 0 ? (
            <div className="flex min-w-0 flex-col gap-6">
              <FilesListHeader />
              <div className="min-w-0">
                <HistorySectionLabel>Files</HistorySectionLabel>
                <ul className="mt-3 flex min-w-0 flex-col" role="list">
                  {likedFileEntries.map((entry) => (
                    <li key={entry.id} className="min-w-0">
                      <FileListRow
                        entry={entry}
                        variant={toolbarVariant}
                        nameEdit={{
                          isEditing:
                            editingNameTarget?.domain === "file" &&
                            editingNameTarget.id === entry.id,
                          editedName,
                          onEditedNameChange: setEditedName,
                          onStart: () => {
                            setEditingNameTarget({
                              domain: "file",
                              id: entry.id,
                            });
                            setEditedName(entry.name);
                          },
                          onCommit: (raw) =>
                            handleFileNameCommit(entry.id, raw),
                          onCancel: handleNameCancelEdit,
                        }}
                        onMenuAction={handleLikedFileMenu}
                        folderIsEmpty={
                          entry.kind === "folder"
                            ? !folderHasChildItems(entry.id)
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "min-w-0",
                visibleEntries.length > 0 && "mt-6",
              )}
            >
              <HistorySectionLabel
                className={cn(
                  visibleEntries.length > 0 &&
                    "mt-1 border-t border-edge-subtle pt-6",
                )}
              >
                Files
              </HistorySectionLabel>
              {gridView ? (
                <FilesGrid
                  entries={likedFileEntries}
                  nameEdit={{
                    editingFileId:
                      editingNameTarget?.domain === "file"
                        ? editingNameTarget.id
                        : null,
                    editedName,
                    onEditedNameChange: setEditedName,
                    onStart: (id, name) => {
                      setEditingNameTarget({ domain: "file", id });
                      setEditedName(name);
                    },
                    onCommit: handleFileNameCommit,
                    onCancel: handleNameCancelEdit,
                  }}
                  onMenuAction={handleLikedFileMenu}
                  folderHasChildItems={folderHasChildItems}
                />
              ) : (
                <ul className="mt-3 flex min-w-0 flex-col" role="list">
                  {likedFileEntries.map((entry) => (
                    <li key={entry.id} className="min-w-0">
                      <FileListRow
                        entry={entry}
                        variant={toolbarVariant}
                        nameEdit={{
                          isEditing:
                            editingNameTarget?.domain === "file" &&
                            editingNameTarget.id === entry.id,
                          editedName,
                          onEditedNameChange: setEditedName,
                          onStart: () => {
                            setEditingNameTarget({
                              domain: "file",
                              id: entry.id,
                            });
                            setEditedName(entry.name);
                          },
                          onCommit: (raw) =>
                            handleFileNameCommit(entry.id, raw),
                          onCancel: handleNameCancelEdit,
                        }}
                        onMenuAction={handleLikedFileMenu}
                        folderIsEmpty={
                          entry.kind === "folder"
                            ? !folderHasChildItems(entry.id)
                            : undefined
                        }
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        ) : null}

        {page === "liked" && filteredLikedChats.length > 0 ? (
          <>
            <HistorySectionLabel
              className={cn(
                (visibleEntries.length > 0 || likedFileEntries.length > 0) &&
                  "mt-6 border-t border-edge-subtle pt-6",
              )}
            >
              Chats
            </HistorySectionLabel>
            {gridView ? (
              <ul
                className="mt-3 grid w-full min-w-0 grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 sm:gap-y-8 xl:grid-cols-4"
                role="list"
              >
                {filteredLikedChats.map((record, i) => (
                  <li key={record.id} className="min-w-0">
                    <LikedChatGridCard
                      record={record}
                      rowIndex={i}
                      onOpen={() =>
                        router.push(
                          `/chat?openChat=${encodeURIComponent(record.id)}`,
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 flex min-w-0 flex-col" role="list">
                {filteredLikedChats.map((record, i) => (
                  <li key={record.id} className="min-w-0">
                    <LikedChatEntryRow
                      record={record}
                      variant={toolbarVariant}
                      rowIndex={i}
                      onOpen={() =>
                        router.push(
                          `/chat?openChat=${encodeURIComponent(record.id)}`,
                        )
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </>
    );
  };

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
            mobileTitle={page === "liked" ? "LIKED" : "HISTORY"}
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
                className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto"
                style={{
                  scrollPaddingBottom: 0,
                }}
              >
                <div
                  className={cn(
                    "flex w-full min-w-0 flex-col items-stretch text-left",
                    "xl:pt-3",
                  )}
                  style={{
                    paddingBottom: 0,
                  }}
                >
                  <div className="px-4 md:px-6">
                    <div className="rounded-[18px] bg-transparent">
                      <div className="flex w-full min-w-0 flex-col gap-4 p-4 md:p-6">
                        {scrollableInner("desktop", true, isGridView)}
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
          mobileTitle={page === "liked" ? "LIKED" : "HISTORY"}
          mobileNavTriggerSide="end"
        />
        <div className="mx-4 mb-1 mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 sm:px-8">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center overflow-x-hidden">
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain">
                <main className="flex w-full min-w-0 flex-col items-stretch pt-6 text-left">
                  <div className="flex w-full min-w-0 flex-col gap-4">
                    {scrollableInner("mobile", false, isGridView)}
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
