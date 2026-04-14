"use client";

import type { ReactNode } from "react";
import { LikedItemsProvider } from "@/components/liked-items/liked-items-context";
import { AppDataProvider } from "@/lib/app-data/app-data-context";
import { ShellNavResetProvider } from "@/lib/shell-nav-reset-context";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ShellNavResetProvider>
      <LikedItemsProvider>
        <AppDataProvider>{children}</AppDataProvider>
      </LikedItemsProvider>
    </ShellNavResetProvider>
  );
}
