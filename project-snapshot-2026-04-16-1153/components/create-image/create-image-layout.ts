import { DESKTOP, TABLET } from "./layout-tokens";

/**
 * Preview width cap for md–xl (tablet) and mobile column math — keeps pre–1000px desktop behavior.
 * Desktop xl+ uses `DESKTOP.preview16x9.w` (see layout hook).
 */
export const CREATE_IMAGE_CONTENT_MAX_PX = 882.06;

/** Desktop xl+ 16:9 preview max width (matches `DESKTOP.preview16x9.w`). */
export const CREATE_IMAGE_DESKTOP_XL_PREVIEW_MAX_PX = DESKTOP.preview16x9.w;

/** Tablet / mid breakpoint (md–xl): centered column cap — matches Tailwind `max-w-[900px]`. */
export const CREATE_IMAGE_TABLET_MAX_PX = TABLET.contentMaxPx;
