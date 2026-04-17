"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { PreviewPanel } from "./PreviewPanel";
import { VideoGenerationSettingsRow } from "./VideoGenerationSettingsRow";
import { VideoFrameReferences } from "./VideoFrameReferences";
import { PromptBar } from "./PromptBar";
import { HistoryPanel } from "./HistoryPanel";
import {
  createImageScrollContentBottomPaddingPx,
  createImageScrollContentBottomPaddingPxDesktopXl,
} from "./preview-frame-layout";
import { useCreateImagePreviewPromptLayout } from "./use-create-image-preview-prompt-layout";
import type { AspectRatio, Quality, ReferenceFile, VideoDuration } from "./types";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
import { useShellNav } from "@/lib/use-shell-nav";
import { ICONS } from "@/components/icons/icon-paths";
import type { PreviewMenuEvent } from "./preview-menu-config";
import { DesktopThreeColumnShell } from "@/components/shell/DesktopThreeColumnShell";
import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import {
  downloadImageFromUrl,
  generatedImageDownloadBasename,
  openImageInNewTab,
} from "@/lib/create-image/media-actions";
import { writePendingEditorImage } from "@/lib/create-image/pending-editor-image";
import { handleShareTarget } from "@/lib/share/web-share";
import { activityEntryToHistoryItem } from "@/lib/app-data/activity-to-drawer-history";
import type { ActivityHistoryEntry } from "@/components/history/types";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const VIDEO_PREVIEW_PROMPT_PLACEHOLDER =
  "After you generate, the prompt you enter in the bar below will appear here.";

type FullScreenPreview =
  | { mode: "image"; url: string }
  | { mode: "video"; src: string; poster?: string }
  | null;

export function CreateVideoClient() {
  const router = useRouter();
  const { navigate, activeMainNav } = useShellNav();
  const { toggle: toggleLiked, isLiked } = useLikedItems();
  const { deleteCatalogItem } = useAppItemActions();
  const { activityEntries, updateActivityEntries } = useAppData();

  const [barPrompt, setBarPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceFile[]>([]);
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
  const [generationError, setGenerationError] = useState<string | null>(null);

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
  const desktopScrollRef = useRef<HTMLDivElement>(null);
  const desktopMiddleColumnRef = useRef<HTMLDivElement>(null);
  const mobileScrollRef = useRef<HTMLDivElement>(null);
  const mobileColumnRef = useRef<HTMLElement>(null);

  const { layoutFrame, promptBar: promptBarGeom, minWidth1280 } =
    useCreateImagePreviewPromptLayout({
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
      aspectRatio,
      templatesOpen: false,
      previewLayoutIgnoreTemplatesOpen: true,
      templatesInScrollColumn: false,
    });

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

  const activeEntry = useMemo(
    () =>
      activeHistoryId
        ? activityEntries.find((e) => e.id === activeHistoryId) ?? null
        : null,
    [activityEntries, activeHistoryId],
  );

  const generateDisabled = useMemo(() => {
    const hasPrompt = barPrompt.trim().length > 0;
    return !hasPrompt;
  }, [barPrompt]);

  const handleGenerate = useCallback(async () => {
    if (generateDisabled || isGenerating) return;
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: barPrompt.trim() }),
      });

      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const msg =
          data &&
          typeof data === "object" &&
          typeof (data as { error?: unknown }).error === "string"
            ? (data as { error: string }).error
            : "Video generation failed.";
        throw new Error(msg);
      }

      const videoUrl =
        data &&
        typeof data === "object" &&
        typeof (data as { videoUrl?: unknown }).videoUrl === "string"
          ? (data as { videoUrl: string }).videoUrl
          : "";

      if (!videoUrl) {
        throw new Error("Video generation succeeded but no video URL was returned.");
      }

      const batchId = uid();
      const createdAt = new Date();
      const promptText = barPrompt.trim();
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
        imageUrls: [],
        videoUrl,
        origin: "generated-video",
      };
      updateActivityEntries((prev) => [activity, ...prev]);

      setActiveHistoryId(batchId);
      setPreviewPrompt(promptText);
      setPreviewAt(createdAt);
      setSlotImages([]);
      setPreviewVideoUrl(videoUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Video generation failed.";
      setGenerationError(msg);
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
    activityEntries,
    updateActivityEntries,
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
    (e: PreviewMenuEvent) => {
      const poster = slotImages[0];
      const mediaUrl = previewVideoUrl ?? poster;
      const at = activeEntry?.occurredAt ?? previewAt;

      switch (e.type) {
        case "expand":
          if (previewVideoUrl) openImageInNewTab(previewVideoUrl);
          else if (poster) openImageInNewTab(poster);
          break;
        case "download":
          if (previewVideoUrl) {
            const stamp = generatedImageDownloadBasename(at ?? new Date());
            const a = document.createElement("a");
            a.href = previewVideoUrl;
            a.download = `${stamp}.mp4`;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            a.remove();
          } else if (poster) {
            void downloadImageFromUrl(poster, at);
          }
          break;
        case "share":
          if (mediaUrl) {
            const shareableHttp =
              [previewVideoUrl, poster, activeEntry?.videoUrl].find(
                (u): u is string =>
                  typeof u === "string" && /^https?:\/\//i.test(u),
              ) ?? null;
            void handleShareTarget(e.target, {
              imageUrl: mediaUrl,
              shareableHttpUrl: shareableHttp,
              offerManualDownload: previewVideoUrl
                ? async () => {
                    const stamp = generatedImageDownloadBasename(
                      at ?? new Date(),
                    );
                    const a = document.createElement("a");
                    a.href = previewVideoUrl;
                    a.download = `${stamp}.mp4`;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }
                : poster
                  ? () => downloadImageFromUrl(poster, at)
                  : undefined,
            });
          }
          break;
        case "edit-image":
          break;
        case "upscale": {
          const img = poster;
          if (!img) break;
          writePendingEditorImage({
            mode: "upscale",
            imageUrl: img,
            fullResolutionUrl: img,
            fileId: null,
            activityId: activeHistoryId,
            promptText: activeEntry?.promptText ?? activeEntry?.subtitle ?? null,
            createdAt: activeEntry?.occurredAt?.toISOString() ?? null,
            aspectRatio: activeEntry?.aspectRatio ?? null,
            resolution: activeEntry?.resolution ?? null,
            liked:
              activeHistoryId != null &&
              isLiked(likedKey.activity(activeHistoryId)),
          });
          const qs = new URLSearchParams();
          qs.set("mode", "upscale");
          if (activeHistoryId) qs.set("activityId", activeHistoryId);
          router.push(`/image-editor?${qs.toString()}`);
          break;
        }
        case "like":
          if (activeHistoryId) {
            toggleLiked(likedKey.activity(activeHistoryId));
          }
          break;
        case "delete":
          if (activeHistoryId) {
            deleteCatalogItem(appItemRef.activity(activeHistoryId));
          }
          setSlotImages([]);
          setPreviewPrompt("");
          setPreviewAt(null);
          setPreviewVideoUrl(null);
          setActiveHistoryId(null);
          break;
        case "save":
          break;
        default:
          break;
      }
    },
    [
      activeEntry?.occurredAt,
      activeEntry?.aspectRatio,
      activeEntry?.promptText,
      activeEntry?.resolution,
      activeEntry?.subtitle,
      activeEntry?.videoUrl,
      activeHistoryId,
      deleteCatalogItem,
      isLiked,
      previewAt,
      previewVideoUrl,
      router,
      slotImages,
      toggleLiked,
    ],
  );

  const handleHistoryMenu = useCallback(
    (itemId: string, e: PreviewMenuEvent) => {
      const entry = activityEntries.find((x) => x.id === itemId);
      if (!entry) return;
      const poster = entry.imageUrls?.[0] ?? entry.thumbnailUrl;
      const videoUrl = entry.videoUrl;
      const mediaUrl = videoUrl ?? poster;
      const at = entry.occurredAt;

      switch (e.type) {
        case "expand":
          if (videoUrl) openImageInNewTab(videoUrl);
          else if (poster) openImageInNewTab(poster);
          break;
        case "download":
          if (videoUrl) {
            const stamp = generatedImageDownloadBasename(at);
            const a = document.createElement("a");
            a.href = videoUrl;
            a.download = `${stamp}.mp4`;
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            document.body.appendChild(a);
            a.click();
            a.remove();
          } else if (poster) {
            void downloadImageFromUrl(poster, at);
          }
          break;
        case "share":
          if (mediaUrl) {
            const shareableHttp =
              [videoUrl, poster, entry.videoUrl].find(
                (u): u is string =>
                  typeof u === "string" && /^https?:\/\//i.test(u),
              ) ?? null;
            void handleShareTarget(e.target, {
              imageUrl: mediaUrl,
              shareableHttpUrl: shareableHttp,
              offerManualDownload: videoUrl
                ? async () => {
                    const stamp = generatedImageDownloadBasename(at);
                    const a = document.createElement("a");
                    a.href = videoUrl;
                    a.download = `${stamp}.mp4`;
                    a.target = "_blank";
                    a.rel = "noopener noreferrer";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }
                : poster
                  ? () => downloadImageFromUrl(poster, at)
                  : undefined,
            });
          }
          break;
        case "upscale": {
          const img = poster;
          if (!img) break;
          writePendingEditorImage({
            mode: "upscale",
            imageUrl: img,
            fullResolutionUrl: img,
            fileId: null,
            activityId: itemId,
            promptText: entry.promptText ?? entry.subtitle ?? null,
            createdAt: entry.occurredAt.toISOString(),
            aspectRatio: entry.aspectRatio ?? null,
            resolution: entry.resolution ?? null,
            liked: isLiked(likedKey.activity(itemId)),
          });
          const qs = new URLSearchParams();
          qs.set("mode", "upscale");
          qs.set("activityId", itemId);
          router.push(`/image-editor?${qs.toString()}`);
          break;
        }
        case "like":
          toggleLiked(likedKey.activity(itemId));
          break;
        case "delete":
          deleteCatalogItem(appItemRef.activity(itemId));
          if (activeHistoryId === itemId) {
            setActiveHistoryId(null);
            setSlotImages([]);
            setPreviewPrompt("");
            setPreviewAt(null);
            setPreviewVideoUrl(null);
          }
          break;
        case "edit-image":
        case "save":
          break;
        default:
          break;
      }
    },
    [activeHistoryId, activityEntries, deleteCatalogItem, isLiked, router, toggleLiked],
  );

  const historyMenuLikeActive = useCallback(
    (id: string) => isLiked(likedKey.activity(id)),
    [isLiked],
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
          <Header variant="mobile" mobileTitle="CREATE" />
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
            <HistoryPanel
              title="VIDEO HISTORY"
              items={createVideoSidebarHistory}
              activeId={activeHistoryId}
              onSelect={loadHistory}
              onMenuEvent={handleHistoryMenu}
              previewMenuLikeActive={historyMenuLikeActive}
              className="min-h-0 w-full min-w-0 flex-1 flex-col"
            />
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:overflow-hidden xl:px-0">
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col xl:mx-auto xl:w-[min(100%,1000px)] xl:max-w-[1000px] xl:min-h-0 xl:min-w-0">
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
                      previewVideoUrl={previewVideoUrl}
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
                      promptDescriptionAnchoredToPreview
                      onPreviewClick={handlePreviewClick}
                      onMenuEvent={handlePreviewMenu}
                      previewMenuLikeActive={
                        activeHistoryId != null &&
                        isLiked(likedKey.activity(activeHistoryId))
                      }
                      afterPreviewStack={
                        <div className="mb-6 mt-[5px] w-full">
                          {generationError ? (
                            <p className="mb-3 text-[11px] text-rose-300">{generationError}</p>
                          ) : null}
                          <VideoFrameReferences
                            className="w-full"
                            variant="compact"
                            startFrame={startFrame}
                            endFrame={endFrame}
                            onStartFrame={addStartFrame}
                            onEndFrame={addEndFrame}
                            onRemoveStart={removeStartFrame}
                            onRemoveEnd={removeEndFrame}
                          />
                        </div>
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DesktopThreeColumnShell>
      </div>

      {/* Below xl: same shell as Create Image mobile — app-bg column, no inner panel card. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg xl:hidden">
        <Header
          variant="mobile"
          mobileTitle="VIDEO"
          mobileNavTriggerSide="end"
        />
        <div className="mx-4 mb-1 mt-2 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-4 sm:px-8">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center">
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col">
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
                  className="flex w-full min-w-0 flex-col items-stretch pt-6 text-left"
                  style={{
                    paddingBottom:
                      createImageScrollContentBottomPaddingPx("mobile"),
                  }}
                >
                  <div className="min-w-0 xl:mb-8">
                    <PreviewPanel
                      aspectRatio={aspectRatio}
                      template={null}
                      slotImages={slotImages}
                      previewVideoUrl={previewVideoUrl}
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
                      promptDescriptionAnchoredToPreview
                      onPreviewClick={handlePreviewClick}
                      onMenuEvent={handlePreviewMenu}
                      previewMenuLikeActive={
                        activeHistoryId != null &&
                        isLiked(likedKey.activity(activeHistoryId))
                      }
                    />
                  </div>
                  <div
                    className="mx-auto mb-6 mt-[12px] flex w-full min-w-0 flex-col items-stretch"
                    style={previewContentCapStyle}
                  >
                    {generationError ? (
                      <p className="mb-3 text-[11px] text-rose-300">{generationError}</p>
                    ) : null}
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
        </div>
      </div>

      <FixedPromptBarDock geometry={promptBarGeom} ariaLabel="Create video">
        {/*
          Dock uses `flex-col-reverse`: first child sits at the screen bottom. Keep PromptBar
          first so it stays under the settings row on mobile and desktop (matches Create Image).
        */}
        <PromptBar
          className="w-full shrink-0"
          prompt={barPrompt}
          onPromptChange={setBarPrompt}
          references={references}
          onAddReferences={handleAddReferences}
          onRemoveReference={handleRemoveReference}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          generateDisabled={generateDisabled}
          variant={minWidth1280 ? "desktop" : "mobile"}
          placeholder="Describe your video"
          generateAriaLabel="Generate video"
          onAddCatalogReference={handleAddCatalogReference}
        />
        <VideoGenerationSettingsRow
          className="w-full shrink-0"
          imagePagesPillStyle
          aspectRatio={aspectRatio}
          onAspectRatio={setAspectRatio}
          quality={quality}
          onQuality={setQuality}
          duration={duration}
          onDuration={setDuration}
          variant={minWidth1280 ? "desktop" : "mobile"}
        />
      </FixedPromptBarDock>

      {fullScreen ? (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-black/95 p-4">
          <button
            type="button"
            className="mb-4 self-end rounded-full px-4 py-2 text-sm text-white hover:bg-white/10"
            onClick={() => setFullScreen(null)}
          >
            Close
          </button>
          <div className="relative flex min-h-0 flex-1 items-center justify-center">
            {fullScreen.mode === "video" ? (
              <video
                poster={fullScreen.poster}
                controls
                playsInline
                autoPlay
                className="max-h-full max-w-full object-contain"
              >
                <source src={fullScreen.src} type="video/mp4" />
              </video>
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
