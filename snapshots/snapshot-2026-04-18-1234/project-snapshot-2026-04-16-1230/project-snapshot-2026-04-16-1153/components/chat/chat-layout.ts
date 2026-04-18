import { CREATE_IMAGE_SCROLL_RESERVE } from "../create-image/preview-frame-layout";

/**
 * Bottom padding for chat scroll regions so content clears the fixed prompt bar.
 * Chat dock is PromptBar only (no generation settings row).
 */
export function chatScrollContentBottomPaddingPx(
  layout: "desktop" | "mobile",
): number {
  const r = CREATE_IMAGE_SCROLL_RESERVE[layout];
  return r.bottomInset + r.promptBar + r.gapAbovePromptDock + 16;
}
