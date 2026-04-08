import type { ChatThreadMessage } from "@/components/chat/ChatMessageThread";

/** Canonical chat session stored in app data (replaces legacy liked-chats blobs). */
export type ChatThreadRecord = {
  id: string;
  savedAt: string;
  messages: ChatThreadMessage[];
  /** When set (e.g. renamed from History), overrides the derived first-user-message title. */
  displayTitle?: string;
};

export function likedChatTitle(
  record: Pick<ChatThreadRecord, "messages" | "displayTitle">,
): string {
  const custom = record.displayTitle?.trim();
  if (custom) return custom.length > 90 ? `${custom.slice(0, 90)}…` : custom;
  const first = record.messages.find((m) => m.role === "user");
  const t = first?.text?.trim();
  if (t) return t.length > 90 ? `${t.slice(0, 90)}…` : t;
  return "Chat";
}

/** Full text used when seeding inline rename (no truncation). */
export function chatTitleEditSeed(
  record: Pick<ChatThreadRecord, "messages" | "displayTitle">,
): string {
  const custom = record.displayTitle?.trim();
  if (custom) return custom;
  const first = record.messages.find((m) => m.role === "user");
  const t = first?.text?.trim();
  if (t) return t;
  return "Chat";
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
