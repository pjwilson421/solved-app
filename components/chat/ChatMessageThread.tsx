"use client";

import type { MouseEvent, RefObject } from "react";
import { useState } from "react";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";
import {
  bubbleStackMarginTopClass,
  chatDateTimeLabelTextClassName,
  formatChatDateLabel,
  formatMessageTime,
  resolveMessageDates,
  shouldShowDateSeparator,
} from "./chat-message-datetime";
import {
  CHAT_TIMESTAMP_REVEAL_PX,
  useChatTimestampReveal,
} from "./use-chat-timestamp-reveal";
import {
  ChatOptionsMenu,
  type AssistantMessageMenuAction,
} from "./ChatOptionsMenu";

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
  onAssistantMessageAction?: (
    message: ChatThreadMessage,
    action: AssistantMessageMenuAction,
  ) => void;
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
        className={cn(
          "rounded-full bg-primary/10 px-3 py-0.5 text-[11px] font-medium",
          chatDateTimeLabelTextClassName,
        )}
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
        className={cn(
          "pr-0.5 text-[11px] leading-[13px]",
          chatDateTimeLabelTextClassName,
        )}
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

/** Shared layout + type rhythm for user and assistant bubbles (role-specific colors below). */
const chatBubbleFrameClassName =
  "relative max-w-[95%] shrink-0 rounded-[20px] py-3 pl-4 pr-10 text-left font-normal text-[16px] leading-[22px]";

const chatBubbleTextClassName =
  "block min-w-0 whitespace-pre-wrap break-words text-[16px] leading-[22px] font-normal select-text cursor-text";

function UserBubble({ m, stackMarginClass }: BubbleProps) {
  return (
    <div
      className={cn(
        chatBubbleFrameClassName,
        "bg-[#0b1f6f] text-tx-primary hover:bg-[#0b1f6f] active:bg-[#0b1f6f]",
        stackMarginClass,
      )}
    >
      <button
        type="button"
        onClick={(e) => handleCopyClick(e, m.text)}
        className={cn(
          "absolute right-1.5 top-1.5 z-[1] flex h-7 w-7 items-center justify-center rounded-full",
          "text-tx-secondary opacity-90 transition-colors hover:bg-white/10 hover:text-white",
        )}
        aria-label="Copy message"
      >
        <IconAsset
          src={ICONS.copy}
          size={16}
          className="pointer-events-none [&_img]:opacity-100"
        />
      </button>
      <span className={chatBubbleTextClassName}>{m.text}</span>
    </div>
  );
}

function AssistantBubble({ m, stackMarginClass }: BubbleProps) {
  return (
    <div
      className={cn(
        chatBubbleFrameClassName,
        "bg-[#282828] text-[#FFFFFF]",
        "[&_a]:text-[#FFFFFF] [&_a]:underline [&_strong]:text-[#FFFFFF] [&_code]:text-[#FFFFFF]",
        stackMarginClass,
      )}
    >
      <button
        type="button"
        onClick={(e) => handleCopyClick(e, m.text)}
        className={cn(
          "absolute right-1.5 top-1.5 z-[1] flex h-7 w-7 items-center justify-center rounded-full",
          "text-[#FFFFFF] opacity-90 transition-colors hover:bg-white/10 hover:opacity-100",
        )}
        aria-label="Copy message"
      >
        <IconAsset
          src={ICONS.copy}
          size={16}
          className="pointer-events-none [&_img]:opacity-100"
        />
      </button>
      <span className={chatBubbleTextClassName}>{m.text}</span>
    </div>
  );
}

export function ChatMessageThread({
  messages,
  className,
  showSuggestedChips = false,
  onChipClick,
  onAssistantMessageAction,
  bottomRef,
}: ChatMessageThreadProps) {
  const { reveal, horizontalLock, transitionClass, handlers } =
    useChatTimestampReveal();
  const [openAssistantMenuMessageId, setOpenAssistantMenuMessageId] = useState<
    string | null
  >(null);

  const now = new Date();
  const dates = resolveMessageDates(messages, now);

  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-col",
        className,
      )}
      style={{
        touchAction: horizontalLock ? "none" : "pan-y",
      }}
      {...handlers}
    >
      <div className="mx-auto flex w-full min-w-0 max-w-[800px] flex-col">
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

            {isUser ? (
              <div className="flex w-full min-w-0 items-end justify-end gap-1.5">
                <MessageTimestampColumn
                  timeLabel={timeLabel}
                  reveal={reveal}
                  transitionClass={transitionClass}
                />
                <UserBubble
                  m={m}
                  stackMarginClass={stackMarginClass}
                />
              </div>
            ) : (
              <div className="flex w-full min-w-0 flex-col items-start">
                <div className="flex w-full min-w-0 items-end justify-start gap-1.5">
                  <div className="inline-flex min-w-0 max-w-[95%] flex-col items-start">
                    <AssistantBubble
                      m={m}
                      stackMarginClass={stackMarginClass}
                    />
                    <div className="mt-1.5 flex w-full justify-end max-w-[95%]">
                      <ChatOptionsMenu
                        open={openAssistantMenuMessageId === m.id}
                        onOpenChange={(open) => {
                          setOpenAssistantMenuMessageId(open ? m.id : null);
                        }}
                        onSelect={(action) => onAssistantMessageAction?.(m, action)}
                      />
                    </div>
                  </div>
                  <MessageTimestampColumn
                    timeLabel={timeLabel}
                    reveal={reveal}
                    transitionClass={transitionClass}
                  />
                </div>
              </div>
            )}
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
                "rounded-full bg-surface-card px-3 py-1.5",
                "text-[11px] font-medium text-tx-secondary transition-colors",
                "hover:bg-panel-hover hover:text-white",
                "focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-panel-hover focus-visible:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      <div ref={bottomRef} className="h-0 w-full shrink-0" aria-hidden />
      </div>
    </div>
  );
}
