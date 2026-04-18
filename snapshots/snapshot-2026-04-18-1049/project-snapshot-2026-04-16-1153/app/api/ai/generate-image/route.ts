import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DEFAULT_IMAGE_MODEL = "gemini-2.5-flash-image";

const GEMINI_KEY_NAMES = [
  "GEMINI_API_KEY",
  "GOOGLE_GENERATIVE_AI_API_KEY",
  "GOOGLE_AI_API_KEY",
] as const;

const VALID_ASSET_TYPES = new Set([
  "Standard",
  "Social Media",
  "Email",
  "Digital",
]);

const VALID_ASPECT_RATIOS = new Set(["16:9", "1:1", "4:5", "9:16"]);

/** Target pixel dimensions for prompt guidance (Gemini uses imageConfig for actual output tier). */
const DIMENSION_MAP: Record<
  string,
  Record<string, { width: number; height: number }>
> = {
  "16:9": {
    "1K": { width: 1024, height: 576 },
    "4K": { width: 3840, height: 2160 },
    "6K": { width: 5760, height: 3240 },
    "8K": { width: 7680, height: 4320 },
  },
  "1:1": {
    "1K": { width: 1024, height: 1024 },
    "4K": { width: 4096, height: 4096 },
    "6K": { width: 6144, height: 6144 },
    "8K": { width: 8192, height: 8192 },
  },
  "4:5": {
    "1K": { width: 1024, height: 1280 },
    "4K": { width: 3277, height: 4096 },
    "6K": { width: 4915, height: 6144 },
    "8K": { width: 6554, height: 8192 },
  },
  "9:16": {
    "1K": { width: 576, height: 1024 },
    "4K": { width: 2160, height: 3840 },
    "6K": { width: 3240, height: 5760 },
    "8K": { width: 4320, height: 7680 },
  },
};

type ResolutionKey = "1K" | "4K" | "6K" | "8K";

function normalizeResolution(raw: string): ResolutionKey {
  const u = raw.trim().toUpperCase();
  if (u === "1K") return "1K";
  if (u === "4K") return "4K";
  if (u === "6K") return "6K";
  if (u === "8K") return "8K";
  return "4K";
}

function normalizeAspectRatio(raw: string): string {
  const t = raw.trim();
  if (VALID_ASPECT_RATIOS.has(t)) return t;
  return "16:9";
}

function normalizeAssetType(raw: string): string {
  const t = raw.trim();
  if (VALID_ASSET_TYPES.has(t)) return t;
  return "Standard";
}

function resolveDimensions(
  aspectRatio: string,
  resolution: ResolutionKey,
): { width: number; height: number } {
  const byAspect = DIMENSION_MAP[aspectRatio];
  if (byAspect?.[resolution]) return byAspect[resolution];
  return DIMENSION_MAP["16:9"][resolution] ?? DIMENSION_MAP["16:9"]["4K"];
}

/** Gemini `imageConfig.imageSize`: 1K / 2K / 4K — map app qualities to closest tier. */
function qualityToGeminiImageSize(resolution: ResolutionKey): "1K" | "2K" | "4K" {
  if (resolution === "1K") return "1K";
  if (resolution === "4K") return "4K";
  return "4K";
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
      return "wide cinematic 16:9 composition — horizontal, generous negative space, landscape storytelling";
    case "1:1":
      return "square 1:1 composition — centered subject, balanced for feeds and thumbnails";
    case "4:5":
      return "vertical portrait 4:5 composition — taller than wide, editorial / feed portrait framing";
    case "9:16":
      return "tall mobile-first 9:16 composition — full vertical story / reels / poster strip framing";
    default:
      return `composition matched to aspect ratio ${aspectRatio}`;
  }
}

function buildGenerationPrompt({
  userPrompt,
  assetType,
  aspectRatio,
  resolution,
  targetWidth,
  targetHeight,
  variationIndex,
  variationTotal,
}: {
  userPrompt: string;
  assetType: string;
  aspectRatio: string;
  resolution: string;
  targetWidth: number;
  targetHeight: number;
  variationIndex: number;
  variationTotal: number;
}) {
  const assetNarrative = describeAssetTypeForPrompt(assetType);
  const aspectNarrative = describeAspectForPrompt(aspectRatio);
  const variationBlock =
    variationTotal > 1
      ? `
 Variation ${variationIndex + 1} of ${variationTotal}: produce a distinct professional interpretation of the same brief (unique pose, lighting, or layout), not a near-duplicate of other variations.
`
      : "";

  return `
  Create a premium, professional ${assetNarrative}.

  User request:
  ${userPrompt}

  Generation requirements:
  - Asset type: ${assetType} — ${assetNarrative}
  - Aspect ratio: ${aspectRatio} — ${aspectNarrative}. Frame for this ratio natively (do not show letterboxing or crop guides).
  - Resolution target: ${resolution} — design detail appropriate for approximately ${targetWidth}×${targetHeight}px output tier.
  - Composition must be designed correctly for ${aspectRatio}; subject and environment should feel native to that frame, not cropped from another ratio.

  High-end, cinematic execution: ultra-detailed, sharp focus, perfect composition.
  Premium lighting, realistic materials, high dynamic range.
  Clean image: no random text, no watermarks, no logos, no UI chrome unless the user explicitly asked for text in the scene.
  No distortion, no artifacts, no blur.

  Style: modern commercial photography / luxury brand aesthetic.
  Depth of field, cinematic lighting, studio quality where appropriate.
  Balanced color grading, high contrast, visually striking — world-class advertisement quality.
  ${variationBlock}
  `.trim();
}

/**
 * Read a single KEY=value from `.env.local` on disk.
 * Next/dotenv often leaves stale empty `process.env.GEMINI_API_KEY` after the file was updated;
 * parsing the file avoids that and picks up keys as soon as the file is saved (no restart).
 */
function readEnvLocalValue(cwd: string, keyName: string): string | undefined {
  try {
    const p = join(cwd, ".env.local");
    if (!existsSync(p)) return undefined;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const k = trimmed.slice(0, eq).trim();
      if (k !== keyName) continue;
      let v = trimmed.slice(eq + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      const out = v.trim();
      return out || undefined;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Google AI Studio / Gemini keys — process.env first, then fresh parse of `.env.local`. */
function resolveGeminiApiKey(cwd: string): string | undefined {
  for (const name of GEMINI_KEY_NAMES) {
    const fromProc = process.env[name]?.trim();
    if (fromProc) return fromProc;
    const fromFile = readEnvLocalValue(cwd, name);
    if (fromFile) return fromFile;
  }
  return undefined;
}

type InlineBlob = {
  data?: string;
  mimeType?: string;
  mime_type?: string;
};

function readInlineBlob(part: object): InlineBlob | undefined {
  if ("inlineData" in part && part.inlineData && typeof part.inlineData === "object") {
    return part.inlineData as InlineBlob;
  }
  if ("inline_data" in part && part.inline_data && typeof part.inline_data === "object") {
    return part.inline_data as InlineBlob;
  }
  return undefined;
}

function extractInlineImageFromResponse(data: unknown): {
  base64: string;
  mime: string;
} | null {
  const root = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
  const candidates = root?.candidates;
  if (!Array.isArray(candidates)) return null;

  for (const cand of candidates) {
    if (!cand || typeof cand !== "object") continue;
    const content = (cand as { content?: { parts?: unknown[] } }).content;
    const parts = content?.parts;
    if (!Array.isArray(parts)) continue;

    for (const p of parts) {
      if (!p || typeof p !== "object") continue;
      const inline = readInlineBlob(p as object);
      if (!inline) continue;
      const base64 = inline.data;
      if (typeof base64 !== "string" || !base64.length) continue;
      const mime =
        (typeof inline.mimeType === "string" && inline.mimeType) ||
        (typeof inline.mime_type === "string" && inline.mime_type) ||
        "image/png";
      return { base64, mime: mime.trim() };
    }
  }
  return null;
}

function parseBodySettings(body: unknown): {
  prompt: string;
  assetType: string;
  aspectRatio: string;
  resolution: ResolutionKey;
  numberOfVariations: number;
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const rawPrompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
  if (!rawPrompt) return null;

  const assetType =
    typeof o.assetType === "string"
      ? normalizeAssetType(o.assetType)
      : normalizeAssetType("Standard");

  const aspectRatio =
    typeof o.aspectRatio === "string"
      ? normalizeAspectRatio(o.aspectRatio)
      : normalizeAspectRatio("16:9");

  const resRaw =
    typeof o.resolution === "string"
      ? o.resolution
      : typeof o.quality === "string"
        ? o.quality
        : "4K";
  const resolution = normalizeResolution(resRaw);

  let n = 1;
  if (typeof o.numberOfVariations === "number" && Number.isFinite(o.numberOfVariations)) {
    n = Math.floor(o.numberOfVariations);
  } else if (typeof o.numberOfVariations === "string" && o.numberOfVariations.trim()) {
    const p = parseInt(o.numberOfVariations, 10);
    if (Number.isFinite(p)) n = p;
  }
  if (n < 1) n = 1;
  if (n > 4) n = 4;

  return {
    prompt: rawPrompt,
    assetType,
    aspectRatio,
    resolution,
    numberOfVariations: n,
  };
}

async function generateOneImage(params: {
  apiUrl: string;
  fullPrompt: string;
  aspectRatio: string;
  geminiImageSize: "1K" | "2K" | "4K";
}): Promise<string> {
  const res = await fetch(params.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: params.fullPrompt }] }],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: params.aspectRatio,
          imageSize: params.geminiImageSize,
        },
      },
    }),
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const msg =
      data &&
      typeof data === "object" &&
      "error" in data &&
      (data as { error?: { message?: string } }).error &&
      typeof (data as { error: { message?: string } }).error.message === "string"
        ? (data as { error: { message: string } }).error.message
        : "Gemini request failed.";
    throw new Error(msg);
  }

  const extracted = extractInlineImageFromResponse(data);
  if (!extracted) {
    throw new Error("No image was returned from Gemini.");
  }

  return `data:${extracted.mime};base64,${extracted.base64}`;
}

export async function POST(req: Request) {
  try {
    const cwd = process.cwd();

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseBodySettings(body);
    if (!parsed) {
      return Response.json({ error: "Missing or empty prompt" }, { status: 400 });
    }

    const { prompt, assetType, aspectRatio, resolution, numberOfVariations } =
      parsed;

    const { width, height } = resolveDimensions(aspectRatio, resolution);
    const geminiImageSize = qualityToGeminiImageSize(resolution);

    console.log("[api/ai/generate-image] Received image generation settings:", {
      prompt,
      assetType,
      aspectRatio,
      resolution,
      numberOfVariations,
    });
    console.log("[api/ai/generate-image] Resolved target dimensions:", {
      width,
      height,
      geminiImageSize,
    });

    const key = resolveGeminiApiKey(cwd);
    if (!key) {
      console.error(
        "[api/ai/generate-image] No API key in process.env or .env.local (GEMINI_API_KEY=...)",
      );
      return Response.json(
        {
          error:
            "Image generation is not configured. Put your key on one line: GEMINI_API_KEY=your_key (no spaces around =), save .env.local, then try again.",
        },
        { status: 500 },
      );
    }

    const model =
      process.env.GEMINI_IMAGE_MODEL?.trim() ||
      readEnvLocalValue(cwd, "GEMINI_IMAGE_MODEL") ||
      DEFAULT_IMAGE_MODEL;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    const indices = Array.from({ length: numberOfVariations }, (_, i) => i);

    try {
      const images = await Promise.all(
        indices.map((variationIndex) => {
          const fullPrompt = buildGenerationPrompt({
            userPrompt: prompt,
            assetType,
            aspectRatio,
            resolution,
            targetWidth: width,
            targetHeight: height,
            variationIndex,
            variationTotal: numberOfVariations,
          });
          return generateOneImage({
            apiUrl,
            fullPrompt,
            aspectRatio,
            geminiImageSize,
          });
        }),
      );

      return Response.json({
        images,
        image: images[0],
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Image generation failed.";
      console.error("[api/ai/generate-image] Generation error", e);
      return Response.json({ error: msg }, { status: 500 });
    }
  } catch (e) {
    console.error("[api/ai/generate-image] Unexpected error", e);
    return Response.json(
      { error: "Image generation failed." },
      { status: 500 },
    );
  }
}
