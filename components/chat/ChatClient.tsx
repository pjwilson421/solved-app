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
import { chatThreadListHeadline } from "@/lib/app-data/chat-thread";
import { DesktopThreeColumnShell } from "@/components/shell/DesktopThreeColumnShell";
import { cn } from "@/lib/utils";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const INITIAL_ASSISTANT_GREETING =
  "Hello there, how can I help you today?";

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
  const [chatSessionId, setChatSessionId] = useState(() =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
  );

  const { chatThreads, upsertChatThreadSnapshot, updateFileEntries } =
    useAppData();
  const { isLiked } = useLikedItems();
  const { toggleLike, deleteCatalogItem } = useAppItemActions();

  const currentThread = useMemo(
    () => chatThreads.find((t) => t.id === chatSessionId),
    [chatThreads, chatSessionId],
  );
  const messages: ChatThreadMessage[] = currentThread?.messages ?? [];

  const displayMessages = useMemo<ChatThreadMessage[]>(() => {
    if (messages.length > 0) return messages;
    return [
      {
        id: "greeting",
        role: "assistant",
        text: INITIAL_ASSISTANT_GREETING,
        sentAt: new Date().toISOString(),
      },
    ];
  }, [messages]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setReferences((prev) => {
        for (const r of prev) URL.revokeObjectURL(r.url);
        return [];
      });
      setBarPrompt("");
      setFullScreenUrl(null);
      setChatSessionId(
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      );
      setIsSending(false);
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
  }, [openChatId, router, searchParams, chatThreads]);

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

      if (action === "Save To Files") {
        const headline = chatThreadListHeadline(thread);
        const base =
          headline.replace(/[^\w.\-()\s]+/g, "_").trim().slice(0, 60) ||
          "Chat";
        const body = thread.messages
          .map((m) => `${m.role.toUpperCase()}: ${m.text ?? ""}`)
          .join("\n\n");
        const sizeKb = Math.max(1, Math.ceil(new Blob([body]).size / 1024));
        const dateModified = new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        updateFileEntries((prev) => [
          ...prev,
          {
            id: uid(),
            name: `${base}_chat.txt`,
            kind: "file",
            typeLabel: "Text",
            dateModified,
            sizeLabel: `${sizeKb} KB`,
            parentId: null,
          },
        ]);
        return;
      }

      if (action === "Share") {
        const url = `${window.location.origin}/chat?openChat=${encodeURIComponent(threadId)}`;
        const title = chatThreadListHeadline(thread);
        if (typeof navigator !== "undefined" && navigator.share) {
          void navigator.share({ title, text: title, url });
        } else {
          void navigator.clipboard?.writeText?.(url);
        }
        return;
      }

      if (action === "Delete") {
        if (threadId === chatSessionId) {
          const nextThreads = chatThreads.filter((t) => t.id !== threadId);
          if (nextThreads.length > 0) {
            setChatSessionId(nextThreads[0].id);
          } else {
            setChatSessionId(
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            );
            setBarPrompt("");
            setReferences((prev) => {
              for (const r of prev) URL.revokeObjectURL(r.url);
              return [];
            });
          }
        }
        deleteCatalogItem(appItemRef.chat(threadId));
      }
    },
    [
      chatSessionId,
      chatThreads,
      deleteCatalogItem,
      isLiked,
      toggleLike,
      updateFileEntries,
      upsertChatThreadSnapshot,
    ],
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

    let assistantText: string;
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
        assistantText = "Sorry, something went wrong.";
      } else {
        assistantText = (data as { text: string }).text;
      }
    } catch {
      assistantText = "Sorry, something went wrong.";
    }

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
              className="min-h-0 w-full min-w-0 flex-1 flex-col"
            />
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:overflow-hidden xl:px-0">
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col xl:mx-auto xl:w-[min(100%,1000px)] xl:max-w-[1000px] xl:min-h-0 xl:min-w-0">
              <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
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
                      messages={displayMessages}
                      showSuggestedChips={false}
                      onChipClick={handleChip}
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
                "flex min-h-0 w-full min-w-0 flex-col bg-transparent outline-none",
                messages.length > 0 ? "pt-[68px]" : "pt-2",
              )}
              style={{
                paddingBottom: mobileScrollBottomPadPx,
              }}
            >
              <div className="w-full min-w-0">
                <ChatMessageThread
                  messages={displayMessages}
                  showSuggestedChips={false}
                  onChipClick={handleChip}
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