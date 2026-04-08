"use client";

import { useCallback, useLayoutEffect, useState, useSyncExternalStore } from "react";
import {
  readPromptBarDockGeometry,
  type PromptBarDockGeometry,
  type PromptBarDockRefs,
} from "./prompt-bar-dock-geometry";

function subscribeMin768(cb: () => void) {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function getMin768Snapshot(): boolean {
  return window.matchMedia("(min-width: 768px)").matches;
}

function useMinWidth768(): boolean {
  return useSyncExternalStore(subscribeMin768, getMin768Snapshot, () => true);
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
  minWidth768: boolean;
} {
  const minWidth768 = useMinWidth768();
  const [promptBar, setPromptBar] = useState<PromptBarDockGeometry | null>(
    null,
  );

  const measure = useCallback(() => {
    if (typeof window === "undefined") return;
    const next = readPromptBarDockGeometry(minWidth768, {
      desktopScrollRef,
      desktopMiddleColumnRef,
      mobileScrollRef,
      mobileColumnRef,
    });
    if (next) setPromptBar(next);
  }, [
    minWidth768,
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

  return { promptBar, minWidth768 };
}
