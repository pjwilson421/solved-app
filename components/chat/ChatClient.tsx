"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useShellNav } from "@/lib/use-shell-nav";
import Image from "next/image";
import { Header } from "../create-image/Header";
import { Sidebar } from "../create-image/Sidebar";
import { PromptBar } from "../create-image/PromptBar";
import { GenerationSettingsRow } from "../create-image/GenerationSettingsRow";
import { DesktopTemplatesStrip } from "../create-image/DesktopTemplatesStrip";
import {
  createImageScrollContentBottomPaddingPx,
  createImageScrollContentBottomPaddingPxDesktopXl,
} from "../create-image/preview-frame-layout";
import { useCreateImagePreviewPromptLayout } from "../create-image/use-create-image-preview-prompt-layout";
import { FixedPromptBarDock } from "../create-image/FixedPromptBarDock";
import {
  createImageDesktopPromptDockGeometryPx,
  type PromptBarDockGeometry,
} from "../create-image/prompt-bar-dock-geometry";
import type {
  AspectRatio,
  AssetContentType,
  Quality,
  ReferenceFile,
} from "../create-image/types";
import { MOCK_TEMPLATES } from "../create-image/types";
import { ChatMessageThread, type ChatThreadMessage } from "./ChatMessageThread";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import {
  ChatHistoryPanel,
  type ChatHistoryThreadMenuAction,
} from "./ChatHistoryPanel";
import type { AssistantMessageMenuAction } from "./ChatOptionsMenu";
import { DesktopThreeColumnShell } from "@/components/shell/DesktopThreeColumnShell";
import {
  setChatThreadCustomTitle,
  setChatThreadPinned,
} from "@/lib/app-data/chat-thread";
import { cn } from "@/lib/utils";
import { IconDots } from "@/components/create-image/icons";
import { threeDotsMenuTriggerButtonClassName } from "@/components/ui/three-dots-menu-trigger";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type MainChatMenuAction = "Like" | "Pin" | "Delete";

const MAIN_CHAT_MENU_ITEMS: MainChatMenuAction[] = ["Like", "Pin", "Delete"];

function mainChatMenuIconSrc(action: MainChatMenuAction, liked: boolean): string {
  if (action === "Like") return liked ? ICONS.liked : ICONS.likedOutlined;
  if (action === "Pin") return ICONS.pin;
  return ICONS.delete;
}

const CHAT_ASSISTANT_FEEDBACK_STORAGE_KEY =
  "solved-app-chat-assistant-feedback-v1";

const INITIAL_CHAT_SESSION_ID = "chat-session-initial";

type ChatAssistantFeedback = {
  chatId: string;
  messageId: string;
  prompt: string;
  responseText: string;
  feedbackType: "good" | "bad";
  createdAt: string;
};

export function ChatClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { navigate, activeMainNav } = useShellNav();
  const openChatId = searchParams.get("openChat");

  const [promptFocusNonce, setPromptFocusNonce] = useState(0);
  const promptTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const [barPrompt, setBarPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  /** Invisible — same dock stack as Create Image so flex layout / spacing matches exactly. */
  const [dockParityAsset, setDockParityAsset] =
    useState<AssetContentType>("Standard");
  const [dockParityAspect, setDockParityAspect] =
    useState<AspectRatio>("16:9");
  const [dockParityQuality, setDockParityQuality] = useState<Quality>("4K");
  const [dockParityVariations, setDockParityVariations] = useState(1);
  const [dockParityTemplateId, setDockParityTemplateId] = useState<
    string | null
  >(null);
  const [mainChatMenuOpen, setMainChatMenuOpen] = useState(false);
  const desktopMainChatMenuRef = useRef<HTMLDivElement>(null);
  const mobileMainChatMenuRef = useRef<HTMLDivElement>(null);
  const [chatSessionId, setChatSessionId] = useState(INITIAL_CHAT_SESSION_ID);

  const { chatThreads, upsertChatThreadSnapshot, updateChatThreads } =
    useAppData();
  const { isLiked } = useLikedItems();
  const { toggleLike, deleteCatalogItem } = useAppItemActions();

  const currentThread = useMemo(
    () => chatThreads.find((t) => t.id === chatSessionId),
    [chatThreads, chatSessionId],
  );
  const messages: ChatThreadMessage[] = currentThread?.messages ?? [];
  const currentChatLiked = isLiked(likedKey.chat(chatSessionId));

  const createNewChatSessionId = useCallback(
    () =>
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    [],
  );

  const resetComposerForNewChat = useCallback(() => {
    setBarPrompt("");
    setReferences((prev) => {
      for (const r of prev) URL.revokeObjectURL(r.url);
      return [];
    });
    setIsSending(false);
    setFullScreenUrl(null);
  }, []);

  const requestAssistantReply = useCallback(async (transcriptPayload: string) => {
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: transcriptPayload }),
      });
      const data: unknown = await res.json().catch(() => null);
      if (
        !res.ok ||
        !data ||
        typeof data !== "object" ||
        typeof (data as { text?: unknown }).text !== "string"
      ) {
        return "Sorry, something went wrong.";
      }
      return (data as { text: string }).text;
    } catch {
      return "Sorry, something went wrong.";
    }
  }, []);

  const persistAssistantFeedback = useCallback((feedback: ChatAssistantFeedback) => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(CHAT_ASSISTANT_FEEDBACK_STORAGE_KEY);
      const parsed = raw ? (JSON.parse(raw) as unknown) : [];
      const prev = Array.isArray(parsed)
        ? parsed.filter((item): item is ChatAssistantFeedback => {
            if (!item || typeof item !== "object") return false;
            const candidate = item as Partial<ChatAssistantFeedback>;
            return (
              typeof candidate.chatId === "string" &&
              typeof candidate.messageId === "string" &&
              typeof candidate.prompt === "string" &&
              typeof candidate.responseText === "string" &&
              (candidate.feedbackType === "good" || candidate.feedbackType === "bad") &&
              typeof candidate.createdAt === "string"
            );
          })
        : [];
      window.localStorage.setItem(
        CHAT_ASSISTANT_FEEDBACK_STORAGE_KEY,
        JSON.stringify([...prev, feedback]),
      );
    } catch (error) {
      console.warn("[chat-feedback] failed to persist assistant feedback", error);
    }
  }, []);

  const handleAssistantMessageMenuAction = useCallback(
    (message: ChatThreadMessage, action: AssistantMessageMenuAction) => {
      if (!currentThread || message.role !== "assistant") return;

      const threadMessages = currentThread.messages;
      const targetIndex = threadMessages.findIndex((m) => m.id === message.id);
      if (targetIndex < 0) return;

      const promptText = (() => {
        for (let i = targetIndex - 1; i >= 0; i -= 1) {
          const candidate = threadMessages[i];
          if (candidate.role !== "user") continue;
          return candidate.text?.trim() ?? "";
        }
        return "";
      })();

      if (action === "Regenerate") {
        if (isSending) return;
        if (!promptText) return;
        const transcriptPayload = `User: ${promptText}`;

        setIsSending(true);
        void requestAssistantReply(transcriptPayload)
          .then((assistantText) => {
            const nextMessages = threadMessages.map((m, index) => {
              if (index !== targetIndex) return m;
              return {
                ...m,
                text: assistantText,
                sentAt: new Date().toISOString(),
              };
            });
            upsertChatThreadSnapshot(chatSessionId, nextMessages);
          })
          .finally(() => {
            setIsSending(false);
          });
        return;
      }

      if (action === "Good response" || action === "Bad response") {
        const feedbackType = action === "Good response" ? "good" : "bad";
        persistAssistantFeedback({
          chatId: chatSessionId,
          messageId: message.id,
          prompt: promptText,
          responseText: message.text ?? "",
          feedbackType,
          createdAt: new Date().toISOString(),
        });
      }
    },
    [
      chatSessionId,
      currentThread,
      isSending,
      persistAssistantFeedback,
      requestAssistantReply,
      upsertChatThreadSnapshot,
    ],
  );

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      resetComposerForNewChat();
      setChatSessionId(createNewChatSessionId());
      setPromptFocusNonce((n) => n + 1);
      router.replace("/chat", { scroll: false });
      return;
    }
    if (!openChatId) return;
    const rec = chatThreads.find((c) => c.id === openChatId);
    if (!rec) {
      router.replace("/chat", { scroll: false });
      return;
    }
    setChatSessionId(rec.id);
    router.replace("/chat", { scroll: false });
    return;
  }, [
    createNewChatSessionId,
    openChatId,
    resetComposerForNewChat,
    router,
    searchParams,
    chatThreads,
  ]);

  useEffect(() => {
    if (chatSessionId !== INITIAL_CHAT_SESSION_ID) return;
    if (chatThreads.length > 0) {
      setChatSessionId(chatThreads[0].id);
      return;
    }
    setChatSessionId(createNewChatSessionId());
  }, [
    chatSessionId,
    createNewChatSessionId,
    chatThreads,
  ]);

  useEffect(() => {
    if (!mainChatMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (desktopMainChatMenuRef.current?.contains(e.target as Node)) return;
      if (mobileMainChatMenuRef.current?.contains(e.target as Node)) return;
      setMainChatMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setMainChatMenuOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mainChatMenuOpen]);

  const handleMainChatMenuAction = useCallback(
    (action: MainChatMenuAction) => {
      setMainChatMenuOpen(false);

      if (action === "Like") {
        if (!currentThread) return;
        if (!isLiked(likedKey.chat(chatSessionId))) {
          upsertChatThreadSnapshot(chatSessionId, currentThread.messages);
          toggleLike(appItemRef.chat(chatSessionId));
        }
        return;
      }

      if (action === "Pin") {
        if (!currentThread) return;
        const currentlyPinned = Boolean(currentThread.pinnedAt);
        if (currentlyPinned) return;
        updateChatThreads((prev) => setChatThreadPinned(prev, chatSessionId, true));
        return;
      }

      if (action === "Delete") {
        if (isLiked(likedKey.chat(chatSessionId))) {
          toggleLike(appItemRef.chat(chatSessionId));
        }
        deleteCatalogItem(appItemRef.chat(chatSessionId));
        resetComposerForNewChat();
        setChatSessionId(createNewChatSessionId());
        setPromptFocusNonce((n) => n + 1);
      }
    },
    [
      chatSessionId,
      createNewChatSessionId,
      currentThread,
      deleteCatalogItem,
      isLiked,
      resetComposerForNewChat,
      toggleLike,
      updateChatThreads,
      upsertChatThreadSnapshot,
    ],
  );

  useLayoutEffect(() => {
    if (promptFocusNonce === 0) return;
    const id = requestAnimationFrame(() => {
      promptTextAreaRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(id);
  }, [promptFocusNonce]);

  const handleChatHistoryThreadMenuAction = useCallback(
    (threadId: string, action: ChatHistoryThreadMenuAction) => {
      const thread = chatThreads.find((t) => t.id === threadId);
      if (!thread) return;

      if (action === "Like") {
        if (!isLiked(likedKey.chat(threadId))) {
          upsertChatThreadSnapshot(threadId, thread.messages);
        }
        toggleLike(appItemRef.chat(threadId));
        return;
      }

      if (action === "Pin") {
        const currentlyPinned = Boolean(thread.pinnedAt);
        updateChatThreads((prev) => setChatThreadPinned(prev, threadId, !currentlyPinned));
        return;
      }

      if (action === "Delete") {
        const shouldDelete =
          typeof window === "undefined"
            ? true
            : window.confirm("Delete this chat permanently?");
        if (!shouldDelete) return;

        if (isLiked(likedKey.chat(threadId))) {
          toggleLike(appItemRef.chat(threadId));
        }

        if (threadId === chatSessionId) {
          const nextThreads = chatThreads.filter((t) => t.id !== threadId);
          if (nextThreads.length > 0) {
            setChatSessionId(nextThreads[0].id);
          } else {
            setChatSessionId(createNewChatSessionId());
            resetComposerForNewChat();
          }
        }

        deleteCatalogItem(appItemRef.chat(threadId));
      }
    },
    [
      chatSessionId,
      chatThreads,
      createNewChatSessionId,
      deleteCatalogItem,
      isLiked,
      resetComposerForNewChat,
      toggleLike,
      updateChatThreads,
      upsertChatThreadSnapshot,
    ],
  );

  const handleRenameChat = useCallback(
    (threadId: string, title: string) => {
      const next = title.trim();
      if (!next) return;
      updateChatThreads((prev) => setChatThreadCustomTitle(prev, threadId, next));
    },
    [updateChatThreads],
  );

  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const desktopMiddleColumnRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileColumnRef = useRef<HTMLElement>(null);
  const messagesEndDesktopRef = useRef<HTMLDivElement>(null);
  const messagesEndMobileRef = useRef<HTMLDivElement>(null);

  const mobileScrollBottomPadPx =
    createImageScrollContentBottomPaddingPx("mobile");

  const { promptBar: promptBarGeom, minWidth1280 } =
    useCreateImagePreviewPromptLayout({
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
      aspectRatio: "16:9",
      templatesOpen: false,
    });

  const desktopScrollBottomPadPx = minWidth1280
    ? createImageScrollContentBottomPaddingPxDesktopXl()
    : createImageScrollContentBottomPaddingPx("desktop");

  /** Create Image shell math only — Chat main column layout differs; dock width/left must still match. */
  const [chatDesktopDockGeom, setChatDesktopDockGeom] =
    useState<PromptBarDockGeometry | null>(null);
  useLayoutEffect(() => {
    if (!minWidth1280) {
      setChatDesktopDockGeom(null);
      return;
    }
    const sync = () =>
      setChatDesktopDockGeom(createImageDesktopPromptDockGeometryPx());
    sync();
    window.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("resize", sync);
    };
  }, [minWidth1280]);

  const chatPromptDockGeometry = minWidth1280
    ? (chatDesktopDockGeom ?? promptBarGeom)
    : promptBarGeom;

  useEffect(() => {
    messagesEndDesktopRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
    messagesEndMobileRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages.length]);

  const generateDisabled = !barPrompt.trim() && references.length === 0;

  const handleSend = useCallback(async () => {
    if (isSending) return;
    if (!barPrompt.trim() && references.length === 0) return;
    const userText = barPrompt.trim();
    setBarPrompt("");
    const userMsg: ChatThreadMessage = {
      id: uid(),
      role: "user",
      text: userText,
      sentAt: new Date().toISOString(),
    };
    const afterUser = [...messages, userMsg];
    upsertChatThreadSnapshot(chatSessionId, afterUser);
    setIsSending(true);

    const transcriptPayload =
      afterUser
        .map((m) => {
          const label = m.role === "user" ? "User" : "Assistant";
          return `${label}: ${m.text ?? ""}`.trim();
        })
        .join("\n\n")
        .trim() || "User sent a message without text.";

    const assistantText = await requestAssistantReply(transcriptPayload);

    const assistantMsg: ChatThreadMessage = {
      id: uid(),
      role: "assistant",
      text: assistantText,
      sentAt: new Date().toISOString(),
    };
    upsertChatThreadSnapshot(chatSessionId, [...afterUser, assistantMsg]);
    setIsSending(false);
  }, [
    isSending,
    barPrompt,
    references,
    messages,
    chatSessionId,
    upsertChatThreadSnapshot,
    requestAssistantReply,
  ]);

  const handleAddReferences = useCallback((files: FileList | null) => {
    if (!files?.length) return;
    setReferences((prev) => {
      const next = [...prev];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) continue;
        next.push({
          id: uid(),
          url: URL.createObjectURL(f),
          name: f.name,
        });
      }
      return next;
    });
  }, []);

  const handleRemoveReference = useCallback((id: string) => {
    setReferences((prev) => {
      const t = prev.find((x) => x.id === id);
      if (t) URL.revokeObjectURL(t.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const handleAddCatalogReference = useCallback((reference: ReferenceFile) => {
    setReferences((prev) => {
      if (prev.some((r) => r.url === reference.url)) return prev;
      return [...prev, reference];
    });
  }, []);

  const handleChip = useCallback((label: string) => {
    setBarPrompt(label);
  }, []);

  const selectChatFromHistory = useCallback(
    (id: string) => {
      if (id === chatSessionId) return;
      setChatSessionId(id);
      setBarPrompt("");
      setReferences((prev) => {
        for (const r of prev) URL.revokeObjectURL(r.url);
        return [];
      });
    },
    [chatSessionId],
  );

  const isThreadLiked = useCallback(
    (threadId: string) => isLiked(likedKey.chat(threadId)),
    [isLiked],
  );

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-tx-primary",
        "xl:[--create-image-prompt-max:1000px]",
      )}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden xl:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header variant="mobile" mobileTitle="CHAT" />
        </div>

        <DesktopThreeColumnShell
          sidebar={
            <Sidebar
              className="flex min-h-0 h-full min-w-0 w-full flex-1 flex-col"
              activeId={activeMainNav}
              onNavigate={navigate}
            />
          }
          rail={
            <ChatHistoryPanel
              threads={chatThreads}
              activeChatId={chatSessionId}
              onSelectChat={selectChatFromHistory}
              onThreadMenuAction={handleChatHistoryThreadMenuAction}
              isThreadLiked={isThreadLiked}
              onRenameChat={handleRenameChat}
              className="min-h-0 w-full min-w-0 flex-1 flex-col"
            />
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:overflow-hidden xl:px-0">
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col xl:mx-auto xl:w-[min(100%,1000px)] xl:max-w-[1000px] xl:min-h-0 xl:min-w-0">
              <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
                <div
                  ref={desktopMainChatMenuRef}
                  className="absolute right-0 top-4 z-[30]"
                >
                  <button
                    type="button"
                    aria-label="Chat options"
                    aria-haspopup="menu"
                    aria-expanded={mainChatMenuOpen}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full",
                      threeDotsMenuTriggerButtonClassName,
                    )}
                    onClick={() => setMainChatMenuOpen((open) => !open)}
                  >
                    <IconDots className="h-4 w-4" />
                  </button>
                  {mainChatMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 top-full z-[70] mt-1 min-w-[160px]"
                    >
                      <div className="rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl">
                        {MAIN_CHAT_MENU_ITEMS.map((label) => (
                          <button
                            key={label}
                            type="button"
                            role="menuitem"
                            className="flex w-full items-center rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-ix-pressed"
                            onClick={() => handleMainChatMenuAction(label)}
                          >
                            <IconAsset
                              src={mainChatMenuIconSrc(label, currentChatLiked)}
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
                <div
                  ref={desktopScrollRef}
                  className="relative z-[1] min-h-0 w-full min-w-0 flex-1 overflow-y-auto"
                  style={{
                    scrollPaddingBottom: desktopScrollBottomPadPx,
                  }}
                >
                  <div
                    ref={desktopMiddleColumnRef}
                    className="flex w-full min-w-0 flex-col items-stretch pt-[68px] text-left"
                    style={{
                      paddingBottom: desktopScrollBottomPadPx,
                    }}
                  >
                    <ChatMessageThread
                      messages={messages}
                      showSuggestedChips={false}
                      onChipClick={handleChip}
                      onAssistantMessageAction={handleAssistantMessageMenuAction}
                      bottomRef={messagesEndDesktopRef}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DesktopThreeColumnShell>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg xl:hidden">
        <Header
          variant="mobile"
          mobileTitle="CHAT"
          mobileNavTriggerSide="end"
        />
        <div className="mx-4 mb-1 mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4">
          <ChatHistoryPanel
            variant="mobile"
            mobileTriggerAlign="end"
            threads={chatThreads}
            activeChatId={chatSessionId}
            onSelectChat={selectChatFromHistory}
            onThreadMenuAction={handleChatHistoryThreadMenuAction}
            isThreadLiked={isThreadLiked}
            onRenameChat={handleRenameChat}
          />
          <div
            ref={mobileScrollRef}
            className="relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            style={{
              scrollPaddingBottom: mobileScrollBottomPadPx,
            }}
          >
            <main
              ref={mobileColumnRef}
              className={cn(
                "relative flex min-h-0 w-full min-w-0 flex-col bg-transparent outline-none",
                messages.length > 0 ? "pt-[68px]" : "pt-2",
              )}
              style={{
                paddingBottom: mobileScrollBottomPadPx,
              }}
            >
              <div
                ref={mobileMainChatMenuRef}
                className="absolute right-0 top-2 z-[30]"
              >
                <button
                  type="button"
                  aria-label="Chat options"
                  aria-haspopup="menu"
                  aria-expanded={mainChatMenuOpen}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full",
                    threeDotsMenuTriggerButtonClassName,
                  )}
                  onClick={() => setMainChatMenuOpen((open) => !open)}
                >
                  <IconDots className="h-4 w-4" />
                </button>
                {mainChatMenuOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-[70] mt-1 min-w-[160px]"
                  >
                    <div className="rounded-xl border border-edge-subtle bg-surface-card py-1.5 shadow-xl">
                      {MAIN_CHAT_MENU_ITEMS.map((label) => (
                        <button
                          key={label}
                          type="button"
                          role="menuitem"
                          className="flex w-full items-center rounded-lg px-4 py-2 text-left text-[11px] text-tx-secondary transition-colors duration-150 hover:bg-[#0d1d45] hover:text-white active:bg-ix-pressed"
                          onClick={() => handleMainChatMenuAction(label)}
                        >
                          <IconAsset
                            src={mainChatMenuIconSrc(label, currentChatLiked)}
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
              <div className="w-full min-w-0">
                <ChatMessageThread
                  messages={messages}
                  showSuggestedChips={false}
                  onChipClick={handleChip}
                  onAssistantMessageAction={handleAssistantMessageMenuAction}
                  bottomRef={messagesEndMobileRef}
                />
              </div>
            </main>
          </div>
        </div>
      </div>

      <FixedPromptBarDock geometry={chatPromptDockGeometry} ariaLabel="Chat input">
        <PromptBar
          className="w-full shrink-0"
          prompt={barPrompt}
          onPromptChange={setBarPrompt}
          references={references}
          onAddReferences={handleAddReferences}
          onRemoveReference={handleRemoveReference}
          onGenerate={handleSend}
          isGenerating={isSending}
          generateDisabled={generateDisabled}
          variant={minWidth1280 ? "desktop" : "mobile"}
          placeholder="Ask anything…"
          generateAriaLabel="Send message"
          promptTextAreaRef={promptTextAreaRef}
          onAddCatalogReference={handleAddCatalogReference}
        />
        <div
          className={cn(
            "pointer-events-none w-full shrink-0",
            /* Below `md` the real settings UI is not in the dock — do not reserve invisible height. */
            minWidth1280 ? "invisible" : "hidden",
          )}
          aria-hidden="true"
        >
          <GenerationSettingsRow
            className="w-full shrink-0"
            assetContentType={dockParityAsset}
            onAssetContentType={setDockParityAsset}
            aspectRatio={dockParityAspect}
            onAspectRatio={setDockParityAspect}
            quality={dockParityQuality}
            onQuality={setDockParityQuality}
            variations={dockParityVariations}
            onVariations={setDockParityVariations}
            variant={minWidth1280 ? "desktop" : "mobile"}
          />
        </div>
        <div
          className={cn(
            "invisible pointer-events-none hidden w-full shrink-0 xl:flex xl:justify-center",
            "mt-[32px]",
          )}
          aria-hidden="true"
        >
          <div className="w-full min-w-0 xl:max-w-[1000px]">
            <DesktopTemplatesStrip
              templates={MOCK_TEMPLATES}
              selectedId={dockParityTemplateId}
              onSelect={setDockParityTemplateId}
            />
          </div>
        </div>
      </FixedPromptBarDock>

      {fullScreenUrl ? (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-black/95 p-4">
          <button
            type="button"
            className="mb-4 self-end rounded-full px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => setFullScreenUrl(null)}
          >
            Close
          </button>
          <div className="relative flex flex-1 items-center justify-center">
            <Image
              src={fullScreenUrl}
              alt="Preview"
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}