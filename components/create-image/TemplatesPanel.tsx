"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP } from "./settings-dropdown";
import { FRAME_SLOT_ROUNDED } from "./layout-tokens";
import type { TemplateDef } from "./types";

/** Create Image: outlined / filled blue pill; other pages keep legacy styling. */
function TemplatesToggleIconMasked() {
  const src = ICONS.templates;
  return (
    <span
      aria-hidden
      className="inline-block size-4 shrink-0 fill-current bg-current text-inherit"
      style={{
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

type TemplatesPanelProps = {
  templates: TemplateDef[];
  selectedId: string | null;
  /** Ignored when `hoverClickMenuDualMode` (Create Image: internal hover + pinned state). */
  open?: boolean;
  /** Click to toggle open (default). Omit when `openMode="hover"`. */
  onToggle?: () => void;
  /** Used with `openMode="hover"` to sync open state with parent (not used in dual mode). */
  onOpenChange?: (next: boolean) => void;
  /** Create Image: open/close from pointer in button + panel area. */
  openMode?: "toggle" | "hover";
  onSelect: (id: string | null) => void;
  className?: string;
  /** xl+: when `open`, show this instead of the wrap grid (horizontal strip). */
  desktopExpandedSlot?: ReactNode;
  /**
   * Create Image: blue outline default, filled blue + dark text/icon on hover
   * and while `open` (toggle selected). Other callers omit for legacy styles.
   */
  toggleButtonPreset?: "default" | "create-image";
  /** Create Image: template preview chips use solid #315790 instead of gradients. */
  menuThumbPreset?: "default" | "create-image";
  /**
   * With `toggleButtonPreset="create-image"`: when true, the open menu is in normal flow
   * (pushes content below). When false (default), the menu overlays (`absolute`) — Create Image.
   */
  stackTemplatesMenuInLayout?: boolean;
  /**
   * Create Image (overlay) or Edit Image (stacked): hover opens temporarily; click pins until
   * outside click or second click. When set, `open` / `onOpenChange` are not used.
   */
  hoverClickMenuDualMode?: boolean;
  /**
   * Create Image overlay only: anchor the menu above the trigger (`bottom-full`) so it does not
   * push layout downward. Ignored when not overlay mode.
   */
  templatesMenuOpensAbove?: boolean;
  /** Fired when the template menu open state changes (hover/pin/toggle). */
  onMenuVisibilityChange?: (visible: boolean) => void;
};

export function TemplatesPanel({
  templates,
  selectedId,
  open = false,
  onToggle,
  onOpenChange,
  openMode = "toggle",
  onSelect,
  className,
  desktopExpandedSlot,
  toggleButtonPreset = "default",
  menuThumbPreset = "default",
  stackTemplatesMenuInLayout = false,
  hoverClickMenuDualMode = false,
  templatesMenuOpensAbove = false,
  onMenuVisibilityChange,
}: TemplatesPanelProps) {
  const isCreateImageToggle = toggleButtonPreset === "create-image";
  const isHoverMode = openMode === "hover";
  const dualHoverClick =
    hoverClickMenuDualMode && isCreateImageToggle && isHoverMode;

  const [hoverOpen, setHoverOpen] = useState(false);
  const [pinnedOpen, setPinnedOpen] = useState(false);
  const pinnedOpenRef = useRef(false);
  pinnedOpenRef.current = pinnedOpen;

  /** Create Image default: overlay. Edit Image: `stackTemplatesMenuInLayout` in-flow. */
  const isCreateImageOverlay =
    isCreateImageToggle && !stackTemplatesMenuInLayout;
  const overlayMenuAbove =
    isCreateImageOverlay && Boolean(templatesMenuOpensAbove);
  /** Same outer width as the asset (“Standard”) settings pill on desktop (`SettingsDropdown`). */
  const matchStandardSettingsTriggerWidth = isCreateImageOverlay;
  const createImageThumbs = menuThumbPreset === "create-image";

  const menuVisible = dualHoverClick ? hoverOpen || pinnedOpen : open;
  const isTemplatesOpen = menuVisible;
  const hoverCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    onMenuVisibilityChange?.(menuVisible);
  }, [menuVisible, onMenuVisibilityChange]);

  const clearHoverCloseTimer = () => {
    if (hoverCloseTimerRef.current != null) {
      clearTimeout(hoverCloseTimerRef.current);
      hoverCloseTimerRef.current = null;
    }
  };

  useEffect(() => () => clearHoverCloseTimer(), []);

  /** Dual: outside clears pin + hover. Editor hover: outside closes via parent. */
  useEffect(() => {
    if (dualHoverClick) {
      if (!menuVisible) return;
      const onPointerDown = (e: Event) => {
        const t = e.target as Node;
        if (!rootRef.current?.contains(t)) {
          setPinnedOpen(false);
          setHoverOpen(false);
        }
      };
      document.addEventListener("pointerdown", onPointerDown, true);
      return () =>
        document.removeEventListener("pointerdown", onPointerDown, true);
    }
    if (
      !menuVisible ||
      !isHoverMode ||
      !isCreateImageToggle ||
      !onOpenChange
    )
      return;
    const onPointerDown = (e: Event) => {
      const t = e.target as Node;
      if (!rootRef.current?.contains(t)) onOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => document.removeEventListener("pointerdown", onPointerDown, true);
  }, [
    dualHoverClick,
    menuVisible,
    isHoverMode,
    isCreateImageToggle,
    onOpenChange,
  ]);

  const handleTemplatesPointerEnter = () => {
    if (dualHoverClick) {
      clearHoverCloseTimer();
      setHoverOpen(true);
      return;
    }
    if (!isHoverMode || !onOpenChange) return;
    clearHoverCloseTimer();
    onOpenChange(true);
  };

  const handleTemplatesPointerLeave = (e: PointerEvent<HTMLDivElement>) => {
    if (dualHoverClick) {
      const rt = e.relatedTarget;
      if (rt instanceof Node && e.currentTarget.contains(rt)) return;
      clearHoverCloseTimer();
      if (pinnedOpenRef.current) {
        setHoverOpen(false);
        return;
      }
      hoverCloseTimerRef.current = setTimeout(() => {
        hoverCloseTimerRef.current = null;
        setHoverOpen(false);
      }, 100);
      return;
    }
    if (!isHoverMode || !onOpenChange) return;
    const rt = e.relatedTarget;
    if (rt instanceof Node && e.currentTarget.contains(rt)) return;
    clearHoverCloseTimer();
    hoverCloseTimerRef.current = setTimeout(() => {
      hoverCloseTimerRef.current = null;
      onOpenChange(false);
    }, 100);
  };

  const handleDualTemplatesButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearHoverCloseTimer();
    setPinnedOpen((p) => {
      if (p) {
        setHoverOpen(false);
        return false;
      }
      return true;
    });
  };

  const handleCreateImageHoverToggleClick = () => {
    if (!isHoverMode || !isCreateImageToggle || !onOpenChange) return;
    clearHoverCloseTimer();
    onOpenChange(!open);
  };

  return (
    <div
      ref={rootRef}
      className={cn(
        "w-full min-w-0",
        isCreateImageOverlay
          ? "relative overflow-visible"
          : cn("flex flex-col gap-3", isHoverMode && "relative"),
        menuVisible && isCreateImageOverlay && "z-[1001]",
        className,
      )}
      onPointerEnter={
        isHoverMode && (dualHoverClick || onOpenChange)
          ? handleTemplatesPointerEnter
          : undefined
      }
      onPointerLeave={
        isHoverMode && (dualHoverClick || onOpenChange)
          ? handleTemplatesPointerLeave
          : undefined
      }
    >
      {isCreateImageToggle && matchStandardSettingsTriggerWidth ? (
        <div
          className={cn(
            "shrink-0 self-start min-w-0",
            SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP,
          )}
        >
          <button
            type="button"
            onClick={
              dualHoverClick
                ? handleDualTemplatesButtonClick
                : isHoverMode
                  ? handleCreateImageHoverToggleClick
                  : onToggle
            }
            className="create-image-templates-toggle flex h-9 min-w-0 w-full cursor-pointer items-center gap-2 rounded-full px-3 text-[11px] font-normal text-white"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <TemplatesToggleIconMasked />
              <span className="min-w-0 truncate">Templates</span>
            </span>
            <span className="inline-flex shrink-0 items-center justify-center leading-none text-inherit">
              {menuVisible ? "▴" : "▾"}
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={
            dualHoverClick
              ? handleDualTemplatesButtonClick
              : isHoverMode
                ? isCreateImageToggle
                  ? handleCreateImageHoverToggleClick
                  : undefined
                : onToggle
          }
          className={cn(
            "h-9 rounded-full px-3 text-[11px] font-normal",
            isCreateImageToggle
              ? "create-image-templates-toggle inline-flex w-min min-w-0 max-w-full shrink-0 self-start items-center justify-between gap-x-2 text-white"
              : "flex items-center gap-2 bg-transparent text-white transition-colors duration-150 hover:bg-ix-hover active:bg-ix-pressed",
          )}
        >
          {isCreateImageToggle ? (
            <>
              <span className="flex min-w-0 items-center gap-x-2">
                <TemplatesToggleIconMasked />
                <span className="whitespace-nowrap">Templates</span>
              </span>
              <span className="inline-flex shrink-0 items-center justify-center leading-none text-inherit">
                {menuVisible ? "▴" : "▾"}
              </span>
            </>
          ) : (
            <>
              <IconAsset src={ICONS.templates} size={16} className="opacity-90" />
              Templates
              <span className="text-tx-secondary">
                {open ? "▴" : "▾"}
              </span>
            </>
          )}
        </button>
      )}
      {menuVisible ? (
        <div
          className={cn(
            "create-image-templates-panel-enter min-w-0",
            isCreateImageOverlay &&
              (overlayMenuAbove
                ? "absolute bottom-full left-0 right-0 z-[1002] w-full min-w-0 pb-3"
                : "absolute left-0 right-0 top-full z-[1002] w-full min-w-0 pt-3"),
          )}
        >
          {desktopExpandedSlot ? (
            <div className="mb-0 hidden min-w-0 w-full xl:block">
              {desktopExpandedSlot}
            </div>
          ) : null}
          <div
            className={cn(
              "flex flex-wrap gap-[17px]",
              desktopExpandedSlot != null && "xl:hidden",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(null)}
              className={cn(
                "flex shrink-0 items-center justify-center bg-rail-navy text-[10px] text-tx-secondary transition-colors duration-150 hover:bg-ix-hover",
                FRAME_SLOT_ROUNDED,
                createImageThumbs
                  ? "h-[92px] w-[92px]"
                  : "h-[64px] w-[92px]",
                selectedId === null && "bg-ix-selected text-brand",
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
                  "group flex shrink-0 items-center justify-center overflow-hidden bg-rail-navy transition-colors duration-150 hover:bg-ix-hover",
                  FRAME_SLOT_ROUNDED,
                  createImageThumbs ? "h-[92px] w-[92px]" : "h-[64px] w-[92px]",
                  selectedId === t.id && "bg-ix-selected",
                )}
              >
                <span
                  className={cn(
                    "select-none text-[9px] font-medium uppercase tracking-wider text-white/80",
                    selectedId === t.id && "text-brand",
                  )}
                >
                  Template
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
