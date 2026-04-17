import type { AspectRatio } from "@/components/create-image/types";

/** Reusable composed-template id (maps from {@link TemplateDef.composedKind}). */
export const COMPOSED_KIND_SOCIAL_TEMPLATE_1 = "social-template-1" as const;
export type ComposedKindSocialTemplate1 =
  typeof COMPOSED_KIND_SOCIAL_TEMPLATE_1;

export type SocialTemplate1ElementId =
  | "hero"
  | "label"
  | "heading"
  | "subheading"
  | "body"
  | "footer"
  | "logo";

/**
 * Layout in **design-space pixels** on {@link TEMPLATE_1_DESIGN_CANVAS} for the active aspect.
 * For text fields, `h` is **minimum height** (content may grow taller without clipping).
 */
export type SocialTemplate1Box = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type SocialTemplate1State = {
  aspectRatio: AspectRatio;
  texts: {
    label: string;
    heading: string;
    subheading: string;
    body: string;
    footer: string;
  };
  heroUrl: string | null;
  logoUrl: string | null;
  boxes: Record<SocialTemplate1ElementId, SocialTemplate1Box>;
};

/** Fixed internal design canvas (never stretch — entire composition scales uniformly). */
export const TEMPLATE_1_DESIGN_CANVAS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "16:9": { width: 1920, height: 1080 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1536, height: 1920 },
  "9:16": { width: 1080, height: 1920 },
};

export function template1DesignPixelSize(aspect: AspectRatio): {
  width: number;
  height: number;
} {
  return TEMPLATE_1_DESIGN_CANVAS[aspect];
}

export const SOCIAL_TEMPLATE_1_SVG: Record<AspectRatio, string> = {
  "16:9": "/templates/SOCIAL-TEMPLATE-1-16X9.svg",
  "1:1": "/templates/SOCIAL-TEMPLATE-1-1X1.svg",
  "4:5": "/templates/SOCIAL-TEMPLATE-1-4X5.svg",
  "9:16": "/templates/SOCIAL-TEMPLATE-1-9X16.svg",
};

export const SOCIAL_TEMPLATE_1_MENU_THUMB =
  "/templates/thumbnails/template-1-social-thumbnail.webp";

const DEFAULT_TEXTS = {
  label: "ANNOUNCEMENT",
  heading: "Heading",
  subheading: "Sub heading goes here.",
  body: "Body text goes here. Replace this copy with your message — keep it concise for social.",
  footer: "Footer text goes here.",
} as const;

const MIN_TEXT_W = 48;
const MIN_TEXT_H = 36;
const MIN_IMG = 40;

/** Default boxes (px on design canvas). Derived from Illustrator SVG anchors / regions. */
const BOXES: Record<AspectRatio, Record<SocialTemplate1ElementId, SocialTemplate1Box>> = {
  "16:9": {
    hero: { x: 0, y: 0, w: 960, h: 1080 },
    label: { x: 1704, y: 24, w: 200, h: 56 },
    heading: { x: 1008, y: 112, w: 888, h: 112 },
    subheading: { x: 1008, y: 232, w: 888, h: 80 },
    body: { x: 1008, y: 320, w: 888, h: 520 },
    footer: { x: 1008, y: 884, w: 840, h: 168 },
    logo: { x: 1608, y: 948, w: 288, h: 100 },
  },
  "1:1": {
    hero: { x: 0, y: 0, w: 540, h: 1080 },
    label: { x: 918, y: 14, w: 150, h: 44 },
    heading: { x: 552, y: 200, w: 510, h: 100 },
    subheading: { x: 552, y: 308, w: 510, h: 72 },
    body: { x: 552, y: 392, w: 510, h: 560 },
    footer: { x: 552, y: 912, w: 510, h: 140 },
    logo: { x: 876, y: 936, w: 186, h: 88 },
  },
  "4:5": {
    hero: { x: 0, y: 0, w: 768, h: 1920 },
    label: { x: 1200, y: 20, w: 312, h: 56 },
    heading: { x: 800, y: 320, w: 712, h: 112 },
    subheading: { x: 800, y: 444, w: 712, h: 80 },
    body: { x: 800, y: 536, w: 712, h: 1180 },
    footer: { x: 800, y: 1768, w: 712, h: 120 },
    logo: { x: 1208, y: 1728, w: 304, h: 112 },
  },
  "9:16": {
    hero: { x: 0, y: 0, w: 1080, h: 1920 },
    label: { x: 708, y: 20, w: 348, h: 52 },
    heading: { x: 48, y: 168, w: 984, h: 132 },
    subheading: { x: 48, y: 312, w: 984, h: 84 },
    body: { x: 48, y: 412, w: 984, h: 1220 },
    footer: { x: 48, y: 1704, w: 920, h: 176 },
    logo: { x: 708, y: 1704, w: 348, h: 120 },
  },
};

export type SocialTemplate1TextKey = keyof SocialTemplate1State["texts"];

/** Typography on the design canvas (px / unitless line-height). */
export const TEMPLATE_1_TEXT_STYLES: Record<
  AspectRatio,
  Record<
    SocialTemplate1TextKey,
    { fontSize: number; lineHeight: number; fontWeight: number; letterSpacing?: string }
  >
> = {
  "16:9": {
    label: { fontSize: 15, lineHeight: 1.15, fontWeight: 700, letterSpacing: "0.14em" },
    heading: { fontSize: 92, lineHeight: 0.98, fontWeight: 700 },
    subheading: { fontSize: 48, lineHeight: 1.12, fontWeight: 500 },
    body: { fontSize: 18, lineHeight: 1.35, fontWeight: 400 },
    footer: { fontSize: 14, lineHeight: 1.35, fontWeight: 700 },
  },
  "1:1": {
    label: { fontSize: 14, lineHeight: 1.15, fontWeight: 700, letterSpacing: "0.14em" },
    heading: { fontSize: 52, lineHeight: 1, fontWeight: 700 },
    subheading: { fontSize: 27, lineHeight: 1.12, fontWeight: 500 },
    body: { fontSize: 14, lineHeight: 1.35, fontWeight: 400 },
    footer: { fontSize: 12, lineHeight: 1.35, fontWeight: 700 },
  },
  "4:5": {
    label: { fontSize: 15, lineHeight: 1.15, fontWeight: 700, letterSpacing: "0.14em" },
    heading: { fontSize: 74, lineHeight: 0.98, fontWeight: 700 },
    subheading: { fontSize: 38, lineHeight: 1.12, fontWeight: 500 },
    body: { fontSize: 18, lineHeight: 1.35, fontWeight: 400 },
    footer: { fontSize: 14, lineHeight: 1.35, fontWeight: 700 },
  },
  "9:16": {
    label: { fontSize: 15, lineHeight: 1.15, fontWeight: 700, letterSpacing: "0.14em" },
    heading: { fontSize: 92, lineHeight: 0.98, fontWeight: 700 },
    subheading: { fontSize: 48, lineHeight: 1.12, fontWeight: 500 },
    body: { fontSize: 18, lineHeight: 1.35, fontWeight: 400 },
    footer: { fontSize: 14, lineHeight: 1.35, fontWeight: 700 },
  },
};

export function isTextTemplateElement(
  id: SocialTemplate1ElementId,
): id is Exclude<SocialTemplate1ElementId, "hero" | "logo"> {
  return id !== "hero" && id !== "logo";
}

export function defaultSocialTemplate1State(
  aspect: AspectRatio,
): SocialTemplate1State {
  const boxes = structuredClone(BOXES[aspect]);
  return {
    aspectRatio: aspect,
    texts: { ...DEFAULT_TEXTS },
    heroUrl: null,
    logoUrl: null,
    boxes,
  };
}

export function remapSocialTemplate1Aspect(
  prev: SocialTemplate1State,
  nextAspect: AspectRatio,
): SocialTemplate1State {
  if (prev.aspectRatio === nextAspect) return prev;
  return {
    ...prev,
    aspectRatio: nextAspect,
    boxes: structuredClone(BOXES[nextAspect]),
  };
}

export function isSplitHeroLayout(aspect: AspectRatio): boolean {
  return aspect !== "9:16";
}

/** Pre–design-px sessions stored `%`-like boxes; remap to pixel layout on design canvas. */
export function migrateSocialTemplate1StateIfLegacy(
  state: SocialTemplate1State,
): SocialTemplate1State {
  if (state.boxes.hero.w > 200) return state;
  return {
    ...state,
    boxes: structuredClone(BOXES[state.aspectRatio]),
  };
}

export function clampTemplate1Box(
  aspect: AspectRatio,
  id: SocialTemplate1ElementId,
  b: SocialTemplate1Box,
): SocialTemplate1Box {
  const { width: cw, height: ch } = TEMPLATE_1_DESIGN_CANVAS[aspect];
  const isText = isTextTemplateElement(id);
  const minW = isText ? MIN_TEXT_W : MIN_IMG;
  const minH = isText ? MIN_TEXT_H : MIN_IMG;

  let { x, y, w, h } = b;
  w = Math.max(minW, w);
  h = Math.max(minH, h);
  x = Math.max(0, Math.min(cw - w, x));
  y = Math.max(0, Math.min(ch - h, y));

  if (x + w > cw) w = cw - x;
  if (y + h > ch) h = ch - y;

  return { x, y, w, h: Math.max(minH, h) };
}
