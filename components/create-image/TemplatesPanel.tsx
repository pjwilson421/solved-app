"use client";

import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import type { TemplateDef } from "./types";

type TemplatesPanelProps = {
  templates: TemplateDef[];
  selectedId: string | null;
  open: boolean;
  onToggle: () => void;
  onSelect: (id: string | null) => void;
  className?: string;
};

export function TemplatesPanel({
  templates,
  selectedId,
  open,
  onToggle,
  onSelect,
  className,
}: TemplatesPanelProps) {
  return (
    <div className={cn("w-full", className)}>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 items-center gap-2 rounded-control bg-surface-hover px-3 text-[11px] font-normal text-white transition-colors hover:bg-surface-pressed"
      >
        <IconAsset src={ICONS.templates} size={16} className="opacity-90" />
        Templates
        <span className="text-tx-muted">{open ? "▴" : "▾"}</span>
      </button>
      {open ? (
        <div className="mt-3 flex flex-wrap gap-[17px]">
          <button
            type="button"
            onClick={() => onSelect(null)}
            className={cn(
              "flex h-[64px] w-[92px] shrink-0 items-center justify-center rounded-card border border-edge-default bg-surface-panel text-[10px] text-tx-muted transition-colors hover:border-edge-strong",
              selectedId === null &&
                "border-edge-strong bg-surface-elevated text-white",
            )}
          >
            None
          </button>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "group flex h-[64px] w-[92px] shrink-0 flex-col overflow-hidden rounded-card border border-edge-default transition-colors hover:border-edge-strong",
                selectedId === t.id && "border-primary",
              )}
            >
              <div
                className={cn(
                  "h-[48px] w-full bg-gradient-to-br",
                  t.thumbnailGradient,
                )}
              />
              <span className="truncate bg-input-bg px-1 py-0.5 text-center text-[9px] text-tx-muted group-hover:text-white">
                {t.name}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
