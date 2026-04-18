import type { ChatThreadRecord } from "./chat-thread";

export const CHAT_THREADS_STORAGE_KEY = "solved-app-chat-threads-v1";

export function loadChatThreadsFromStorage(): ChatThreadRecord[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CHAT_THREADS_STORAGE_KEY);
    if (raw == null) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed as ChatThreadRecord[];
  } catch {
    return null;
  }
}

export function saveChatThreadsToStorage(entries: ChatThreadRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CHAT_THREADS_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn("[chat-threads] localStorage save failed", e);
  }
}
