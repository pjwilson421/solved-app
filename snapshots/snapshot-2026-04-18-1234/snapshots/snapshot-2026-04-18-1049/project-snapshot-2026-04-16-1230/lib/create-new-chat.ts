const NEW_CHAT_FLAG = "new";

/**
 * Opens the Chat page with a fresh session. Appends a timestamp so navigation
 * runs even when the user is already on `/chat` (same path would otherwise noop).
 */
export function hrefForNewChatSession(): string {
  const t = typeof Date !== "undefined" ? Date.now() : 0;
  return `/chat?${NEW_CHAT_FLAG}=1&t=${t}`;
}

/**
 * Shell "New chat" entry point — use from desktop nav, mobile drawer, and tests.
 */
export function createNewChat(router: { push: (href: string) => void }): void {
  router.push(hrefForNewChatSession());
}
