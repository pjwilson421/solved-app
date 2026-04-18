import { appItemRef, toLikedItemStorageKey } from "@/lib/app-data/item-ref";

/** Namespaced keys persisted in liked-items storage (avoid id collisions across domains). */
export const likedKey = {
  activity: (id: string) => toLikedItemStorageKey(appItemRef.activity(id)),
  file: (id: string) => toLikedItemStorageKey(appItemRef.file(id)),
  generation: (id: string) => toLikedItemStorageKey(appItemRef.generation(id)),
  chat: (id: string) => toLikedItemStorageKey(appItemRef.chat(id)),
} as const;
