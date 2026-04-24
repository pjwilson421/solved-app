import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

/** Override with GEMINI_VIDEO_MODEL — use `veo-3.1-generate-preview` for first+last frame interpolation when your key supports it. */
const DEFAULT_VIDEO_MODEL = "veo-2.0-generate-001";
const POLL_INTERVAL_MS = 10_000;
const MAX_WAIT_MS = 10 * 60 * 1000;
const MAX_FRAME_BASE64_CHARS = 18_000_000;


type VideoOperationLike = {
  name?: string;
  done?: boolean;
  error?: unknown;
  response?: {
    generatedVideos?: Array<{
      video?:
        | string
        | {
            uri?: string;
            url?: string;
            downloadUri?: string;
            name?: string;
          };
    }>;
  };
};

type FramePayload = { mimeType: string; data: string };

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

function resolveGeminiApiKey(cwd: string): string | undefined {
  const fromProc = process.env.GEMINI_API_KEY?.trim();
  if (fromProc) return fromProc;
  return readEnvLocalValue(cwd, "GEMINI_API_KEY");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseFramePayload(raw: unknown): FramePayload | null {
  if (!raw || typeof raw !== "object" || raw === null) return null;
  const o = raw as Record<string, unknown>;
  const mimeType =
    typeof o.mimeType === "string" ? o.mimeType.trim().toLowerCase() : "";
  const data =
    typeof o.data === "string" ? o.data.trim().replace(/\s/g, "") : "";
  if (!mimeType || !/^image\/(jpeg|png|webp)$/.test(mimeType)) return null;
  if (!data || data.length > MAX_FRAME_BASE64_CHARS) return null;
  return { mimeType, data };
}

function videoAspectFromUi(aspect: string): "16:9" | "9:16" {
  const a = aspect.trim();
  if (a === "9:16" || a === "4:5") return "9:16";
  return "16:9";
}

function durationUiToSeconds(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const n = Math.round(raw);
    return Math.min(8, Math.max(5, n));
  }
  if (typeof raw === "string") {
    const m = raw.trim().match(/^(\d+)/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (Number.isFinite(n)) {
        if (n <= 5) return 5;
        if (n <= 7) return 6;
        return 8;
      }
    }
  }
  return 8;
}

function geminiImagePayload(frame: FramePayload) {
  return {
    bytesBase64Encoded: frame.data,
    mimeType: frame.mimeType,
  };
}

async function predictVideosLongRunning(args: {
  apiKey: string;
  model: string;
  instance: Record<string, unknown>;
  parameters: Record<string, unknown>;
}): Promise<{ name: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(args.model)}:predictLongRunning?key=${encodeURIComponent(args.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [args.instance],
      parameters: args.parameters,
    }),
  });

  const data = (await res.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;

  if (!res.ok) {
    const errObj = data?.error;
    const msg =
      errObj &&
      typeof errObj === "object" &&
      errObj !== null &&
      "message" in errObj &&
      typeof (errObj as { message: unknown }).message === "string"
        ? (errObj as { message: string }).message
        : `Video predictLongRunning failed (${res.status}).`;
    throw new Error(msg);
  }

  const name = typeof data?.name === "string" ? data.name.trim() : "";
  if (!name) {
    throw new Error("Video generation did not return an operation name.");
  }
  return { name };
}

function extractVideoUrl(operation: VideoOperationLike): string | null {
  const generatedVideos = operation.response?.generatedVideos;
  if (!Array.isArray(generatedVideos)) return null;

  for (const generated of generatedVideos) {
    const video = generated?.video;
    if (!video) continue;

    if (typeof video === "string" && video.trim()) {
      return video.trim();
    }

    if (typeof video === "object") {
      const maybeUrl =
        (typeof video.uri === "string" && video.uri.trim()) ||
        (typeof video.url === "string" && video.url.trim()) ||
        (typeof video.downloadUri === "string" && video.downloadUri.trim()) ||
        null;
      if (maybeUrl) return maybeUrl;
    }
  }

  return null;
}

function normalizeVideoUrl(videoUrl: string): string {
  if (/\.mp4(?:$|\?)/i.test(videoUrl)) {
    return videoUrl;
  }

  let parsed: URL;
  try {
    parsed = new URL(videoUrl);
  } catch {
    console.warn("[api/video/generate] Non-mp4 video URL returned:", videoUrl);
    return videoUrl;
  }

  const hostname = parsed.hostname.toLowerCase();
  const isGoogleCloudStorageHost =
    hostname === "storage.googleapis.com" ||
    hostname.endsWith(".storage.googleapis.com") ||
    hostname === "storage.cloud.google.com";

  if (isGoogleCloudStorageHost) {
    if (!parsed.searchParams.has("alt")) {
      parsed.searchParams.set("alt", "media");
    }
    return parsed.toString();
  }

  console.warn("[api/video/generate] Non-mp4 video URL returned:", videoUrl);
  return videoUrl;
}

function stringifyError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string") return error;
  return "Video generation failed.";
}

async function fetchVideoAsDataUrl(videoUrl: string, apiKey: string): Promise<string> {
  const downloadUrl = videoUrl.includes("?")
    ? `${videoUrl}&key=${apiKey}`
    : `${videoUrl}?key=${apiKey}`;

  const response = await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Failed to download generated video (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const mimeType = response.headers.get("content-type")?.trim() || "video/mp4";

  return `data:${mimeType};base64,${base64}`;
}

export async function POST(request: Request) {
  try {
    const cwd = process.cwd();
    const apiKey = resolveGeminiApiKey(cwd);
    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not set. Add it to .env.local (no spaces around =) and restart the dev server.",
        },
        { status: 500 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    if (!body || typeof body !== "object") {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const o = body as Record<string, unknown>;

    const userPrompt = typeof o.prompt === "string" ? o.prompt.trim() : "";
    const startFrame = parseFramePayload(o.startFrame);
    const endFrame = parseFramePayload(o.endFrame);

    if (!userPrompt && !startFrame && !endFrame) {
      return Response.json(
        {
          error:
            "Provide a text prompt and/or a start frame and/or an end frame image.",
        },
        { status: 400 },
      );
    }

    // The centralized builder now handles prompt enhancement, so we use the user prompt directly
    // If no prompt is provided, the client should have used the builder to create one
    const effectivePrompt = userPrompt || "A compelling cinematic video.";

    const aspectRaw =
      typeof o.aspectRatio === "string" ? o.aspectRatio : "16:9";
    const videoAspect = videoAspectFromUi(aspectRaw);
    const durationSeconds = durationUiToSeconds(o.duration);

    const model =
      process.env.GEMINI_VIDEO_MODEL?.trim() ||
      readEnvLocalValue(cwd, "GEMINI_VIDEO_MODEL") ||
      DEFAULT_VIDEO_MODEL;

    const instance: Record<string, unknown> = {
      prompt: effectivePrompt,
    };

    if (startFrame) {
      instance.image = geminiImagePayload(startFrame);
    }
    let usedLastFrame = false;
    if (endFrame && startFrame) {
      instance.lastFrame = geminiImagePayload(endFrame);
      usedLastFrame = true;
    } else if (endFrame && !startFrame) {
      instance.image = geminiImagePayload(endFrame);
    }

    const parameters: Record<string, unknown> = {
      aspectRatio: videoAspect,
      durationSeconds,
    };

    const ai = new GoogleGenAI({ apiKey });

    let opName: string;
    try {
      const started = await predictVideosLongRunning({
        apiKey,
        model,
        instance,
        parameters,
      });
      opName = started.name;
    } catch (firstErr) {
      if (usedLastFrame && instance.lastFrame) {
        console.warn(
          "[api/video/generate] Retrying without lastFrame. For first+last keyframes use a model that supports both (e.g. set GEMINI_VIDEO_MODEL=veo-3.1-generate-preview). Original error:",
          stringifyError(firstErr),
        );
        delete instance.lastFrame;
        const retry = await predictVideosLongRunning({
          apiKey,
          model,
          instance,
          parameters,
        });
        opName = retry.name;
      } else {
        throw firstErr;
      }
    }

    let operation: VideoOperationLike = { name: opName, done: false };
    const startedAt = Date.now();

    while (!operation.done) {
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        throw new Error("Video generation timed out.");
      }

      await sleep(POLL_INTERVAL_MS);

      operation = (await ai.operations.getVideosOperation({
        operation: operation as never,
      })) as VideoOperationLike;
    }

    if (operation.error) {
      throw new Error(stringifyError(operation.error));
    }

    const extractedVideoUrl = extractVideoUrl(operation);
    if (!extractedVideoUrl) {
      throw new Error("Video generation completed but no video URL was returned.");
    }

    const normalizedVideoUrl = normalizeVideoUrl(extractedVideoUrl);
    const videoUrl = await fetchVideoAsDataUrl(normalizedVideoUrl, apiKey);

    return Response.json({ videoUrl });
  } catch (error) {
    return Response.json({ error: stringifyError(error) }, { status: 500 });
  }
}
