"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LIKED_ITEMS_STORAGE_KEY,
  readLikedKeys,
  writeLikedKeys,
} from "@/lib/liked-items-storage";

type LikedItemsContextValue = {
  /** Whether initial load from localStorage has run (client). */
  hydrated: boolean;
  isLiked: (key: string) => boolean;
  toggle: (key: string) => void;
  /** Remove one or more keys without toggling (e.g. when deleting catalog rows). */
  removeKeys: (keys: string[]) => void;
};

const LikedItemsContext = createContext<LikedItemsContextValue | null>(null);

export function LikedItemsProvider({ children }: { children: ReactNode }) {
  const [keys, setKeys] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  useLayoutEffect(() => {
    setKeys(readLikedKeys());
    setHydrated(true);
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== LIKED_ITEMS_STORAGE_KEY || e.newValue == null) return;
      try {
        const data = JSON.parse(e.newValue) as unknown;
        if (Array.isArray(data)) {
          setKeys(
            new Set(data.filter((x): x is string => typeof x === "string")),
          );
        }
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  /** Add key → liked (filled heart); remove key → unliked (outline). Persists to localStorage each time. */
  const toggle = useCallback((key: string) => {
    setKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      writeLikedKeys(next);
      return next;
    });
  }, []);

  const removeKeys = useCallback((toRemove: string[]) => {
    if (toRemove.length === 0) return;
    setKeys((prev) => {
      const next = new Set(prev);
      for (const k of toRemove) next.delete(k);
      writeLikedKeys(next);
      return next;
    });
  }, []);

  const isLiked = useCallback((key: string) => keys.has(key), [keys]);

  const value = useMemo(
    () => ({ hydrated, isLiked, toggle, removeKeys }),
    [hydrated, isLiked, toggle, removeKeys],
  );

  return (
    <LikedItemsContext.Provider value={value}>
      {children}
    </LikedItemsContext.Provider>
  );
}

export function useLikedItems(): LikedItemsContextValue {
  const ctx = useContext(LikedItemsContext);
  if (!ctx) {
    throw new Error("useLikedItems must be used within LikedItemsProvider");
  }
  return ctx;
}
