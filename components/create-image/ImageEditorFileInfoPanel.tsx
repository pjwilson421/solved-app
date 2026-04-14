"use client";

import { useId, useState } from "react";
import {
  historyPanelRailDesktopTitleAreaWrapperClassName,
  historyPanelRailHeaderButtonClassName,
  historyPanelRailInnerClassName,
  historyPanelRailTitleRowClassName,
  historyPanelRailTitleSurfaceClassName,
  historyPanelRailTitleToggleLabelClassName,
  historyPanelRightRailUnifiedShellClassName,
  historyPanelRightRailUnifiedShellCollapsedClassName,
  railHistoryDropdownPanelSurfaceClassName,
  RightRailPanelChevron,
} from "@/components/ui/right-rail-collapsible";
import { cn } from "@/lib/utils";
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
};

/** Selected tab only: solid pill `#07195B` (desktop right rail). Unselected: transparent + light hover. */
function fileInfoTabClass(tab: FileInfoTab, activeTab: FileInfoTab) {
  const isSelected = activeTab === tab;
  return cn(
    "shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium leading-none text-white outline-none transition-[background-color] duration-150 ease-out",
    isSelected ? "bg-[#07195b]" : "bg-transparent hover:bg-white/12",
  );
}

/**
 * Image Editor right rail — same outer shell / flex chain / gray panel geometry as
 * {@link ChatHistoryPanel} (dock bottom aligns with prompt bar via shared `DesktopSideRail`).
 */
export function ImageEditorFileInfoPanel({
  activeTab,
  onTabChange,
  promptPreview,
  aspectRatio,
  quality,
  variations,
  className,
}: ImageEditorFileInfoPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const bodyId = useId();

  return (
    <aside
      className={cn(
        "flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden bg-app-bg xl:w-[300px]",
        className,
      )}
    >
      <div
        className={cn(
          historyPanelRailInnerClassName,
          "flex min-h-0 min-w-0 flex-1 flex-col",
        )}
      >
        <div
          className={cn(
            expanded
              ? historyPanelRightRailUnifiedShellClassName
              : historyPanelRightRailUnifiedShellCollapsedClassName,
            "relative z-[1]",
          )}
        >
          <div className={historyPanelRailDesktopTitleAreaWrapperClassName}>
            <div className={historyPanelRailTitleRowClassName}>
              <div
                className={cn(
                  historyPanelRailTitleSurfaceClassName,
                  "w-full min-w-0",
                )}
              >
                <button
                  type="button"
                  id={`${bodyId}-toggle`}
                  aria-expanded={expanded}
                  aria-controls={expanded ? bodyId : undefined}
                  onClick={() => setExpanded((v) => !v)}
                  className={historyPanelRailHeaderButtonClassName}
                >
                  <span className={historyPanelRailTitleToggleLabelClassName}>
                    FILE INFORMATION
                  </span>
                  <RightRailPanelChevron expanded={expanded} />
                </button>
              </div>
            </div>
          </div>

          {expanded ? (
            <div
              id={bodyId}
              role="region"
              aria-labelledby={`${bodyId}-toggle`}
              className={cn(
                "relative z-10 min-h-0 flex-1",
                railHistoryDropdownPanelSurfaceClassName,
              )}
            >
              <div className="min-h-0 flex-1 overflow-y-auto">
                <div className="mt-3 flex gap-2 px-4">
                  <button
                    type="button"
                    className={fileInfoTabClass("prompt", activeTab)}
                    onClick={() => onTabChange("prompt")}
                  >
                    Prompt
                  </button>
                  <button
                    type="button"
                    className={fileInfoTabClass("settings", activeTab)}
                    onClick={() => onTabChange("settings")}
                  >
                    Settings
                  </button>
                </div>
                <div className="mt-4 px-4">
                  {activeTab === "prompt" ? (
                    <p className="text-left text-[11px] leading-[18px] text-white">
                      {promptPreview.trim()
                        ? promptPreview
                        : "Edits you describe in the prompt bar will appear here."}
                    </p>
                  ) : (
                    <ul className="space-y-2 text-left text-[11px] leading-[18px] text-white">
                      <li>Aspect {aspectRatio}</li>
                      <li>Quality {quality}</li>
                      <li>Variations {variations}</li>
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
