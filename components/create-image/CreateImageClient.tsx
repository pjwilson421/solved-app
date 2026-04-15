"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { PreviewPanel } from "./PreviewPanel";
import { DesktopTemplatesStrip } from "./DesktopTemplatesStrip";
import { TemplatesPanel } from "./TemplatesPanel";
import { GenerationSettingsRow } from "./GenerationSettingsRow";
import { PromptBar } from "./PromptBar";
import { HistoryPanel } from "./HistoryPanel";
import {
  createImageScrollContentBottomPaddingPx,
  createImageScrollContentBottomPaddingPxDesktopXl,
} from "./preview-frame-layout";
import { useCreateImagePreviewPromptLayout } from "./use-create-image-preview-prompt-layout";
import type {
  AspectRatio,
  AssetContentType,
  Quality,
  ReferenceFile,
} from "./types";
import { MOCK_TEMPLATES } from "./types";
import { MobileCreateImageInlineHistoryGrid } from "./MobileCreateImageInlineHistoryGrid";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
import { DesktopThreeColumnShell } from "@/components/shell/DesktopThreeColumnShell";
import { cn } from "@/lib/utils";
import { useShellNav } from "@/lib/use-shell-nav";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { useAppData } from "@/lib/app-data/app-data-context";
import { activityEntryToHistoryItem } from "@/lib/app-data/activity-to-drawer-history";
import {
  fileIdsForImageUrls,
  firstDisplaySlotFileId,
  firstFileIdForImageBatch,
} from "@/components/files/image-editor-source";
import type { ActivityHistoryEntry } from "@/components/history/types";
import { isDataImageSrc } from "@/lib/is-data-image-src";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Calls `/api/ai/generate-image` with live Image Settings; server returns one or more data-URL images. */
async function fetchGeneratedImages(opts: {
  prompt: string;
  assetType: AssetContentType;
  aspectRatio: AspectRatio;
  resolution: Quality;
  numberOfVariations: number;
}): Promise<string[]> {
  const {
    prompt,
    assetType,
    aspectRatio,
    resolution,
    numberOfVariations,
  } = opts;
  console.log("Generate request settings:", {
    prompt,
    assetType,
    aspectRatio,
    resolution,
    numberOfVariations,
  });

  const res = await fetch("/api/ai/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      assetType,
      aspectRatio,
      resolution,
      numberOfVariations,
    }),
  });
  const data: unknown = await res.json().catch(() => null);

  let urls: string[] = [];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { images?: unknown }).images)
  ) {
    urls = (data as { images: unknown[] }).images.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
  }
  if (
    urls.length === 0 &&
    data &&
    typeof data === "object" &&
    typeof (data as { image?: unknown }).image === "string"
  ) {
    urls = [(data as { image: string }).image];
  }

  if (!res.ok || urls.length === 0) {
    const fromServer =
      data &&
      typeof data === "object" &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : null;
    throw new Error(fromServer || `Image generation failed (${res.status})`);
  }
  return urls;
}

export function CreateImageClient() {
  const router = useRouter();
  const { navigate, activeMainNav } = useShellNav();
  const { toggle: toggleLiked } = useLikedItems();
  const {
    activityEntries,
    updateActivityEntries,
    updateFileEntries,
    fileEntries,
  } = useAppData();

  const [barPrompt, setBarPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [assetContentType, setAssetContentType] =
    useState<AssetContentType>("Standard");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<Quality>("4K");
  const [variations, setVariations] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewAt, setPreviewAt] = useState<Date | null>(null);
  const [slotImages, setSlotImages] = useState<string[]>([]);
  /** Parallel to `slotImages`: catalog ids for Create Image file rows (handoff to Image Editor). */
  const [slotFileIds, setSlotFileIds] = useState<string[]>([]);

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const createImageSidebarHistory = useMemo(
    () =>
      activityEntries
        .filter((e) => e.kind === "image" && e.origin === "generated-image")
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .map(activityEntryToHistoryItem),
    [activityEntries],
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const generateInFlightRef = useRef(false);
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
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
    templatesOpen: templatesMenuOpen,
    previewLayoutIgnoreTemplatesOpen: true,
    templatesInScrollColumn: true,
  });

  const desktopScrollBottomPadPx = minWidth1280
    ? createImageScrollContentBottomPaddingPxDesktopXl()
    : createImageScrollContentBottomPaddingPx("desktop");

  const template = useMemo(
    () => MOCK_TEMPLATES.find((t) => t.id === templateId) ?? null,
    [templateId],
  );

  const desktopTemplatesStripSlot = useMemo(
    () => (
      <DesktopTemplatesStrip
        templates={MOCK_TEMPLATES}
        selectedId={templateId}
        onSelect={setTemplateId}
      />
    ),
    [templateId],
  );

  const templatesAfterPreviewStack = useMemo(
    () => (
      <TemplatesPanel
        templates={MOCK_TEMPLATES}
        selectedId={templateId}
        openMode="hover"
        onSelect={setTemplateId}
        desktopExpandedSlot={desktopTemplatesStripSlot}
        toggleButtonPreset="create-image"
        menuThumbPreset="create-image"
        hoverClickMenuDualMode
        stackTemplatesMenuInLayout
        onMenuVisibilityChange={setTemplatesMenuOpen}
      />
    ),
    [desktopTemplatesStripSlot, templateId],
  );

  const displaySlots = useMemo(() => {
    if (!template) return slotImages;
    const cap = template.slots;
    return slotImages.slice(0, cap);
  }, [template, slotImages]);

  const generateDisabled =
    !barPrompt.trim() && references.length === 0;

  const handleGenerate = useCallback(async () => {
    if (generateInFlightRef.current) return;
    const trimmed = barPrompt.trim();
    if (!trimmed && references.length === 0) return;

    generateInFlightRef.current = true;
    setIsGenerating(true);
    try {
      const promptForApi =
        trimmed ||
        "Generate a compelling image based on the attached reference images.";
      const urls = await fetchGeneratedImages({
        prompt: promptForApi,
        assetType: assetContentType,
        aspectRatio,
        resolution: quality,
        numberOfVariations: variations,
      });
      const batchId = uid();
      const createdAt = new Date();
      const promptText = trimmed || "(reference only)";
      const subtitle =
        promptText.length > 120 ? `${promptText.slice(0, 117)}…` : promptText;

      const imageCount = activityEntries.filter(
        (e) => e.kind === "image" && e.origin === "generated-image",
      ).length;
      const sequenceNum = String(imageCount + 1).padStart(2, "0");
      const title = `image-${sequenceNum}.jpg`;

      const activity: ActivityHistoryEntry = {
        id: batchId,
        kind: "image",
        type: "image",
        title,
        subtitle,
        occurredAt: createdAt,
        promptText,
        thumbnailUrl: urls[0],
        imageUrl: urls[0],
        imageUrls: urls,
        aspectRatio,
        resolution: quality,
        origin: "generated-image",
      };
      updateActivityEntries((prev) => [activity, ...prev]);

      setActiveHistoryId(batchId);
      setPreviewPrompt(promptText);
      setPreviewAt(createdAt);
      setSlotImages(urls);
      setSlotFileIds([]);
    } catch (err) {
      console.error("[CreateImageClient] Image generation failed:", err);
    } finally {
      generateInFlightRef.current = false;
      setIsGenerating(false);
    }
  }, [
    barPrompt,
    references,
    variations,
    assetContentType,
    aspectRatio,
    quality,
    activityEntries,
    updateActivityEntries,
  ]);

  const loadHistory = useCallback(
    (id: string) => {
      const item = activityEntries.find((e) => e.id === id);
      if (!item || item.kind !== "image") return;
      const urls =
        item.imageUrls && item.imageUrls.length > 0
          ? item.imageUrls
          : item.thumbnailUrl
            ? [item.thumbnailUrl]
            : [];
      setActiveHistoryId(id);
      const promptRestore = item.promptText ?? item.subtitle;
      setPreviewPrompt(promptRestore);
      setPreviewAt(item.occurredAt);
      setSlotImages(urls);
      setSlotFileIds(fileIdsForImageUrls(fileEntries, urls));
      setBarPrompt(promptRestore);
    },
    [activityEntries, fileEntries],
  );

  const openImageEditorForDisplay = useCallback(
    (url: string | undefined) => {
      if (!url) return;
      const fileId = firstDisplaySlotFileId(displaySlots, slotFileIds);
      if (fileId) {
        router.push(
          `/image-editor?${new URLSearchParams({ fileId }).toString()}`,
        );
      } else {
        router.push(
          `/image-editor?${new URLSearchParams({ url }).toString()}`,
        );
      }
    },
    [router, displaySlots, slotFileIds],
  );

  const handlePreviewClick = useCallback(() => {
    const url = displaySlots.find((u) => typeof u === "string" && u.length > 0);
    openImageEditorForDisplay(url);
  }, [displaySlots, openImageEditorForDisplay]);

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

  const handlePreviewMenu = useCallback(
    (action: string) => {
      const url = displaySlots.find((u) => typeof u === "string" && u.length > 0);
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
      if (action === "Edit image" && url) {
        openImageEditorForDisplay(url);
      }
      if (action === "Delete") {
        setSlotImages([]);
        setSlotFileIds([]);
        setPreviewPrompt("");
        setPreviewAt(null);
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
      displaySlots,
      openImageEditorForDisplay,
      toggleLiked,
      updateActivityEntries,
      updateFileEntries,
    ],
  );

  const handleHistoryMenu = useCallback(
    (itemId: string, action: string) => {
      const entry = activityEntries.find((e) => e.id === itemId);
      const url =
        entry?.imageUrls?.[0] ?? entry?.thumbnailUrl;
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
      if (action === "Edit image" && url) {
        const fileId = firstFileIdForImageBatch(fileEntries, itemId, url);
        if (fileId) {
          router.push(
            `/image-editor?${new URLSearchParams({ fileId }).toString()}`,
          );
        } else {
          router.push(
            `/image-editor?${new URLSearchParams({ url }).toString()}`,
          );
        }
      }
      if (action === "Delete") {
        updateActivityEntries((h) => h.filter((x) => x.id !== itemId));
        if (activeHistoryId === itemId) {
          setActiveHistoryId(null);
          setSlotImages([]);
          setSlotFileIds([]);
          setPreviewPrompt("");
          setPreviewAt(null);
        }
      }
      if (action === "Like") {
        toggleLiked(likedKey.generation(itemId));
      }
    },
    [
      activeHistoryId,
      activityEntries,
      fileEntries,
      router,
      toggleLiked,
      updateActivityEntries,
      updateFileEntries,
    ],
  );

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-tx-primary",
        "xl:[--create-image-prompt-max:1000px]",
      )}
    >
      {/* xl+: visible side rails + desktop header; same refs as preview/prompt layout */}
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
              title="IMAGE HISTORY"
              items={createImageSidebarHistory}
              activeId={activeHistoryId}
              onSelect={loadHistory}
              onMenuAction={handleHistoryMenu}
              className="min-h-0 w-full min-w-0 flex-1 flex-col"
            />
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:px-0">
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col xl:mx-auto xl:w-[min(100%,1000px)] xl:max-w-[1000px] xl:min-h-0 xl:min-w-0">
              <div
                ref={desktopScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
                style={{
                  scrollPaddingBottom: desktopScrollBottomPadPx,
                }}
              >
                {/* Desktop xl+: centered column max 1000px (16:9 preview). */}
                <div
                  ref={desktopMiddleColumnRef}
                  className="flex w-full min-w-0 flex-col items-stretch pt-6 text-left"
                  style={{
                    paddingBottom: desktopScrollBottomPadPx,
                  }}
                >
                  <div className="min-w-0 xl:mb-8">
                    <PreviewPanel
                      aspectRatio={aspectRatio}
                      template={template}
                      slotImages={displaySlots}
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      promptDescriptionAnchoredToPreview
                      onPreviewClick={handlePreviewClick}
                      onMenuAction={handlePreviewMenu}
                      afterPreviewStack={templatesAfterPreviewStack}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DesktopThreeColumnShell>
      </div>

      {/* Below xl: center column only (matches Chat mobile header + desktop middle flow). */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-bg xl:hidden">
        <Header
          variant="mobile"
          mobileTitle="CREATE"
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
                      template={template}
                      slotImages={displaySlots}
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      promptDescriptionAnchoredToPreview
                      onPreviewClick={handlePreviewClick}
                      onMenuAction={handlePreviewMenu}
                      afterPreviewStack={
                        createImageSidebarHistory.length > 0
                          ? undefined
                          : templatesAfterPreviewStack
                      }
                      inlineAfterDescription={
                        createImageSidebarHistory.length > 0 ? (
                          <>
                            <div className="mt-3 w-full min-w-0 shrink-0">
                              {templatesAfterPreviewStack}
                            </div>
                            <MobileCreateImageInlineHistoryGrid
                              items={createImageSidebarHistory}
                              activeId={activeHistoryId}
                              onSelect={loadHistory}
                              onMenuAction={handleHistoryMenu}
                            />
                          </>
                        ) : undefined
                      }
                    />
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FixedPromptBarDock geometry={promptBarGeom} ariaLabel="Create image">
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
          onAddCatalogReference={handleAddCatalogReference}
        />
        <GenerationSettingsRow
          className="w-full shrink-0"
          imagePagesPillStyle
          assetContentType={assetContentType}
          onAssetContentType={setAssetContentType}
          aspectRatio={aspectRatio}
          onAspectRatio={setAspectRatio}
          quality={quality}
          onQuality={setQuality}
          variations={variations}
          onVariations={setVariations}
          variant={minWidth1280 ? "desktop" : "mobile"}
        />
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
              alt="Full preview"
              fill
              className="object-contain"
              sizes="100vw"
              unoptimized={isDataImageSrc(fullScreenUrl)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
