"use client";

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  readPromptBarDockGeometry,
  type PromptBarDockGeometry,
  type PromptBarDockRefs,
} from "./prompt-bar-dock-geometry";

function subscribeMin1280(cb: () => void) {
  const mq = window.matchMedia("(min-width: 1280px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getMin1280Snapshot(): boolean {
  return window.matchMedia("(min-width: 1280px)").matches;
}

function useMinWidth1280(): boolean {
  return useSyncExternalStore(subscribeMin1280, getMin1280Snapshot, () => false);
}

/**
 * Prompt bar fixed position/size — same measurement chain as Create Image (`useCreateImagePreviewPromptLayout`).
 */
export function usePromptBarDockLayout({
  desktopScrollRef,
  desktopMiddleColumnRef,
  mobileScrollRef,
  mobileColumnRef,
}: PromptBarDockRefs): {
  promptBar: PromptBarDockGeometry | null;
  minWidth1280: boolean;
} {
  const minWidth1280 = useMinWidth1280();
  const [promptBar, setPromptBar] = useState<PromptBarDockGeometry | null>(
    null,
  );

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = readPromptBarDockGeometry(minWidth1280, {
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
    });
    if (next) setPromptBar(next);
  }, [
    minWidth1280,
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

  return { promptBar, minWidth1280 };
}
