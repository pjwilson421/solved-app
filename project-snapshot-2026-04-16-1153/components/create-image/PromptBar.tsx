"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { PromptBarShell } from "@/components/icons/PromptBarShell";
import { ICONS } from "@/components/icons/icon-paths";
import { useAppData } from "@/lib/app-data/app-data-context";
import { imageSrcFromFileEntry } from "@/components/files/image-editor-source";
import type { ReferenceFile } from "./types";

/** White glyph from raster SVG via mask (`IconAsset` is `<img>` — no `fill-current` on paths). */
function PromptBarMaskedIcon({
  src,
  size,
  className,
}: {
  src: string;
  size: number;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block shrink-0 fill-current bg-current text-inherit",
        className,
      )}
      style={{
        width: size,
        height: size,
        maskImage: `url("${src}")`,
        WebkitMaskImage: `url("${src}")`,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
    />
  );
}

/** Arrow artwork from `generate-button.svg` (paths only; circle removed). */
function PromptBarGenerateArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn(
        "block size-[22px] shrink-0 fill-current text-[#07195b]",
        className,
      )}
      viewBox="0 0 24 24"
      aria-hidden
    >
      <path d="M16.89,10.39h0c-.23-.23-.23-.59,0-.81l-4.49-4.19c-.23-.23-.59-.23-.81,0h0c-.23.23-.23.59,0,.81l4.49,4.19c.23.23.59.23.81,0Z" />
      <path d="M12,18.78h0c-.31,0-.57-.25-.57-.57V5.79c0-.31.25-.57.57-.57h0c.31,0,.57.25.57.57v12.41c0,.31-.25.57-.57.57h0Z" />
      <path d="M7.11,10.39h0c-.23-.23-.23-.59,0-.81l4.49-4.19c.23-.23.59-.23.81,0h0c.23.23.23.59,0,.81l-4.49,4.19c-.23.23-.59.23-.81,0Z" />
    </svg>
  );
}

type PromptBarProps = {
  prompt: string;
  onPromptChange: (v: string) => void;
  references: ReferenceFile[];
  onAddReferences: (files: FileList | null) => void;
  onRemoveReference: (id: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  generateDisabled: boolean;
  className?: string;
  variant?: "desktop" | "mobile";
  /** Input placeholder (default: image create copy). */
  placeholder?: string;
  /** Primary action button label (default: Generate). */
  generateAriaLabel?: string;
  /** When set, attached to the prompt textarea (desktop or mobile branch). */
  promptTextAreaRef?: RefObject<HTMLTextAreaElement | null>;
  /** Adds a catalog-backed reference file (used by desktop folder dropdown). */
  onAddCatalogReference?: (reference: ReferenceFile) => void;
};

export function PromptBar({
  prompt,
  onPromptChange,
  references,
  onAddReferences,
  onRemoveReference,
  onGenerate,
  isGenerating,
  generateDisabled,
  className,
  variant = "desktop",
  placeholder = "Describe your image…",
  generateAriaLabel = "Generate",
  promptTextAreaRef,
  onAddCatalogReference,
}: PromptBarProps) {
  const MIN_TEXTAREA_HEIGHT_PX = 24;
  const fileRef = useRef<HTMLInputElement>(null);
  const attachMenuRootRef = useRef<HTMLDivElement>(null);
  const desktopTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [filesPanelOpen, setFilesPanelOpen] = useState(false);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const isDesktop = variant === "desktop";
  const { fileEntries } = useAppData();

  const catalogAttachOptions = useMemo(
    () =>
      fileEntries
        .filter((entry) => entry.kind === "file" && entry.typeLabel === "Image")
        .map((entry) => {
          const url = imageSrcFromFileEntry(entry);
          if (!url) return null;
          return {
            id: entry.id,
            name: entry.name,
            url,
            typeLabel: entry.typeLabel,
          };
        })
        .filter((entry): entry is { id: string; name: string; url: string; typeLabel: string } => entry !== null),
    [fileEntries],
  );

  useEffect(() => {
    if (!attachMenuOpen && !filesPanelOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (!attachMenuRootRef.current?.contains(e.target as Node)) {
        setAttachMenuOpen(false);
        setFilesPanelOpen(false);
        setSelectedCatalogIds([]);
      }
    };
    const onDocKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setAttachMenuOpen(false);
        setFilesPanelOpen(false);
        setSelectedCatalogIds([]);
      }
    };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onDocKeyDown);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onDocKeyDown);
    };
  }, [attachMenuOpen, filesPanelOpen]);

  const autoResizeTextArea = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    if (el.value.length === 0) {
      el.style.height = `${MIN_TEXTAREA_HEIGHT_PX}px`;
      return;
    }
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, MIN_TEXTAREA_HEIGHT_PX)}px`;
  }, []);

  useEffect(() => {
    autoResizeTextArea(isDesktop ? desktopTextAreaRef.current : mobileTextAreaRef.current);
  }, [autoResizeTextArea, isDesktop, prompt]);

  const setDesktopTextAreaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      desktopTextAreaRef.current = el;
      autoResizeTextArea(el);
      if (promptTextAreaRef) {
        promptTextAreaRef.current = el;
      }
    },
    [autoResizeTextArea, promptTextAreaRef],
  );

  const setMobileTextAreaRef = useCallback(
    (el: HTMLTextAreaElement | null) => {
      mobileTextAreaRef.current = el;
      autoResizeTextArea(el);
      if (promptTextAreaRef) {
        promptTextAreaRef.current = el;
      }
    },
    [autoResizeTextArea, promptTextAreaRef],
  );

  const generateBtn = (
    <button
      type="submit"
      suppressHydrationWarning
      disabled={generateDisabled || isGenerating}
      className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 p-0 opacity-100 transition-opacity hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-100"
      aria-label={generateAriaLabel}
    >
      {isGenerating ? (
        isDesktop ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#22c55e]">
            <span
              className="h-4 w-4 shrink-0 rounded-full bg-white/90 animate-pulse"
              aria-hidden
            />
          </span>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#22c55e]">
            <span
              className="h-4 w-4 shrink-0 rounded-full bg-white/90 animate-pulse"
              aria-hidden
            />
          </span>
        )
      ) : (
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#22c55e] text-white",
            "transition-[filter] duration-150 ease-out",
            !generateDisabled &&
              "group-hover:brightness-110 group-active:brightness-95",
          )}
        >
          <span className="inline-flex origin-center scale-[2] leading-none">
            <PromptBarGenerateArrowIcon />
          </span>
        </span>
      )}
    </button>
  );

  const fileInput = (
    <input
      ref={fileRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple
      className="hidden"
      onChange={(e) => {
        onAddReferences(e.target.files);
        e.target.value = "";
      }}
    />
  );

  const submitGenerate = () => {
    if (generateDisabled || isGenerating) return;
    void Promise.resolve(onGenerate()).catch((err: unknown) => {
      console.error("[PromptBar] Generate action failed:", err);
    });
  };

  const makeReferenceId = useCallback((seed: string) => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `${seed}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  const handleAttachCatalogFiles = useCallback(
    (options: Array<{ id: string; name: string; url: string }>) => {
      for (const option of options) {
        onAddCatalogReference?.({
          id: makeReferenceId(option.id),
          name: option.name,
          url: option.url,
        });
      }
      setAttachMenuOpen(false);
      setFilesPanelOpen(false);
      setSelectedCatalogIds([]);
    },
    [makeReferenceId, onAddCatalogReference],
  );

  const selectedCatalogOptions = useMemo(() => {
    const selected = new Set(selectedCatalogIds);
    return catalogAttachOptions.filter((option) => selected.has(option.id));
  }, [catalogAttachOptions, selectedCatalogIds]);

  const handleToggleCatalogSelection = useCallback((id: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  }, []);

  const controlsRow =
    <form
      suppressHydrationWarning
      className={cn(
        "flex h-full w-full min-h-0 min-w-0 flex-nowrap items-center",
        isDesktop ? "gap-2 lg:gap-[10px]" : "gap-3",
      )}
      onSubmit={(e) => {
        e.preventDefault();
        submitGenerate();
      }}
    >
      {fileInput}
      {isDesktop ? (
        <div ref={attachMenuRootRef} className="relative shrink-0">
          <button
            type="button"
            suppressHydrationWarning
            onClick={() => {
              setFilesPanelOpen(false);
              setSelectedCatalogIds([]);
              setAttachMenuOpen((open) => !open);
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-rail-navy p-0 text-white transition-opacity hover:opacity-70"
            aria-label="Add reference images"
            aria-haspopup="menu"
            aria-expanded={attachMenuOpen || filesPanelOpen}
          >
            <PromptBarMaskedIcon src={ICONS.attachPrompt} size={28} />
          </button>

          {attachMenuOpen ? (
            <div
              role="menu"
              className="absolute bottom-full left-0 z-[1300] mb-2 w-[220px] max-w-[min(80vw,320px)]"
            >
              <div className="rounded-xl border border-edge-subtle bg-surface-card p-1.5 shadow-xl">
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center rounded-full px-3 py-2 text-left text-[11px] text-white transition-colors hover:bg-[#0d1d45] focus-visible:bg-[#0d1d45]"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    fileRef.current?.click();
                  }}
                >
                  Upload from computer
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center rounded-full px-3 py-2 text-left text-[11px] text-white transition-colors hover:bg-[#0d1d45] focus-visible:bg-[#0d1d45]"
                  onClick={() => {
                    setAttachMenuOpen(false);
                    setSelectedCatalogIds([]);
                    setFilesPanelOpen(true);
                  }}
                >
                  Attach from files
                </button>
              </div>
            </div>
          ) : null}

          {filesPanelOpen ? (
            <div className="absolute bottom-full left-0 z-[1300] mb-2 w-[320px] max-w-[min(92vw,420px)]">
              <div className="rounded-xl border border-edge-subtle bg-surface-card p-1.5 shadow-xl">
                <div className="max-h-[260px] overflow-y-auto">
                  {catalogAttachOptions.length === 0 ? (
                    <p className="px-3 py-2 text-[11px] text-tx-secondary">
                      No compatible files available
                    </p>
                  ) : (
                    catalogAttachOptions.map((option) => {
                      const isSelected = selectedCatalogIds.includes(option.id);
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={cn(
                            "flex w-full items-center justify-between gap-2 rounded-full px-3 py-2 text-left text-[11px] text-white transition-colors hover:bg-[#0d1d45] focus-visible:bg-[#0d1d45]",
                            isSelected && "bg-[#0d1d45]",
                          )}
                          onClick={() => handleToggleCatalogSelection(option.id)}
                          aria-pressed={isSelected}
                        >
                          <span className="min-w-0 flex-1 truncate">{option.name}</span>
                          <span className="shrink-0 text-[10px] text-white/60">
                            {option.typeLabel}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>

                <div className="mt-1.5 flex items-center justify-end gap-2 px-1">
                  <button
                    type="button"
                    className="rounded-full px-3 py-1.5 text-[11px] text-tx-secondary transition-colors hover:bg-[#0d1d45] hover:text-white"
                    onClick={() => {
                      setFilesPanelOpen(false);
                      setSelectedCatalogIds([]);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="rounded-full bg-[#0d1d45] px-3 py-1.5 text-[11px] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={selectedCatalogOptions.length === 0}
                    onClick={() => handleAttachCatalogFiles(selectedCatalogOptions)}
                  >
                    Select
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          suppressHydrationWarning
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-rail-navy p-0 text-white transition-opacity hover:opacity-70"
          aria-label="Add reference images"
        >
          <PromptBarMaskedIcon src={ICONS.attachPrompt} size={28} />
        </button>
      )}
      <div className="relative flex min-h-0 min-w-0 flex-1 items-center self-stretch">
        {isDesktop && prompt.length === 0 ? (
          <span
            aria-hidden
            className="pointer-events-none absolute left-1.5 right-0 top-1/2 -translate-y-1/2 truncate text-[16px] leading-6 text-white/50"
          >
            {placeholder}
          </span>
        ) : null}
        <textarea
          suppressHydrationWarning
          ref={isDesktop ? setDesktopTextAreaRef : setMobileTextAreaRef}
          readOnly={false}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onInput={(e) => autoResizeTextArea(e.currentTarget)}
          onKeyDown={(e) => {
            const isEnter = e.key === "Enter" || e.key === "NumpadEnter";
            if (!isEnter || e.shiftKey) return;
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            submitGenerate();
          }}
          placeholder={placeholder}
          rows={1}
          style={{ minHeight: MIN_TEXTAREA_HEIGHT_PX, height: MIN_TEXTAREA_HEIGHT_PX }}
          className={cn(
            "block min-w-0 flex-1 self-center resize-none overflow-hidden rounded-none border-0 bg-transparent px-1.5 text-[16px] text-[#ffffff] !text-[#ffffff] caret-[#ffffff] [-webkit-text-fill-color:#ffffff] placeholder:text-white/50 pointer-events-auto cursor-text outline-none focus:outline-none focus:ring-0",
            isDesktop
              ? "h-full py-0 leading-normal placeholder:opacity-0 placeholder:leading-normal"
              : "py-2 leading-6 placeholder:opacity-100 placeholder:leading-6",
          )}
        />
      </div>
      <div className="flex shrink-0 pl-0.5">{generateBtn}</div>
    </form>;

  const referenceThumbs =
    references.length > 0 ? (
      <div className="mb-2 flex flex-wrap gap-1.5">
        {references.map((r) => (
          <div
            key={r.id}
            className="relative h-11 w-11 overflow-hidden rounded-md border border-edge-subtle/40 bg-app-bg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveReference(r.id)}
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-app-bg text-[9px] text-white"
              aria-label="Remove reference"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    ) : null;

  return (
    <div className={cn(className)}>
      {referenceThumbs}
      <PromptBarShell
        variant={variant}
        allowDesktopOverflowVisible={isDesktop}
      >
        {controlsRow}
      </PromptBarShell>
    </div>
  );
}
