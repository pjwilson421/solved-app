/** Minimal shape for date resolution / grouping (keeps module free of UI circular imports). */
export type ChatMessageTimeFields = {
  sentAt?: string;
  role: "user" | "assistant";
};

/**
 * Max time between consecutive messages from the same sender to visually group bubbles
 * (tighter spacing, shared “thread” feel — aligned with common iMessage grouping windows).
 */
export const CHAT_GROUP_GAP_MS = 4 * 60 * 1000; // 4 minutes

const MS_PER_DAY = 86400000;

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function calendarDaysBetweenNowAnd(date: Date, now: Date): number {
  const a = startOfLocalDay(now).getTime();
  const b = startOfLocalDay(date).getTime();
  return Math.round((a - b) / MS_PER_DAY);
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

/**
 * Resolve each message’s sent time. Messages without `sentAt` get stable synthetic times
 * (1 minute apart) so older saved chats still render sensibly.
 */
export function resolveMessageDates(
  messages: ChatMessageTimeFields[],
  now: Date = new Date(),
): Date[] {
  const n = messages.length;
  const base = now.getTime() - n * 60_000;
  return messages.map((m, i) => {
    if (m.sentAt) {
      const d = new Date(m.sentAt);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return new Date(base + i * 60_000);
  });
}

/**
 * Show a centered day label once at the start of the thread and again only when the
 * calendar day changes from the previous message (not on every bubble, not for long gaps within the same day).
 */
export function shouldShowDateSeparator(
  prevDate: Date | undefined,
  currDate: Date,
  index: number,
): boolean {
  if (index === 0) return true;
  if (prevDate == null) return true;
  return !isSameLocalDay(prevDate, currDate);
}

/**
 * Apple Messages–style date string: Today, Yesterday, weekday (recent), or Jan 8 / Jan 8, 2026.
 */
export function formatChatDateLabel(date: Date, now: Date = new Date()): string {
  const diffDays = calendarDaysBetweenNowAnd(date, now);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";

  // Recent messages: prefer weekday (“Monday”) like iOS when still in the casual recency window.
  if (diffDays >= 2 && diffDays < 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** 12-hour time like iPhone: 9:41 AM, 2:05 PM */
export function formatMessageTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Same sender, same local day, and close in time → group with previous bubble. */
export function shouldGroupWithPrevious(
  prev: ChatMessageTimeFields | undefined,
  prevDate: Date | undefined,
  curr: ChatMessageTimeFields,
  currDate: Date,
): boolean {
  if (!prev || !prevDate) return false;
  if (prev.role !== curr.role) return false;
  if (!isSameLocalDay(prevDate, currDate)) return false;
  const gap = currDate.getTime() - prevDate.getTime();
  return gap >= 0 && gap <= CHAT_GROUP_GAP_MS;
}

/**
 * Vertical gap between consecutive bubbles: 16px same role (user–user or assistant–assistant),
 * 24px when roles alternate. First row after a date separator uses 0 (separator provides space).
 */
export function bubbleStackMarginTopClass(
  showDateSeparatorAbove: boolean,
  prev: ChatMessageTimeFields | undefined,
  curr: ChatMessageTimeFields,
): string {
  if (showDateSeparatorAbove) return "mt-0";
  if (!prev) return "mt-0";
  return prev.role === curr.role ? "mt-4" : "mt-6";
}
