export type ImageSettings = {
  assetType?: string;
  aspectRatio: string;
  resolution: string;
  numberOfVariations?: number;
  targetWidth?: number;
  targetHeight?: number;
  variationIndex?: number;
  variationTotal?: number;
  referenceImageCount?: number;
  editorContext?: {
    enhanceBrightness: number;
    enhanceSaturation: number;
    textItems: Array<{
      text: string;
      fontFamily: string;
      fontWeight?: number;
      color: string;
      xPct: number;
      yPct: number;
    }>;
    templateLabel: string | null;
    hasAddMask?: boolean;
    hasRemoveMask?: boolean;
    hasIsolatedMaskRefs?: boolean;
  };
};

function cleanPrompt(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function isVaguePrompt(input: string): boolean {
  if (!input) return true;
  const words = input.split(/\s+/).filter(Boolean);
  return words.length <= 3 || input.length < 18;
}

function subjectLine(prompt: string): string {
  if (!prompt) {
    return "A clear, visually compelling primary subject aligned to the user's intent.";
  }
  if (!isVaguePrompt(prompt)) {
    return prompt;
  }
  return `${prompt}; elevate it into a premium, visually striking hero subject with realistic form and materials.`;
}

function describeAssetTypeForPrompt(assetType: string): string {
  switch (assetType) {
    case "Social Media":
      return "social media post creative: scroll-stopping, platform-ready composition and safe focal framing";
    case "Email":
      return "email header / newsletter hero: clear hierarchy, readable at typical email preview sizes";
    case "Digital":
      return "digital display or web ad creative: high-impact campaign visual for screens and banners";
    default:
      return "premium commercial photograph / hero visual: versatile, polished, brand-ready";
  }
}

function describeAspectForPrompt(aspectRatio: string): string {
  switch (aspectRatio) {
    case "16:9":
      return "wide landscape 16:9 — photograph fills the entire frame edge-to-edge; scene and subject use the full width and height (no empty bands)";
    case "1:1":
      return "square 1:1 — photograph fills the entire square edge-to-edge; balanced subject and environment using the full frame";
    case "4:5":
      return "vertical portrait 4:5 — photograph fills the entire frame edge-to-edge; editorial portrait using full height and width";
    case "9:16":
      return "tall vertical 9:16 — photograph fills the entire frame edge-to-edge; full-height composition for mobile vertical formats";
    default:
      return `composition matched to aspect ratio ${aspectRatio} — fill the entire frame edge-to-edge`;
  }
}

function sceneLine(assetType: string | undefined, prompt: string): string {
  const channel = assetType?.trim() ? `${assetType.trim()}-appropriate` : "purposeful";
  if (isVaguePrompt(prompt)) {
    return `Place the subject in a coherent, ${channel} environment with believable depth, scale, and supporting elements.`;
  }
  return `Build a coherent, ${channel} scene that strengthens the subject narrative without clutter.`;
}

function buildEditorContextAppendix(opts: ImageSettings["editorContext"]): string {
  if (!opts) return "";
  
  const lines: string[] = [];
  lines.push("[Image editor context]");
  
  if (opts.templateLabel) {
    lines.push(`- Template: ${opts.templateLabel}`);
  }
  
  if (opts.hasAddMask) {
    lines.push(
      "- The first reference is a flattened composite of the current image. Semi-transparent blue/cool highlights mark the exact region(s) where the user wants NEW objects or content ADDED. Follow the user's prompt and place additions naturally in those highlighted areas, blended with the scene.",
    );
  }
  
  if (opts.hasRemoveMask) {
    lines.push(
      "- Semi-transparent red/warm highlights on the composite mark region(s) to edit: remove existing content there, then follow prompt/reference guidance for what should appear in that painted area.",
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

function technicalLine(settings: ImageSettings): string {
  const parts: string[] = [`${settings.aspectRatio} aspect ratio`, `${settings.resolution} resolution`];
  if (typeof settings.numberOfVariations === "number" && settings.numberOfVariations > 1) {
    parts.push(`${settings.numberOfVariations} variation-ready framing consistency`);
  }
  return parts.join(", ");
}

export function buildImagePrompt(userPrompt: string, settings: ImageSettings): string {
  const prompt = cleanPrompt(userPrompt);
  
  // Build comprehensive prompt using the API route's logic
  const assetNarrative = settings.assetType ? describeAssetTypeForPrompt(settings.assetType) : "premium commercial photograph / hero visual: versatile, polished, brand-ready";
  const aspectNarrative = describeAspectForPrompt(settings.aspectRatio);
  
  const referenceBlock = settings.referenceImageCount && settings.referenceImageCount > 0
    ? `
  - Reference images: The user attached ${settings.referenceImageCount} image(s) in this request. Use them for subject matter, palette, composition, and style unless the written brief clearly conflicts — then prioritize the text.
`
    : "";
    
  const variationBlock = settings.variationTotal && settings.variationTotal > 1
    ? `
 Variation ${settings.variationIndex ? settings.variationIndex + 1 : 1} of ${settings.variationTotal}: produce a distinct professional interpretation of the same brief (unique pose, lighting, or layout), not a near-duplicate of other variations.
`
    : "";

  const dimensionBlock = settings.targetWidth && settings.targetHeight
    ? ` - Output dimensions (mandatory): the final image MUST be exactly ${settings.targetWidth} pixels wide by ${settings.targetHeight} pixels tall — no other width or height.`
    : "";

  const fullBleedBlock = settings.targetWidth && settings.targetHeight
    ? ` - Full-bleed photograph: the image must be a single continuous photograph that completely fills every pixel of the ${settings.targetWidth}×${settings.targetHeight} canvas. Subject, sky, ground, and environment extend to all four edges. There must be NO letterboxing, NO pillarboxing, NO black bars, NO gray mattes, NO cinematic "widescreen" bands, NO empty margins, NO frames-within-frames, and NO unused solid-color strips — unless the user's written prompt explicitly asks for bars, frames, or matte effects by name.`
    : "";

  let finalPrompt = `
  Create a premium, professional ${assetNarrative}.

  User request:
  ${prompt}

  Generation requirements:
  - Asset type: ${settings.assetType || "Standard"} — ${assetNarrative}
  - Aspect ratio: ${settings.aspectRatio} — ${aspectNarrative}
${dimensionBlock}
${fullBleedBlock}
  - Resolution label: ${settings.resolution} — match detail level appropriate for ${settings.targetWidth && settings.targetHeight ? `${settings.targetWidth}×${settings.targetHeight}px` : "selected resolution"}.
${referenceBlock}
  - Composition must be native to ${settings.aspectRatio}: design the shot as if shooting with a camera sensor in that exact aspect — not a smaller photo pasted onto a larger canvas.

  High-end, cinematic execution: ultra-detailed, sharp focus, perfect composition.
  Premium lighting, realistic materials, high dynamic range.
  Clean image: no random text, no watermarks, no logos, no UI chrome unless the user explicitly asked for text in the scene.
  No distortion, no artifacts, no blur.

  Style: modern commercial photography / luxury brand aesthetic.
  Depth of field, cinematic lighting, studio quality where appropriate.
  Balanced color grading, high contrast, visually striking — world-class advertisement quality.
${variationBlock}
  `.trim();

  // Add editor context if present
  const editorAppendix = buildEditorContextAppendix(settings.editorContext);
  if (editorAppendix) {
    finalPrompt += `\n\n${editorAppendix}`;
  }

  return finalPrompt;
}
