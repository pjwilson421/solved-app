"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import {
  historyPanelRailDesktopTitleAreaWrapperClassName,
  historyPanelRailHeaderButtonClassName,
  historyPanelRailInnerClassName,
  historyPanelRailTitleHeadingClassName,
  historyPanelRailTitleRowClassName,
  historyPanelRailTitleSurfaceClassName,
  historyPanelRailTitleToggleLabelClassName,
  historyPanelRailRowActionsTriggerButtonClassName,
  historyPanelRightRailUnifiedShellClassName,
  historyPanelRightRailUnifiedShellCollapsedClassName,
  historyPanelRightRailUnifiedShellShrinkWrapClassName,
  railHistoryDropdownPanelSurfaceClassName,
  RightRailPanelChevron,
} from "@/components/ui/right-rail-collapsible";
import { IconDots } from "@/components/create-image/icons";
import { threeDotsMenuTriggerButtonClassName } from "@/components/ui/three-dots-menu-trigger";
import { cn } from "@/lib/utils";
import type { ChatThreadRecord } from "@/lib/app-data/chat-thread";

export type ChatHistoryThreadMenuAction =
  | "Like"
  | "Save To Files"
  | "Share"
  | "Delete";

const THREAD_MENU_ITEMS: ChatHistoryThreadMenuAction[] = [
  "Like",
  "Save To Files",
  "Share",
  "Delete",
];

type ChatHistoryPanelProps = {
  threads: ChatThreadRecord[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  /** Per-thread overflow menu (desktop + mobile list). */
  onThreadMenuAction?: (
    threadId: string,
    action: ChatHistoryThreadMenuAction,
  ) => void;
  /** Merged onto the root `aside` — use the same string as {@link HistoryPanel} on Create Image. */
  className?: string;
  /**
   * `rail` (default): xl+ right rail — unified panel fills the rail.
   * `mobile`: Chat narrow layout — title + list share one continuous panel below the header.
   */
  variant?: "rail" | "mobile";
  /**
   * Mobile only: `start` (default) = trigger left; `end` = trigger right (e.g. under hamburger).
   */
  mobileTriggerAlign?: "start" | "end";
};

function chatHistoryTitlePreview(record: ChatThreadRecord): string {
  const firstUser = record.messages.find((m) => m.role === "user");
  const firstLine = firstUser?.text?.trim().split(/\r?\n/)[0]?.trim() ?? "";
  if (!firstLine) return "Chat";
  const words = firstLine.split(/\s+/).filter(Boolean);
  if (words.length <= 8) return words.join(" ");
  return `${words.slice(0, 8).join(" ")}…`;
}

function chatHistoryTimestampLabel(savedAt: string): string {
  const d = new Date(savedAt);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const dayLabel = sameDay
    ? "Today"
    : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const timeLabel = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${dayLabel} • ${timeLabel}`;
}

/**
 * Chat thread picker: desktop xl+ right rail, or mobile compact trigger + overlay list.
 */
export function ChatHistoryPanel({
  threads,
  activeChatId,
  onSelectChat,
  onThreadMenuAction,
  className,
  variant = "rail",
  mobileTriggerAlign = "start",
}: ChatHistoryPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsMenuThreadId, setActionsMenuThreadId] = useState<string | null>(
    null,
  );
  const bodyId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const rowMenuRootRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const setRowMenuRoot = useCallback((id: string, el: HTMLDivElement | null) => {
    const m = rowMenuRootRefs.current;
    if (el) m.set(id, el);
    else m.delete(id);
  }, []);

  const toggleMenu = useCallback(() => {
    setMenuOpen((o) => !o);
  }, []);

  const closeActionsMenu = useCallback(() => {
    setActionsMenuThreadId(null);
  }, []);

  const toggleActionsMenu = useCallback((threadId: string) => {
    setActionsMenuThreadId((cur) => (cur === threadId ? null : threadId));
  }, []);

  useEffect(() => {
    if (!menuOpen) closeActionsMenu();
  }, [menuOpen, closeActionsMenu]);

  useEffect(() => {
    if (!menuOpen && !actionsMenuThreadId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (actionsMenuThreadId) {
        setActionsMenuThreadId(null);
        return;
      }
      setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen, actionsMenuThreadId]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!actionsMenuThreadId) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = rowMenuRootRefs.current.get(actionsMenuThreadId);
      if (el?.contains(e.target as Node)) return;
      setActionsMenuThreadId(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [actionsMenuThreadId]);

  const sortedThreads = useMemo(() => {
    const completedThreads = threads.filter((t) =>
      t.messages.some((m) => m.role === "user" && m.text.trim().length > 0),
    );
    return [...completedThreads].sort((a, b) =>
      a.savedAt < b.savedAt ? 1 : a.savedAt > b.savedAt ? -1 : 0,
    );
  }, [threads]);

  const rowPad = "px-1";

  const handlePickChat = useCallback(
    (id: string) => {
      setMenuOpen(false);
      closeActionsMenu();
      onSelectChat(id);
    },
    [closeActionsMenu, onSelectChat],
  );

  const titleTextClass =
    "min-w-0 truncate text-left text-[11px] leading-[18px] text-white";

  const listContent =
    sortedThreads.length === 0 ? (
      <p
        className={cn(
          "py-8 text-left text-[11px] leading-[18px] text-white",
          rowPad,
        )}
      >
        No saved chats yet.
      </p>
    ) : (
      sortedThreads.map((t) => {
        const selected = t.id === activeChatId;
        const actionsOpen = actionsMenuThreadId === t.id;
        return (
          <div
            key={t.id}
            className={cn(
              "border-b border-edge-subtle/15 pb-3 pt-3 last:border-b-0",
              rowPad,
            )}
          >
            <div
              role="option"
              aria-selected={selected ? "true" : undefined}
              tabIndex={0}
              onClick={() => handlePickChat(t.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePickChat(t.id);
                }
              }}
              className={cn(
                "flex w-full min-w-0 cursor-pointer items-start justify-between gap-0 rounded-full px-3 py-2 transition-colors duration-150",
                selected ? "bg-[#0C1E6A]" : "bg-transparent hover:bg-[#0C1E6A]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    titleTextClass,
                    "truncate overflow-hidden whitespace-nowrap text-ellipsis",
                  )}
                >
                  {chatHistoryTitlePreview(t)}
                </p>
                <p className="mt-0.5 truncate text-[10px] leading-[14px] text-white/60">
                  {chatHistoryTimestampLabel(t.savedAt)}
                </p>
              </div>
              <div
                ref={(el) => setRowMenuRoot(t.id, el)}
                className="relative shrink-0 self-center"
                data-chat-history-row-menu=""
              >
                <button
                  type="button"
                  aria-label="Chat actions"
                  aria-expanded={actionsOpen}
                  aria-haspopup="menu"
                  className={cn(
                    historyPanelRailRowActionsTriggerButtonClassName,
                    threeDotsMenuTriggerButtonClassName,
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    toggleActionsMenu(t.id);
                  }}
                >
                  <IconDots className="h-4 w-4" />
                </button>
                {actionsOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[70] mt-1 min-w-[180px] max-w-[min(100vw-2rem,260px)]"
                  >
                    <div className="rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl">
                      {THREAD_MENU_ITEMS.map((label) => (
                        <button
                          key={label}
                          type="button"
                          role="menuitem"
                          className="flex w-full cursor-pointer items-center rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-ix-pressed"
                          onClick={(e) => {
                            e.stopPropagation();
                            onThreadMenuAction?.(t.id, label);
                            closeActionsMenu();
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        );
      })
    );

  const titleToggle = (
    <div className={historyPanelRailTitleRowClassName}>
      <div
        className={cn(historyPanelRailTitleSurfaceClassName, "w-full min-w-0")}
      >
        <button
          type="button"
          id={`${bodyId}-toggle`}
          aria-expanded={menuOpen}
          aria-haspopup="listbox"
          aria-controls={menuOpen ? bodyId : undefined}
          onClick={toggleMenu}
          className={historyPanelRailHeaderButtonClassName}
        >
          <span className={historyPanelRailTitleToggleLabelClassName}>
            CHAT HISTORY
          </span>
          <RightRailPanelChevron expanded={menuOpen} />
        </button>
      </div>
    </div>
  );

  if (variant === "mobile") {
    const alignEnd = mobileTriggerAlign === "end";
    return (
      <div
        ref={rootRef}
        className={cn(
          "relative z-[35] min-w-0 shrink-0 bg-transparent pt-0",
          alignEnd
            ? "ml-auto w-full max-w-[min(100%,320px)]"
            : "w-full self-start",
          className,
        )}
      >
        <div
          className={cn(
            historyPanelRightRailUnifiedShellShrinkWrapClassName,
            /* Half-width blue panel vs parent; `w-full` from shrink-wrap is overridden here (mobile only). */
            "min-w-0 w-1/2 max-w-full shadow-xl",
            alignEnd ? "ml-auto" : "self-start",
          )}
        >
          <div className={cn("w-full shrink-0", historyPanelRailTitleRowClassName)}>
            <div
              className={cn(
                historyPanelRailTitleSurfaceClassName,
                "w-full min-w-0",
              )}
            >
              <button
                type="button"
                id={`${bodyId}-toggle`}
                aria-expanded={menuOpen}
                aria-haspopup="listbox"
                aria-controls={menuOpen ? bodyId : undefined}
                onClick={toggleMenu}
                className={cn(
                  historyPanelRailHeaderButtonClassName,
                  "justify-between",
                )}
              >
                <span
                  className={cn(
                    historyPanelRailTitleHeadingClassName,
                    "shrink-0 whitespace-nowrap text-left",
                  )}
                >
                  CHAT HISTORY
                </span>
                <RightRailPanelChevron expanded={menuOpen} />
              </button>
            </div>
          </div>
          {menuOpen ? (
            <div
              id={bodyId}
              role="listbox"
              aria-labelledby={`${bodyId}-toggle`}
              className={cn(
                railHistoryDropdownPanelSurfaceClassName,
                "max-h-[min(52vh,400px)]",
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
                {listContent}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-app-bg xl:w-[300px]",
        className,
      )}
    >
      <div
        className={cn(
          historyPanelRailInnerClassName,
          "flex min-h-0 min-w-0 flex-1 flex-col",
        )}
      >
        <div
          ref={rootRef}
          className={cn(
            menuOpen
              ? historyPanelRightRailUnifiedShellClassName
              : historyPanelRightRailUnifiedShellCollapsedClassName,
            "relative z-[1]",
          )}
        >
          <div className={historyPanelRailDesktopTitleAreaWrapperClassName}>
            {titleToggle}
          </div>

          {menuOpen ? (
            <div
              id={bodyId}
              role="listbox"
              aria-labelledby={`${bodyId}-toggle`}
              className={cn(
                "relative z-10 min-h-0 flex-1",
                railHistoryDropdownPanelSurfaceClassName,
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">{listContent}</div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
