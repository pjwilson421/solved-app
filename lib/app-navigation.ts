/**
 * Single source of truth for primary (shell) navigation routes.
 * Desktop Sidebar and mobile shell nav must use these URLs only.
 */

import { createNewChat } from "@/lib/create-new-chat";

export type PrimaryNavId =
  | "chat"
  | "create-image"
  | "create-video"
  | "image-editor"
  | "files"
  | "history"
  | "liked";

export const SETTINGS_PATHS = {
  general: "/settings/general",
  appearance: "/settings/appearance",
  help: "/settings/help",
} as const;

export type SettingsSection = keyof typeof SETTINGS_PATHS;

export function hrefForSettingsSection(section: SettingsSection): string {
  return SETTINGS_PATHS[section];
}

/**
 * Static hrefs for primary nav. Chat is special: interactive navigation must use
 * `createNewChat` / `pushPrimaryNav` so a new session opens even when already on `/chat`.
 */
export function hrefForPrimaryNav(id: PrimaryNavId): string {
  switch (id) {
    case "chat":
      return "/chat?new=1";
    case "create-image":
      return "/";
    case "create-video":
      return "/create-video";
    case "image-editor":
      return "/image-editor";
    case "files":
      return "/files";
    case "history":
      return "/history";
    case "liked":
      return "/liked";
    default:
      return "/";
  }
}

type AppRouterLike = {
  push: (href: string) => void;
  replace: (href: string) => void;
};

/**
 * Navigates to the primary shell route. For Files / History / Liked, if the user is
 * already on that pathname, uses `replace` so query strings are cleared without
 * stacking duplicate history entries for the same destination.
 */
export function pushPrimaryNav(router: AppRouterLike, id: PrimaryNavId): void {
  if (id === "chat") {
    createNewChat(router);
    return;
  }
  const href = hrefForPrimaryNav(id);
  const pathOnly = href.split("?")[0] ?? href;
  if (
    (id === "files" || id === "history" || id === "liked") &&
    typeof window !== "undefined" &&
    window.location.pathname === pathOnly
  ) {
    router.replace(href);
    return;
  }
  router.push(href);
}

export function pushSettingsSection(
  router: { push: (href: string) => void },
  section: SettingsSection,
): void {
  router.push(hrefForSettingsSection(section));
}

/**
 * Maps the current pathname to shell nav highlighting.
 * Returns null for paths outside the main app shell (should be rare).
 */
export function primaryNavIdFromPathname(pathname: string | null): PrimaryNavId | "settings" | null {
  if (!pathname) return null;
  if (pathname.startsWith("/settings")) return "settings";
  if (pathname === "/chat") return "chat";
  if (pathname === "/" || pathname === "") return "create-image";
  if (pathname.startsWith("/create-video")) return "create-video";
  if (pathname.startsWith("/image-editor")) return "image-editor";
  if (pathname.startsWith("/files")) return "files";
  if (pathname.startsWith("/history")) return "history";
  if (pathname.startsWith("/liked")) return "liked";
  return null;
}
