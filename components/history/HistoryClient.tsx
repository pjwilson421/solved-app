"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useShellNav } from "@/lib/use-shell-nav";
import { useShellNavReset } from "@/lib/shell-nav-reset-context";
import { Header } from "../create-image/Header";
import { Sidebar } from "../create-image/Sidebar";
import {
  CREATE_IMAGE_SCROLL_RESERVE,
  SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX,
} from "../create-image/preview-frame-layout";
import { useMinWidth1280 } from "../create-image/use-create-image-preview-prompt-layout";
import { MobileCreateImageDrawer } from "../create-image/MobileCreateImageDrawer";
import type { HistoryItem } from "../create-image/types";
import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { FileListRow } from "../files/FileListRow";
import { FilesGrid } from "../files/FilesGrid";
import { FilesDesktopHeaderActions } from "../files/FilesToolbar";
import type { FileRowMenuAction } from "../files/FileRowActionsMenu";
import { likedChatTitle } from "../chat/liked-chats-storage";
import { chatTitleEditSeed } from "@/lib/app-data/chat-thread";
import { LikedChatEntryRow } from "../chat/LikedChatEntryRow";
import { LikedChatGridCard } from "../chat/LikedChatGridCard";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import { getLikedHistoryEntries } from "./get-liked-history-entries";
import { groupEntriesByBucket } from "./history-buckets";
import { HistoryGrid } from "./HistoryGrid";
import { HistoryListRow } from "./HistoryListRow";
import { HistorySectionLabel } from "./HistorySectionLabel";
import {
  HistoryToolbar,
  type HistoryActivityFilter,
} from "./HistoryToolbar";
import type { ActivityHistoryEntry, HistoryActivityKind } from "./types";
import { type SortOption, genericSort } from "@/lib/app-data/sort-filter-utils";

const EMPTY_HISTORY: HistoryItem[] = [];

type HistoryViewMode = "grid" | "list";

function historyViewModeFromSearchParams(
  params: ReturnType<typeof useSearchParams>,
  page: HistoryClientPage,
): HistoryViewMode {
  if (page === "history") {
    return params.get("view") === "grid" ? "grid" : "list";
  }
  /* Liked: default list; grid only when ?view=grid (same URL convention as Files). */
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

export function HistoryClient({ page = "history" }: HistoryClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { navigate, activeMainNav } = useShellNav();
  const { historyResetVersion, likedResetVersion } = useShellNavReset();
  const viewFromUrl = historyViewModeFromSearchParams(searchParams, page);
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
  }, [historyResetVersion, page]);

  useEffect(() => {
    if (likedResetVersion === 0 || page !== "liked") return;
    setSearchQuery("");
    setActivityFilter("all");
    setSortOption("date-desc");
  }, [likedResetVersion, page]);

  const setHistoryGridView = useCallback(() => {
    setHistoryViewMode("grid");
    const q = new URLSearchParams(searchParams.toString());
    q.set("view", "grid");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const setHistoryListView = useCallback(() => {
    setHistoryViewMode("list");
    const q = new URLSearchParams(searchParams.toString());
    q.delete("view");
    const qs = q.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const isGridView = historyViewMode === "grid";

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activityFilter, setActivityFilter] =
    useState<HistoryActivityFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("date-desc");
  const [historyTitleRenamingId, setHistoryTitleRenamingId] = useState<
    string | null
  >(null);
  const [historyTitleRenameValue, setHistoryTitleRenameValue] = useState("");

  const minWidth1280 = useMinWidth1280();

  const { deleteCatalogItem, openItem, renameFile, downloadItem } =
    useAppItemActions();

  const { isLiked } = useLikedItems();
  const isActivityLiked = useCallback(
    (id: string) => isLiked(likedKey.activity(id)),
    [isLiked],
  );

  const {
    activityEntries,
    fileEntries,
    chatThreads,
    updateActivityEntries,
    updateChatThreads,
  } = useAppData();

  useEffect(() => {
    setHistoryTitleRenamingId(null);
    setHistoryTitleRenameValue("");
  }, [page]);

  const folderHasChildItems = useCallback(
    (folderId: string) => fileEntries.some((e) => e.parentId === folderId),
    [fileEntries],
  );
  const allEntries = useMemo(() => {
    const chatActivityEntries: ActivityHistoryEntry[] = chatThreads.map((t) => {
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

    return genericSort(
      list,
      sortOption,
      (e) => e.title,
      (e) => e.occurredAt.getTime()
    );
  }, [sourceEntries, searchQuery, activityFilter, sortOption]);

  const grouped = useMemo(
    () => groupEntriesByBucket(visibleEntries),
    [visibleEntries],
  );

  const handleItemOpen = useCallback((id: string) => {
    openItem(appItemRef.activity(id));
  }, [openItem]);

  const startHistoryTitleRename = useCallback(
    (id: string) => {
      if (page !== "history" && page !== "liked") return;
      const thread = chatThreads.find((t) => t.id === id);
      if (thread) {
        setHistoryTitleRenameValue(chatTitleEditSeed(thread));
        setHistoryTitleRenamingId(id);
        return;
      }
      const activityEntry = activityEntries.find((e) => e.id === id);
      if (activityEntry) {
        setHistoryTitleRenameValue(activityEntry.title);
        setHistoryTitleRenamingId(id);
        return;
      }
      const fileEntry = fileEntries.find((e) => e.id === id);
      if (fileEntry) {
        setHistoryTitleRenameValue(fileEntry.name);
        setHistoryTitleRenamingId(id);
      }
    },
    [page, chatThreads, activityEntries, fileEntries],
  );

  const cancelHistoryTitleRename = useCallback(() => {
    setHistoryTitleRenamingId(null);
    setHistoryTitleRenameValue("");
  }, []);

  const submitHistoryTitleRename = useCallback(() => {
    if ((page !== "history" && page !== "liked") || !historyTitleRenamingId) {
      return;
    }
    const trimmed = historyTitleRenameValue.trim();
    const thread = chatThreads.find((t) => t.id === historyTitleRenamingId);
    if (thread) {
      updateChatThreads((prev) =>
        prev.map((t) =>
          t.id === historyTitleRenamingId
            ? { ...t, displayTitle: trimmed || undefined }
            : t,
        ),
      );
    } else {
      const actEntry = activityEntries.find(
        (e) => e.id === historyTitleRenamingId,
      );
      if (actEntry) {
        if (trimmed && trimmed !== actEntry.title) {
          updateActivityEntries((prev) =>
            prev.map((e) =>
              e.id === historyTitleRenamingId ? { ...e, title: trimmed } : e,
            ),
          );
        }
      } else {
        const f = fileEntries.find((e) => e.id === historyTitleRenamingId);
        if (f && trimmed && trimmed !== f.name) {
          renameFile(historyTitleRenamingId, trimmed);
        }
      }
    }
    setHistoryTitleRenamingId(null);
    setHistoryTitleRenameValue("");
  }, [
    page,
    historyTitleRenamingId,
    historyTitleRenameValue,
    chatThreads,
    activityEntries,
    fileEntries,
    updateChatThreads,
    updateActivityEntries,
    renameFile,
  ]);

  const handleMenu = useCallback(
    (id: string, action: FileRowMenuAction) => {
      const fileHit = fileEntries.find((e) => e.id === id);
      if (fileHit) {
        if (action === "Delete") {
          deleteCatalogItem(appItemRef.file(id));
        } else if (action === "Open") {
          openItem(appItemRef.file(id));
        } else if (action === "Rename") {
          startHistoryTitleRename(id);
        } else if (action === "Download") {
          downloadItem(appItemRef.file(id));
        }
        return;
      }
      if (action === "Delete") {
        deleteCatalogItem(appItemRef.activity(id));
      } else if (action === "Open") {
        openItem(appItemRef.activity(id));
      } else if (action === "Rename") {
        startHistoryTitleRename(id);
      }
    },
    [
      fileEntries,
      deleteCatalogItem,
      openItem,
      downloadItem,
      startHistoryTitleRename,
    ],
  );

  const emptyListCopy =
    page === "liked"
      ? searchQuery.trim() || activityFilter !== "all"
        ? "No liked items match your search or filters."
        : "No liked items yet."
      : searchQuery.trim() || activityFilter !== "all"
        ? "No history matches your search or filters."
        : "No history yet.";

  const scrollableInner = (
    toolbarVariant: "desktop" | "mobile",
    showDesktopChrome: boolean,
    gridView: boolean,
  ) => {
    let globalIndex = 0;
    return (
      <>
        <div className="flex items-center justify-between gap-4">
          <h1
            className={cn(
              "min-w-0 flex-1 text-left font-bold uppercase leading-none text-white",
              "text-[11px] tracking-[0.11em] md:text-[12px] md:font-semibold md:tracking-[0.09em] lg:text-[13px] lg:tracking-[0.08em]",
            )}
          >
            {page === "liked"
              ? "Liked files"
              : toolbarVariant === "mobile"
                ? "All activity"
                : "All history"}
          </h1>
          {showDesktopChrome && toolbarVariant === "desktop" ? (
            <FilesDesktopHeaderActions
              menuButtonVariant="list"
              onListViewClick={setHistoryListView}
              listViewActive={!gridView}
              onGridViewClick={setHistoryGridView}
              gridViewActive={gridView}
            />
          ) : null}
        </div>

        <HistoryToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          activityFilter={activityFilter}
          onActivityFilterChange={setActivityFilter}
          sortOption={sortOption}
          onSortChange={setSortOption}
        />

        {visibleEntries.length === 0 ? (
          page === "liked" &&
          (likedFileEntries.length > 0 || filteredLikedChats.length > 0) ? null : (
            <p className="py-6 text-left text-[12px] leading-relaxed text-[#A1A1AA] sm:text-[13px]">
              {emptyListCopy}
            </p>
          )
        ) : gridView ? (
          <HistoryGrid
            entries={visibleEntries}
            onMenuAction={handleMenu}
            onItemOpen={handleItemOpen}
            enableTitleInlineRename={
              page === "history" || page === "liked"
            }
            titleRenamingId={historyTitleRenamingId}
            titleRenameValue={historyTitleRenameValue}
            onStartTitleRename={startHistoryTitleRename}
            onTitleRenameChange={setHistoryTitleRenameValue}
            onTitleRenameSubmit={submitHistoryTitleRename}
            onTitleRenameCancel={cancelHistoryTitleRename}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {grouped.map((group, gi) => (
              <div key={group.bucket}>
                <HistorySectionLabel
                  className={cn(gi > 0 && "mt-1 border-t border-[#2A2A2E] pt-6")}
                >
                  {group.label}
                </HistorySectionLabel>
                <ul
                  className={cn(
                    "mt-3 flex flex-col gap-2",
                    toolbarVariant === "mobile" ? "gap-2" : "gap-2",
                  )}
                  role="list"
                >
                  {group.items.map((entry) => {
                    const i = globalIndex++;
                    if (entry.kind === "chat") {
                      const record = chatThreads.find((t) => t.id === entry.id);
                      if (!record) return null;
                      return (
                        <li key={entry.id}>
                          <LikedChatEntryRow
                            record={record}
                            variant={toolbarVariant}
                            rowIndex={i}
                            onOpen={() =>
                              router.push(
                                `/chat?openChat=${encodeURIComponent(record.id)}`
                              )
                            }
                            enableTitleInlineRename={
                              page === "history" || page === "liked"
                            }
                            isTitleRenaming={historyTitleRenamingId === entry.id}
                            titleRenameValue={
                              historyTitleRenamingId === entry.id
                                ? historyTitleRenameValue
                                : ""
                            }
                            onStartTitleRename={() =>
                              startHistoryTitleRename(entry.id)
                            }
                            onTitleRenameChange={setHistoryTitleRenameValue}
                            onTitleRenameSubmit={submitHistoryTitleRename}
                            onTitleRenameCancel={cancelHistoryTitleRename}
                          />
                        </li>
                      );
                    }
                    return (
                      <li key={entry.id}>
                        <HistoryListRow
                          entry={entry}
                          variant={toolbarVariant}
                          rowIndex={i}
                          onMenuAction={handleMenu}
                          onItemOpen={handleItemOpen}
                          enableTitleInlineRename={
                            page === "history" || page === "liked"
                          }
                          isTitleRenaming={historyTitleRenamingId === entry.id}
                          titleRenameValue={
                            historyTitleRenamingId === entry.id
                              ? historyTitleRenameValue
                              : ""
                          }
                          onStartTitleRename={() =>
                            startHistoryTitleRename(entry.id)
                          }
                          onTitleRenameChange={setHistoryTitleRenameValue}
                          onTitleRenameSubmit={submitHistoryTitleRename}
                          onTitleRenameCancel={cancelHistoryTitleRename}
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
          <>
            <HistorySectionLabel
              className={cn(
                visibleEntries.length > 0 &&
                  "mt-6 border-t border-[#2A2A2E] pt-6",
              )}
            >
              Files
            </HistorySectionLabel>
            {gridView ? (
              <FilesGrid
                entries={likedFileEntries}
                onMenuAction={handleMenu}
                folderHasChildItems={folderHasChildItems}
                renamingId={historyTitleRenamingId}
                renameValue={historyTitleRenameValue}
                onStartRename={startHistoryTitleRename}
                onRenameValueChange={setHistoryTitleRenameValue}
                onRenameSubmit={submitHistoryTitleRename}
                onRenameCancel={cancelHistoryTitleRename}
              />
            ) : (
              <ul
                className="mt-3 flex flex-col gap-2"
                role="list"
              >
                {likedFileEntries.map((entry, i) => (
                  <li key={entry.id}>
                    <FileListRow
                      entry={entry}
                      variant={toolbarVariant}
                      rowIndex={i}
                      onMenuAction={handleMenu}
                      isRenaming={historyTitleRenamingId === entry.id}
                      renameValue={
                        historyTitleRenamingId === entry.id
                          ? historyTitleRenameValue
                          : ""
                      }
                      onStartRename={startHistoryTitleRename}
                      onRenameValueChange={setHistoryTitleRenameValue}
                      onRenameSubmit={submitHistoryTitleRename}
                      onRenameCancel={cancelHistoryTitleRename}
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
          </>
        ) : null}

        {page === "liked" && filteredLikedChats.length > 0 ? (
          <>
            <HistorySectionLabel
              className={cn(
                (visibleEntries.length > 0 || likedFileEntries.length > 0) &&
                  "mt-6 border-t border-[#2A2A2E] pt-6",
              )}
            >
              Chats
            </HistorySectionLabel>
            {gridView ? (
              <ul
                className="mt-3 grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 sm:gap-y-8 md:grid-cols-3 xl:grid-cols-4"
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
                      enableTitleInlineRename
                      isTitleRenaming={historyTitleRenamingId === record.id}
                      titleRenameValue={
                        historyTitleRenamingId === record.id
                          ? historyTitleRenameValue
                          : ""
                      }
                      onStartTitleRename={() =>
                        startHistoryTitleRename(record.id)
                      }
                      onTitleRenameChange={setHistoryTitleRenameValue}
                      onTitleRenameSubmit={submitHistoryTitleRename}
                      onTitleRenameCancel={cancelHistoryTitleRename}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="mt-3 flex flex-col gap-2" role="list">
                {filteredLikedChats.map((record, i) => (
                  <li key={record.id}>
                    <LikedChatEntryRow
                      record={record}
                      variant={toolbarVariant}
                      rowIndex={i}
                      onOpen={() =>
                        router.push(
                          `/chat?openChat=${encodeURIComponent(record.id)}`,
                        )
                      }
                      enableTitleInlineRename
                      isTitleRenaming={historyTitleRenamingId === record.id}
                      titleRenameValue={
                        historyTitleRenamingId === record.id
                          ? historyTitleRenameValue
                          : ""
                      }
                      onStartTitleRename={() =>
                        startHistoryTitleRename(record.id)
                      }
                      onTitleRenameChange={setHistoryTitleRenameValue}
                      onTitleRenameSubmit={submitHistoryTitleRename}
                      onTitleRenameCancel={cancelHistoryTitleRename}
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

  const wrapScroll = (children: ReactNode) => (
    <div className="flex w-full min-w-0 flex-col gap-4 pb-6">{children}</div>
  );

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden text-[#FAFAFA]",
        page === "history" || page === "liked"
          ? "bg-app-canvas"
          : "bg-[#0F0F10]",
        "md:[--create-image-prompt-max:900px] xl:[--create-image-prompt-max:1000px]",
      )}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header
            variant="mobile"
            mobileTitle={page === "liked" ? "LIKED" : "HISTORY"}
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[300px_minmax(0,1fr)]">
          <Sidebar
            className="hidden shrink-0 xl:flex xl:w-[300px] xl:min-w-[300px]"
            activeId={activeMainNav}
            onNavigate={navigate}
            fixedDockClearancePx={CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}
          />

          {/* xl: History & Liked — same bottom clearance as Sidebar (`fixedDockClearancePx`). */}
          <div
            className={cn(
              "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 pt-6 md:px-8 xl:px-10",
              minWidth1280 && "min-h-0 w-full self-start",
            )}
            style={
              minWidth1280
                ? {
                    height:
                      page === "history" || page === "liked"
                        ? `calc(100% - ${CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}px)`
                        : `calc(100% - ${SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX}px)`,
                  }
                : undefined
            }
          >
            <div
              className={cn(
                "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
                page !== "history" &&
                  page !== "liked" &&
                  "rounded-[18px] border border-[#2A2A2E] bg-[#141418]",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 md:p-6">
                {wrapScroll(scrollableInner("desktop", true, isGridView))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden md:hidden",
          page === "history" || page === "liked"
            ? "bg-app-canvas"
            : "bg-[#0F0F10]",
        )}
      >
        <Header
          variant="mobile"
          mobileTitle={page === "liked" ? "LIKED" : "HISTORY"}
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <div
          className={cn(
            "mx-4 mt-2 mb-4 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden",
            page !== "history" &&
              page !== "liked" &&
              "rounded-[22px] border border-[#2A2A2E] bg-[#141418]",
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-4">
            {wrapScroll(scrollableInner("mobile", false, isGridView))}
          </div>
        </div>
      </div>

      <MobileCreateImageDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        historyItems={EMPTY_HISTORY}
        activeHistoryId={null}
        onSelectHistory={() => {}}
        onHistoryMenuAction={() => {}}
        activeMainNav={activeMainNav}
      />
    </div>
  );
}
