"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ChatThreadMessage } from "@/components/chat/ChatMessageThread";
import type { FileEntry } from "@/components/files/types";
import type { ActivityHistoryEntry } from "@/components/history/types";
import type { ChatThreadRecord } from "./chat-thread";
import { upsertChatThreadMessages } from "./chat-thread";
import { createInitialFileEntries } from "./mocks/file-entries";
import { createInitialActivityEntries } from "./mocks/activity-entries";
import {
  loadActivityEntriesFromStorage,
  saveActivityEntriesToStorage,
} from "./activity-entries-persistence";
import {
  loadFileEntriesFromStorage,
  saveFileEntriesToStorage,
} from "./file-entries-persistence";
import {
  loadChatThreadsFromStorage,
  saveChatThreadsToStorage,
} from "./chat-thread-persistence";
import type { AppItemRef } from "./item-ref";
import { GlobalPreviewModal } from "@/components/global/GlobalPreviewModal";

/** Full-screen image preview (URL already resolved); mutually exclusive with {@link AppDataContextValue.previewItemRef}. */
export type DirectImagePreview = { imageSrc: string; title: string };

export type AppDataContextValue = {
  /** Bumps when catalog data changes (for keyed subtrees / debugging). */
  revision: number;
  /** True after activity entries have been read from storage (or confirmed empty). */
  activityCatalogHydrated: boolean;
  fileEntries: FileEntry[];
  activityEntries: ActivityHistoryEntry[];
  chatThreads: ChatThreadRecord[];
  updateFileEntries: (updater: (prev: FileEntry[]) => FileEntry[]) => void;
  updateActivityEntries: (
    updater: (prev: ActivityHistoryEntry[]) => ActivityHistoryEntry[],
  ) => void;
  updateChatThreads: (
    updater: (prev: ChatThreadRecord[]) => ChatThreadRecord[],
  ) => void;
  /** Merge latest messages for a session (creates thread row if missing). */
  upsertChatThreadSnapshot: (id: string, messages: ChatThreadMessage[]) => void;
  /** Global unified preview modal state */
  previewItemRef: AppItemRef | null;
  setPreviewItemRef: (ref: AppItemRef | null) => void;
  /** Ad-hoc image URL preview (e.g. Create Image expand) — clears catalog preview when set. */
  directImagePreview: DirectImagePreview | null;
  setDirectImagePreview: (value: DirectImagePreview | null) => void;
};

const AppDataContext = createContext<AppDataContextValue | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [revision, setRevision] = useState(0);
  const [fileEntries, setFileEntries] = useState<FileEntry[]>(() =>
    createInitialFileEntries(),
  );
  const [fileCatalogHydrated, setFileCatalogHydrated] = useState(false);
  const [activityEntries, setActivityEntries] = useState<
    ActivityHistoryEntry[]
  >(() => createInitialActivityEntries());
  const [activityCatalogHydrated, setActivityCatalogHydrated] = useState(false);
  const [chatThreads, setChatThreads] = useState<ChatThreadRecord[]>(() => []);
  const [chatCatalogHydrated, setChatCatalogHydrated] = useState(false);
  const [previewItemRef, setPreviewItemRefState] = useState<AppItemRef | null>(
    null,
  );
  const [directImagePreview, setDirectImagePreviewState] =
    useState<DirectImagePreview | null>(null);

  const setPreviewItemRef = useCallback((ref: AppItemRef | null) => {
    setDirectImagePreviewState(null);
    setPreviewItemRefState(ref);
  }, []);

  const setDirectImagePreview = useCallback((value: DirectImagePreview | null) => {
    setPreviewItemRefState(null);
    setDirectImagePreviewState(value);
  }, []);

  useEffect(() => {
    const storedFiles = loadFileEntriesFromStorage();
    if (storedFiles !== null) {
      setFileEntries(storedFiles);
    }
    setFileCatalogHydrated(true);

    const storedActivity = loadActivityEntriesFromStorage();
    if (storedActivity !== null) {
      setActivityEntries(storedActivity);
    }
    setActivityCatalogHydrated(true);

    const storedChats = loadChatThreadsFromStorage();
    if (storedChats !== null) {
      setChatThreads(storedChats);
    }
    setChatCatalogHydrated(true);
  }, []);

  useEffect(() => {
    if (!fileCatalogHydrated) return;
    saveFileEntriesToStorage(fileEntries);
  }, [fileEntries, fileCatalogHydrated]);

  useEffect(() => {
    if (!activityCatalogHydrated) return;
    saveActivityEntriesToStorage(activityEntries);
  }, [activityEntries, activityCatalogHydrated]);

  useEffect(() => {
    if (!chatCatalogHydrated) return;
    saveChatThreadsToStorage(chatThreads);
  }, [chatThreads, chatCatalogHydrated]);

  const bump = useCallback(() => {
    setRevision((n) => n + 1);
  }, []);

  const updateFileEntries = useCallback(
    (updater: (prev: FileEntry[]) => FileEntry[]) => {
      setFileEntries((prev) => updater(prev));
      bump();
    },
    [bump],
  );

  const updateActivityEntries = useCallback(
    (updater: (prev: ActivityHistoryEntry[]) => ActivityHistoryEntry[]) => {
      setActivityEntries((prev) => updater(prev));
      bump();
    },
    [bump],
  );

  const updateChatThreads = useCallback(
    (updater: (prev: ChatThreadRecord[]) => ChatThreadRecord[]) => {
      setChatThreads((prev) => updater(prev));
      bump();
    },
    [bump],
  );

  const upsertChatThreadSnapshot = useCallback(
    (id: string, messages: ChatThreadMessage[]) => {
      setChatThreads((prev) => upsertChatThreadMessages(prev, id, messages));
      bump();
    },
    [bump],
  );

  const value = useMemo(
    () => ({
      revision,
      activityCatalogHydrated,
      fileEntries,
      activityEntries,
      chatThreads,
      updateFileEntries,
      updateActivityEntries,
      updateChatThreads,
      upsertChatThreadSnapshot,
      previewItemRef,
      setPreviewItemRef,
      directImagePreview,
      setDirectImagePreview,
    }),
    [
      revision,
      activityCatalogHydrated,
      fileEntries,
      activityEntries,
      chatThreads,
      updateFileEntries,
      updateActivityEntries,
      updateChatThreads,
      upsertChatThreadSnapshot,
      previewItemRef,
      setPreviewItemRef,
      directImagePreview,
      setDirectImagePreview,
    ],
  );

  return (
    <AppDataContext.Provider value={value}>
      {children}
      <GlobalPreviewModal />
    </AppDataContext.Provider>
  );
}

export function useAppData(): AppDataContextValue {
  const ctx = useContext(AppDataContext);
  if (!ctx) {
    throw new Error("useAppData must be used within AppDataProvider");
  }
  return ctx;
}
