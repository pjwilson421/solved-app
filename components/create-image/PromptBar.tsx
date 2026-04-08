"use client";

import { useRef, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { PromptBarShell } from "@/components/icons/PromptBarShell";
import { ICONS } from "@/components/icons/icon-paths";
import type { ReferenceFile } from "./types";

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
      type="button"
      onClick={onGenerate}
      disabled={generateDisabled || isGenerating}
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-action border-0 p-0 opacity-100 disabled:opacity-100",
        generateDisabled || isGenerating ? "cursor-not-allowed" : "",
      )}
      aria-label={generateAriaLabel}
    >
      {isGenerating ? (
        isDesktop ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-action bg-[#3ABEFF]">
            <span className="h-4 w-4 animate-spin rounded-action border-2 border-white border-t-transparent" />
          </span>
        ) : (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-action bg-[#3ABEFF]">
            <span className="h-4 w-4 animate-spin rounded-action border-2 border-white border-t-transparent" />
          </span>
        )
      ) : (
        <IconAsset
          src={ICONS.generateButton}
          size={40}
          className="h-10 w-10 shrink-0"
        />
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

  const controlsRow =
    variant === "desktop" ? (
      <div className="flex w-full min-h-0 min-w-0 flex-nowrap items-center gap-2 lg:gap-[10px]">
        {fileInput}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-action border-0 bg-app-canvas p-0 transition-opacity hover:opacity-90"
          aria-label="Add reference images"
        >
          <IconAsset src={ICONS.attachPrompt} size={28} />
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
            if (!generateDisabled && !isGenerating) onGenerate();
          }}
          placeholder={placeholder}
          rows={1}
          className="m-0 box-border block h-10 min-h-10 max-h-10 min-w-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-0 text-[16px] leading-10 text-[#3ABEFF] caret-[#3ABEFF] [padding-block:0] placeholder:text-[#3ABEFF] placeholder:leading-10 outline-none focus:outline-none focus:ring-0"
        />
        <div className="ml-auto flex shrink-0 items-center pl-1">{generateBtn}</div>
      </div>
    ) : (
      <div className="flex w-full items-center gap-3">
        {fileInput}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-action border-0 bg-app-canvas p-0 transition-opacity hover:opacity-90"
          aria-label="Add reference images"
        >
          <IconAsset src={ICONS.attachPrompt} size={28} />
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
            if (!generateDisabled && !isGenerating) onGenerate();
          }}
          placeholder={placeholder}
          rows={1}
          className="min-h-11 max-h-11 min-w-0 flex-1 resize-none rounded-control border-0 bg-transparent px-1.5 py-0 text-[16px] leading-11 text-[#3ABEFF] caret-[#3ABEFF] [padding-block:0] placeholder:text-[#3ABEFF] placeholder:leading-11 outline-none focus:outline-none focus:ring-0"
        />
        <div className="flex shrink-0 pl-0.5">{generateBtn}</div>
      </div>
    );

  const referenceThumbs =
    references.length > 0 ? (
      <div className="mb-2 flex flex-wrap gap-1.5">
        {references.map((r) => (
          <div
            key={r.id}
            className="relative h-11 w-11 overflow-hidden rounded-card border border-app-border/40 bg-app-canvas"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={r.url} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onRemoveReference(r.id)}
              className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-action bg-app-canvas text-[9px] text-white"
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
