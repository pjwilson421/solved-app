import type { ChatThreadMessage } from "@/components/chat/ChatMessageThread";

/** Canonical chat session stored in app data (replaces legacy liked-chats blobs). */
export type ChatThreadRecord = {
  id: string;
  savedAt: string;
  pinnedAt?: string;
  customTitle?: string;
  messages: ChatThreadMessage[];
};

export function likedChatTitle(
  record: Pick<ChatThreadRecord, "messages" | "customTitle">,
): string {
  const custom = record.customTitle?.trim();
  if (custom) return custom;
  const first = record.messages.find((m) => m.role === "user");
  const t = first?.text?.trim();
  if (t) return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  return "Chat";
}

/** First line of the first user message (matches Chat History row titles). */
export function chatThreadListHeadline(
  record: Pick<ChatThreadRecord, "messages" | "customTitle">,
): string {
  const custom = record.customTitle?.trim();
  if (custom) return custom;
  const first = record.messages.find((m) => m.role === "user");
  const raw = first?.text?.trim() ?? "";
  if (!raw) return "Chat";
  const line = raw.split(/\r?\n/)[0]?.trim() ?? "";
  return line || "Chat";
}

export function cloneMessages(messages: ChatThreadMessage[]): ChatThreadMessage[] {
  return messages.map((m) => ({ ...m }));
}

/** Insert or replace thread, bumping `savedAt`. */
export function upsertChatThreadMessages(
  prev: ChatThreadRecord[],
  id: string,
  messages: ChatThreadMessage[],
): ChatThreadRecord[] {
  const savedAt = new Date().toISOString();
  const copy = cloneMessages(messages);
  const i = prev.findIndex((t) => t.id === id);
  if (i === -1) {
    return [...prev, { id, savedAt, messages: copy }];
  }
  return prev.map((t) =>
    t.id === id ? { ...t, savedAt, messages: copy } : t,
  );
}

export function setChatThreadPinned(
  prev: ChatThreadRecord[],
  id: string,
  pinned: boolean,
): ChatThreadRecord[] {
  const pinnedAt = pinned ? new Date().toISOString() : undefined;
  return prev.map((thread) => {
    if (thread.id !== id) return thread;
    if (!pinned && typeof thread.pinnedAt === "undefined") return thread;
    if (pinned && thread.pinnedAt) return thread;
    if (!pinned) {
      return { ...thread, pinnedAt: undefined };
    }
    return { ...thread, pinnedAt };
  });
}

export function setChatThreadCustomTitle(
  prev: ChatThreadRecord[],
  id: string,
  title: string,
): ChatThreadRecord[] {
  const nextTitle = title.trim();
  if (!nextTitle) return prev;
  return prev.map((thread) => {
    if (thread.id !== id) return thread;
    if (thread.customTitle === nextTitle) return thread;
    return { ...thread, customTitle: nextTitle };
  });
}
