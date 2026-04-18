"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type { RefObject } from "react";
import {
  CREATE_IMAGE_CONTENT_MAX_PX,
  CREATE_IMAGE_DESKTOP_XL_PREVIEW_MAX_PX,
} from "./create-image-layout";
import {
  computePreviewFrameSize,
  previewMaxHeightFromScrollPort,
  previewMaxHeightFromViewport,
} from "./preview-frame-layout";
import type { AspectRatio } from "./types";
import {
  readPromptBarDockGeometry,
  type PromptBarDockGeometry,
} from "./prompt-bar-dock-geometry";

export type { PromptBarDockGeometry } from "./prompt-bar-dock-geometry";

function readViewportHeight(): number {
  if (typeof window === "undefined") return 800;
  return window.visualViewport?.height ?? window.innerHeight;
}

function subscribeMin1280(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1280px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getMin1280Snapshot(): boolean {
  return window.matchMedia("(min-width: 1280px)").matches;
}

/** Desktop layout with visible side rails + desktop header (`xl:` / 1280px). */
export function useMinWidth1280(): boolean {
  return useSyncExternalStore(
    subscribeMin1280,
    getMin1280Snapshot,
    () => false,
  );
}

/**
 * Middle column ref defines width + left edge. Preview / templates / prompt bar share the same
 * left origin (no centering in scroll vs column mismatch).
 * Wide path (`xl+`): desktop scroll + middle column refs. Narrow: mobile refs.
 */
export function useCreateImagePreviewPromptLayout({
  desktopScrollRef,
  desktopMiddleColumnRef,
  mobileScrollRef,
  mobileColumnRef,
  aspectRatio,
  templatesOpen,
  /** When true, preview height math ignores `templatesOpen` (overlay menus; Create Image). */
  previewLayoutIgnoreTemplatesOpen = false,
  /**
   * When true, preview height ignores `templatesOpen` only on xl+ desktop (`min-width: 1280px`).
   * Mobile/narrow layout still reacts — use for Image Editor desktop stable preview while templates expand in-flow.
   */
  previewLayoutIgnoreTemplatesOpenOnDesktopXl = false,
  extraFixedDockReservePx = 0,
  extraBelowPreviewReservePx = 0,
  /** When false, preview height math does not reserve templates below the preview in the scroll column. */
  templatesInScrollColumn = true,
}: {
  desktopScrollRef: RefObject<HTMLElement | null>;
  desktopMiddleColumnRef: RefObject<HTMLElement | null>;
  mobileScrollRef: RefObject<HTMLElement | null>;
  mobileColumnRef: RefObject<HTMLElement | null>;
  aspectRatio: AspectRatio;
  templatesOpen: boolean;
  previewLayoutIgnoreTemplatesOpen?: boolean;
  previewLayoutIgnoreTemplatesOpenOnDesktopXl?: boolean;
  /** Added to fixed dock height budget (e.g. image editor tools above settings). */
  extraFixedDockReservePx?: number;
  /** Scroll-column content below preview meta (e.g. editor tool strip under description). */
  extraBelowPreviewReservePx?: number;
  templatesInScrollColumn?: boolean;
}): {
  layoutFrame: { width: number; height: number } | null;
  promptBar: PromptBarDockGeometry | null;
  /** Matches Tailwind `xl:` — same cutoff as hamburger + visible side rails. */
  minWidth1280: boolean;
} {
  const minWidth1280 = useMinWidth1280();

  const templatesForPreview = useMemo(() => {
    if (previewLayoutIgnoreTemplatesOpen) return false;
    if (previewLayoutIgnoreTemplatesOpenOnDesktopXl && minWidth1280)
      return false;
    return templatesOpen;
  }, [
    previewLayoutIgnoreTemplatesOpen,
    previewLayoutIgnoreTemplatesOpenOnDesktopXl,
    minWidth1280,
    templatesOpen,
  ]);

  const [layoutFrame, setLayoutFrame] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [promptBar, setPromptBar] = useState<PromptBarDockGeometry | null>(
    null,
  );

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;

    const vh = readViewportHeight();

    if (minWidth1280) {
      const colEl = desktopMiddleColumnRef.current;
      const scrollEl = desktopScrollRef.current;
      if (!colEl || !scrollEl) return;

      const columnWidth = colEl.clientWidth;
      const portH = scrollEl.clientHeight;
      /* Desktop shell is `display:none` below `xl` while refs may still exist — skip bad measure. */
      if (columnWidth < 2 || portH < 2) {
        setLayoutFrame(null);
        return;
      }
      const desktopTemplatesVariant = "strip";
      const maxPreviewH =
        portH > 0
          ? previewMaxHeightFromScrollPort(
              portH,
              "desktop",
              templatesForPreview,
              desktopTemplatesVariant,
              extraFixedDockReservePx,
              extraBelowPreviewReservePx,
              templatesInScrollColumn,
            )
          : previewMaxHeightFromViewport(
              vh,
              "desktop",
              templatesForPreview,
              desktopTemplatesVariant,
              extraFixedDockReservePx,
              extraBelowPreviewReservePx,
              templatesInScrollColumn,
            );

      const contentMax = minWidth1280
        ? CREATE_IMAGE_DESKTOP_XL_PREVIEW_MAX_PX
        : CREATE_IMAGE_CONTENT_MAX_PX;
      const frame = computePreviewFrameSize(
        aspectRatio,
        columnWidth,
        maxPreviewH,
        contentMax,
      );

      setLayoutFrame(frame);
      {
        const dock = readPromptBarDockGeometry(true, {
          desktopScrollRef,
          desktopMiddleColumnRef,
          mobileScrollRef,
          mobileColumnRef,
        });
        if (dock) setPromptBar(dock);
      }
      return;
    }

    const mainEl = mobileColumnRef.current;
    const scrollEl = mobileScrollRef.current;
    if (!mainEl || !scrollEl) return;

    const portH = scrollEl.clientHeight;
    const maxPreviewH =
      portH > 0
        ? previewMaxHeightFromScrollPort(
            portH,
            "mobile",
            templatesForPreview,
            "dropdown",
            extraFixedDockReservePx,
            extraBelowPreviewReservePx,
            templatesInScrollColumn,
          )
        : previewMaxHeightFromViewport(
            vh,
            "mobile",
            templatesForPreview,
            "dropdown",
            extraFixedDockReservePx,
            extraBelowPreviewReservePx,
            templatesInScrollColumn,
          );

    const cs = getComputedStyle(mainEl);
    const padX =
      (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const columnWidth = Math.max(0, mainEl.clientWidth - padX);
    const frame = computePreviewFrameSize(
      aspectRatio,
      columnWidth,
      Math.max(80, Math.floor(maxPreviewH * 0.93)),
      CREATE_IMAGE_CONTENT_MAX_PX,
    );

    setLayoutFrame(frame);
    {
      const dock = readPromptBarDockGeometry(false, {
        desktopScrollRef,
        desktopMiddleColumnRef,
        mobileScrollRef,
        mobileColumnRef,
      });
      if (dock) setPromptBar(dock);
    }
  }, [
    aspectRatio,
    minWidth1280,
    templatesForPreview,
    extraFixedDockReservePx,
    extraBelowPreviewReservePx,
    templatesInScrollColumn,
    desktopScrollRef,
    desktopMiddleColumnRef,
    mobileScrollRef,
    mobileColumnRef,
  ]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());

    if (minWidth1280) {
      const scrollEl = desktopScrollRef.current;
      const colEl = desktopMiddleColumnRef.current;
      if (scrollEl) ro.observe(scrollEl);
      if (colEl) ro.observe(colEl);
    } else {
      const scrollEl = mobileScrollRef.current;
      const colEl = mobileColumnRef.current;
      if (scrollEl) ro.observe(scrollEl);
      if (colEl) ro.observe(colEl);
    }

    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
  }, [
    measure,
    minWidth1280,
    desktopScrollRef,
    desktopMiddleColumnRef,
    mobileScrollRef,
    mobileColumnRef,
  ]);

  return { layoutFrame, promptBar, minWidth1280 };
}
