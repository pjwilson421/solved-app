import type { ActivityHistoryEntry } from "@/components/history/types";
import {
  isCandidateHigherFidelity,
  selectBestImageSource,
} from "@/lib/create-image/image-source-fidelity";

const DB_NAME = "solved-app-activity-image-sources";
const DB_VERSION = 1;
const STORE = "byActivityId";

type StoredActivityImageSource = {
  id: string;
  fullResolutionUrl?: string;
  imageUrl?: string;
  imageUrls?: string[];
  previewUrl?: string;
  thumbnailUrl?: string;
  updatedAtMs: number;
};

function shouldPersistUrl(url: string | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (/^blob:/i.test(trimmed)) return false;
  return true;
}

function normalizeUrlList(urls: string[] | undefined): string[] | undefined {
  if (!urls || urls.length === 0) return undefined;
  const cleaned = urls
    .map((u) => u.trim())
    .filter((u) => shouldPersistUrl(u));
  return cleaned.length > 0 ? cleaned : undefined;
}

function toStored(entry: ActivityHistoryEntry): StoredActivityImageSource | null {
  if (entry.kind !== "image" && entry.kind !== "editor") return null;

  const fullResolutionUrl = shouldPersistUrl(entry.fullResolutionUrl)
    ? entry.fullResolutionUrl?.trim()
    : undefined;
  const imageUrl = shouldPersistUrl(entry.imageUrl)
    ? entry.imageUrl?.trim()
    : undefined;
  const previewUrl = shouldPersistUrl(entry.previewUrl)
    ? entry.previewUrl?.trim()
    : undefined;
  const thumbnailUrl = shouldPersistUrl(entry.thumbnailUrl)
    ? entry.thumbnailUrl?.trim()
    : undefined;
  const imageUrls = normalizeUrlList(entry.imageUrls);

  if (!fullResolutionUrl && !imageUrl && !previewUrl && !thumbnailUrl && !imageUrls) {
    return null;
  }

  return {
    id: entry.id,
    ...(fullResolutionUrl ? { fullResolutionUrl } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    ...(imageUrls ? { imageUrls } : {}),
    ...(previewUrl ? { previewUrl } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
    updatedAtMs: Date.now(),
  };
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = window.indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
  });
}

function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  return openDb().then((db) =>
    new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      run(store)
        .then((result) => {
          tx.oncomplete = () => {
            db.close();
            resolve(result);
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        })
        .catch((error) => {
          db.close();
          reject(error);
        });
    }),
  );
}

async function getById(id: string): Promise<StoredActivityImageSource | null> {
  return withStore("readonly", async (store) => {
    const value = await new Promise<StoredActivityImageSource | null>((resolve, reject) => {
      const req = store.get(id);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => {
        const result = req.result as StoredActivityImageSource | undefined;
        resolve(result ?? null);
      };
    });
    return value;
  });
}

async function putMany(items: StoredActivityImageSource[]): Promise<void> {
  if (items.length === 0) return;
  await withStore("readwrite", async (store) => {
    await Promise.all(
      items.map(
        (item) =>
          new Promise<void>((resolve, reject) => {
            const req = store.put(item);
            req.onerror = () => reject(req.error);
            req.onsuccess = () => resolve();
          }),
      ),
    );
  });
}

function mergeEntryWithStored(
  entry: ActivityHistoryEntry,
  stored: StoredActivityImageSource,
): ActivityHistoryEntry {
  const bestCurrent = selectBestImageSource(entry);
  const bestStored = selectBestImageSource(stored);

  if (
    !isCandidateHigherFidelity({
      currentUrl: bestCurrent,
      candidateUrl: bestStored,
      context: {
        fullResolutionUrl: stored.fullResolutionUrl,
        imageUrls: stored.imageUrls,
        imageUrl: stored.imageUrl,
        previewUrl: stored.previewUrl,
        thumbnailUrl: stored.thumbnailUrl,
      },
    })
  ) {
    return entry;
  }

  const merged: ActivityHistoryEntry = { ...entry };

  if (stored.fullResolutionUrl) merged.fullResolutionUrl = stored.fullResolutionUrl;
  if (stored.imageUrl) merged.imageUrl = stored.imageUrl;
  if (stored.previewUrl) merged.previewUrl = stored.previewUrl;
  if (stored.thumbnailUrl && !merged.thumbnailUrl) {
    merged.thumbnailUrl = stored.thumbnailUrl;
  }
  if (stored.imageUrls && stored.imageUrls.length > 0) {
    merged.imageUrls = stored.imageUrls;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info("[image-source] hydrated activity source", {
      activityId: entry.id,
      from: "durable-fullres-storage",
      previousBest: bestCurrent,
      nextBest: selectBestImageSource(merged),
    });
  }

  return merged;
}

export async function persistDurableActivityImageSources(
  entries: ActivityHistoryEntry[],
): Promise<void> {
  if (typeof window === "undefined" || !window.indexedDB) return;
  const items = entries
    .map((entry) => toStored(entry))
    .filter((item): item is StoredActivityImageSource => item !== null);
  if (items.length === 0) return;
  try {
    await putMany(items);
  } catch {
    /* best effort */
  }
}

export async function hydrateActivityEntriesFromDurableSources(
  entries: ActivityHistoryEntry[],
): Promise<ActivityHistoryEntry[]> {
  if (typeof window === "undefined" || !window.indexedDB) return entries;

  const imageLike = entries.filter(
    (entry) => entry.kind === "image" || entry.kind === "editor",
  );
  if (imageLike.length === 0) return entries;

  try {
    const hydratedById = new Map<string, StoredActivityImageSource>();
    await Promise.all(
      imageLike.map(async (entry) => {
        const stored = await getById(entry.id);
        if (stored) hydratedById.set(entry.id, stored);
      }),
    );

    if (hydratedById.size === 0) return entries;

    return entries.map((entry) => {
      const stored = hydratedById.get(entry.id);
      if (!stored) return entry;
      return mergeEntryWithStored(entry, stored);
    });
  } catch {
    return entries;
  }
}
