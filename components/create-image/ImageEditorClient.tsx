"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { PreviewPanel } from "./PreviewPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { GenerationSettingsRow } from "./GenerationSettingsRow";
import { PromptBar } from "./PromptBar";
import { MobileCreateImageDrawer } from "./MobileCreateImageDrawer";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
import { useShellNav } from "@/lib/use-shell-nav";
import { ImageEditorToolStrip } from "./ImageEditorToolStrip";
import type { ImageEditorToolId } from "./ImageEditorToolStrip";
import { ImageEditorFileInfoPanel } from "./ImageEditorFileInfoPanel";
import { DesktopTemplatesStrip } from "./DesktopTemplatesStrip";
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
import { ICONS } from "@/components/icons/icon-paths";
import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { useAppData } from "@/lib/app-data/app-data-context";
import { activityEntryToHistoryItem } from "@/lib/app-data/activity-to-drawer-history";
import { createMockVisuallyEditedImage } from "@/components/files/mock-visual-edited-image";
import type { ActivityHistoryEntry } from "@/components/history/types";
import { imageSrcFromFileEntry } from "@/components/files/image-editor-source";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const MOBILE_FILE_INFO: [string, string] = [
  "Edit, enhance, regenerate, remove elements,",
  "add content, draw, and update text before export.",
];

/** Fixed dock: tool strip above settings (`gap-3`) + wrapped chip rows (~2 lines). */
const IMAGE_EDITOR_DOCK_TOOLS_RESERVE_PX = 12 + 96;

type ImageEditorClientProps = {
  initialImageUrl: string | null;
  /** Catalog file id — resolved against shared `fileEntries` (generated images in Files). */
  initialFileId?: string | null;
};

export function ImageEditorClient({
  initialImageUrl,
  initialFileId = null,
}: ImageEditorClientProps) {
  const { navigate, activeMainNav } = useShellNav();
  const { toggle: toggleLiked } = useLikedItems();
  const { activityEntries, updateActivityEntries, fileEntries } = useAppData();

  const [barPrompt, setBarPrompt] = useState("");
  const [references] = useState<ReferenceFile[]>([]);
  const [assetContentType, setAssetContentType] =
    useState<AssetContentType>("Social Media");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<Quality>("4K");
  const [variations, setVariations] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  const [editTitle] = useState("Portrait retouch");
  const [activeTool, setActiveTool] = useState<ImageEditorToolId>("add");
  const [fileInfoTab, setFileInfoTab] = useState<"prompt" | "settings">(
    "prompt",
  );

  const [slotImages, setSlotImages] = useState<string[]>(() =>
    initialImageUrl ? [initialImageUrl] : [],
  );

  useEffect(() => {
    if (!initialFileId) return;
    const entry = fileEntries.find((f) => f.id === initialFileId);
    const src = imageSrcFromFileEntry(entry);
    if (src) {
      setSlotImages([src]);
      editorLineageParentRef.current = initialFileId;
    }
  }, [initialFileId, fileEntries]);

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const imageEditorSidebarHistory = useMemo(
    () =>
      activityEntries
        .filter((e) => e.kind === "editor" && e.origin === "image-editor")
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
  /** Catalog file id for the image currently in the canvas (lineage parent for the next saved edit). */
  const editorLineageParentRef = useRef<string | null>(null);

  const { layoutFrame, promptBar: promptBarGeom, minWidth768 } =
    useCreateImagePreviewPromptLayout({
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
      aspectRatio,
      templatesOpen: false,
      extraFixedDockReservePx: IMAGE_EDITOR_DOCK_TOOLS_RESERVE_PX,
    });

  const minWidth1280 = useMinWidth1280();
  const desktopScrollBottomPadPx =
    (minWidth1280
      ? createImageScrollContentBottomPaddingPxDesktopXl()
      : createImageScrollContentBottomPaddingPx("desktop")) +
    IMAGE_EDITOR_DOCK_TOOLS_RESERVE_PX;

  const generateDisabled = !barPrompt.trim();

  const handleApplyEdits = useCallback(async () => {
    if (generateDisabled || isGenerating) return;
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const createdAt = new Date();
      const batchId = uid();
      const promptText = barPrompt.trim();
      const sourceUrl = slotImages[0];
      const visual = await createMockVisuallyEditedImage(
        sourceUrl,
        `${batchId}-${promptText}`,
      );
      const previewSrc =
        "dataUrl" in visual ? visual.dataUrl : visual.remoteUrl;
      
      setSlotImages([previewSrc]);
      setActiveHistoryId(null);
    } finally {
      setIsGenerating(false);
    }
  }, [
    barPrompt,
    generateDisabled,
    isGenerating,
    slotImages,
    updateActivityEntries,
    activeHistoryId,
  ]);

  const loadHistory = useCallback(
    (id: string) => {
      const entry = activityEntries.find((e) => e.id === id);
      if (!entry || entry.kind !== "editor") return;
      const urls =
        entry.imageUrls && entry.imageUrls.length > 0
          ? entry.imageUrls
          : entry.thumbnailUrl
            ? [entry.thumbnailUrl]
            : [];
      setActiveHistoryId(id);
      setSlotImages(urls);
      setBarPrompt(entry.promptText ?? entry.subtitle);
      const outputFile = fileEntries.find(
        (f) =>
          f.kind === "file" &&
          f.typeLabel === "Image" &&
          f.generationBatchId === id,
      );
      editorLineageParentRef.current = outputFile?.id ?? null;
    },
    [activityEntries, fileEntries],
  );

  const handlePreviewClick = useCallback(() => {
    const url = slotImages[0];
    if (!url) return;
    setFullScreenUrl(url);
  }, [slotImages]);

  const handlePreviewMenu = useCallback(
    (action: string) => {
      const url = slotImages[0];
      if (action === "Full Screen Preview" && url) setFullScreenUrl(url);
      if (action === "Save" && url) {
        const batchId = uid();
        const editorCount = activityEntries.filter((e) => e.kind === "editor" && e.origin === "image-editor").length;
        const sequenceNum = String(editorCount + 1).padStart(2, "0");
        const title = `image-${sequenceNum}-edited.jpg`;
        const promptText = barPrompt.trim();
        const subtitle = promptText.length > 120 ? `${promptText.slice(0, 117)}…` : promptText;
        const parentFileId = editorLineageParentRef.current;
        const sourceImageId = activeHistoryId ?? parentFileId ?? undefined;

        const activity: ActivityHistoryEntry = {
          id: batchId,
          kind: "editor",
          title,
          subtitle,
          occurredAt: new Date(),
          promptText,
          editPrompt: promptText,
          thumbnailUrl: url,
          imageUrls: [url],
          origin: "image-editor",
          edited: true,
          ...(sourceImageId ? { sourceImageId } : {}),
          ...(parentFileId ? { sourceFileEntryId: parentFileId } : {}),
        };
        updateActivityEntries((prev) => [activity, ...prev]);
        setActiveHistoryId(batchId);
      }
      if (action === "Download" && url) {
        const a = document.createElement("a");
        a.href = url;
        a.download = "edited-image.jpg";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
      if (action === "Share" && url && navigator.share) {
        void navigator.share({ url });
      }
      if (action === "Delete") {
        setSlotImages([]);
        editorLineageParentRef.current = null;
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
      slotImages,
      toggleLiked,
      updateActivityEntries,
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
        a.download = "edited-image.jpg";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.click();
      }
      if (action === "Share" && url && navigator.share) {
        void navigator.share({ url });
      }
      if (action === "Delete") {
        updateActivityEntries((h) => h.filter((x) => x.id !== itemId));
        if (activeHistoryId === itemId) {
          setActiveHistoryId(null);
          setSlotImages([]);
          editorLineageParentRef.current = null;
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
    ],
  );

  const onToolSelect = useCallback((id: ImageEditorToolId) => {
    setActiveTool(id);
    if (id === "templates") {
      setTemplatesOpen((o) => !o);
    } else {
      setTemplatesOpen(false);
    }
  }, []);

  const metaMaxWidth = useMemo(() => {
    if (layoutFrame?.width) return { width: layoutFrame.width, maxWidth: "100%" as const };
    return undefined;
  }, [layoutFrame]);

  const editorMeta = (
    <div
      className={cn(
        "mt-3 min-w-0 shrink-0",
        layoutFrame?.width ? "mx-auto" : "mx-auto w-full max-w-[882.06px] xl:max-w-[1000px]",
      )}
      style={metaMaxWidth}
    >
      <p className="text-[12px] font-medium leading-snug text-white">
        Edited Image — {editTitle}
      </p>
    </div>
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
            mobileTitle="EDIT"
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
                  <div className="min-w-0 xl:mb-5">
                    <PreviewPanel
                      aspectRatio={aspectRatio}
                      template={null}
                      slotImages={slotImages}
                      promptText=""
                      createdAt={null}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      showPreviewLabel={false}
                      hideMeta
                      onPreviewClick={handlePreviewClick}
                      onMenuAction={handlePreviewMenu}
                    />
                    {editorMeta}
                  </div>
                  {templatesOpen ? (
                    <>
                      <div className="mb-6 w-full min-w-0 xl:hidden">
                        <TemplatesPanel
                          templates={MOCK_TEMPLATES}
                          selectedId={templateId}
                          open
                          onToggle={() => setTemplatesOpen(false)}
                          onSelect={setTemplateId}
                        />
                      </div>
                      <div className="mb-6 hidden w-full min-w-0 xl:block">
                        <DesktopTemplatesStrip
                          templates={MOCK_TEMPLATES}
                          selectedId={templateId}
                          onSelect={setTemplateId}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            <div
              className="hidden min-w-0 xl:block xl:min-h-0"
              aria-hidden="true"
            />
          </div>
          <ImageEditorFileInfoPanel
            activeTab={fileInfoTab}
            onTabChange={setFileInfoTab}
            promptPreview={barPrompt}
            aspectRatio={aspectRatio}
            quality={quality}
            variations={variations}
            fixedDockClearancePx={CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset}
            className="hidden max-h-screen xl:flex"
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-app-canvas md:hidden">
        <Header
          variant="mobile"
          mobileTitle="EDIT"
          onMenuClick={() => setMobileMenuOpen(true)}
        />
        <div className="mx-4 mt-2 mb-1 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-app-border bg-app-panel">
          <div
            ref={mobileScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain"
            style={{
              scrollPaddingBottom:
                createImageScrollContentBottomPaddingPx("mobile") +
                IMAGE_EDITOR_DOCK_TOOLS_RESERVE_PX,
            }}
          >
            <main
              ref={mobileColumnRef}
              className="flex w-full min-w-0 flex-col px-4 pt-3"
              style={{
                paddingBottom:
                  createImageScrollContentBottomPaddingPx("mobile") +
                  IMAGE_EDITOR_DOCK_TOOLS_RESERVE_PX,
              }}
            >
              <p
                className="mb-[14px] text-[11px] font-bold tracking-[0.09em] text-white"
                style={{ letterSpacing: "0.11em" }}
              >
                EDIT IMAGE
              </p>
              <PreviewPanel
                aspectRatio={aspectRatio}
                template={null}
                slotImages={slotImages}
                promptText=""
                createdAt={null}
                isLoading={isGenerating}
                showPreviewLabel={false}
                hideMeta
                mobileFrame
                layoutFrame={layoutFrame}
                onPreviewClick={handlePreviewClick}
                onMenuAction={handlePreviewMenu}
              />
              <div className="mt-3 min-w-0">
                <p className="text-[12px] font-medium leading-snug text-white">
                  Edited Image — {editTitle}
                </p>
              </div>
              <div className="mt-5 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#A1A1AA]">
                  File information
                </p>
                <p className="text-[11px] leading-[18px] text-[#A1A1AA]">
                  {MOBILE_FILE_INFO[0]}
                </p>
                <p className="text-[11px] leading-[18px] text-[#A1A1AA]">
                  {MOBILE_FILE_INFO[1]}
                </p>
              </div>
              <div className="my-5 h-px w-full bg-app-hover-strong/80" />
              <p
                className="mb-3 text-[11px] font-bold tracking-[0.09em] text-white"
                style={{ letterSpacing: "0.11em" }}
              >
                TEMPLATES
              </p>
              <TemplatesPanel
                templates={MOCK_TEMPLATES}
                selectedId={templateId}
                open={templatesOpen}
                onToggle={() => setTemplatesOpen((o) => !o)}
                onSelect={setTemplateId}
              />
              <p
                className="mb-2 text-[11px] font-bold tracking-[0.09em] text-white"
                style={{ letterSpacing: "0.11em" }}
              >
                PROMPT
              </p>
            </main>
          </div>
        </div>
      </div>

      <FixedPromptBarDock geometry={promptBarGeom} ariaLabel="Image editor">
        <PromptBar
          className="w-full shrink-0"
          prompt={barPrompt}
          onPromptChange={setBarPrompt}
          references={references}
          onAddReferences={() => {}}
          onRemoveReference={() => {}}
          onGenerate={handleApplyEdits}
          isGenerating={isGenerating}
          generateDisabled={generateDisabled}
          variant={minWidth768 ? "desktop" : "mobile"}
          placeholder="Describe your edits"
          generateAriaLabel="Apply edits"
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
        <ImageEditorToolStrip
          activeId={activeTool}
          onSelect={onToolSelect}
          className="w-full shrink-0"
        />
      </FixedPromptBarDock>

      <MobileCreateImageDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        historyItems={imageEditorSidebarHistory}
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
