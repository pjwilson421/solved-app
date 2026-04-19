/**
 * Persists the last successfully generated Create Video preview so it survives
 * route changes and full page refresh. Large `data:` URLs use IndexedDB; small
 * URLs (or http(s)) stay inline in localStorage metadata.
 */

const META_KEY = "solved-app-create-video-last-preview-v2";
/** @deprecated migrated into META_KEY */
const LEGACY_SESSION_KEY = "solved-app-create-video-preview-v1";

const DB_NAME = "solved-app-create-video";
const DB_VERSION = 1;
const IDB_STORE = "lastPreview";
const IDB_VIDEO_KEY = "videoUrl";

/** ~600k chars keeps JSON under typical localStorage limits alongside other keys. */
const MAX_INLINE_VIDEO_URL_CHARS = 600_000;

export type CreateVideoPreviewPersisted = {
  v: 2;
  activityId: string;
  previewPrompt: string;
  previewAtIso: string;
  /** Monotonic-ish clock when this preview was saved (successful generation). */
  savedAtMs: number;
  videoUrl?: string;
  useIndexedDb?: boolean;
};

let cachedVideoUrl: string | null = null;
let cachedActivityId: string | null = null;

function setCache(activityId: string, videoUrl: string) {
  cachedActivityId = activityId;
  cachedVideoUrl = videoUrl;
}

function clearCache() {
  cachedActivityId = null;
  cachedVideoUrl = null;
}

function readMetaRaw(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(META_KEY);
  } catch {
    return null;
  }
}

function parseMeta(raw: string): CreateVideoPreviewPersisted | null {
  try {
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    if (o.v !== 2) return null;
    const activityId =
      typeof o.activityId === "string" ? o.activityId.trim() : "";
    const previewPrompt =
      typeof o.previewPrompt === "string" ? o.previewPrompt : "";
    const previewAtIso =
      typeof o.previewAtIso === "string" ? o.previewAtIso.trim() : "";
    const savedAtMs =
      typeof o.savedAtMs === "number" && Number.isFinite(o.savedAtMs)
        ? o.savedAtMs
        : 0;
    if (!activityId || !previewAtIso) return null;
    const videoUrl =
      typeof o.videoUrl === "string" && o.videoUrl.length > 0
        ? o.videoUrl
        : undefined;
    const useIndexedDb = o.useIndexedDb === true;
    return {
      v: 2,
      activityId,
      previewPrompt,
      previewAtIso,
      savedAtMs,
      ...(videoUrl ? { videoUrl } : {}),
      ...(useIndexedDb ? { useIndexedDb: true } : {}),
    };
  } catch {
    return null;
  }
}

/** Sync read of metadata only (no IndexedDB, no migration). */
export function readCreateVideoPreviewMetaSync(): CreateVideoPreviewPersisted | null {
  if (typeof window === "undefined") return null;
  const raw = readMetaRaw();
  if (!raw) return null;
  return parseMeta(raw);
}

async function migrateLegacySessionIfNeeded(): Promise<void> {
  if (typeof window === "undefined") return;
  if (readMetaRaw()) return;
  try {
    const leg = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!leg) return;
    const old = JSON.parse(leg) as {
      v?: number;
      videoUrl?: string;
      activityId?: string;
      previewPrompt?: string;
      previewAtIso?: string;
    };
    if (
      old.v !== 1 ||
      typeof old.videoUrl !== "string" ||
      !old.videoUrl ||
      typeof old.activityId !== "string"
    ) {
      sessionStorage.removeItem(LEGACY_SESSION_KEY);
      return;
    }
    await writeCreateVideoPreviewPersistence({
      videoUrl: old.videoUrl,
      activityId: old.activityId,
      previewPrompt:
        typeof old.previewPrompt === "string" ? old.previewPrompt : "",
      previewAtIso:
        typeof old.previewAtIso === "string"
          ? old.previewAtIso
          : new Date().toISOString(),
    });
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

function idbSetVideo(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).put(url, IDB_VIDEO_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

function idbGetVideo(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.close();
        resolve(null);
        return;
      }
      const tx = db.transaction(IDB_STORE, "readonly");
      const req = tx.objectStore(IDB_STORE).get(IDB_VIDEO_KEY);
      req.onsuccess = () => {
        const v = req.result;
        db.close();
        resolve(typeof v === "string" && v.length > 0 ? v : null);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    };
  });
}

function idbClear(): Promise<void> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB_NAME, DB_VERSION);
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.close();
        resolve();
        return;
      }
      const tx = db.transaction(IDB_STORE, "readwrite");
      tx.objectStore(IDB_STORE).delete(IDB_VIDEO_KEY);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    };
  });
}

export type WriteCreateVideoPreviewInput = {
  videoUrl: string;
  activityId: string;
  previewPrompt: string;
  previewAtIso: string;
};

export async function writeCreateVideoPreviewPersistence(
  input: WriteCreateVideoPreviewInput,
): Promise<void> {
  if (typeof window === "undefined") return;
  const { videoUrl, activityId, previewPrompt, previewAtIso } = input;
  if (!videoUrl || !activityId) return;

  const savedAtMs = Date.now();
  setCache(activityId, videoUrl);

  let useIndexedDb = videoUrl.length > MAX_INLINE_VIDEO_URL_CHARS;
  const baseMeta: Omit<CreateVideoPreviewPersisted, "videoUrl" | "useIndexedDb"> =
    {
      v: 2,
      activityId,
      previewPrompt,
      previewAtIso,
      savedAtMs,
    };

  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }

  if (!useIndexedDb) {
    const meta: CreateVideoPreviewPersisted = {
      ...baseMeta,
      videoUrl,
    };
    try {
      localStorage.setItem(META_KEY, JSON.stringify(meta));
      await idbClear().catch(() => {});
      return;
    } catch {
      useIndexedDb = true;
    }
  }

  await idbSetVideo(videoUrl);
  const metaIdb: CreateVideoPreviewPersisted = {
    ...baseMeta,
    useIndexedDb: true,
  };
  try {
    localStorage.setItem(META_KEY, JSON.stringify(metaIdb));
  } catch {
    /* quota — preview may not restore after refresh */
  }
}

export type LoadedCreateVideoPreview = {
  videoUrl: string;
  activityId: string;
  previewPrompt: string;
  previewAtIso: string;
  savedAtMs: number;
};

export async function loadCreateVideoPreviewFromPersistence(): Promise<LoadedCreateVideoPreview | null> {
  if (typeof window === "undefined") return null;
  await migrateLegacySessionIfNeeded();
  const raw = readMetaRaw();
  if (!raw) return null;
  const meta = parseMeta(raw);
  if (!meta) return null;

  let videoUrl: string | undefined = meta.videoUrl;
  if (meta.useIndexedDb) {
    try {
      videoUrl = (await idbGetVideo()) ?? undefined;
    } catch {
      return null;
    }
  }
  if (!videoUrl?.length) return null;

  setCache(meta.activityId, videoUrl);
  return {
    videoUrl,
    activityId: meta.activityId,
    previewPrompt: meta.previewPrompt,
    previewAtIso: meta.previewAtIso,
    savedAtMs: meta.savedAtMs,
  };
}

/**
 * Resolve preview URL for a history row when `entry.videoUrl` was stripped from localStorage.
 */
export function getCreateVideoPreviewUrlForActivity(
  activityId: string,
): string | null {
  if (cachedActivityId === activityId && cachedVideoUrl) {
    return cachedVideoUrl;
  }
  const meta = readCreateVideoPreviewMetaSync();
  if (meta?.activityId === activityId && meta.videoUrl) return meta.videoUrl;
  if (
    meta?.activityId === activityId &&
    meta.useIndexedDb &&
    cachedActivityId === activityId &&
    cachedVideoUrl
  ) {
    return cachedVideoUrl;
  }
  try {
    const leg = sessionStorage.getItem(LEGACY_SESSION_KEY);
    if (!leg) return null;
    const old = JSON.parse(leg) as {
      v?: number;
      activityId?: string;
      videoUrl?: string;
    };
    if (
      old.v === 1 &&
      old.activityId === activityId &&
      typeof old.videoUrl === "string" &&
      old.videoUrl.length > 0
    ) {
      return old.videoUrl;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export async function clearCreateVideoPreviewPersistence(): Promise<void> {
  if (typeof window === "undefined") return;
  clearCache();
  try {
    localStorage.removeItem(META_KEY);
  } catch {
    /* ignore */
  }
  try {
    sessionStorage.removeItem(LEGACY_SESSION_KEY);
  } catch {
    /* ignore */
  }
  await idbClear().catch(() => {});
}
