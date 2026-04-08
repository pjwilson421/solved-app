import type { RefObject } from "react";

export type PromptBarDockGeometry = { left: number; width: number };

export type PromptBarDockRefs = {
  desktopScrollRef: RefObject<HTMLElement | null>;
  desktopMiddleColumnRef: RefObject<HTMLElement | null>;
  mobileScrollRef: RefObject<HTMLElement | null>;
  mobileColumnRef: RefObject<HTMLElement | null>;
};

/**
 * Matches `useCreateImagePreviewPromptLayout` prompt dock math exactly (Create Image = source of truth).
 */
export function readPromptBarDockGeometry(
  minWidth768: boolean,
  refs: PromptBarDockRefs,
): PromptBarDockGeometry | null {
  if (minWidth768) {
    const colEl = refs.desktopMiddleColumnRef.current;
    const scrollEl = refs.desktopScrollRef.current;
    if (!colEl || !scrollEl) return null;
    const colRect = colEl.getBoundingClientRect();
    const columnWidth = colEl.clientWidth;
    return { left: colRect.left, width: columnWidth };
  }

  const mainEl = refs.mobileColumnRef.current;
  const scrollEl = refs.mobileScrollRef.current;
  if (!mainEl || !scrollEl) return null;
  const rect = mainEl.getBoundingClientRect();
  const cs = getComputedStyle(mainEl);
  const padX =
    (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  const padL = parseFloat(cs.paddingLeft) || 0;
  const columnWidth = Math.max(0, mainEl.clientWidth - padX);
  const contentLeft = rect.left + padL;
  return { left: contentLeft, width: columnWidth };
}

/** Tailwind defaults — must match CreateImageClient shell. */
const XL_BREAKPOINT_PX = 1280;
const SM_BREAKPOINT_PX = 640;

/**
 * Pixel geometry of the fixed prompt dock on Create Image **desktop** (md+), derived from the
 * same grid / max-width rules as `CreateImageClient` (300 | 1fr | 300 at xl; max 900px centered
 * tablet with px-4 / sm:px-8). Use on pages whose main column differs but the dock should match
 * Create Image exactly.
 */
export function createImageDesktopPromptDockGeometryPx(): PromptBarDockGeometry {
  if (typeof document === "undefined") {
    return { left: 0, width: 900 };
  }
  const vw = document.documentElement.clientWidth;
  if (vw >= XL_BREAKPOINT_PX) {
    const centerW = Math.max(0, vw - 600);
    const width = Math.min(1000, centerW);
    const left = 300 + (centerW - width) / 2;
    return { left, width };
  }
  const pad = vw >= SM_BREAKPOINT_PX ? 32 : 16;
  const inner = Math.max(0, vw - 2 * pad);
  const width = Math.min(900, inner);
  const left = pad + (inner - width) / 2;
  return { left, width };
}
