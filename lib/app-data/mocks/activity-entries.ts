import type { ActivityHistoryEntry } from "@/components/history/types";

function hoursAgo(from: Date, h: number): Date {
  return new Date(from.getTime() - h * 60 * 60 * 1000);
}

function daysAgo(from: Date, d: number): Date {
  return new Date(from.getTime() - d * 24 * 60 * 60 * 1000);
}

/** Demo rows aligned with history list/grid samples. */
export function buildDemoHistoryEntries(now = new Date()): ActivityHistoryEntry[] {
  return [
    {
      id: "h0",
      kind: "chat",
      title: "Product naming brainstorm",
      subtitle: "Chat session",
      occurredAt: hoursAgo(now, 1),
    },
    {
      id: "h1",
      kind: "image",
      title: "Generated Image",
      subtitle: "Luxury watch campaign",
      occurredAt: hoursAgo(now, 2),
    },
    {
      id: "h2",
      kind: "editor",
      title: "Edited Image",
      subtitle: "Portrait retouch",
      occurredAt: hoursAgo(now, 5),
    },
    {
      id: "h3",
      kind: "video",
      title: "Generated Video",
      subtitle: "Car reveal",
      occurredAt: daysAgo(now, 1),
    },
    {
      id: "h4",
      kind: "image",
      title: "Generated Image",
      subtitle: "Editorial poster concept",
      occurredAt: daysAgo(now, 1),
    },
    {
      id: "h5",
      kind: "editor",
      title: "Edited Image",
      subtitle: "Background cleanup",
      occurredAt: daysAgo(now, 6),
    },
  ];
}

export function createInitialActivityEntries(): ActivityHistoryEntry[] {
  return buildDemoHistoryEntries();
}
