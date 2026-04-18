/**
 * Cross-domain item identity for likes, history, files, and future chat/generation rows.
 * Liked-item persistence uses `domain:id` strings (see `toLikedItemStorageKey`).
 */

export type AppItemDomain = "activity" | "file" | "generation" | "chat";

export type AppItemRef = Readonly<{
  domain: AppItemDomain;
  id: string;
}>;

export const appItemRef = {
  activity: (id: string): AppItemRef => ({ domain: "activity", id }),
  file: (id: string): AppItemRef => ({ domain: "file", id }),
  generation: (id: string): AppItemRef => ({ domain: "generation", id }),
  chat: (id: string): AppItemRef => ({ domain: "chat", id }),
} as const;

/** Key shape must stay stable with `lib/liked-items-storage` consumers. */
export function toLikedItemStorageKey(ref: AppItemRef): string {
  return `${ref.domain}:${ref.id}`;
}
