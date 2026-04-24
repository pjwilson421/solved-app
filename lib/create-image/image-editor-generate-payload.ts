import type { EditorTextItem } from "@/components/create-image/ImageEditorTextOverlay";
import {
  type ReferenceImageApiPart,
  referenceImagePartFromDataUrl,
} from "@/lib/create-image/encode-reference-images";

const MAX_COMPOSE_DIMENSION = 2048;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(new Error(`Image load failed: ${src.slice(0, 64)}…`));
    img.src = src;
  });
}

async function loadOptionalDataUrl(
  dataUrl: string | null,
): Promise<HTMLImageElement | null> {
  if (!dataUrl?.trim()) return null;
  try {
    return await loadImage(dataUrl);
  } catch {
    return null;
  }
}

/**
 * Helper to create editor context settings for the centralized prompt builder.
 * This replaces the old buildImageEditorPromptAppendix function.
 */
export function createEditorContextSettings(opts: {
  enhanceBrightness: number;
  enhanceSaturation: number;
  textItems: EditorTextItem[];
  /** Human-readable template name when the editor supports templates; else null. */
  templateLabel: string | null;
  /** Add-tool mask is included in the composite; guides where to place new content. */
  hasAddMask?: boolean;
  /** Remove-tool mask is included in the composite; guides what to erase/inpaint. */
  hasRemoveMask?: boolean;
  /** Extra reference image(s) after the composite are mask-only layers (same alignment). */
  hasIsolatedMaskRefs?: boolean;
}) {
  return {
    enhanceBrightness: opts.enhanceBrightness,
    enhanceSaturation: opts.enhanceSaturation,
    textItems: opts.textItems,
    templateLabel: opts.templateLabel,
    hasAddMask: opts.hasAddMask,
    hasRemoveMask: opts.hasRemoveMask,
    hasIsolatedMaskRefs: opts.hasIsolatedMaskRefs,
  };
}

/**
 * Rasterize the current editor preview into one PNG suitable as the primary reference image.
 */
export async function composeEditorImageForGeneration(opts: {
  baseImageUrl: string;
  brightnessPct: number;
  saturationPct: number;
  addMaskPngDataUrl: string | null;
  removeMaskPngDataUrl: string | null;
  drawPngDataUrl: string | null;
  textItems: EditorTextItem[];
}): Promise<ReferenceImageApiPart | null> {
  const base = await loadImage(opts.baseImageUrl.trim());
  let w = base.naturalWidth;
  let h = base.naturalHeight;
  if (!w || !h) return null;

  const scale = Math.min(1, MAX_COMPOSE_DIMENSION / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const filter =
    opts.brightnessPct === 100 && opts.saturationPct === 100
      ? "none"
      : `brightness(${opts.brightnessPct}%) saturate(${opts.saturationPct}%)`;

  ctx.save();
  ctx.filter = filter;
  ctx.drawImage(base, 0, 0, tw, th);
  ctx.restore();

  const [addL, removeL, drawL] = await Promise.all([
    loadOptionalDataUrl(opts.addMaskPngDataUrl),
    loadOptionalDataUrl(opts.removeMaskPngDataUrl),
    loadOptionalDataUrl(opts.drawPngDataUrl),
  ]);

  if (addL) ctx.drawImage(addL, 0, 0, tw, th);
  if (removeL) ctx.drawImage(removeL, 0, 0, tw, th);
  if (drawL) ctx.drawImage(drawL, 0, 0, tw, th);

  const fontScale = tw / 1000;
  for (const item of opts.textItems) {
    const t = item.text.trim();
    if (!t) continue;
    const fontPx = Math.max(
      10,
      Math.min(56, Math.round(16 * Math.max(0.85, fontScale))),
    );
    const weight = (item.fontWeight ?? 400) >= 700 ? "700" : "400";
    ctx.save();
    ctx.font = `${weight} ${fontPx}px ${item.fontFamily}`;
    ctx.fillStyle = item.color;
    const x = (item.xPct / 100) * tw - 2;
    const y = (item.yPct / 100) * th - 2;
    ctx.fillText(t, x, y);
    ctx.restore();
  }

  let dataUrl: string;
  try {
    dataUrl = canvas.toDataURL("image/png");
  } catch {
    return null;
  }
  return referenceImagePartFromDataUrl(dataUrl);
}
