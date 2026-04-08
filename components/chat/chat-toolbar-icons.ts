/**
 * Top-right Chat toolbar: like + ⋯ use the same button shell and icon dimensions.
 */
export const CHAT_TOOLBAR_ICON_PX = 24;
export const CHAT_TOOLBAR_ICON_IMG_CLASS =
  "pointer-events-none [&_img]:!h-6 [&_img]:!w-6 [&_img]:!max-h-6 [&_img]:!max-w-6 [&_img]:object-contain [&_img]:opacity-100";

/** Matches unliked heart control: same box, radius, and hover as the like button. */
export const CHAT_TOOLBAR_ICON_BUTTON_CLASS =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-control transition-[background-color,box-shadow,color] text-[#A1A1AA] hover:bg-[#2A2A2E] hover:text-white";
