import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import {
  resolveGenerationDimensions,
  type GenerationResolutionKey,
} from "@/lib/create-image/generation-dimensions";
import { buildImagePrompt, type ImageSettings } from "@/lib/ai/build-image-prompt";

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

type ResolutionKey = GenerationResolutionKey;

function normalizeResolution(raw: string): ResolutionKey {
  const u = raw.trim().toUpperCase();
  if (u === "1K") return "1K";
  if (u === "2K") return "2K";
  if (u === "4K") return "4K";
  if (u === "6K") return "4K";
  if (u === "8K") return "4K";
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

/** Reject trim if it would shrink the canvas too aggressively (avoid ruining valid dark-edge art). */
function trimResultIsPlausible(
  trimmedW: number,
  trimmedH: number,
  targetWidth: number,
  targetHeight: number,
): boolean {
  const minSide = Math.min(targetWidth, targetHeight);
  if (trimmedW < minSide * 0.35 || trimmedH < minSide * 0.35) return false;
  return true;
}

/**
 * Gemini image models may return a tiered raster and sometimes bake letterboxing / black
 * mattes into the bitmap even at the target size. We trim uniform edges, then resize with
 * `cover` so the final file is exactly WxH with photographic content filling the frame.
 */
async function ensureImagePixelDimensions(
  base64: string,
  mime: string,
  targetWidth: number,
  targetHeight: number,
): Promise<{ base64: string; mime: string }> {
  try {
    const inputBuffer = Buffer.from(base64, "base64");
    if (inputBuffer.length === 0) {
      throw new Error("empty decoded image");
    }
    const rotated = await sharp(inputBuffer).rotate().toBuffer();

    let working = rotated;
    try {
      const trimmedBuf = await sharp(rotated)
        .trim({
          threshold: 16,
          lineArt: false,
        })
        .toBuffer();
      const tMeta = await sharp(trimmedBuf).metadata();
      const tw = tMeta.width ?? 0;
      const th = tMeta.height ?? 0;
      if (
        tw > 0 &&
        th > 0 &&
        trimResultIsPlausible(tw, th, targetWidth, targetHeight)
      ) {
        working = trimmedBuf;
      }
    } catch {
      /* trim not applicable — keep rotated buffer */
    }

    const meta = await sharp(working).metadata();
    const w = meta.width ?? 0;
    const h = meta.height ?? 0;
    if (w !== targetWidth || h !== targetHeight) {
      console.warn("[api/ai/generate-image] Normalizing model output to canonical pixels", {
        modelPixels: { width: w, height: h },
        targetPixels: { width: targetWidth, height: targetHeight },
      });
    }
    const outBuffer = await sharp(working)
      .resize(targetWidth, targetHeight, {
        fit: "cover",
        position: "centre",
      })
      .png({ compressionLevel: 6, effort: 4 })
      .toBuffer();
    return {
      base64: outBuffer.toString("base64"),
      mime: "image/png",
    };
  } catch (e) {
    console.error(
      "[api/ai/generate-image] Pixel normalize failed; returning raw model image (dimensions may differ)",
      e,
    );
    return { base64, mime };
  }
}

/** Gemini `imageConfig.imageSize`: 1K / 2K / 4K — map app qualities to closest tier. */
function qualityToGeminiImageSize(resolution: ResolutionKey): "1K" | "2K" | "4K" {
  if (resolution === "1K") return "1K";
  if (resolution === "2K") return "2K";
  if (resolution === "4K") return "4K";
  return "4K";
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

/** Google AI Studio / Gemini keys — use process.env for production consistency. */
function resolveGeminiApiKey(cwd: string): string | undefined {
  for (const name of GEMINI_KEY_NAMES) {
    const fromProc = process.env[name]?.trim();
    if (fromProc) return fromProc;
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

const MAX_REFERENCE_IMAGES = 8;
const MAX_REFERENCE_BASE64_CHARS = 18_000_000;

function parseReferenceImages(raw: unknown): { mimeType: string; data: string }[] {
  if (!Array.isArray(raw)) return [];
  const out: { mimeType: string; data: string }[] = [];
  for (const item of raw) {
    if (out.length >= MAX_REFERENCE_IMAGES) break;
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const mimeType =
      typeof rec.mimeType === "string" ? rec.mimeType.trim() : "";
    const data =
      typeof rec.data === "string" ? rec.data.trim().replace(/\s/g, "") : "";
    if (!mimeType || !data || !/^image\//i.test(mimeType)) continue;
    if (data.length > MAX_REFERENCE_BASE64_CHARS) continue;
    out.push({ mimeType, data });
  }
  return out;
}

function parseBodySettings(body: unknown): {
  prompt: string;
  assetType: string;
  aspectRatio: string;
  resolution: ResolutionKey;
  numberOfVariations: number;
  referenceImages: { mimeType: string; data: string }[];
} | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;

  const referenceImages = parseReferenceImages(o.referenceImages);

  const rawPrompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
  if (!rawPrompt && referenceImages.length === 0) return null;

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
    referenceImages,
  };
}

async function generateOneImage(params: {
  apiUrl: string;
  fullPrompt: string;
  aspectRatio: string;
  geminiImageSize: "1K" | "2K" | "4K";
  targetWidth: number;
  targetHeight: number;
  referenceImages: { mimeType: string; data: string }[];
}): Promise<string> {
  const parts: object[] = params.referenceImages.map((img) => ({
    inlineData: {
      mimeType: img.mimeType,
      data: img.data,
    },
  }));
  parts.push({ text: params.fullPrompt });

  const res = await fetch(params.apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts }],
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

  const normalized = await ensureImagePixelDimensions(
    extracted.base64,
    extracted.mime,
    params.targetWidth,
    params.targetHeight,
  );
  return `data:${normalized.mime};base64,${normalized.base64}`;
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

    const {
      prompt,
      assetType,
      aspectRatio,
      resolution,
      numberOfVariations,
      referenceImages,
    } = parsed;

    const { width, height } = resolveGenerationDimensions(aspectRatio, resolution);
    const geminiImageSize = qualityToGeminiImageSize(resolution);

    console.log("[api/ai/generate-image] Received image generation settings:", {
      prompt,
      assetType,
      aspectRatio,
      resolution,
      numberOfVariations,
      referenceImageCount: referenceImages.length,
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
            "Image generation is not configured. Set GEMINI_API_KEY environment variable and try again.",
        },
        { status: 500 },
      );
    }

    const model =
      process.env.GEMINI_IMAGE_MODEL?.trim() ||
      DEFAULT_IMAGE_MODEL;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

    const indices = Array.from({ length: numberOfVariations }, (_, i) => i);

    try {
      const images = await Promise.all(
        indices.map((variationIndex) => {
          const imageSettings: ImageSettings = {
            assetType,
            aspectRatio,
            resolution,
            numberOfVariations,
            targetWidth: width,
            targetHeight: height,
            variationIndex,
            variationTotal: numberOfVariations,
            referenceImageCount: referenceImages.length,
          };
          const fullPrompt = buildImagePrompt(prompt, imageSettings);
          return generateOneImage({
            apiUrl,
            fullPrompt,
            aspectRatio,
            geminiImageSize,
            targetWidth: width,
            targetHeight: height,
            referenceImages,
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
