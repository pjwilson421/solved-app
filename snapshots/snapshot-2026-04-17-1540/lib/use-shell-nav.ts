"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { NavId } from "@/components/create-image/Sidebar";
import {
  primaryNavIdFromPathname,
  pushPrimaryNav,
  type PrimaryNavId,
} from "@/lib/app-navigation";
import { useShellNavReset } from "@/lib/shell-nav-reset-context";

export function useShellNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { bumpFiles, bumpHistory, bumpLiked } = useShellNavReset();
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const navigate = useCallback(
    (id: NavId) => {
      if (id === "settings") return;
      if (id === "files") bumpFiles();
      else if (id === "history") bumpHistory();
      else if (id === "liked") bumpLiked();
      pushPrimaryNav(router, id as PrimaryNavId);
    },
    [router, bumpFiles, bumpHistory, bumpLiked],
  );

  const activeMainNav: NavId | null = useMemo(() => {
    if (!hydrated) return null;
    const id = primaryNavIdFromPathname(pathname);
    return (id as NavId | null) ?? null;
  }, [hydrated, pathname]);

  return { navigate, activeMainNav };
}
