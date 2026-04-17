"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { PreviewPanel } from "./PreviewPanel";
import { HistoryPanel } from "./HistoryPanel";
import { TemplatesPanel } from "./TemplatesPanel";
import { GenerationSettingsRow } from "./GenerationSettingsRow";
import { PromptBar } from "./PromptBar";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
import {
  PreviewExpandOverlay,
  type PreviewExpandOverlayPreview,
} from "./PreviewExpandOverlay";
import { useShellNav } from "@/lib/use-shell-nav";
import { ImageEditorToolStrip } from "./ImageEditorToolStrip";
import type { ImageEditorToolId } from "./ImageEditorToolStrip";
import {
  ImageEditorAddPaintOverlay,
  type ImageEditorAddPaintOverlayHandle,
} from "./ImageEditorAddPaintOverlay";
import { DesktopTemplatesStrip } from "./DesktopTemplatesStrip";
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
import { ASPECT_RATIOS, MOCK_TEMPLATES, normalizeQuality } from "./types";
import type { PreviewMenuEvent } from "./preview-menu-config";
import { DesktopThreeColumnShell } from "@/components/shell/DesktopThreeColumnShell";
import { cn } from "@/lib/utils";
import { likedKey } from "@/lib/liked-item-keys";
import { useLikedItems } from "@/components/liked-items/liked-items-context";
import { useAppData } from "@/lib/app-data/app-data-context";
import { useAppItemActions } from "@/lib/app-data/use-app-item-actions";
import { appItemRef } from "@/lib/app-data/item-ref";
import {
  bestFullscreenImageUrlForEntry,
  bestImageUrlForEntry,
  downloadImageFromUrl,
  pickShareableHttpUrl,
} from "@/lib/create-image/media-actions";
import {
  clearPendingEditorImage,
  readPendingEditorImage,
  writePendingEditorImage,
  type EditorHandoffMode,
} from "@/lib/create-image/pending-editor-image";
import { handleShareTarget } from "@/lib/share/web-share";
import { createMockVisuallyEditedImage } from "@/components/files/mock-visual-edited-image";
import type { ActivityHistoryEntry } from "@/components/history/types";
import {
  fileIdsForImageUrls,
  firstFileIdForImageBatch,
  imageSrcFromFileEntry,
} from "@/components/files/image-editor-source";
import { activityEntryToHistoryItem } from "@/lib/app-data/activity-to-drawer-history";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

type ImageEditorClientProps = {
  initialImageUrl: string | null;
  /** Catalog file id — resolved against shared `fileEntries` (generated images in Files). */
  initialFileId?: string | null;
  /** Activity / history row id when opened from Create Image. */
  initialActivityId?: string | null;
  /** URL `mode` query: `edit` vs `upscale` handoff (session payload may override). */
  initialHandoffMode?: EditorHandoffMode | null;
};

export function ImageEditorClient({
  initialImageUrl,
  initialFileId = null,
  initialActivityId = null,
  initialHandoffMode = null,
}: ImageEditorClientProps) {
  const router = useRouter();
  const { navigate, activeMainNav } = useShellNav();
  const { toggle: toggleLiked, isLiked } = useLikedItems();
  const { deleteCatalogItem } = useAppItemActions();
  const { activityEntries, updateActivityEntries, fileEntries } = useAppData();

  const [barPrompt, setBarPrompt] = useState("");
  const [references, setReferences] = useState<ReferenceFile[]>([]);
  const [assetContentType, setAssetContentType] =
    useState<AssetContentType>("Standard");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [quality, setQuality] = useState<Quality>("4K");
  const [variations, setVariations] = useState(1);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<ImageEditorToolId>("add");
  const activeToolRef = useRef<ImageEditorToolId>(activeTool);
  activeToolRef.current = activeTool;

  const [addToolMenuOpen, setAddToolMenuOpen] = useState(false);
  const [addBrushRadius, setAddBrushRadius] = useState(24);
  const [addMaskDataUrl, setAddMaskDataUrl] = useState<string | null>(null);
  const [addPaintHistory, setAddPaintHistory] = useState({
    canUndo: false,
    canRedo: false,
  });
  const addPaintOverlayRef = useRef<ImageEditorAddPaintOverlayHandle>(null);

  const [slotImages, setSlotImages] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const pending = readPendingEditorImage();
      const handoff = pending?.imageUrl?.trim();
      if (handoff) return [handoff];
    }
    return initialImageUrl ? [initialImageUrl] : [];
  });
  /** Under-preview description — same pattern as Create Image (`previewPrompt` / `previewAt`). */
  const [previewPrompt, setPreviewPrompt] = useState("");
  const [previewAt, setPreviewAt] = useState<Date | null>(null);

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(
    initialActivityId,
  );

  /** Catalog file id for the image currently in the canvas (lineage parent for the next saved edit). */
  const editorLineageParentRef = useRef<string | null>(null);

  const [editorHandoffMode, setEditorHandoffMode] =
    useState<EditorHandoffMode | null>(initialHandoffMode);

  useLayoutEffect(() => {
    const pending = readPendingEditorImage();
    const handoff = pending?.imageUrl?.trim();
    if (handoff) {
      setSlotImages([handoff]);
      if (pending.activityId) setActiveHistoryId(pending.activityId);
      else if (initialActivityId) setActiveHistoryId(initialActivityId);
      if (pending.fileId) editorLineageParentRef.current = pending.fileId;
      if (pending.mode) setEditorHandoffMode(pending.mode);
      else if (initialHandoffMode) setEditorHandoffMode(initialHandoffMode);
      if (pending.promptText) setPreviewPrompt(pending.promptText);
      if (pending.createdAt) {
        const d = new Date(pending.createdAt);
        if (!Number.isNaN(d.getTime())) setPreviewAt(d);
      }
      if (
        pending.aspectRatio &&
        ASPECT_RATIOS.includes(pending.aspectRatio as AspectRatio)
      ) {
        setAspectRatio(pending.aspectRatio as AspectRatio);
      }
      if (pending.resolution) {
        setQuality(normalizeQuality(pending.resolution));
      }
      return;
    }
    if (initialActivityId) setActiveHistoryId(initialActivityId);
    if (initialHandoffMode) setEditorHandoffMode(initialHandoffMode);
  }, [initialActivityId, initialHandoffMode]);

  /** Clear handoff payload after paint so Strict Mode remount can still read session. */
  useEffect(() => {
    const pending = readPendingEditorImage();
    const url = pending?.imageUrl?.trim();
    if (!url) return;
    let innerId = 0;
    const outerId = window.requestAnimationFrame(() => {
      innerId = window.requestAnimationFrame(() => {
        const cur = readPendingEditorImage();
        if (cur?.imageUrl?.trim() === url) clearPendingEditorImage();
      });
    });
    return () => {
      window.cancelAnimationFrame(outerId);
      if (innerId) window.cancelAnimationFrame(innerId);
    };
  }, []);

  const prevEditorImageUrlRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const url = slotImages[0]?.trim() ?? "";
    if (prevEditorImageUrlRef.current === url) return;
    prevEditorImageUrlRef.current = url;
    addPaintOverlayRef.current?.clearMask();
    setAddMaskDataUrl(null);
  }, [slotImages]);

  /** Resolve catalog file → canvas when there was no session handoff (or fileEntries loads later). */
  useEffect(() => {
    if (!initialFileId) return;
    const entry = fileEntries.find((f) => f.id === initialFileId);
    const src = imageSrcFromFileEntry(entry);
    if (!src) return;
    setSlotImages((prev) => {
      if (prev[0]?.trim()) return prev;
      return [src];
    });
  }, [initialFileId, fileEntries]);

  /** When the canvas URL matches this file entry, attach lineage; prompt only if still empty (preserve session handoff). */
  useEffect(() => {
    if (!initialFileId) return;
    const entry = fileEntries.find((f) => f.id === initialFileId);
    const src = imageSrcFromFileEntry(entry);
    if (!entry || !src) return;
    const cur = slotImages[0]?.trim();
    if (!cur || cur !== src) return;
    editorLineageParentRef.current = initialFileId;
    setPreviewPrompt((p) =>
      p.trim() ? p : entry.editPrompt?.trim() ?? "",
    );
  }, [initialFileId, fileEntries, slotImages]);

  const [isGenerating, setIsGenerating] = useState(false);
  const [templatesMenuOpen, setTemplatesMenuOpen] = useState(false);
  const [fullScreenUrl, setFullScreenUrl] = useState<string | null>(null);
  const [expandedImagePreview, setExpandedImagePreview] =
    useState<PreviewExpandOverlayPreview | null>(null);

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
      previewLayoutIgnoreTemplatesOpenOnDesktopXl: true,
      templatesInScrollColumn: true,
    });

  const desktopScrollBottomPadPx = minWidth1280
    ? createImageScrollContentBottomPaddingPxDesktopXl()
    : createImageScrollContentBottomPaddingPx("desktop");

  const generateDisabled = !barPrompt.trim() || !slotImages[0]?.trim();

  const createImageSidebarHistory = useMemo(
    () =>
      activityEntries
        .filter((e) => e.kind === "image" && e.origin === "generated-image")
        .sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())
        .map(activityEntryToHistoryItem),
    [activityEntries],
  );

  const openImageEditorHandoff = useCallback(
    (
      mode: EditorHandoffMode,
      url: string | undefined,
      ctx: {
        entry: ActivityHistoryEntry | null;
        activityId: string | null;
        fileId: string | null;
      },
    ) => {
      if (!url) return;
      const { entry, activityId, fileId } = ctx;
      const fullRes = entry ? bestImageUrlForEntry(entry) ?? url : url;
      const liked =
        activityId != null && isLiked(likedKey.activity(activityId));
      writePendingEditorImage({
        mode,
        imageUrl: url,
        fullResolutionUrl: fullRes,
        fileId,
        activityId,
        promptText: entry?.promptText ?? entry?.subtitle ?? null,
        createdAt: entry?.occurredAt?.toISOString() ?? null,
        aspectRatio: entry?.aspectRatio ?? null,
        resolution: entry?.resolution ?? null,
        liked,
      });
      const qs = new URLSearchParams();
      if (fileId) qs.set("fileId", fileId);
      if (activityId) qs.set("activityId", activityId);
      qs.set("mode", mode);
      router.push(`/image-editor?${qs.toString()}`);
    },
    [router, isLiked],
  );

  const loadHistory = useCallback(
    (id: string) => {
      const item = activityEntries.find((e) => e.id === id);
      if (!item || item.kind !== "image") return;
      const primary = bestImageUrlForEntry(item);
      const urls =
        primary != null
          ? [primary]
          : item.imageUrls && item.imageUrls.length > 0
            ? [...item.imageUrls]
            : item.thumbnailUrl
              ? [item.thumbnailUrl]
              : [];
      setActiveHistoryId(id);
      const promptRestore = item.promptText ?? item.subtitle;
      setPreviewPrompt(promptRestore);
      setPreviewAt(item.occurredAt);
      setSlotImages(urls);
      const lineageIds = fileIdsForImageUrls(fileEntries, urls);
      editorLineageParentRef.current = lineageIds[0] ?? null;
      if (
        item.aspectRatio &&
        ASPECT_RATIOS.includes(item.aspectRatio as AspectRatio)
      ) {
        setAspectRatio(item.aspectRatio as AspectRatio);
      }
      setQuality(normalizeQuality(item.resolution ?? quality));
      setVariations(Math.max(1, urls.length));
      setBarPrompt(promptRestore);
    },
    [activityEntries, fileEntries, quality],
  );

  const handleHistoryMenu = useCallback(
    (itemId: string, e: PreviewMenuEvent) => {
      const entry = activityEntries.find((a) => a.id === itemId);
      const url =
        entry != null
          ? bestFullscreenImageUrlForEntry(entry) ??
            bestImageUrlForEntry(entry)
          : undefined;
      if (!entry || !url) return;

      switch (e.type) {
        case "expand":
          setExpandedImagePreview({
            src: bestFullscreenImageUrlForEntry(entry) ?? url,
            title: entry.title,
          });
          break;
        case "download":
          void downloadImageFromUrl(url, entry.occurredAt);
          break;
        case "share":
          void handleShareTarget(e.target, {
            imageUrl: url,
            shareableHttpUrl: pickShareableHttpUrl(entry, url),
            offerManualDownload: () =>
              downloadImageFromUrl(url, entry.occurredAt),
          });
          break;
        case "edit-image": {
          const fileId =
            firstFileIdForImageBatch(fileEntries, itemId, url) ?? null;
          openImageEditorHandoff("edit", url, {
            entry,
            activityId: itemId,
            fileId,
          });
          break;
        }
        case "upscale": {
          const fileId =
            firstFileIdForImageBatch(fileEntries, itemId, url) ?? null;
          openImageEditorHandoff("upscale", url, {
            entry,
            activityId: itemId,
            fileId,
          });
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
            editorLineageParentRef.current = null;
            setAspectRatio(aspectRatio);
            setQuality(quality);
            setVariations(variations);
          }
          break;
        case "save":
          break;
        default:
          break;
      }
    },
    [
      activeHistoryId,
      activityEntries,
      aspectRatio,
      deleteCatalogItem,
      fileEntries,
      openImageEditorHandoff,
      quality,
      toggleLiked,
      variations,
    ],
  );

  const historyMenuLikeActive = useCallback(
    (id: string) => isLiked(likedKey.activity(id)),
    [isLiked],
  );

  const handleApplyEdits = useCallback(async () => {
    if (generateDisabled || isGenerating) return;
    setIsGenerating(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const createdAt = new Date();
      const batchId = uid();
      const promptText = barPrompt.trim();
      const sourceUrl = slotImages[0];
      const visual = await createMockVisuallyEditedImage(sourceUrl);
      const previewSrc =
        "dataUrl" in visual ? visual.dataUrl : visual.remoteUrl;

      const editorCount = activityEntries.filter(
        (e) => e.kind === "editor" && e.origin === "image-editor",
      ).length;
      const sequenceNum = String(editorCount + 1).padStart(2, "0");
      const title = `image-${sequenceNum}-edited.jpg`;
      const subtitle =
        promptText.length > 120 ? `${promptText.slice(0, 117)}…` : promptText;
      const parentFileId = editorLineageParentRef.current;
      const sourceImageId = activeHistoryId ?? parentFileId ?? undefined;

      const activity: ActivityHistoryEntry = {
        id: batchId,
        kind: "editor",
        title,
        subtitle,
        occurredAt: createdAt,
        promptText,
        editPrompt: promptText,
        thumbnailUrl: previewSrc,
        imageUrl: previewSrc,
        fullResolutionUrl: previewSrc,
        imageUrls: [previewSrc],
        origin: "image-editor",
        edited: true,
        ...(sourceImageId ? { sourceImageId } : {}),
        ...(parentFileId ? { sourceFileEntryId: parentFileId } : {}),
      };
      updateActivityEntries((prev) => [activity, ...prev]);

      setSlotImages([previewSrc]);
      setPreviewPrompt(promptText);
      setPreviewAt(createdAt);
      setActiveHistoryId(batchId);
    } finally {
      setIsGenerating(false);
    }
  }, [
    activeHistoryId,
    activityEntries,
    barPrompt,
    generateDisabled,
    isGenerating,
    slotImages,
    updateActivityEntries,
  ]);

  const handlePreviewClick = useCallback(() => {
    const url = slotImages[0];
    if (!url) return;
    setFullScreenUrl(url);
  }, [slotImages]);

  const activeHistoryRecord = useMemo(
    () =>
      activeHistoryId
        ? activityEntries.find((e) => e.id === activeHistoryId) ?? null
        : null,
    [activeHistoryId, activityEntries],
  );

  const editorBestUrl = useMemo(() => {
    const fromEntry = activeHistoryRecord
      ? bestImageUrlForEntry(activeHistoryRecord)
      : undefined;
    return fromEntry ?? slotImages[0];
  }, [activeHistoryRecord, slotImages]);

  const handlePreviewMenu = useCallback(
    (event: PreviewMenuEvent) => {
      const url = editorBestUrl;
      const downloadSrc =
        activeHistoryRecord != null
          ? bestFullscreenImageUrlForEntry(activeHistoryRecord) ?? url
          : url;
      const at = activeHistoryRecord?.occurredAt ?? previewAt;

      switch (event.type) {
        case "expand":
          if (url) setFullScreenUrl(url);
          break;
        case "save":
          if (url) {
            const batchId = uid();
            const editorCount = activityEntries.filter(
              (e) => e.kind === "editor" && e.origin === "image-editor",
            ).length;
            const sequenceNum = String(editorCount + 1).padStart(2, "0");
            const title = `image-${sequenceNum}-edited.jpg`;
            const promptText = barPrompt.trim();
            const subtitle =
              promptText.length > 120
                ? `${promptText.slice(0, 117)}…`
                : promptText;
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
              fullResolutionUrl: url,
              imageUrls: [url],
              origin: "image-editor",
              edited: true,
              ...(sourceImageId ? { sourceImageId } : {}),
              ...(parentFileId ? { sourceFileEntryId: parentFileId } : {}),
            };
            updateActivityEntries((prev) => [activity, ...prev]);
            setActiveHistoryId(batchId);
          }
          break;
        case "download":
          if (downloadSrc) void downloadImageFromUrl(downloadSrc, at);
          break;
        case "share":
          if (url) {
            void handleShareTarget(event.target, {
              imageUrl: downloadSrc ?? url,
              shareableHttpUrl: pickShareableHttpUrl(
                activeHistoryRecord,
                downloadSrc ?? url,
              ),
              offerManualDownload: () =>
                downloadImageFromUrl(downloadSrc ?? url, at),
            });
          }
          break;
        case "edit-image":
          setEditorHandoffMode("edit");
          break;
        case "upscale":
          setEditorHandoffMode("upscale");
          break;
        case "delete":
          setSlotImages([]);
          setPreviewPrompt("");
          setPreviewAt(null);
          editorLineageParentRef.current = null;
          if (activeHistoryId) {
            deleteCatalogItem(appItemRef.activity(activeHistoryId));
            setActiveHistoryId(null);
          }
          break;
        case "like":
          if (activeHistoryId) {
            toggleLiked(likedKey.activity(activeHistoryId));
          }
          break;
        default:
          break;
      }
    },
    [
      activeHistoryId,
      activeHistoryRecord?.occurredAt,
      barPrompt,
      deleteCatalogItem,
      editorBestUrl,
      previewAt,
      activityEntries,
      toggleLiked,
      updateActivityEntries,
    ],
  );

  const onToolSelect = useCallback((id: ImageEditorToolId) => {
    if (id === "add") {
      if (activeToolRef.current === "add") {
        setAddToolMenuOpen((o) => !o);
      } else {
        setActiveTool("add");
        setAddToolMenuOpen(true);
      }
      return;
    }
    setAddToolMenuOpen(false);
    setActiveTool(id);
  }, []);

  const addPaintInteractive =
    activeTool === "add" && Boolean(slotImages[0]?.trim()) && !isGenerating;

  const editorPreviewOverlay =
    slotImages[0]?.trim() ? (
      <ImageEditorAddPaintOverlay
        key={slotImages[0]}
        ref={addPaintOverlayRef}
        interactive={addPaintInteractive}
        brushRadiusPx={addBrushRadius}
        onMaskExport={setAddMaskDataUrl}
        onHistoryChange={setAddPaintHistory}
      />
    ) : null;

  const addToolMenu =
    activeTool === "add"
      ? {
          open: addToolMenuOpen,
          brushSize: addBrushRadius,
          onBrushSizeChange: setAddBrushRadius,
          onUndo: () => addPaintOverlayRef.current?.undo(),
          onRedo: () => addPaintOverlayRef.current?.redo(),
          canUndo: addPaintHistory.canUndo,
          canRedo: addPaintHistory.canRedo,
        }
      : null;

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
      const target = prev.find((x) => x.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((x) => x.id !== id);
    });
  }, []);

  const handleAddCatalogReference = useCallback((reference: ReferenceFile) => {
    setReferences((prev) => {
      if (prev.some((r) => r.url === reference.url)) return prev;
      return [...prev, reference];
    });
  }, []);

  const metaMaxWidth = useMemo(() => {
    if (layoutFrame?.width) return { width: layoutFrame.width, maxWidth: "100%" as const };
    return undefined;
  }, [layoutFrame]);

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

  const editorBelowPreviewShellClass = cn(
    "mt-3 min-w-0 shrink-0",
    layoutFrame?.width
      ? "mx-auto"
      : "mx-auto w-full max-w-[882.06px] xl:max-w-[1000px]",
  );

  const editorTemplatesPanelDesktop = useMemo(
    () => (
      <TemplatesPanel
        key={activeTool}
        layoutColumn="desktop"
        templates={MOCK_TEMPLATES}
        selectedId={templateId}
        open={templatesMenuOpen}
        onOpenChange={setTemplatesMenuOpen}
        onSelect={setTemplateId}
        desktopExpandedSlot={desktopTemplatesStripSlot}
        toggleButtonPreset="create-image"
        menuThumbPreset="create-image"
        stackTemplatesMenuInLayout
      />
    ),
    [activeTool, desktopTemplatesStripSlot, templateId, templatesMenuOpen],
  );

  const editorTemplatesPanelMobile = useMemo(
    () => (
      <TemplatesPanel
        key={activeTool}
        layoutColumn="mobile"
        templates={MOCK_TEMPLATES}
        selectedId={templateId}
        open={templatesMenuOpen}
        onOpenChange={setTemplatesMenuOpen}
        onSelect={setTemplateId}
        desktopExpandedSlot={desktopTemplatesStripSlot}
        toggleButtonPreset="create-image"
        menuThumbPreset="create-image"
        stackTemplatesMenuInLayout
      />
    ),
    [activeTool, desktopTemplatesStripSlot, templateId, templatesMenuOpen],
  );

  /** Editor tools under description; Templates sit above this row in the scroll column. */
  const editorToolStripUnderMeta = (
    <div className={editorBelowPreviewShellClass} style={metaMaxWidth}>
      <div
        className="flex w-full min-w-0 flex-wrap items-center justify-start gap-2 xl:gap-2.5"
        role="toolbar"
        aria-label="Edit tools"
      >
        <ImageEditorToolStrip
          activeId={activeTool}
          onSelect={onToolSelect}
          addToolMenu={addToolMenu}
          className="w-full shrink-0"
        />
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "flex h-dvh min-h-0 flex-col overflow-hidden bg-app-bg text-tx-primary",
        "xl:[--create-image-prompt-max:1000px]",
      )}
      data-editor-handoff={editorHandoffMode ?? undefined}
    >
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden xl:flex">
        <div className="hidden shrink-0 xl:block">
          <Header variant="desktop" />
        </div>
        <div className="shrink-0 xl:hidden">
          <Header variant="mobile" mobileTitle="EDIT" />
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
              onMenuEvent={handleHistoryMenu}
              previewMenuLikeActive={historyMenuLikeActive}
              previewMenuPreset="create-image"
              thumbnailHoverOpacityOnItemHover
              className="min-h-0 w-full min-w-0 flex-1 flex-col"
            />
          }
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center px-4 sm:px-8 xl:h-full xl:min-h-0 xl:min-w-0 xl:px-0">
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
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      showPreviewLabel={false}
                      promptDescriptionAnchoredToPreview
                      previewMenuPreset="create-image"
                      onPreviewClick={handlePreviewClick}
                      onMenuEvent={handlePreviewMenu}
                      previewMenuLikeActive={
                        activeHistoryId != null &&
                        isLiked(likedKey.activity(activeHistoryId))
                      }
                      imageObjectFit="cover"
                      previewBodyOverlay={editorPreviewOverlay}
                      previewMediaClickable={!addPaintInteractive}
                      afterPreviewStack={editorTemplatesPanelDesktop}
                    />
                    {editorToolStripUnderMeta}
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
          mobileTitle="EDIT"
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
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      showPreviewLabel={false}
                      promptDescriptionAnchoredToPreview
                      previewMenuPreset="create-image"
                      onPreviewClick={handlePreviewClick}
                      onMenuEvent={handlePreviewMenu}
                      previewMenuLikeActive={
                        activeHistoryId != null &&
                        isLiked(likedKey.activity(activeHistoryId))
                      }
                      imageObjectFit="cover"
                      previewBodyOverlay={editorPreviewOverlay}
                      previewMediaClickable={!addPaintInteractive}
                      afterPreviewStack={editorTemplatesPanelMobile}
                    />
                    {editorToolStripUnderMeta}
                  </div>
                </main>
              </div>
            </div>
          </div>
        </div>
      </div>

      <FixedPromptBarDock geometry={promptBarGeom} ariaLabel="Image editor">
        <PromptBar
          className="w-full shrink-0"
          prompt={barPrompt}
          onPromptChange={setBarPrompt}
          references={references}
          onAddReferences={handleAddReferences}
          onRemoveReference={handleRemoveReference}
          onGenerate={handleApplyEdits}
          isGenerating={isGenerating}
          generateDisabled={generateDisabled}
          variant={minWidth1280 ? "desktop" : "mobile"}
          placeholder={
            activeTool === "add"
              ? "Paint over the area to edit and describe your changes"
              : "Describe your edits"
          }
          generateAriaLabel="Apply edits"
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
            />
          </div>
        </div>
      ) : null}
      <PreviewExpandOverlay
        preview={expandedImagePreview}
        onClose={() => setExpandedImagePreview(null)}
      />
    </div>
  );
}
