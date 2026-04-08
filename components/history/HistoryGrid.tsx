"use client";

import type { ActivityHistoryEntry } from "./types";
import { HistoryGridCard } from "./HistoryGridCard";
import { LikedChatGridCard } from "../chat/LikedChatGridCard";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useRouter } from "next/navigation";
import type { FileRowMenuAction } from "../files/FileRowActionsMenu";

type HistoryGridProps = {
  entries: ActivityHistoryEntry[];
  onMenuAction?: (id: string, action: FileRowMenuAction) => void;
  onItemOpen?: (id: string) => void;
};

export function HistoryGrid({ entries, onMenuAction, onItemOpen }: HistoryGridProps) {
  const { chatThreads } = useAppData();
  const router = useRouter();

  return (
    <ul
      className="grid grid-cols-2 gap-x-4 gap-y-5 sm:gap-x-5 sm:gap-y-8 md:grid-cols-3 xl:grid-cols-4"
      role="list"
    >
      {entries.map((entry, i) => {
        if (entry.kind === "chat") {
          const record = chatThreads.find((t) => t.id === entry.id);
          if (!record) return null;
          return (
            <li key={entry.id} className="min-w-0">
              <LikedChatGridCard
                record={record}
                rowIndex={i}
                onOpen={() =>
                  router.push(`/chat?openChat=${encodeURIComponent(record.id)}`)
                }
              />
            </li>
          );
        }
        return (
          <li key={entry.id} className="min-w-0">
            <HistoryGridCard
              entry={entry}
              rowIndex={i}
              onMenuAction={onMenuAction}
              onItemOpen={onItemOpen}
            />
          </li>
        );
      })}
    </ul>
  );
}
