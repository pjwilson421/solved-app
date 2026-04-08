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
  if (!ctx) {
    throw new Error(
      "useShellNavReset must be used within ShellNavResetProvider",
    );
  }
  return ctx;
}
