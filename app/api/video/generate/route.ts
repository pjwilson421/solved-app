import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";

const VEO_MODEL = "veo-2.0-generate-001";
const POLL_INTERVAL_MS = 10_000;
const MAX_WAIT_MS = 10 * 60 * 1000;

type VideoOperationLike = {
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY environment variable is not set" },
        { status: 500 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const prompt =
      body &&
      typeof body === "object" &&
      typeof (body as { prompt?: unknown }).prompt === "string"
        ? (body as { prompt: string }).prompt.trim()
        : "";

    if (!prompt) {
      return Response.json(
        { error: "Invalid request body: 'prompt' string is required." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    let operation: VideoOperationLike = await ai.models.generateVideos({
      model: VEO_MODEL,
      prompt,
    });

    const startedAt = Date.now();

    while (!operation.done) {
      if (Date.now() - startedAt > MAX_WAIT_MS) {
        throw new Error("Video generation timed out.");
      }

      await sleep(POLL_INTERVAL_MS);
      operation = await ai.operations.getVideosOperation({ operation });
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
