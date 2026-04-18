"use client";

import { useCallback, useRef, useState } from "react";

/** How far left the user drags to fully reveal timestamps (iPhone-like column width). */
export const CHAT_TIMESTAMP_REVEAL_PX = 52;

const DECIDE_PX = 12;

/**
 * iMessage-style interaction: horizontal drag on the thread reveals per-row times;
 * on release, times ease away. Vertical scrolling is preserved when movement is mostly vertical.
 */
export function useChatTimestampReveal() {
  const [reveal, setReveal] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [horizontalLock, setHorizontalLock] = useState(false);

  const modeRef = useRef<"undecided" | "h" | "v">("undecided");
  const startRef = useRef({ x: 0, y: 0 });
  const activeRef = useRef(false);

  const resetGesture = useCallback(() => {
    activeRef.current = false;
    modeRef.current = "undecided";
    setDragging(false);
    setHorizontalLock(false);
    setReveal(0);
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (e.button !== 0) return;
    const el = e.target as HTMLElement | null;
    if (el?.closest?.("button, a, input, textarea, [role='menuitem']")) return;

    activeRef.current = true;
    modeRef.current = "undecided";
    startRef.current = { x: e.clientX, y: e.clientY };
    setDragging(true);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    if (!activeRef.current) return;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;

    if (modeRef.current === "undecided") {
      if (Math.hypot(dx, dy) < DECIDE_PX) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        modeRef.current = "h";
        setHorizontalLock(true);
      } else {
        modeRef.current = "v";
        activeRef.current = false;
        setDragging(false);
        return;
      }
    }

    if (modeRef.current !== "h") return;

    e.preventDefault();
    const next = Math.min(1, Math.max(0, -dx / CHAT_TIMESTAMP_REVEAL_PX));
    setReveal(next);
  }, []);

  const onPointerEnd = useCallback(() => {
    resetGesture();
  }, [resetGesture]);

  const onLostPointerCapture = useCallback(() => {
    resetGesture();
  }, [resetGesture]);

  return {
    reveal,
    dragging,
    /** While true, block native pan so horizontal scrub doesn’t scroll the page. */
    horizontalLock,
    transitionClass:
      dragging && horizontalLock
        ? ""
        : "transition-[width,opacity] duration-200 ease-out",
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
      onPointerCancel: onPointerEnd,
      onLostPointerCapture,
    },
  };
}
