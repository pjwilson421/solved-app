"use client";

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
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

function subscribeMin768(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getMin768Snapshot(): boolean {
  return window.matchMedia("(min-width: 768px)").matches;
}

function subscribeMin1280(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1280px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getMin1280Snapshot(): boolean {
  return window.matchMedia("(min-width: 1280px)").matches;
}

/**
 * True when the md+ shell (wide column + desktop refs) is the active layout.
 */
function useMinWidth768(): boolean {
  return useSyncExternalStore(
    subscribeMin768,
    getMin768Snapshot,
    () => true,
  );
}

/** Desktop layout with sidebar + history (`xl:`). */
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
 * Wide path (md+): desktop scroll + middle column refs. Narrow: mobile refs.
 */
export function useCreateImagePreviewPromptLayout({
  desktopScrollRef,
  desktopMiddleColumnRef,
  mobileScrollRef,
  mobileColumnRef,
  aspectRatio,
  templatesOpen,
  extraFixedDockReservePx = 0,
}: {
  desktopScrollRef: RefObject<HTMLElement | null>;
  desktopMiddleColumnRef: RefObject<HTMLElement | null>;
  mobileScrollRef: RefObject<HTMLElement | null>;
  mobileColumnRef: RefObject<HTMLElement | null>;
  aspectRatio: AspectRatio;
  templatesOpen: boolean;
  /** Added to fixed dock height budget (e.g. image editor tools above settings). */
  extraFixedDockReservePx?: number;
}): {
  layoutFrame: { width: number; height: number } | null;
  promptBar: PromptBarDockGeometry | null;
  /** Matches Tailwind `md:` — use for prompt/settings variants without prop drilling breakpoints. */
  minWidth768: boolean;
} {
  const minWidth768 = useMinWidth768();
  const minWidth1280 = useMinWidth1280();

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

    if (minWidth768) {
      const colEl = desktopMiddleColumnRef.current;
      const scrollEl = desktopScrollRef.current;
      if (!colEl || !scrollEl) return;

      const columnWidth = colEl.clientWidth;
      const portH = scrollEl.clientHeight;
      const desktopTemplatesVariant = minWidth1280 ? "strip" : "dropdown";
      const maxPreviewH =
        portH > 0
          ? previewMaxHeightFromScrollPort(
              portH,
              "desktop",
              templatesOpen,
              desktopTemplatesVariant,
              extraFixedDockReservePx,
            )
          : previewMaxHeightFromViewport(
              vh,
              "desktop",
              templatesOpen,
              desktopTemplatesVariant,
              extraFixedDockReservePx,
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
            templatesOpen,
            "dropdown",
            extraFixedDockReservePx,
          )
        : previewMaxHeightFromViewport(
            vh,
            "mobile",
            templatesOpen,
            "dropdown",
            extraFixedDockReservePx,
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
    minWidth768,
    minWidth1280,
    templatesOpen,
    extraFixedDockReservePx,
    desktopScrollRef,
    desktopMiddleColumnRef,
    mobileScrollRef,
    mobileColumnRef,
  ]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(() => measure());

    if (minWidth768) {
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
    minWidth768,
    desktopScrollRef,
    desktopMiddleColumnRef,
    mobileScrollRef,
    mobileColumnRef,
  ]);

  return { layoutFrame, promptBar, minWidth768 };
}
