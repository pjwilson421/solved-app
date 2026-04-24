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
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { threeDotsMenuTriggerButtonClassName } from "@/components/ui/three-dots-menu-trigger";
import { cn } from "@/lib/utils";
import type { ChatThreadRecord } from "@/lib/app-data/chat-thread";

export type ChatHistoryThreadMenuAction =
  | "Like"
  | "Pin"
  | "Rename"
  | "Delete";

const THREAD_MENU_ITEMS: ChatHistoryThreadMenuAction[] = [
  "Like",
  "Pin",
  "Rename",
  "Delete",
];

function threadMenuIconSrc(action: ChatHistoryThreadMenuAction, liked: boolean): string {
  if (action === "Like") return liked ? ICONS.liked : ICONS.likedOutlined;
  if (action === "Pin") return ICONS.pin;
  if (action === "Rename") return ICONS.rename;
  return ICONS.delete;
}

type ChatHistoryPanelProps = {
  threads: ChatThreadRecord[];
  activeChatId: string;
  onSelectChat: (id: string) => void;
  /** Per-thread overflow menu (desktop + mobile list). */
  onThreadMenuAction?: (
    threadId: string,
    action: ChatHistoryThreadMenuAction,
  ) => void;
  isThreadLiked?: (threadId: string) => boolean;
  onRenameChat?: (threadId: string, title: string) => void;
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
  const custom = record.customTitle?.trim();
  if (custom) return custom;
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

function ChatPinnedIcon() {
  return (
    <svg
      className="h-3.5 w-3.5 shrink-0 text-white/70"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 3h8v1.5l-1.5 2v4.5l2 1.5V14h-3.5L12 21l-1-7H7.5v-1.5l2-1.5V6.5L8 4.5V3Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * Chat thread picker: desktop xl+ right rail, or mobile compact trigger + overlay list.
 */
export function ChatHistoryPanel({
  threads,
  activeChatId,
  onSelectChat,
  onThreadMenuAction,
  isThreadLiked,
  onRenameChat,
  className,
  variant = "rail",
  mobileTriggerAlign = "start",
}: ChatHistoryPanelProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionsMenuThreadId, setActionsMenuThreadId] = useState<string | null>(
    null,
  );
  const [renamingThreadId, setRenamingThreadId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const bodyId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);
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

  const cancelRename = useCallback(() => {
    setRenamingThreadId(null);
    setRenameValue("");
  }, []);

  const commitRename = useCallback(() => {
    if (!renamingThreadId) return;
    const next = renameValue.trim();
    if (!next) {
      cancelRename();
      return;
    }
    onRenameChat?.(renamingThreadId, next);
    cancelRename();
  }, [cancelRename, onRenameChat, renameValue, renamingThreadId]);

  const toggleActionsMenu = useCallback((threadId: string) => {
    setActionsMenuThreadId((cur) => (cur === threadId ? null : threadId));
  }, []);

  useEffect(() => {
    if (!menuOpen) closeActionsMenu();
  }, [menuOpen, closeActionsMenu]);

  useEffect(() => {
    if (!renamingThreadId) return;
    const id = requestAnimationFrame(() => {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [renamingThreadId]);

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

  useEffect(() => {
    if (!renamingThreadId) return;
    const exists = threads.some((t) => t.id === renamingThreadId);
    if (!exists) {
      cancelRename();
    }
  }, [cancelRename, renamingThreadId, threads]);

  const sortedThreads = useMemo(() => {
    const completedThreads = threads.filter((t) =>
      t.messages.some((m) => m.role === "user" && m.text.trim().length > 0),
    );
    return [...completedThreads].sort((a, b) => {
      const aPinned = typeof a.pinnedAt === "string";
      const bPinned = typeof b.pinnedAt === "string";
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      if (aPinned && bPinned && a.pinnedAt && b.pinnedAt) {
        if (a.pinnedAt < b.pinnedAt) return 1;
        if (a.pinnedAt > b.pinnedAt) return -1;
      }
      if (a.savedAt < b.savedAt) return 1;
      if (a.savedAt > b.savedAt) return -1;
      return 0;
    });
  }, [threads]);

  const rowPad = "px-1";

  const handlePickChat = useCallback(
    (id: string) => {
      if (renamingThreadId) return;
      setMenuOpen(false);
      closeActionsMenu();
      onSelectChat(id);
    },
    [closeActionsMenu, onSelectChat, renamingThreadId],
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
        const isRenaming = renamingThreadId === t.id;
        const titlePreview = chatHistoryTitlePreview(t);
        const threadLiked = isThreadLiked?.(t.id) ?? false;
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
                if (isRenaming) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handlePickChat(t.id);
                }
              }}
              className={cn(
                "flex w-full min-w-0 cursor-pointer items-center justify-between gap-0 rounded-full px-3 py-3 transition-colors duration-150",
                selected ? "bg-[#0C1E6A]" : "bg-transparent hover:bg-[#0C1E6A]",
              )}
            >
              <div className="min-w-0 flex-1 pl-12 py-1">
                <p
                  className={cn(
                    titleTextClass,
                    "flex items-center gap-1.5",
                    "truncate overflow-hidden whitespace-nowrap text-ellipsis",
                  )}
                >
                  {t.pinnedAt ? <ChatPinnedIcon /> : null}
                  {isRenaming ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          commitRename();
                          return;
                        }
                        if (e.key === "Escape") {
                          e.preventDefault();
                          e.stopPropagation();
                          cancelRename();
                        }
                      }}
                      onBlur={() => {
                        commitRename();
                      }}
                      className="min-w-0 flex-1 bg-transparent text-[11px] leading-[18px] text-white outline-none"
                      aria-label="Rename chat"
                    />
                  ) : (
                    <span className="min-w-0 truncate">{titlePreview}</span>
                  )}
                </p>
                <p className="mt-1 truncate text-[10px] leading-[14px] text-white/60">
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
                            if (label === "Rename") {
                              setRenamingThreadId(t.id);
                              setRenameValue(titlePreview);
                            } else {
                              onThreadMenuAction?.(t.id, label);
                            }
                            closeActionsMenu();
                          }}
                        >
                          <IconAsset
                            src={threadMenuIconSrc(label, threadLiked)}
                            size={14}
                            className="mr-2.5"
                          />
                          <span>{label}</span>
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
