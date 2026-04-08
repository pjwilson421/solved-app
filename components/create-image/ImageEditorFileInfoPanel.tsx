"use client";

import { cn } from "@/lib/utils";
import { SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX } from "./preview-frame-layout";
import type { AspectRatio, Quality } from "./types";

type FileInfoTab = "prompt" | "settings";

type ImageEditorFileInfoPanelProps = {
  activeTab: FileInfoTab;
  onTabChange: (t: FileInfoTab) => void;
  promptPreview: string;
  aspectRatio: AspectRatio;
  quality: Quality;
  variations: number;
  className?: string;
  /** Optional override so right rail can align to a page-specific prompt dock. */
  fixedDockClearancePx?: number;
};

const tabBtn = (active: boolean) =>
  cn(
    "rounded-menu-item px-3 py-1.5 text-[11px] font-medium leading-none transition-colors",
    active
      ? "bg-[#3ABEFF] text-white"
      : "bg-app-inset text-[#A1A1AA] hover:bg-app-elevated hover:text-white",
  );

export function ImageEditorFileInfoPanel({
  activeTab,
  onTabChange,
  promptPreview,
  aspectRatio,
  quality,
  variations,
  className,
  fixedDockClearancePx,
}: ImageEditorFileInfoPanelProps) {
  const bottomClearancePx =
    fixedDockClearancePx ?? SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX;

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 w-[300px] shrink-0 flex-col self-start bg-app-canvas",
        className,
      )}
      style={{
        height: `calc(100% - ${bottomClearancePx}px)`,
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-0 pl-5 pr-5 pt-6">
        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            "w-full rounded-panel border border-app-border bg-app-card",
            "py-4",
          )}
        >
          <h2 className="px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
            File information
          </h2>
          <div className="mt-3 flex gap-2 px-4">
            <button
              type="button"
              className={tabBtn(activeTab === "prompt")}
              onClick={() => onTabChange("prompt")}
            >
              Prompt
            </button>
            <button
              type="button"
              className={tabBtn(activeTab === "settings")}
              onClick={() => onTabChange("settings")}
            >
              Settings
            </button>
          </div>
          <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4">
            {activeTab === "prompt" ? (
              <p className="text-left text-[11px] leading-[18px] text-[#A1A1AA]">
                {promptPreview.trim()
                  ? promptPreview
                  : "Edits you describe in the prompt bar will appear here."}
              </p>
            ) : (
              <ul className="space-y-2 text-left text-[11px] leading-[18px] text-[#A1A1AA]">
                <li>
                  <span className="text-[#71717A]">Aspect </span>
                  {aspectRatio}
                </li>
                <li>
                  <span className="text-[#71717A]">Quality </span>
                  {quality}
                </li>
                <li>
                  <span className="text-[#71717A]">Variations </span>
                  {variations}
                </li>
              </ul>
            )}
          </div>
        </section>
      </div>
    </aside>
  );
}
