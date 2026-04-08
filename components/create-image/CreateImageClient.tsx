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
  CREATE_IMAGE_SCROLL_RESERVE,
  createImageScrollContentBottomPaddingPx,
  createImageScrollContentBottomPaddingPxDesktopXl,
} from "./preview-frame-layout";
import {
  useCreateImagePreviewPromptLayout,
  useMinWidth1280,
} from "./use-create-image-preview-prompt-layout";
import type {
  AspectRatio,
  AssetContentType,
  Quality,
  ReferenceFile,
} from "./types";
import { MOCK_TEMPLATES } from "./types";
import { mobileCreateImageHelperLines } from "./mobile-create-image-copy";
import { MobileCreateImageDrawer } from "./MobileCreateImageDrawer";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
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

async function mockGenerateImages(
  count: number,
  aspect: AspectRatio,
  seedBase: string,
): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 1600));
  const { w, h } = dimsForAspect(aspect);
  const safe = seedBase.replace(/\W+/g, "").slice(0, 12) || "img";
  return Array.from(
    { length: count },
    (_, i) => `https://picsum.photos/seed/${safe}${i}/${w}/${h}`,
  );
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
    useState<AssetContentType>("Social Media");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<Quality>("4K");
  const [variations, setVariations] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

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
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
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
    templatesOpen,
  });

  const minWidth1280 = useMinWidth1280();
  const desktopScrollBottomPadPx = minWidth1280
    ? createImageScrollContentBottomPaddingPxDesktopXl()
    : createImageScrollContentBottomPaddingPx("desktop");

  const template = useMemo(
    () => MOCK_TEMPLATES.find((t) => t.id === templateId) ?? null,
    [templateId],
  );

  const displaySlots = useMemo(() => {
    if (!template) return slotImages;
    const cap = template.slots;
    return slotImages.slice(0, cap);
  }, [template, slotImages]);

  const generateDisabled =
    !barPrompt.trim() && references.length === 0;

  const handleGenerate = useCallback(async () => {
    if (generateDisabled || isGenerating) return;
    setIsGenerating(true);
    try {
      const urls = await mockGenerateImages(
        variations,
        aspectRatio,
        `${assetContentType}-${barPrompt}-${references.map((r) => r.id).join("")}`,
      );
      const batchId = uid();
      const createdAt = new Date();
      const promptText = barPrompt.trim() || "(reference only)";
      const subtitle =
        promptText.length > 120 ? `${promptText.slice(0, 117)}…` : promptText;

      const imageCount = activityEntries.filter((e) => e.kind === "image" && e.origin === "generated-image").length;
      const sequenceNum = String(imageCount + 1).padStart(2, "0");
      const title = `image-${sequenceNum}.jpg`;

      const activity: ActivityHistoryEntry = {
        id: batchId,
        kind: "image",
        title,
        subtitle,
        occurredAt: createdAt,
        promptText,
        thumbnailUrl: urls[0],
        imageUrls: urls,
        origin: "generated-image",
      };
      updateActivityEntries((prev) => [activity, ...prev]);

      setActiveHistoryId(batchId);
      setPreviewPrompt(promptText);
      setPreviewAt(createdAt);
      setSlotImages(urls);
      setSlotFileIds([]);
    } finally {
      setIsGenerating(false);
    }
  }, [
    barPrompt,
    generateDisabled,
    isGenerating,
    references,
    variations,
    aspectRatio,
    assetContentType,
    updateActivityEntries,
    updateFileEntries,
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
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-canvas text-[#FAFAFA]",
        /* Tablet (md–xl): 900px column cap; desktop xl+: 1000px 16:9 preview column. */
        "md:[--create-image-prompt-max:900px] xl:[--create-image-prompt-max:1000px]",
      )}
    >
      {/* md+: sidebar (xl+) + centered main + history (xl+); refs for preview/prompt layout */}
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
        {/* xl: fixed 300px rails + minmax(0,1fr) center; inner flex justify-center + max-w (refs unchanged). */}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden xl:grid xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          <Sidebar
            className="hidden shrink-0 xl:flex xl:w-[300px] xl:min-w-[300px]"
            activeId={activeMainNav}
            onNavigate={navigate}
            fixedDockClearancePx={CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}
          />
          {/* Tablet: flex + items-center. Desktop (xl): 1fr | minmax(0,1000px) | 1fr — equal side tracks keep the middle column centered at every width. */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:grid xl:h-full xl:min-h-0 xl:min-w-0 xl:max-w-none xl:grid-cols-[minmax(0,1fr)_minmax(0,1000px)_minmax(0,1fr)] xl:items-stretch xl:overflow-hidden xl:px-0">
            <div
              className="hidden min-w-0 xl:block xl:min-h-0"
              aria-hidden="true"
            />
            <div className="flex min-h-0 w-full min-w-0 max-w-[900px] flex-1 flex-col xl:max-w-none xl:w-full xl:min-h-0 xl:min-w-0">
              <div
                ref={desktopScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
                style={{
                  scrollPaddingBottom: desktopScrollBottomPadPx,
                }}
              >
                {/* One column: tablet md–xl max 900px; desktop xl max 1000px (16:9 preview). */}
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
                      onPreviewClick={handlePreviewClick}
                      onMenuAction={handlePreviewMenu}
                    />
                  </div>
                  <div className="mb-3 mt-5 min-w-0 w-full shrink-0 max-xl:block xl:hidden">
                    <TemplatesPanel
                      templates={MOCK_TEMPLATES}
                      selectedId={templateId}
                      open={templatesOpen}
                      onToggle={() => setTemplatesOpen((o) => !o)}
                      onSelect={setTemplateId}
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
            items={createImageSidebarHistory}
            activeId={activeHistoryId}
            onSelect={loadHistory}
            onMenuAction={handleHistoryMenu}
            className="hidden max-h-screen shrink-0 xl:flex xl:w-[300px] xl:min-w-[300px]"
          />
        </div>
      </div>

      {/* Below md: MOBILE-image-16x9.svg layout — single column card */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas md:hidden">
        <Header
          variant="mobile"
          mobileTitle="CREATE"
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
              <PreviewPanel
                aspectRatio={aspectRatio}
                template={template}
                slotImages={displaySlots}
                promptText={previewPrompt}
                createdAt={previewAt}
                isLoading={isGenerating}
                layoutFrame={layoutFrame}
                showPreviewLabel={false}
                hideMeta
                mobileFrame
                onPreviewClick={handlePreviewClick}
                onMenuAction={handlePreviewMenu}
              />
              {(() => {
                const [lineA, lineB] = mobileCreateImageHelperLines(aspectRatio);
                return (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[11px] leading-[18px] text-[#A1A1AA]">
                      {lineA}
                    </p>
                    <p className="text-[11px] leading-[18px] text-[#A1A1AA]">
                      {lineB}
                    </p>
                  </div>
                );
              })()}
              <div className="mt-4 mb-4 min-w-0 w-full">
                <TemplatesPanel
                  templates={MOCK_TEMPLATES}
                  selectedId={templateId}
                  open={templatesOpen}
                  onToggle={() => setTemplatesOpen((o) => !o)}
                  onSelect={setTemplateId}
                />
              </div>
            </main>
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
          variant={minWidth768 ? "desktop" : "mobile"}
        />
        <GenerationSettingsRow
          className="w-full shrink-0"
          assetContentType={assetContentType}
          onAssetContentType={setAssetContentType}
          aspectRatio={aspectRatio}
          onAspectRatio={setAspectRatio}
          quality={quality}
          onQuality={setQuality}
          variations={variations}
          onVariations={setVariations}
          variant={minWidth768 ? "desktop" : "mobile"}
        />
        <div
          className={cn(
            "hidden w-full shrink-0 xl:flex xl:justify-center",
            /* mt: description → templates; gap-3 on dock = templates → settings (≈12px). */
            "mt-[32px]",
          )}
        >
          <div className="w-full min-w-0 xl:max-w-[1000px]">
            <DesktopTemplatesStrip
              templates={MOCK_TEMPLATES}
              selectedId={templateId}
              onSelect={setTemplateId}
            />
          </div>
        </div>
      </FixedPromptBarDock>

      <MobileCreateImageDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        historyItems={createImageSidebarHistory}
        activeHistoryId={activeHistoryId}
        onSelectHistory={(id) => {
          loadHistory(id);
          setMobileMenuOpen(false);
        }}
        onHistoryMenuAction={handleHistoryMenu}
        activeMainNav={activeMainNav}
      />

      {fullScreenUrl ? (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-black/95 p-4">
          <button
            type="button"
            className="mb-4 self-end rounded-lg px-4 py-2 text-sm text-white hover:bg-white/10"
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
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
