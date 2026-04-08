"use client";

import type { MouseEvent, RefObject } from "react";
import { useMemo } from "react";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";
import {
  bubbleStackMarginTopClass,
  formatChatDateLabel,
  formatMessageTime,
  resolveMessageDates,
  shouldShowDateSeparator,
} from "./chat-message-datetime";
import {
  CHAT_TIMESTAMP_REVEAL_PX,
  useChatTimestampReveal,
} from "./use-chat-timestamp-reveal";

/** Muted secondary text — aligned with Apple Messages on iOS. */
const CHAT_META = "#8a8a93";

/** Copies full plain text; clipboard API with execCommand fallback for older / non-HTTPS contexts. */
async function copyMessageText(text: string): Promise<boolean> {
  const value = text ?? "";
  if (!value) return false;

  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through */
  }

  try {
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "0";
    ta.setAttribute("aria-hidden", "true");
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, value.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

function handleCopyClick(e: MouseEvent<HTMLButtonElement>, text: string) {
  e.preventDefault();
  e.stopPropagation();
  void copyMessageText(text);
}

export type ChatThreadMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  /** ISO 8601 — used for date separators, grouping, and swipe-to-reveal times. */
  sentAt?: string;
};

const SUGGESTED_CHIPS = [
  "Summarize this",
  "Explain step by step",
  "Shorter answer",
] as const;

type ChatMessageThreadProps = {
  messages: ChatThreadMessage[];
  className?: string;
  /** Mobile SVG: optional quick-action row above the prompt. */
  showSuggestedChips?: boolean;
  onChipClick?: (label: string) => void;
  /** Anchor for auto-scroll to latest message. */
  bottomRef?: RefObject<HTMLDivElement | null>;
};

function DateSeparator({ label }: { label: string }) {
  return (
    <div
      className="flex w-full justify-center px-2 py-2"
      role="separator"
      aria-label={label}
    >
      <span
        className="rounded-input px-3 py-0.5 text-[11px] font-medium"
        style={{ color: CHAT_META, backgroundColor: "rgba(255,255,255,0.05)" }}
      >
        {label}
      </span>
    </div>
  );
}

function MessageTimestampColumn({
  timeLabel,
  reveal,
  transitionClass,
}: {
  timeLabel: string;
  reveal: number;
  transitionClass: string;
}) {
  const w = reveal * CHAT_TIMESTAMP_REVEAL_PX;
  const opacity = reveal < 0.03 ? 0 : Math.min(1, reveal * 1.15);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col justify-end overflow-hidden text-right tabular-nums",
        transitionClass,
      )}
      style={{
        width: w,
        opacity,
        pointerEvents: "none",
      }}
      aria-hidden
    >
      <span
        className="pr-0.5 text-[11px] leading-[13px]"
        style={{ color: CHAT_META }}
      >
        {timeLabel}
      </span>
    </div>
  );
}

type BubbleProps = {
  m: ChatThreadMessage;
  stackMarginClass: string;
};

function UserBubble({ m, stackMarginClass }: BubbleProps) {
  return (
    <div
      className={cn(
        "relative max-w-[min(100%,420px)] rounded-full bg-[#3ABEFF]/90",
        "px-5 pr-11 pb-3 pt-3 text-left text-[16px] leading-[22px] text-[#FAFAFA]",
        stackMarginClass,
      )}
    >
      <button
        type="button"
        onClick={(e) => handleCopyClick(e, m.text)}
        className={cn(
          "absolute right-1.5 top-1.5 z-[1] flex h-7 w-7 items-center justify-center rounded-menu-item",
          "text-[#A1A1AA] opacity-90 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/15",
        )}
        aria-label="Copy message"
      >
        <IconAsset
          src={ICONS.copy}
          size={16}
          className="pointer-events-none [&_img]:opacity-100"
        />
      </button>
      <span className="block whitespace-pre-wrap break-words">{m.text}</span>
    </div>
  );
}

function AssistantBubble({ m, stackMarginClass }: BubbleProps) {
  return (
    <div
      className={cn(
        "relative max-w-[min(100%,620px)] rounded-full border-0 bg-[#18181B] shadow-none ring-0",
        "pl-[5px] pr-[5px] pb-3 pt-3 text-left text-[16px] leading-[22px] text-[#E4E4E7]",
        stackMarginClass,
      )}
    >
      <button
        type="button"
        onClick={(e) => handleCopyClick(e, m.text)}
        className={cn(
          "absolute right-[5px] top-[5px] z-[1] flex h-7 w-7 items-center justify-center rounded-menu-item",
          "text-[#A1A1AA] opacity-90 transition-colors hover:bg-white/10 hover:text-white focus-visible:bg-white/15",
        )}
        aria-label="Copy message"
      >
        <IconAsset
          src={ICONS.copy}
          size={16}
          className="pointer-events-none [&_img]:opacity-100"
        />
      </button>
      <span className="block whitespace-pre-wrap break-words pr-[38px]">
        {m.text}
      </span>
    </div>
  );
}

export function ChatMessageThread({
  messages,
  className,
  showSuggestedChips = false,
  onChipClick,
  bottomRef,
}: ChatMessageThreadProps) {
  const { reveal, horizontalLock, transitionClass, handlers } =
    useChatTimestampReveal();

  const now = useMemo(() => new Date(), [messages.length]);

  const dates = useMemo(
    () => resolveMessageDates(messages, now),
    [messages, now],
  );

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col",
        horizontalLock && "select-none",
        className,
      )}
      style={{
        touchAction: horizontalLock ? "none" : "pan-y",
      }}
      {...handlers}
    >
      {messages.map((m, i) => {
        const prev = i > 0 ? messages[i - 1] : undefined;
        const prevDate = i > 0 ? dates[i - 1] : undefined;
        const d = dates[i];
        const showSep = shouldShowDateSeparator(prevDate, d, i);
        const stackMarginClass = bubbleStackMarginTopClass(showSep, prev, m);
        const dateLabel = formatChatDateLabel(d, now);
        const timeLabel = formatMessageTime(d);
        const isUser = m.role === "user";

        return (
          <div key={m.id}>
            {showSep ? <DateSeparator label={dateLabel} /> : null}

            <div
              className={cn(
                "flex w-full min-w-0 items-end gap-1.5",
                isUser ? "justify-end" : "justify-start",
              )}
            >
              {isUser ? (
                <>
                  <UserBubble m={m} stackMarginClass={stackMarginClass} />
                  <MessageTimestampColumn
                    timeLabel={timeLabel}
                    reveal={reveal}
                    transitionClass={transitionClass}
                  />
                </>
              ) : (
                <>
                  <AssistantBubble m={m} stackMarginClass={stackMarginClass} />
                  <MessageTimestampColumn
                    timeLabel={timeLabel}
                    reveal={reveal}
                    transitionClass={transitionClass}
                  />
                </>
              )}
            </div>
          </div>
        );
      })}

      {showSuggestedChips ? (
        <div
          className="mt-4 flex flex-wrap justify-start gap-2 pt-1"
          role="group"
          aria-label="Suggested prompts"
        >
          {SUGGESTED_CHIPS.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => onChipClick?.(label)}
              className={cn(
                "rounded-card bg-app-card px-3 py-1.5",
                "text-[11px] font-medium text-[#A1A1AA] transition-colors",
                "hover:bg-app-hover hover:text-white focus-visible:bg-app-hover",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <div ref={bottomRef} className="h-px w-full shrink-0" aria-hidden />
    </div>
  );
}
