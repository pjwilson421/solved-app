"use client";

import Image from "next/image";
import {
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP } from "./settings-dropdown";
import { FRAME_SLOT_ROUNDED } from "./layout-tokens";
import type { TemplateDef } from "./types";

/** Tailwind `xl` default breakpoint — must match responsive columns that mount two panels. */
const XL_MIN_WIDTH_MEDIA = "(min-width: 1280px)";

function subscribeTailwindXlMin(onChange: () => void) {
  const mq = window.matchMedia(XL_MIN_WIDTH_MEDIA);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getTailwindXlMinSnapshot() {
  return window.matchMedia(XL_MIN_WIDTH_MEDIA).matches;
}

function getTailwindXlMinServerSnapshot() {
  return true;
}

function useTailwindXlMin(): boolean {
  return useSyncExternalStore(
    subscribeTailwindXlMin,
    getTailwindXlMinSnapshot,
    getTailwindXlMinServerSnapshot,
  );
}

export type TemplatesPanelLayoutColumn = "desktop" | "mobile";

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

/** Single chevron; `open` rotates 180° so closed/open match in size and stroke (no ▴/▾ glyph mismatch). */
function TemplatesChevron({
  open,
  className,
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      className={cn(
        "block size-[10px] shrink-0 text-[inherit] transition-transform duration-200 ease-out",
        open && "rotate-180",
        className,
      )}
      viewBox="0 0 10 10"
      aria-hidden
    >
      <path
        d="M1.75 3.25L5 6.5L8.25 3.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type TemplatesPanelProps = {
  /**
   * Which column this instance is mounted in. Create Image / Image Editor mount two
   * `TemplatesPanel`s (xl vs below-xl); only the visible one may register outside-dismiss
   * listeners or the hidden instance will treat real button clicks as “outside”.
   */
  layoutColumn: TemplatesPanelLayoutColumn;
  templates: TemplateDef[];
  selectedId: string | null;
  /** Controlled open state — toggled only by button click, outside press, or Escape. */
  open: boolean;
  /** Same contract as `useState` setter so the trigger can toggle with a functional update (no stale `open`). */
  onOpenChange: Dispatch<SetStateAction<boolean>>;
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
   * Create Image overlay only: anchor the menu above the trigger (`bottom-full`) so it does not
   * push layout downward. Ignored when not overlay mode.
   */
  templatesMenuOpensAbove?: boolean;
};

export function TemplatesPanel({
  layoutColumn,
  templates,
  selectedId,
  open,
  onOpenChange,
  onSelect,
  className,
  desktopExpandedSlot,
  toggleButtonPreset = "default",
  menuThumbPreset = "default",
  stackTemplatesMenuInLayout = false,
  templatesMenuOpensAbove = false,
}: TemplatesPanelProps) {
  const isCreateImageToggle = toggleButtonPreset === "create-image";

  /** Create Image default: overlay. Edit Image: `stackTemplatesMenuInLayout` in-flow. */
  const isCreateImageOverlay =
    isCreateImageToggle && !stackTemplatesMenuInLayout;
  const overlayMenuAbove =
    isCreateImageOverlay && Boolean(templatesMenuOpensAbove);
  /** Same outer width as the asset (“Standard”) settings pill on desktop (`SettingsDropdown`). */
  const matchStandardSettingsTriggerWidth = isCreateImageOverlay;
  const createImageThumbs = menuThumbPreset === "create-image";

  const isXlViewport = useTailwindXlMin();
  const isActiveResponsiveInstance =
    layoutColumn === "desktop" ? isXlViewport : !isXlViewport;

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!open || !isActiveResponsiveInstance) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      const clickedButton = buttonRef.current?.contains(target);
      const clickedMenu = menuRef.current?.contains(target);
      if (clickedButton || clickedMenu) return;
      onOpenChange(false);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open, onOpenChange, isActiveResponsiveInstance]);

  const handleTemplatesButtonClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenChange((prev) => !prev);
  };

  return (
    <div
      className={cn(
        "w-full min-w-0 shrink-0",
        isCreateImageOverlay
          ? "relative overflow-visible"
          : "relative flex flex-col gap-3",
        open && isCreateImageOverlay && "z-[1001]",
        className,
      )}
    >
      {isCreateImageToggle && matchStandardSettingsTriggerWidth ? (
        <div
          className={cn(
            "shrink-0 self-start min-w-0 h-9",
            SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP,
          )}
        >
          <button
            ref={buttonRef}
            type="button"
            onClick={handleTemplatesButtonClick}
            aria-expanded={open}
            aria-haspopup="listbox"
            className="create-image-templates-toggle flex h-9 min-w-0 w-full cursor-pointer items-center gap-2 rounded-full px-3 text-[11px] font-normal text-white"
          >
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <TemplatesToggleIconMasked />
              <span className="min-w-0 truncate">Templates</span>
            </span>
            <span className="inline-flex shrink-0 items-center justify-center leading-none text-inherit">
              <TemplatesChevron open={open} />
            </span>
          </button>
        </div>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={handleTemplatesButtonClick}
          aria-expanded={open}
          aria-haspopup="listbox"
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
                <TemplatesChevron open={open} />
              </span>
            </>
          ) : (
            <>
              <IconAsset src={ICONS.templates} size={16} className="opacity-90" />
              Templates
              <span className="inline-flex shrink-0 items-center justify-center leading-none text-tx-secondary">
                <TemplatesChevron open={open} />
              </span>
            </>
          )}
        </button>
      )}
      {open ? (
        <div
          ref={menuRef}
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
              "flex min-w-0 w-full flex-nowrap gap-4 overflow-x-scroll overflow-y-hidden overscroll-x-contain pb-6 [scroll-behavior:auto] templates-strip-scrollbar",
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
                  "group relative flex shrink-0 items-center justify-center overflow-hidden bg-rail-navy transition-colors duration-150 hover:bg-ix-hover",
                  FRAME_SLOT_ROUNDED,
                  createImageThumbs ? "h-[92px] w-[92px]" : "h-[64px] w-[92px]",
                  selectedId === t.id && "bg-ix-selected",
                )}
              >
                {t.menuThumbnailSrc ? (
                  <>
                    <Image
                      src={t.menuThumbnailSrc}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="92px"
                    />
                    <span
                      className={cn(
                        "pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-1 pb-1 pt-4 text-left text-[8px] font-semibold uppercase leading-none tracking-wide text-white/90",
                        selectedId === t.id && "text-brand",
                      )}
                    >
                      {t.name}
                    </span>
                  </>
                ) : (
                  <span
                    className={cn(
                      "select-none text-[9px] font-medium uppercase tracking-wider text-white/80",
                      selectedId === t.id && "text-brand",
                    )}
                  >
                    Template
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
