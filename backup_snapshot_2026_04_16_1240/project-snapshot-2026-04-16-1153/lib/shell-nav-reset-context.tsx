"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ShellNavResetContextValue = {
  filesResetVersion: number;
  historyResetVersion: number;
  likedResetVersion: number;
  bumpFiles: () => void;
  bumpHistory: () => void;
  bumpLiked: () => void;
};

const ShellNavResetContext = createContext<ShellNavResetContextValue | null>(
  null,
);

/** Used when a component calls the hook outside `ShellNavResetProvider` (avoids blank screen). */
const SHELL_NAV_RESET_FALLBACK: ShellNavResetContextValue = {
  filesResetVersion: 0,
  historyResetVersion: 0,
  likedResetVersion: 0,
  bumpFiles: () => {},
  bumpHistory: () => {},
  bumpLiked: () => {},
};

export function ShellNavResetProvider({ children }: { children: ReactNode }) {
  const [filesResetVersion, setFiles] = useState(0);
  const [historyResetVersion, setHistory] = useState(0);
  const [likedResetVersion, setLiked] = useState(0);
  const bumpFiles = useCallback(() => setFiles((n) => n + 1), []);
  const bumpHistory = useCallback(() => setHistory((n) => n + 1), []);
  const bumpLiked = useCallback(() => setLiked((n) => n + 1), []);
  const value = useMemo(
    () => ({
      filesResetVersion,
      historyResetVersion,
      likedResetVersion,
      bumpFiles,
      bumpHistory,
      bumpLiked,
    }),
    [
      filesResetVersion,
      historyResetVersion,
      likedResetVersion,
      bumpFiles,
      bumpHistory,
      bumpLiked,
    ],
  );
  return (
    <ShellNavResetContext.Provider value={value}>
      {children}
    </ShellNavResetContext.Provider>
  );
}

export function useShellNavReset(): ShellNavResetContextValue {
  const ctx = useContext(ShellNavResetContext);
  if (ctx != null) return ctx;
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    console.warn(
      "[app] useShellNavReset outside ShellNavResetProvider — using no-op bumps. Ensure app/layout.tsx wraps children with <AppProviders>.",
    );
  }
  return SHELL_NAV_RESET_FALLBACK;
}
