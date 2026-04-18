/**
 * Legacy liked-chats localStorage has been removed. Chat threads live in
 * `AppDataProvider` (`chatThreads`); likes use `likedKey.chat(id)` + global
 * liked-item storage.
 */
export type { ChatThreadRecord as LikedChatRecord } from "@/lib/app-data/chat-thread";
export { likedChatTitle } from "@/lib/app-data/chat-thread";
