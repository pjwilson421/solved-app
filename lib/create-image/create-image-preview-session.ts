import type { AspectRatio, Quality } from "@/components/create-image/types";
import { ASPECT_RATIOS, normalizeQuality } from "@/components/create-image/types";

const KEY = "solved-app-create-image-preview-v1";

export type StoredCreateImagePreview = {
  v: 1;
  slotImages: string[];
  slotFileIds: string[];
  previewPrompt: string;
  previewAt: string | null;
  activeHistoryId: string | null;
  displayAspectRatio: AspectRatio;
  displayQuality: Quality;
  displayVariations: number;
};

function isAspectRatio(v: unknown): v is AspectRatio {
  return typeof v === "string" && (ASPECT_RATIOS as readonly string[]).includes(v);
}

export function readStoredCreateImagePreview(): StoredCreateImagePreview | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as unknown;
    if (!data || typeof data !== "object") return null;
    const o = data as Record<string, unknown>;
    if (o.v !== 1) return null;
    if (!Array.isArray(o.slotImages)) return null;
    const slotImages = o.slotImages.filter(
      (x): x is string => typeof x === "string",
    );
    if (!slotImages.some((u) => u.trim().length > 0)) return null;

    const slotFileIds = Array.isArray(o.slotFileIds)
      ? o.slotFileIds.filter((x): x is string => typeof x === "string")
      : [];

    const previewPrompt =
      typeof o.previewPrompt === "string" ? o.previewPrompt : "";
    const previewAt =
      typeof o.previewAt === "string" && o.previewAt.length > 0
        ? o.previewAt
        : null;
    const activeHistoryId =
      typeof o.activeHistoryId === "string" && o.activeHistoryId.length > 0
        ? o.activeHistoryId
        : null;

    const displayAspectRatio = isAspectRatio(o.displayAspectRatio)
      ? o.displayAspectRatio
      : "16:9";
    const displayQuality = normalizeQuality(
      typeof o.displayQuality === "string" ? o.displayQuality : "4K",
    );
    const displayVariations =
      typeof o.displayVariations === "number" &&
      Number.isFinite(o.displayVariations) &&
      o.displayVariations >= 1
        ? Math.floor(o.displayVariations)
        : 1;

    return {
      v: 1,
      slotImages,
      slotFileIds,
      previewPrompt,
      previewAt,
      activeHistoryId,
      displayAspectRatio,
      displayQuality,
      displayVariations,
    };
  } catch {
    return null;
  }
}

export function writeStoredCreateImagePreview(
  payload: StoredCreateImagePreview,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

export function clearStoredCreateImagePreview(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
