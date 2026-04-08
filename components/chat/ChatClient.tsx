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
import { PreviewActionsMenu } from "../create-image/PreviewActionsMenu";
import { PromptBar } from "../create-image/PromptBar";
import { GenerationSettingsRow } from "../create-image/GenerationSettingsRow";
import { DesktopTemplatesStrip } from "../create-image/DesktopTemplatesStrip";
import { MobileCreateImageDrawer } from "../create-image/MobileCreateImageDrawer";
import {
  CREATE_IMAGE_SCROLL_RESERVE,
  createImageScrollContentBottomPaddingPx,
  createImageScrollContentBottomPaddingPxDesktopXl,
} from "../create-image/preview-frame-layout";
import {
  useCreateImagePreviewPromptLayout,
  useMinWidth1280,
} from "../create-image/use-create-image-preview-prompt-layout";
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
import { activityEntriesToDrawerHistoryItems } from "@/lib/app-data/activity-to-drawer-history";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import type { ChatThreadRecord } from "@/lib/app-data/chat-thread";
import {
  ChatOptionsMenu,
  type ChatMenuAction,
} from "./ChatOptionsMenu";
import {
  CHAT_TOOLBAR_ICON_BUTTON_CLASS,
  CHAT_TOOLBAR_ICON_IMG_CLASS,
  CHAT_TOOLBAR_ICON_PX,
} from "./chat-toolbar-icons";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";

function chatLikeButtonClass(liked: boolean) {
  return cn(
    liked
      ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-control transition-[background-color,color] bg-[#3ABEFF]/55 text-white hover:bg-[#0D8FD1] active:bg-[#0D8FD1] focus-visible:brightness-110"
      : cn(
          CHAT_TOOLBAR_ICON_BUTTON_CLASS,
          "focus-visible:bg-white/10",
        ),
  );
}

function ChatToolbarIconRow({
  rowClassName,
  chatLiked,
  onToggleChatLike,
  onChatMenuAction,
}: {
  rowClassName?: string;
  chatLiked: boolean;
  onToggleChatLike: () => void;
  onChatMenuAction?: (action: ChatMenuAction) => void;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-end gap-1",
        rowClassName,
      )}
    >
      <button
        type="button"
        className={chatLikeButtonClass(chatLiked)}
        aria-label={chatLiked ? "Unlike chat" : "Like chat"}
        aria-pressed={chatLiked}
        data-state={chatLiked ? "liked" : "unliked"}
        onClick={onToggleChatLike}
      >
        <IconAsset
          key={chatLiked ? "filled" : "outline"}
          src={chatLiked ? ICONS.likedFilled : ICONS.likedOutlined}
          size={CHAT_TOOLBAR_ICON_PX}
          className={CHAT_TOOLBAR_ICON_IMG_CLASS}
        />
      </button>
      <ChatOptionsMenu onSelect={onChatMenuAction} />
    </div>
  );
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function firstUserLine(thread: Pick<ChatThreadRecord, "messages">): string {
  const first = thread.messages.find((m) => m.role === "user")?.text?.trim();
  if (!first) return "New chat";
  const oneLine = first.replace(/\s+/g, " ");
  return oneLine.length > 140 ? `${oneLine.slice(0, 140)}…` : oneLine;
}

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
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  /** Invisible — same dock stack as Create Image so flex layout / spacing matches exactly. */
  const [dockParityAsset, setDockParityAsset] =
    useState<AssetContentType>("Social Media");
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

  const { chatThreads, upsertChatThreadSnapshot, activityEntries } =
    useAppData();
  const { isLiked } = useLikedItems();
  const { toggleLike, deleteCatalogItem } = useAppItemActions();

  const drawerHistoryItems = useMemo(
    () => activityEntriesToDrawerHistoryItems(activityEntries),
    [activityEntries],
  );
  const chatHistoryItems = useMemo(
    () =>
      [...chatThreads]
        .sort(
          (a, b) =>
            new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime(),
        )
        .map((t) => ({
          id: t.id,
          preview: firstUserLine(t),
        })),
    [chatThreads],
  );

  const currentThread = useMemo(
    () => chatThreads.find((t) => t.id === chatSessionId),
    [chatThreads, chatSessionId],
  );
  const messages: ChatThreadMessage[] = currentThread?.messages ?? [];
  const chatLiked = isLiked(likedKey.chat(chatSessionId));

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setReferences((prev) => {
        for (const r of prev) URL.revokeObjectURL(r.url);
        return [];
      });
      setBarPrompt("");
      setActiveHistoryId(null);
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

  const toggleChatLike = useCallback(() => {
    const k = likedKey.chat(chatSessionId);
    if (!isLiked(k)) {
      upsertChatThreadSnapshot(chatSessionId, messages);
    }
    toggleLike(appItemRef.chat(chatSessionId));
  }, [
    chatSessionId,
    isLiked,
    messages,
    toggleLike,
    upsertChatThreadSnapshot,
  ]);

  const handleChatMenuAction = useCallback((_action: ChatMenuAction) => {
    /* Move to files, Rename, Delete — hook up when routes/modals exist */
  }, []);

  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const desktopMiddleColumnRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileColumnRef = useRef<HTMLElement>(null);
  const messagesEndDesktopRef = useRef<HTMLDivElement>(null);
  const messagesEndMobileRef = useRef<HTMLDivElement>(null);

  const minWidth1280 = useMinWidth1280();
  const desktopScrollBottomPadPx = minWidth1280
    ? createImageScrollContentBottomPaddingPxDesktopXl()
    : createImageScrollContentBottomPaddingPx("desktop");
  const mobileScrollBottomPadPx =
    createImageScrollContentBottomPaddingPx("mobile");

  const { promptBar: promptBarGeom, minWidth768 } =
    useCreateImagePreviewPromptLayout({
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
      aspectRatio: "16:9",
      templatesOpen: false,
    });

  /** Create Image shell math only — Chat main column layout differs; dock width/left must still match. */
  const [chatDesktopDockGeom, setChatDesktopDockGeom] =
    useState<PromptBarDockGeometry | null>(null);
  useLayoutEffect(() => {
    if (!minWidth768) {
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
  }, [minWidth768]);

  const chatPromptDockGeometry = minWidth768
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
    await new Promise((r) => setTimeout(r, 720));
    const assistantMsg: ChatThreadMessage = {
      id: uid(),
      role: "assistant",
      text:
        "This is a placeholder reply. Connect your chat API here to stream real assistant messages.",
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

  const loadHistory = useCallback((id: string) => {
    setActiveHistoryId(id);
  }, []);

  const handleHistoryMenu = useCallback(
    (itemId: string, action: string) => {
      const item = drawerHistoryItems.find((h) => h.id === itemId);
      const url = item?.imageUrls[0];
      if (action === "Full Screen Preview" && url) setFullScreenUrl(url);
      if (action === "Download" && url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "image.jpg";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
      if (action === "Share" && url && navigator.share) {
        void navigator.share({ url });
      }
      if (action === "Delete") {
        deleteCatalogItem(appItemRef.activity(itemId));
        if (activeHistoryId === itemId) setActiveHistoryId(null);
      }
    },
    [activeHistoryId, drawerHistoryItems, deleteCatalogItem],
  );

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-canvas text-[#FAFAFA]",
        "md:[--create-image-prompt-max:900px] xl:[--create-image-prompt-max:1000px]",
      )}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden md:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header
            variant="mobile"
            mobileTitle="CHAT"
            onMenuClick={() => setMobileMenuOpen(true)}
          />
        </div>

        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          <Sidebar
            className="hidden shrink-0 xl:flex xl:w-[300px] xl:min-w-[300px]"
            activeId={activeMainNav}
            onNavigate={navigate}
            fixedDockClearancePx={CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}
          />

          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-hidden px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:flex-1 xl:overflow-hidden xl:px-0 xl:pr-[40px]">
            <div className="relative flex min-h-0 w-full min-w-0 flex-1 flex-col">
              <ChatToolbarIconRow
                rowClassName="px-4 pt-4 md:px-6 md:pt-5"
                chatLiked={chatLiked}
                onToggleChatLike={toggleChatLike}
                onChatMenuAction={handleChatMenuAction}
              />

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
                    className="flex w-full min-w-0 flex-col items-stretch pt-6 text-left"
                    style={{
                      paddingBottom: desktopScrollBottomPadPx,
                    }}
                  >
                    <div className="mx-auto w-full min-w-0 max-w-[980px] px-4 md:px-6">
                      <ChatMessageThread
                        messages={messages}
                        showSuggestedChips={false}
                        onChipClick={handleChip}
                        bottomRef={messagesEndDesktopRef}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <aside
            className="hidden min-h-0 min-w-0 w-[300px] shrink-0 flex-col self-start bg-app-canvas xl:flex"
            style={{
              height: `calc(100% - ${CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}px)`,
            }}
          >
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-0 pl-5 pr-5 pt-6">
              <section className="flex min-h-0 flex-1 flex-col overflow-hidden w-full rounded-panel bg-[#18181B] py-3">
                <div className="shrink-0 px-4 pb-3">
                  <h2 className="text-left text-[10px] font-bold uppercase tracking-[0.08em] text-white">
                    HISTORY
                  </h2>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto">
                  {chatHistoryItems.length === 0 ? (
                    <p className="px-4 py-8 text-left text-[11px] leading-[18px] text-[#8A8A93]">
                      No chats yet.
                    </p>
                  ) : (
                    chatHistoryItems.map((item) => (
                      <div
                        key={item.id}
                        className={cn(
                          "border-b border-[#2A2A2E]/15 px-4 pb-3 pt-3 transition-colors last:border-b-0",
                          "hover:bg-[#1E1E22]/35",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setChatSessionId(item.id);
                              setActiveHistoryId(item.id);
                            }}
                            className="block min-w-0 flex-1 text-left"
                          >
                            <p className="line-clamp-1 text-left text-[11px] leading-[18px] text-[#A1A1AA]">
                              {item.preview}
                            </p>
                          </button>
                          <div className="z-20 shrink-0">
                            <PreviewActionsMenu
                              align="right"
                              onSelect={(action) => {
                                if (action === "Delete") {
                                  deleteCatalogItem(appItemRef.chat(item.id));
                                  if (chatSessionId === item.id) {
                                    setActiveHistoryId(null);
                                  }
                                }
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </aside>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas md:hidden">
        <Header
          variant="mobile"
          mobileTitle="CHAT"
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <div className="mx-4 mt-2 mb-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <ChatToolbarIconRow
            rowClassName="px-3 pt-3 pr-3"
            chatLiked={chatLiked}
            onToggleChatLike={toggleChatLike}
            onChatMenuAction={handleChatMenuAction}
          />
          <div
            ref={mobileScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            style={{
              scrollPaddingBottom: mobileScrollBottomPadPx,
            }}
          >
            <main
              ref={mobileColumnRef}
              className="flex w-full min-w-0 flex-col px-4 pt-3"
              style={{
                paddingBottom: mobileScrollBottomPadPx,
              }}
            >
              <div className="mx-auto w-full min-w-0 max-w-[980px]">
                <ChatMessageThread
                  messages={messages}
                  showSuggestedChips
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
          variant={minWidth768 ? "desktop" : "mobile"}
          placeholder="Ask anything…"
          generateAriaLabel="Send message"
          promptTextAreaRef={promptTextAreaRef}
        />
        <div
          className="invisible pointer-events-none w-full shrink-0"
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
            variant={minWidth768 ? "desktop" : "mobile"}
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

      <MobileCreateImageDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        historyItems={drawerHistoryItems}
        activeHistoryId={activeHistoryId}
        onSelectHistory={loadHistory}
        onHistoryMenuAction={handleHistoryMenu}
        activeMainNav={activeMainNav}
      />

      {fullScreenUrl ? (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-black/95 p-4">
          <button
            type="button"
            className="mb-4 self-end rounded-control px-4 py-2 text-sm text-white hover:bg-white/10"
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