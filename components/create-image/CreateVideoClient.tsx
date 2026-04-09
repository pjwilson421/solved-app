"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { PreviewPanel } from "./PreviewPanel";
import { VideoGenerationSettingsRow } from "./VideoGenerationSettingsRow";
import { VideoFrameReferences } from "./VideoFrameReferences";
import { PromptBar } from "./PromptBar";
import { HistoryPanel } from "./HistoryPanel";
import {
  CREATE_IMAGE_SCROLL_RESERVE,
  createImageScrollContentBottomPaddingPx,
  createImageScrollContentBottomPaddingPxDesktopXl,
} from "./preview-frame-layout";
import {
  useCreateImagePreviewPromptLayout,
  useMinWidth1280,
} from "./use-create-image-preview-prompt-layout";
import type { AspectRatio, Quality, ReferenceFile, VideoDuration } from "./types";
import { mobileCreateVideoHelperLines } from "./mobile-create-video-copy";
import { MobileCreateImageDrawer } from "./MobileCreateImageDrawer";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
import { useShellNav } from "@/lib/use-shell-nav";
import { ICONS } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { useAppData } from "@/lib/app-data/app-data-context";
import { activityEntryToHistoryItem } from "@/lib/app-data/activity-to-drawer-history";
import type { ActivityHistoryEntry } from "@/components/history/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function dimsForAspect(a: AspectRatio): { w: number; h: number } {
  switch (a) {
    case "16:9":
      return { w: 1600, h: 900 };
    case "1:1":
      return { w: 1024, h: 1024 };
    case "4:5":
      return { w: 800, h: 1000 };
    case "9:16":
      return { w: 900, h: 1600 };
    default:
      return { w: 1600, h: 900 };
  }
}

/** Short CC0 sample clip (no API key); simulates a generated video asset. */
const MOCK_GENERATED_VIDEO_MP4 =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

async function mockVideoPoster(
  aspect: AspectRatio,
  seedBase: string,
): Promise<string> {
  await new Promise((r) => setTimeout(r, 1600));
  const { w, h } = dimsForAspect(aspect);
  const safe = seedBase.replace(/\W+/g, "").slice(0, 12) || "vid";
  return `https://picsum.photos/seed/${safe}-video/${w}/${h}`;
}

async function mockGenerateVideoAsset(
  aspect: AspectRatio,
  seedBase: string,
): Promise<{ posterUrl: string; videoUrl: string }> {
  const posterUrl = await mockVideoPoster(aspect, seedBase);
  return { posterUrl, videoUrl: MOCK_GENERATED_VIDEO_MP4 };
}

const VIDEO_PREVIEW_PROMPT_PLACEHOLDER =
  "After you generate, the prompt you enter in the bar below will appear here.";

type FullScreenPreview =
  | { mode: "image"; url: string }
  | { mode: "video"; src: string; poster?: string }
  | null;

export function CreateVideoClient() {
  const { navigate, activeMainNav } = useShellNav();
  const { toggle: toggleLiked } = useLikedItems();
  const { activityEntries, updateActivityEntries, updateFileEntries } =
    useAppData();

  const [barPrompt, setBarPrompt] = useState("");
  const [startFrame, setStartFrame] = useState<ReferenceFile | null>(null);
  const [endFrame, setEndFrame] = useState<ReferenceFile | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<Quality>("4K");
  const [duration, setDuration] = useState<VideoDuration>("10s");

  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewAt, setPreviewAt] = useState<Date | null>(null);
  const [slotImages, setSlotImages] = useState<string[]>([]);

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);

  const createVideoSidebarHistory = useMemo(
    () =>
      activityEntries
        .filter((e) => e.kind === "video" && e.origin === "generated-video")
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .map(activityEntryToHistoryItem),
    [activityEntries],
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [fullScreen, setFullScreen] = useState<FullScreenPreview>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const desktopMiddleColumnRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileColumnRef = useRef<HTMLElement>(null);

  const { layoutFrame, promptBar: promptBarGeom, minWidth768 } =
    useCreateImagePreviewPromptLayout({
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
      aspectRatio,
      templatesOpen: false,
    });

  const minWidth1280 = useMinWidth1280();
  const desktopScrollBottomPadPx = minWidth1280
    ? createImageScrollContentBottomPaddingPxDesktopXl()
    : createImageScrollContentBottomPaddingPx("desktop");

  /** Cap below-preview content to measured preview frame width; prompt dock uses dockLayoutStyle. */
  const previewContentCapStyle = useMemo(() => {
    if (layoutFrame && layoutFrame.width > 0) {
      return { maxWidth: layoutFrame.width, width: "100%" as const };
    }
    return undefined;
  }, [layoutFrame]);

  const generateDisabled = useMemo(() => {
    const hasPrompt = barPrompt.trim().length > 0;
    const hasFrame = startFrame != null || endFrame != null;
    return !hasPrompt && !hasFrame;
  }, [barPrompt, startFrame, endFrame]);

  const handleGenerate = useCallback(async () => {
    if (generateDisabled || isGenerating) return;
    setIsGenerating(true);
    try {
      const seed = `${aspectRatio}-${duration}-${quality}-${barPrompt}-${startFrame?.id ?? ""}-${endFrame?.id ?? ""}`;
      const { posterUrl, videoUrl } = await mockGenerateVideoAsset(
        aspectRatio,
        seed,
      );
      const batchId = uid();
      const createdAt = new Date();
      const promptText = barPrompt.trim() || "(frames only)";
      const subtitle =
        promptText.length > 120 ? `${promptText.slice(0, 117)}…` : promptText;

      const videoCount = activityEntries.filter((e) => e.kind === "video" && e.origin === "generated-video").length;
      const sequenceNum = String(videoCount + 1).padStart(2, "0");
      const title = `video-${sequenceNum}.mp4`;

      const activity: ActivityHistoryEntry = {
        id: batchId,
        kind: "video",
        title,
        subtitle,
        occurredAt: createdAt,
        promptText,
        thumbnailUrl: posterUrl,
        imageUrls: [posterUrl],
        videoUrl,
        origin: "generated-video",
      };
      updateActivityEntries((prev) => [activity, ...prev]);

      setActiveHistoryId(batchId);
      setPreviewPrompt(promptText);
      setPreviewAt(createdAt);
      setSlotImages([posterUrl]);
      setPreviewVideoUrl(videoUrl);
    } finally {
      setIsGenerating(false);
    }
  }, [
    aspectRatio,
    barPrompt,
    duration,
    endFrame,
    generateDisabled,
    isGenerating,
    quality,
    startFrame,
    updateActivityEntries,
    updateFileEntries,
  ]);

  const loadHistory = useCallback(
    (id: string) => {
      const entry = activityEntries.find((e) => e.id === id);
      if (!entry || entry.kind !== "video") return;
      const urls =
        entry.imageUrls && entry.imageUrls.length > 0
          ? entry.imageUrls
          : entry.thumbnailUrl
            ? [entry.thumbnailUrl]
            : [];
      setActiveHistoryId(id);
      const promptRestore = entry.promptText ?? entry.subtitle;
      setPreviewPrompt(promptRestore);
      setPreviewAt(entry.occurredAt);
      setSlotImages(urls);
      setBarPrompt(promptRestore);
      setPreviewVideoUrl(entry.videoUrl ?? null);
    },
    [activityEntries],
  );

  const handlePreviewClick = useCallback(() => {
    const poster = slotImages[0];
    if (previewVideoUrl) {
      setFullScreen({
        mode: "video",
        src: previewVideoUrl,
        poster,
      });
    } else if (poster) {
      setFullScreen({ mode: "image", url: poster });
    }
  }, [previewVideoUrl, slotImages]);

  const handlePreviewMenu = useCallback(
    (action: string) => {
      const poster = slotImages[0];
      if (action === "Full Screen Preview") {
        if (previewVideoUrl) {
          setFullScreen({
            mode: "video",
            src: previewVideoUrl,
            poster,
          });
        } else if (poster) {
          setFullScreen({ mode: "image", url: poster });
        }
      }
      if (action === "Download") {
        const href = previewVideoUrl ?? poster;
        if (!href) return;
        const a = document.createElement("a");
        a.href = href;
        a.download = previewVideoUrl ? "video.mp4" : "video-poster.jpg";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
      if (action === "Share") {
        const url = previewVideoUrl ?? poster;
        if (url && navigator.share) void navigator.share({ url });
      }
      if (action === "Edit image") {
        /* Video editor route TBD */
      }
      if (action === "Delete") {
        setSlotImages([]);
        setPreviewPrompt("");
        setPreviewAt(null);
        setPreviewVideoUrl(null);
        if (activeHistoryId) {
          updateActivityEntries((h) =>
            h.filter((x) => x.id !== activeHistoryId),
          );
          setActiveHistoryId(null);
        }
      }
      if (action === "Like" && activeHistoryId) {
        toggleLiked(likedKey.generation(activeHistoryId));
      }
    },
    [
      activeHistoryId,
      previewVideoUrl,
      slotImages,
      toggleLiked,
      updateActivityEntries,
      updateFileEntries,
    ],
  );

  const handleHistoryMenu = useCallback(
    (itemId: string, action: string) => {
      const entry = activityEntries.find((e) => e.id === itemId);
      const poster =
        entry?.imageUrls?.[0] ?? entry?.thumbnailUrl;
      const videoUrl = entry?.videoUrl;
      if (action === "Full Screen Preview") {
        if (videoUrl) {
          setFullScreen({
            mode: "video",
            src: videoUrl,
            poster,
          });
        } else if (poster) {
          setFullScreen({ mode: "image", url: poster });
        }
      }
      if (action === "Download") {
        const href = videoUrl ?? poster;
        if (!href) return;
        const a = document.createElement("a");
        a.href = href;
        a.download = videoUrl ? "video.mp4" : "video-poster.jpg";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
      if (action === "Share") {
        const url = videoUrl ?? poster;
        if (url && navigator.share) void navigator.share({ url });
      }
      if (action === "Delete") {
        updateActivityEntries((h) => h.filter((x) => x.id !== itemId));
        if (activeHistoryId === itemId) {
          setActiveHistoryId(null);
          setSlotImages([]);
          setPreviewPrompt("");
          setPreviewAt(null);
          setPreviewVideoUrl(null);
        }
      }
      if (action === "Like") {
        toggleLiked(likedKey.generation(itemId));
      }
    },
    [
      activeHistoryId,
      activityEntries,
      toggleLiked,
      updateActivityEntries,
      updateFileEntries,
    ],
  );

  const addStartFrame = useCallback((files: FileList | null) => {
    if (!files?.[0]) return;
    const f = files[0];
    if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) return;
    setStartFrame((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { id: uid(), url: URL.createObjectURL(f), name: f.name };
    });
  }, []);

  const addEndFrame = useCallback((files: FileList | null) => {
    if (!files?.[0]) return;
    const f = files[0];
    if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) return;
    setEndFrame((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { id: uid(), url: URL.createObjectURL(f), name: f.name };
    });
  }, []);

  const removeStartFrame = useCallback(() => {
    setStartFrame((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  const removeEndFrame = useCallback(() => {
    setEndFrame((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return null;
    });
  }, []);

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-surface-base text-tx-primary",
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
            mobileTitle="CREATE"
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
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:grid xl:h-full xl:min-h-0 xl:min-w-0 xl:max-w-none xl:grid-cols-[minmax(0,1fr)_minmax(0,1000px)_minmax(0,1fr)] xl:items-stretch xl:overflow-hidden xl:px-0">
            <div
              className="hidden min-w-0 xl:block xl:min-h-0"
              aria-hidden="true"
            />
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col xl:max-w-none xl:w-full xl:min-h-0 xl:min-w-0">
              <div
                ref={desktopScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
                style={{ scrollPaddingBottom: desktopScrollBottomPadPx }}
              >
                <div
                  ref={desktopMiddleColumnRef}
                  className="flex w-full min-w-0 flex-col items-stretch pt-6 text-left"
                  style={{ paddingBottom: desktopScrollBottomPadPx }}
                >
                  <div className="min-w-0 xl:mb-8">
                    <PreviewPanel
                      aspectRatio={aspectRatio}
                      template={null}
                      slotImages={slotImages}
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      previewLabel="VIDEO PREVIEW"
                      showPreviewLabel={false}
                      layoutFrame={layoutFrame}
                      previewPromptPlaceholder={
                        VIDEO_PREVIEW_PROMPT_PLACEHOLDER
                      }
                      emptyStatePlaceholderIcon={ICONS.videoPlaceholder}
                      onPreviewClick={handlePreviewClick}
                      onMenuAction={handlePreviewMenu}
                    />
                  </div>
                  <div
                    className="mx-auto mb-6 flex w-full min-w-0 flex-col items-stretch"
                    style={previewContentCapStyle}
                  >
                    <VideoFrameReferences
                      className="w-full"
                      startFrame={startFrame}
                      endFrame={endFrame}
                      onStartFrame={addStartFrame}
                      onEndFrame={addEndFrame}
                      onRemoveStart={removeStartFrame}
                      onRemoveEnd={removeEndFrame}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div
              className="hidden min-w-0 xl:block xl:min-h-0"
              aria-hidden="true"
            />
          </div>
          <HistoryPanel
            items={createVideoSidebarHistory}
            activeId={activeHistoryId}
            onSelect={loadHistory}
            onMenuAction={handleHistoryMenu}
            className="hidden max-h-screen shrink-0 !bg-transparent xl:flex xl:w-[300px] xl:min-w-[300px]"
            panelClassName="w-full rounded-panel border border-edge-default bg-surface-elevated"
            fixedDockClearancePx={CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}
            flushBottom
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-base md:hidden">
        <Header
          variant="mobile"
          mobileTitle="VIDEO"
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <div className="mx-4 mt-2 mb-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          <div
            ref={mobileScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            style={{
              scrollPaddingBottom:
                createImageScrollContentBottomPaddingPx("mobile"),
            }}
          >
            <main
              ref={mobileColumnRef}
              className="flex w-full min-w-0 flex-col px-4 pt-3"
              style={{
                paddingBottom:
                  createImageScrollContentBottomPaddingPx("mobile"),
              }}
            >
              <p
                className="mb-[14px] text-[11px] font-bold tracking-[0.09em] text-white"
                style={{ letterSpacing: "0.11em" }}
              >
                VIDEO PREVIEW
              </p>
              <PreviewPanel
                aspectRatio={aspectRatio}
                template={null}
                slotImages={slotImages}
                promptText={previewPrompt}
                createdAt={previewAt}
                isLoading={isGenerating}
                showPreviewLabel={false}
                hideMeta
                mobileFrame
                layoutFrame={layoutFrame}
                previewPromptPlaceholder={VIDEO_PREVIEW_PROMPT_PLACEHOLDER}
                emptyStatePlaceholderIcon={ICONS.videoPlaceholder}
                onPreviewClick={handlePreviewClick}
                onMenuAction={handlePreviewMenu}
              />
              {(() => {
                const [lineA, lineB] =
                  mobileCreateVideoHelperLines(aspectRatio);
                return (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[11px] leading-[18px] text-tx-muted">
                      {lineA}
                    </p>
                    <p className="text-[11px] leading-[18px] text-tx-muted">
                      {lineB}
                    </p>
                  </div>
                );
              })()}
              <div
                className="mx-auto mt-5 mb-4 flex w-full min-w-0 flex-col items-stretch"
                style={previewContentCapStyle}
              >
                <VideoFrameReferences
                  className="w-full"
                  startFrame={startFrame}
                  endFrame={endFrame}
                  onStartFrame={addStartFrame}
                  onEndFrame={addEndFrame}
                  onRemoveStart={removeStartFrame}
                  onRemoveEnd={removeEndFrame}
                />
              </div>
            </main>
          </div>
        </div>
      </div>

      <FixedPromptBarDock geometry={promptBarGeom} ariaLabel="Create video">
        <PromptBar
          className="w-full shrink-0"
          prompt={barPrompt}
          onPromptChange={setBarPrompt}
          references={[]}
          onAddReferences={() => {}}
          onRemoveReference={() => {}}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          generateDisabled={generateDisabled}
          variant={minWidth768 ? "desktop" : "mobile"}
          placeholder="Describe your video"
          generateAriaLabel="Generate video"
        />
        <VideoGenerationSettingsRow
          className="w-full shrink-0"
          aspectRatio={aspectRatio}
          onAspectRatio={setAspectRatio}
          quality={quality}
          onQuality={setQuality}
          duration={duration}
          onDuration={setDuration}
          variant={minWidth768 ? "desktop" : "mobile"}
        />
      </FixedPromptBarDock>

      <MobileCreateImageDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        historyItems={createVideoSidebarHistory}
        activeHistoryId={activeHistoryId}
        onSelectHistory={(id) => {
          loadHistory(id);
          setMobileMenuOpen(false);
        }}
        onHistoryMenuAction={handleHistoryMenu}
        activeMainNav={activeMainNav}
      />

      {fullScreen ? (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-surface-base/95 p-4">
          <button
            type="button"
            className="mb-4 self-end rounded-control px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => setFullScreen(null)}
          >
            Close
          </button>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {fullScreen.mode === "video" ? (
              <video
                src={fullScreen.src}
                poster={fullScreen.poster}
                controls
                playsInline
                autoPlay
                className="max-h-full max-w-full object-contain"
              />
            ) : (
              <div className="relative h-full w-full">
                <Image
                  src={fullScreen.url}
                  alt="Full preview"
                  fill
                  className="object-contain"
                  sizes="100vw"
                />
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
