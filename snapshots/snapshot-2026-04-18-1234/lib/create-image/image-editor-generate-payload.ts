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
 * Extra instructions appended to the user prompt so the model sees editor metadata
 * (template, enhance, text) even though the first reference is a flattened composite.
 */
export function buildImageEditorPromptAppendix(opts: {
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
}): string {
  const lines: string[] = [];
  lines.push("[Image editor context]");
  if (opts.templateLabel) {
    lines.push(`- Template: ${opts.templateLabel}`);
  }
  if (opts.hasAddMask) {
    lines.push(
      "- The first reference is a flattened composite of the current image. Semi-transparent blue/cool highlights mark the exact region(s) where the user wants NEW objects or content ADDED. Follow the user’s prompt and place additions naturally in those highlighted areas, blended with the scene.",
    );
  }
  if (opts.hasRemoveMask) {
    lines.push(
      "- Semi-transparent red/warm highlights on the composite mark region(s) the user wants REMOVED or seamlessly inpainted away (per the user’s prompt).",
    );
  }
  if (opts.hasIsolatedMaskRefs) {
    lines.push(
      "- After the composite, additional reference image(s) are the isolated painted mask layer(s) only (transparent where the user did not paint). Align them with the composite to localize add/remove edits.",
    );
  }
  if (opts.enhanceBrightness !== 100 || opts.enhanceSaturation !== 100) {
    lines.push(
      `- Preview adjustments on base image: brightness ${opts.enhanceBrightness}%, saturation ${opts.enhanceSaturation}%.`,
    );
  }
  const texts = opts.textItems.filter((t) => t.text.trim());
  if (texts.length > 0) {
    lines.push(
      "- Text overlays on the preview (preserve content, fonts, and approximate placement):",
    );
    for (const t of texts) {
      lines.push(
        `  • "${t.text.trim()}" (font: ${t.fontFamily}; weight: ${t.fontWeight ?? 400}; color: ${t.color})`,
      );
    }
  }
  lines.push(
    "- First reference image: flattened composite of the editor canvas (base + mask overlays + drawings + text) at generate time.",
  );
  return lines.join("\n");
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
