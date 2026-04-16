/** Stable ids for simple rows (Share is the only submenu parent). */
export type PreviewMenuSimpleAction =
  | "expand"
  | "download"
  | "edit-image"
  | "upscale"
  | "like"
  | "delete"
  | "save";

/** @deprecated Use {@link PreviewMenuEvent} — kept for gradual migration. */
export type PreviewMenuActionId = PreviewMenuSimpleAction | "share";

export type PreviewMenuPreset = "create-image" | "image-editor";

export type ShareMenuTarget =
  | "meta"
  | "instagram"
  | "tiktok"
  | "x"
  | "whatsapp"
  | "pinterest"
  | "linkedin"
  | "copy-link";

export type PreviewMenuEvent =
  | { type: PreviewMenuSimpleAction }
  | { type: "share"; target: ShareMenuTarget };

export type PreviewMenuItem = {
  id: PreviewMenuSimpleAction | "share";
  label: string;
  iconSrc: string;
};

const ICON = {
  expand: "/icons/expand-icon.svg",
  download: "/icons/download-icon.svg",
  share: "/icons/share-icon.svg",
  editImage: "/icons/edit-image-icon.svg",
  upscale: "/icons/upscale-icon.svg",
  like: "/icons/liked-outlined-icon.svg",
  likeFilled: "/icons/liked-filled-icon.svg",
  delete: "/icons/delete-icon.svg",
  save: "/icons/save-icon.svg",
} as const;

export const PREVIEW_MENU_LIKE_ICONS = {
  outline: ICON.like,
  filled: ICON.likeFilled,
} as const;

/** Create Image / Create Video preview + history rail (no Save). */
const CREATE_IMAGE_MENU_ITEMS: PreviewMenuItem[] = [
  { id: "expand", label: "Expand", iconSrc: ICON.expand },
  { id: "download", label: "Download", iconSrc: ICON.download },
  { id: "share", label: "Share", iconSrc: ICON.share },
  { id: "edit-image", label: "Edit Image", iconSrc: ICON.editImage },
  { id: "upscale", label: "Upscale", iconSrc: ICON.upscale },
  { id: "like", label: "Like", iconSrc: ICON.like },
  { id: "delete", label: "Delete", iconSrc: ICON.delete },
];

/** Image Editor: Save after Upscale in the flat list order (Save inserted before Like). */
const IMAGE_EDITOR_MENU_ITEMS: PreviewMenuItem[] = [
  ...CREATE_IMAGE_MENU_ITEMS.slice(0, 5),
  { id: "save", label: "Save", iconSrc: ICON.save },
  ...CREATE_IMAGE_MENU_ITEMS.slice(5),
];

export function getPreviewMenuItems(
  preset: PreviewMenuPreset,
): readonly PreviewMenuItem[] {
  return preset === "image-editor"
    ? IMAGE_EDITOR_MENU_ITEMS
    : CREATE_IMAGE_MENU_ITEMS;
}

/** Order: platforms first, Copy link last. */
export const SHARE_SUBMENU_ITEMS: { target: ShareMenuTarget; label: string }[] =
  [
    { target: "meta", label: "Share to Meta" },
    { target: "instagram", label: "Share to Instagram" },
    { target: "tiktok", label: "Share to TikTok" },
    { target: "x", label: "Share to X" },
    { target: "whatsapp", label: "Share to WhatsApp" },
    { target: "pinterest", label: "Share to Pinterest" },
    { target: "linkedin", label: "Share to LinkedIn" },
    { target: "copy-link", label: "Copy link" },
  ];
