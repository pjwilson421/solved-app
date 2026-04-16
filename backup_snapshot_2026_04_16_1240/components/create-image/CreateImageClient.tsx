"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
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
import type { PreviewMenuEvent } from "./preview-menu-config";
import { FixedPromptBarDock } from "./FixedPromptBarDock";
import { DesktopThreeColumnShell } from "@/components/shell/DesktopThreeColumnShell";
import { cn } from "@/lib/utils";
import { useShellNav } from "@/lib/use-shell-nav";
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
  writePendingEditorImage,
  type EditorHandoffMode,
} from "@/lib/create-image/pending-editor-image";
import {
  COPY_LINK_SUCCESS_EVENT,
  handleShareTarget,
} from "@/lib/share/web-share";
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

type ExpandedImagePreview = {
  src: string;
  title: string;
};

function CreateImageExpandOverlay({
  preview,
  onClose,
}: {
  preview: ExpandedImagePreview | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!preview) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [preview, onClose]);

  if (!preview) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1600] bg-black"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${preview.title}`}
      onClick={onClose}
    >
      <div className="absolute inset-0 flex items-center justify-center p-[2vh]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={preview.src}
          alt=""
          className="block h-auto max-h-[96vh] w-auto max-w-[96vw] object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur-sm">
          <p className="min-w-0 truncate text-left text-[13px] font-medium text-white drop-shadow-sm">
            {preview.title}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className={cn(
            "pointer-events-auto shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium text-tx-secondary",
            "border border-edge-subtle bg-panel-bg transition-colors hover:bg-panel-hover hover:text-white",
          )}
        >
          Close
        </button>
      </div>
    </div>,
    document.body,
  );
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

async function makePersistableThumbnail(url: string): Promise<string | undefined> {
  if (!/^data:/i.test(url)) return url;
  if (typeof window === "undefined") return undefined;
  try {
    const img = new window.Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("thumbnail decode failed"));
    });
    img.src = url;
    await loaded;

    const sourceW = Math.max(1, img.naturalWidth || 1);
    const sourceH = Math.max(1, img.naturalHeight || 1);
    const maxEdge = 560;
    const scale = Math.min(1, maxEdge / Math.max(sourceW, sourceH));
    const targetW = Math.max(1, Math.round(sourceW * scale));
    const targetH = Math.max(1, Math.round(sourceH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}

export function CreateImageClient() {
  const router = useRouter();
  const { navigate, activeMainNav } = useShellNav();
  const { toggle: toggleLiked, isLiked } = useLikedItems();
  const { deleteCatalogItem } = useAppItemActions();
  const {
    activityEntries,
    updateActivityEntries,
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
  const [displayAspectRatio, setDisplayAspectRatio] =
    useState<AspectRatio>("16:9");
  const [displayQuality, setDisplayQuality] = useState<Quality>("4K");
  const [displayVariations, setDisplayVariations] = useState(1);
  const [expandedImagePreview, setExpandedImagePreview] =
    useState<ExpandedImagePreview | null>(null);

  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const hasDisplayedGeneration = useMemo(() => {
    if (activeHistoryId != null) return true;
    return slotImages.some((u) => typeof u === "string" && u.length > 0);
  }, [activeHistoryId, slotImages]);

  /** Preview frame: follow live settings until output exists; then lock to last generation / history. */
  const previewAspectRatio = hasDisplayedGeneration
    ? displayAspectRatio
    : aspectRatio;

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
  const [copyLinkNotice, setCopyLinkNotice] = useState(false);
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
    aspectRatio: previewAspectRatio,
    templatesOpen: templatesMenuOpen,
    previewLayoutIgnoreTemplatesOpen: true,
    previewLayoutIgnoreTemplatesOpenOnDesktopXl: true,
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

  const activeEntry = useMemo(
    () =>
      activeHistoryId
        ? activityEntries.find((e) => e.id === activeHistoryId) ?? null
        : null,
    [activityEntries, activeHistoryId],
  );

  const mainBestUrl = useMemo(() => {
    const fromEntry = activeEntry
      ? bestImageUrlForEntry(activeEntry)
      : undefined;
    if (fromEntry) return fromEntry;
    return displaySlots.find((u) => typeof u === "string" && u.length > 0);
  }, [activeEntry, displaySlots]);

  useEffect(() => {
    let clearTimer = 0;
    function onCopy() {
      window.clearTimeout(clearTimer);
      setCopyLinkNotice(true);
      clearTimer = window.setTimeout(() => setCopyLinkNotice(false), 2200);
    }
    window.addEventListener(COPY_LINK_SUCCESS_EVENT, onCopy);
    return () => {
      window.removeEventListener(COPY_LINK_SUCCESS_EVENT, onCopy);
      window.clearTimeout(clearTimer);
    };
  }, []);

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
      const thumbnailUrls = await Promise.all(
        urls.map((url) => makePersistableThumbnail(url)),
      );
      const batchId = uid();
      const createdAt = new Date();
      const promptText = trimmed || "(reference only)";
      const subtitle =
        promptText.length > 120 ? `${promptText.slice(0, 117)}…` : promptText;

      const existingImageCount = activityEntries.filter(
        (e) => e.kind === "image" && e.origin === "generated-image",
      ).length;
      const activities: ActivityHistoryEntry[] = urls.map((url, idx) => {
        const sequenceNum = String(existingImageCount + idx + 1).padStart(2, "0");
        const thumbnailUrl = thumbnailUrls[idx] ?? undefined;
        return {
          id: `${batchId}-${idx + 1}`,
          kind: "image",
          type: "image",
          title: `image-${sequenceNum}.jpg`,
          subtitle,
          occurredAt: new Date(createdAt.getTime() + idx),
          promptText,
          ...(thumbnailUrl ? { thumbnailUrl } : {}),
          imageUrl: url,
          fullResolutionUrl: url,
          imageUrls: [url],
          aspectRatio,
          resolution: quality,
          origin: "generated-image",
        };
      });
      updateActivityEntries((prev) => [...activities, ...prev]);

      setActiveHistoryId(activities[0]?.id ?? null);
      setPreviewPrompt(promptText);
      setPreviewAt(createdAt);
      setSlotImages(urls);
      setSlotFileIds([]);
      setDisplayAspectRatio(aspectRatio);
      setDisplayQuality(quality);
      setDisplayVariations(variations);
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
      setSlotFileIds(fileIdsForImageUrls(fileEntries, urls));
      setDisplayAspectRatio(item.aspectRatio ?? aspectRatio);
      setDisplayQuality(item.resolution ?? quality);
      setDisplayVariations(Math.max(1, urls.length));
      setBarPrompt(promptRestore);
    },
    [activityEntries, aspectRatio, fileEntries, quality],
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

  const handlePreviewClick = useCallback(() => {
    openImageEditorHandoff("edit", mainBestUrl, {
      entry: activeEntry,
      activityId: activeHistoryId,
      fileId: firstDisplaySlotFileId(displaySlots, slotFileIds) ?? null,
    });
  }, [
    mainBestUrl,
    openImageEditorHandoff,
    activeEntry,
    activeHistoryId,
    displaySlots,
    slotFileIds,
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

  const handlePreviewMenu = useCallback(
    (e: PreviewMenuEvent) => {
      const url = mainBestUrl;
      const at = activeEntry?.occurredAt ?? previewAt;

      switch (e.type) {
        case "expand":
          if (activeEntry) {
            const fullSrc = bestFullscreenImageUrlForEntry(activeEntry);
            if (fullSrc) {
              setExpandedImagePreview({
                src: fullSrc,
                title: activeEntry.title,
              });
            }
          } else if (url) {
            setExpandedImagePreview({
              src: url,
              title: previewPrompt.trim() || "Image",
            });
          }
          break;
        case "download":
          if (url) void downloadImageFromUrl(url, at);
          break;
        case "share":
          if (url) {
            void handleShareTarget(e.target, {
              imageUrl: url,
              shareableHttpUrl: pickShareableHttpUrl(activeEntry, url),
              offerManualDownload: () => downloadImageFromUrl(url, at),
            });
          }
          break;
        case "edit-image":
          openImageEditorHandoff("edit", url, {
            entry: activeEntry,
            activityId: activeHistoryId,
            fileId: firstDisplaySlotFileId(displaySlots, slotFileIds) ?? null,
          });
          break;
        case "upscale":
          openImageEditorHandoff("upscale", url, {
            entry: activeEntry,
            activityId: activeHistoryId,
            fileId: firstDisplaySlotFileId(displaySlots, slotFileIds) ?? null,
          });
          break;
        case "like":
          if (activeHistoryId) toggleLiked(likedKey.activity(activeHistoryId));
          break;
        case "delete":
          if (activeHistoryId) {
            deleteCatalogItem(appItemRef.activity(activeHistoryId));
          }
          setSlotImages([]);
          setSlotFileIds([]);
          setPreviewPrompt("");
          setPreviewAt(null);
          setActiveHistoryId(null);
          setDisplayAspectRatio(aspectRatio);
          setDisplayQuality(quality);
          setDisplayVariations(variations);
          break;
        case "save":
          break;
        default:
          break;
      }
    },
    [
      activeEntry?.occurredAt,
      activeHistoryId,
      deleteCatalogItem,
      mainBestUrl,
      displaySlots,
      openImageEditorHandoff,
      previewAt,
      previewPrompt,
      slotFileIds,
      toggleLiked,
    ],
  );

  const handleHistoryMenu = useCallback(
    (itemId: string, e: PreviewMenuEvent) => {
      const entry = activityEntries.find((a) => a.id === itemId);
      const url =
        entry != null ? bestImageUrlForEntry(entry) : undefined;
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
            setSlotFileIds([]);
            setPreviewPrompt("");
            setPreviewAt(null);
            setDisplayAspectRatio(aspectRatio);
            setDisplayQuality(quality);
            setDisplayVariations(variations);
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
      deleteCatalogItem,
      fileEntries,
      openImageEditorHandoff,
      toggleLiked,
    ],
  );

  const historyMenuLikeActive = useCallback(
    (id: string) => isLiked(likedKey.activity(id)),
    [isLiked],
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
              onMenuEvent={handleHistoryMenu}
              previewMenuLikeActive={historyMenuLikeActive}
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
                      aspectRatio={previewAspectRatio}
                      template={template}
                      slotImages={displaySlots}
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      promptDescriptionAnchoredToPreview
                      onPreviewClick={handlePreviewClick}
                      onMenuEvent={handlePreviewMenu}
                      previewMenuLikeActive={
                        activeHistoryId != null &&
                        isLiked(likedKey.activity(activeHistoryId))
                      }
                      imageObjectFit="cover"
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
                      aspectRatio={previewAspectRatio}
                      template={template}
                      slotImages={displaySlots}
                      promptText={previewPrompt}
                      createdAt={previewAt}
                      isLoading={isGenerating}
                      layoutFrame={layoutFrame}
                      promptDescriptionAnchoredToPreview
                      onPreviewClick={handlePreviewClick}
                      onMenuEvent={handlePreviewMenu}
                      previewMenuLikeActive={
                        activeHistoryId != null &&
                        isLiked(likedKey.activity(activeHistoryId))
                      }
                      imageObjectFit="cover"
                      afterPreviewStack={templatesAfterPreviewStack}
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

      {copyLinkNotice ? (
        <div
          className="pointer-events-none fixed bottom-28 left-1/2 z-[2000] -translate-x-1/2 rounded-lg border border-edge-subtle bg-surface-card px-3 py-2 text-[11px] text-white shadow-xl"
          role="status"
        >
          Link copied
        </div>
      ) : null}
      <CreateImageExpandOverlay
        preview={expandedImagePreview}
        onClose={() => setExpandedImagePreview(null)}
      />
    </div>
  );
}
