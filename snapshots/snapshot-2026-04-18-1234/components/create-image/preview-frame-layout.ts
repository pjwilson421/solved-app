import { CREATE_IMAGE_CONTENT_MAX_PX } from "./create-image-layout";
import { DESKTOP } from "./layout-tokens";
import type { AspectRatio } from "./types";

/**
 * Fixed prompt bar zone + clearance above it (matches `--prompt-dock-viewport-bottom` + bar height).
 * Content must lay out above this band so nothing is covered.
 */
export const CREATE_IMAGE_SCROLL_RESERVE = {
  desktop: {
    contentTopPadding: 24,
    /** Meta under preview (date + prompt lines + margins). */
    previewMetaBlock: 92,
    /** Gap below description / meta — matches `mt-5` on templates wrapper and dock `gap-5`. */
    templatesMarginTop: 20,
    templatesButtonRow: 40,
    templatesExpandedExtra: 120,
    /** xl: label + strip + scrollbar (+ margin meta→templates, aligned with `mt-5`). */
    templatesDesktopStripBlock: 180,
    /** xl+: matches `var(--prompt-dock-viewport-bottom)` at 1280px (rail inner gutter). */
    bottomInset: 20,
    /** Fixed row above prompt (no outer bar; h-9 settings pills, may wrap). */
    generationSettingsRow: 44,
    /** Matches dock `gap-3` ↔ PreviewPanel description `mt-3` below preview. */
    gapSettingsToPrompt: 12,
    promptBar: 76,
    /** Scroll clearance above the generation settings row — matches dock `gap-3` (12px) to settings→prompt. */
    gapAbovePromptDock: 12,
  },
  mobile: {
    scrollTopChrome: 20,
    /** Helper copy + gap; preview meta hidden on mobile. */
    previewMetaBlock: 40,
    templatesSectionCollapsed: 48,
    templatesExpandedExtra: 120,
    /** Matches largest `--prompt-dock-viewport-bottom` below xl (`2rem` from 640px) so scroll clears the dock. */
    bottomInset: 32,
    /** Settings row (h-9 controls, optional wrap; no outer bar padding). */
    generationSettingsRow: 80,
    gapSettingsToPrompt: 12,
    promptBar: 76,
    gapAbovePromptDock: 12,
  },
} as const;

/**
 * Legacy numeric export (xl+ dock bottom inset, px). Rails and dock use
 * `var(--prompt-dock-viewport-bottom)` in CSS; keep this for older imports only.
 */
export const LEFT_NAV_VIEWPORT_BOTTOM_GAP_PX =
  CREATE_IMAGE_SCROLL_RESERVE.desktop.bottomInset;

/** @deprecated Alias of {@link LEFT_NAV_VIEWPORT_BOTTOM_GAP_PX}. */
export const SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX = LEFT_NAV_VIEWPORT_BOTTOM_GAP_PX;

/** Create Image: templates pill row in fixed dock + `gap-3` to GenerationSettingsRow. */
export const CREATE_IMAGE_TEMPLATES_IN_DOCK_EXTRA_PX =
  CREATE_IMAGE_SCROLL_RESERVE.desktop.templatesButtonRow +
  CREATE_IMAGE_SCROLL_RESERVE.desktop.gapSettingsToPrompt;


/** Bottom padding for scroll column so last content clears the fixed dock (settings + prompt). */
export function createImageScrollContentBottomPaddingPx(
  layout: "desktop" | "mobile",
): number {
  const r = CREATE_IMAGE_SCROLL_RESERVE[layout];
  return (
    r.bottomInset +
    r.promptBar +
    r.gapSettingsToPrompt +
    r.generationSettingsRow +
    r.gapAbovePromptDock +
    16
  );
}

/** Legacy: `mt-[32px]` above templates when strip lived in fixed dock (Chat dock parity only). */
export const TEMPLATES_FIXED_MARGIN_TOP_PX = 32;

/** Gap below preview meta → templates strip in scroll column (`mt-3`). */
export const TEMPLATES_STRIP_SCROLL_GAP_BELOW_META_PX = 12;

/** xl+ scroll padding when fixed dock is settings + prompt only (Create / Edit / Video image flows). */
export function createImageScrollContentBottomPaddingPxDesktopXl(): number {
  return createImageScrollContentBottomPaddingPx("desktop");
}

/** xl+ extra padding when dock includes invisible templates strip spacer (Chat). */
export function createImageScrollContentBottomPaddingPxDesktopXlDockTemplatesStrip(): number {
  const r = CREATE_IMAGE_SCROLL_RESERVE.desktop;
  return (
    createImageScrollContentBottomPaddingPx("desktop") +
    r.templatesDesktopStripBlock +
    TEMPLATES_FIXED_MARGIN_TOP_PX
  );
}

export function promptDockReserveHeightPx(layout: "desktop" | "mobile"): number {
  const r = CREATE_IMAGE_SCROLL_RESERVE[layout];
  return (
    r.bottomInset +
    r.promptBar +
    r.gapSettingsToPrompt +
    r.generationSettingsRow +
    r.gapAbovePromptDock
  );
}

/** Scroll-column space below preview meta for Image Editor tool strip + gap (not in fixed dock). */
export const IMAGE_EDITOR_TOOL_STRIP_SCROLL_RESERVE_PX = 56;

/** Max preview frame height from visible scroll port (not full window). */
export function previewMaxHeightFromScrollPort(
  scrollPortHeightPx: number,
  layout: "desktop" | "mobile",
  templatesOpen: boolean,
  desktopTemplatesVariant: "dropdown" | "strip" = "dropdown",
  /** Extra fixed UI above the generation settings row (e.g. image editor tool strip). */
  extraFixedDockReservePx = 0,
  /** Extra content below preview inside the scroll column (e.g. editor tools under meta). */
  extraBelowPreviewReservePx = 0,
  /**
   * When false, no scroll-column space is reserved for templates below the preview (templates live
   * in the fixed dock / overlay only — Create Image).
   */
  templatesInScrollColumn = true,
): number {
  const r = CREATE_IMAGE_SCROLL_RESERVE.desktop;
  const dock =
    promptDockReserveHeightPx(layout) + Math.max(0, extraFixedDockReservePx);

  const extraBelow = Math.max(0, extraBelowPreviewReservePx);

  if (layout === "desktop") {
    /* xl strip: scroll column under meta; reserve full strip height only when open. */
    const templatesBelowScroll = templatesInScrollColumn
      ? desktopTemplatesVariant === "strip"
        ? TEMPLATES_STRIP_SCROLL_GAP_BELOW_META_PX +
          (templatesOpen
            ? r.templatesDesktopStripBlock
            : r.templatesButtonRow)
        : r.templatesMarginTop +
          r.templatesButtonRow +
          (templatesOpen ? r.templatesExpandedExtra : 0)
      : 0;
    const belowPreview =
      r.previewMetaBlock + extraBelow + templatesBelowScroll;
    const usable =
      scrollPortHeightPx -
      r.contentTopPadding -
      dock -
      belowPreview;
    return Math.max(100, usable);
  }

  const rm = CREATE_IMAGE_SCROLL_RESERVE.mobile;
  const templatesBelowScroll = templatesInScrollColumn
    ? rm.templatesSectionCollapsed + (templatesOpen ? rm.templatesExpandedExtra : 0)
    : 0;
  const belowPreview =
    rm.previewMetaBlock + extraBelow + templatesBelowScroll;
  const usable =
    scrollPortHeightPx - rm.scrollTopChrome - dock - belowPreview;
  return Math.max(100, usable);
}

/** Fallback when scroll port height is not yet measurable. */
export function previewMaxHeightFromViewport(
  viewportHeight: number,
  layout: "desktop" | "mobile",
  templatesOpen: boolean,
  desktopTemplatesVariant: "dropdown" | "strip" = "dropdown",
  extraFixedDockReservePx = 0,
  extraBelowPreviewReservePx = 0,
  templatesInScrollColumn = true,
): number {
  const header = layout === "desktop" ? 64 : 72;
  const approxScrollPort = Math.max(200, viewportHeight - header);
  return previewMaxHeightFromScrollPort(
    approxScrollPort,
    layout,
    templatesOpen,
    desktopTemplatesVariant,
    extraFixedDockReservePx,
    extraBelowPreviewReservePx,
    templatesInScrollColumn,
  );
}

/**
 * Preview box size: limited by middle-column width and by available height.
 * @param contentMaxWidthPx — max preview width (882.06 tablet/md–xl; 1000 desktop xl+ for 16:9 column).
 */
export function computePreviewFrameSize(
  aspect: AspectRatio,
  columnWidthPx: number,
  maxHeightPx: number,
  contentMaxWidthPx: number = CREATE_IMAGE_CONTENT_MAX_PX,
): { width: number; height: number } {
  const col = Math.min(
    contentMaxWidthPx,
    Math.max(0, columnWidthPx),
  );
  const maxH = Math.max(80, maxHeightPx);

  switch (aspect) {
    case "16:9": {
      const heightBudget = Math.min(maxH, DESKTOP.preview16x9.h);
      const wCap = col;
      const wFromHeight = heightBudget * (16 / 9);
      const width = Math.min(wCap, wFromHeight);
      const height = width * (9 / 16);
      return { width, height };
    }
    case "1:1": {
      const wCap = Math.min(DESKTOP.preview1x1.w, col);
      const width = Math.min(wCap, maxH);
      return { width, height: width };
    }
    case "4:5": {
      const wDesign = DESKTOP.preview4x5.w;
      const hDesign = DESKTOP.preview4x5.h;
      const wCap = Math.min(wDesign, col);
      const wFromH = maxH * (wDesign / hDesign);
      const width = Math.min(wCap, wFromH);
      const height = width * (hDesign / wDesign);
      return { width, height };
    }
    case "9:16": {
      const wDesign = DESKTOP.preview9x16.w;
      const hDesign = DESKTOP.preview9x16.h;
      const wCap = Math.min(wDesign, col);
      const wFromH = maxH * (wDesign / hDesign);
      const width = Math.min(wCap, wFromH);
      const height = width * (hDesign / wDesign);
      return { width, height };
    }
    default: {
      const wCap = col;
      const wFromH = maxH * (16 / 9);
      const width = Math.min(wCap, wFromH);
      return { width, height: width * (9 / 16) };
    }
  }
}
