import {
  defaultSocialTemplate1State,
  migrateSocialTemplate1StateIfLegacy,
  SOCIAL_TEMPLATE_1_MENU_THUMB,
  type SocialTemplate1State,
} from "@/lib/create-image/composed-templates/social-template-1";
import { makePersistableThumbnail } from "@/lib/create-image/make-persistable-thumbnail";

export function isSocialTemplate1Dirty(
  state: SocialTemplate1State | null,
): boolean {
  if (!state) return false;
  const d = defaultSocialTemplate1State(state.aspectRatio);
  const migrated = migrateSocialTemplate1StateIfLegacy(state);
  if (migrated.heroUrl || migrated.logoUrl) return true;
  if (JSON.stringify(migrated.texts) !== JSON.stringify(d.texts)) return true;
  if (JSON.stringify(migrated.boxes) !== JSON.stringify(d.boxes)) return true;
  return false;
}

export function isSlotTemplateDirty(slotUrls: string[]): boolean {
  return slotUrls.some((u) => typeof u === "string" && u.trim().length > 0);
}

/**
 * Clone composed template state and replace blob: media with small JPEG data URLs
 * so drafts can be stored on activity entries and survive session navigation.
 */
export async function snapshotSocialTemplate1ForDraft(
  state: SocialTemplate1State,
): Promise<SocialTemplate1State> {
  const migrated = migrateSocialTemplate1StateIfLegacy(structuredClone(state));
  let heroUrl = migrated.heroUrl;
  let logoUrl = migrated.logoUrl;
  if (heroUrl) {
    const t = await makePersistableThumbnail(heroUrl);
    if (t) heroUrl = t;
  }
  if (logoUrl) {
    const t = await makePersistableThumbnail(logoUrl);
    if (t) logoUrl = t;
  }
  return { ...migrated, heroUrl, logoUrl };
}

/** Thumbnail for a template draft row when no hero image is set. */
export function socialTemplate1DraftFallbackThumb(): string {
  return SOCIAL_TEMPLATE_1_MENU_THUMB;
}
