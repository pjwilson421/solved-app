"use client";

import { useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { PromptBarShell } from "@/components/icons/PromptBarShell";
import { ICONS } from "@/components/icons/icon-paths";
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
  placeholder = "Describe your image",
  generateAriaLabel = "Generate",
  promptTextAreaRef,
}: PromptBarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const isDesktop = variant === "desktop";

  const generateBtn = (
    <button
      type="submit"
      disabled={generateDisabled || isGenerating}
      className={cn(
        "group flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 p-0 opacity-100 disabled:opacity-100",
        generateDisabled || isGenerating ? "cursor-not-allowed" : "",
      )}
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

  const controlsRow =
    variant === "desktop" ? (
      <form
        className="flex w-full min-h-0 min-w-0 flex-nowrap items-center gap-2 lg:gap-[10px]"
        onSubmit={(e) => {
          e.preventDefault();
          submitGenerate();
        }}
      >
        {fileInput}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-rail-navy p-0 text-white transition-opacity hover:opacity-90"
          aria-label="Add reference images"
        >
          <PromptBarMaskedIcon src={ICONS.attachPrompt} size={28} />
        </button>
        <textarea
          ref={isDesktop ? promptTextAreaRef : undefined}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            const isEnter = e.key === "Enter" || e.key === "NumpadEnter";
            if (!isEnter || e.shiftKey) return;
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            submitGenerate();
          }}
          placeholder={placeholder}
          rows={1}
          className="m-0 box-border block h-10 min-h-10 max-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-0 text-[16px] leading-10 text-[#ffffff] [padding-block:0] placeholder:text-white/50 placeholder:leading-10 outline-none focus:outline-none focus:ring-0"
        />
        <div className="ml-auto flex shrink-0 items-center pl-1">{generateBtn}</div>
      </form>
    ) : (
      <form
        className="flex w-full items-center gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          submitGenerate();
        }}
      >
        {fileInput}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-rail-navy p-0 text-white transition-opacity hover:opacity-90"
          aria-label="Add reference images"
        >
          <PromptBarMaskedIcon src={ICONS.attachPrompt} size={28} />
        </button>
        <textarea
          ref={isDesktop ? undefined : promptTextAreaRef}
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          onKeyDown={(e) => {
            const isEnter = e.key === "Enter" || e.key === "NumpadEnter";
            if (!isEnter || e.shiftKey) return;
            if (e.nativeEvent.isComposing) return;
            e.preventDefault();
            submitGenerate();
          }}
          placeholder={placeholder}
          rows={1}
          className="min-h-11 max-h-11 min-w-0 flex-1 resize-none rounded-none border-0 bg-transparent px-1.5 py-0 text-[16px] leading-11 text-[#ffffff] [padding-block:0] placeholder:text-white/50 placeholder:leading-11 outline-none focus:outline-none focus:ring-0"
        />
        <div className="flex shrink-0 pl-0.5">{generateBtn}</div>
      </form>
    );

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
      <PromptBarShell variant={variant}>{controlsRow}</PromptBarShell>
    </div>
  );
}
