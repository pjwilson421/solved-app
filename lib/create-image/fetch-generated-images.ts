import type {
  AspectRatio,
  AssetContentType,
  Quality,
} from "@/components/create-image/types";
import { buildImagePrompt } from "@/lib/ai/build-image-prompt";

export type FetchGeneratedImagesOptions = {
  prompt: string;
  assetType: AssetContentType;
  aspectRatio: AspectRatio;
  resolution: Quality;
  numberOfVariations: number;
  referenceImages?: { mimeType: string; data: string }[];
};

const MAX_RETRIES = 4;
const BASE_RETRY_DELAY_MS = 700;

const FRIENDLY_HIGH_DEMAND_MESSAGE =
  "Image generation is temporarily experiencing high demand. Please try again in a moment.";

function extractUrls(data: unknown): string[] {
  let urls: string[] = [];
  if (
    data &&
    typeof data === "object" &&
    Array.isArray((data as { images?: unknown }).images)
  ) {
    urls = (data as { images: unknown[] }).images.filter(
      (x): x is string => typeof x === "string" && x.length > 0,
    );
  }
  if (
    urls.length === 0 &&
    data &&
    typeof data === "object" &&
    typeof (data as { image?: unknown }).image === "string"
  ) {
    urls = [(data as { image: string }).image];
  }
  return urls;
}

function serverErrorMessage(data: unknown): string | null {
  return data &&
    typeof data === "object" &&
    typeof (data as { error?: unknown }).error === "string"
    ? (data as { error: string }).error
    : null;
}

function isTransientHighDemandFailure(
  status: number,
  message: string | null,
): boolean {
  if (status === 429 || status === 503) return true;
  const m = (message ?? "").toLowerCase();
  return (
    m.includes("high demand") ||
    m.includes("currently experiencing") ||
    m.includes("try again later") ||
    m.includes("temporar") ||
    m.includes("rate limit")
  );
}

function retryDelayMs(attempt: number, retryAfterHeader: string | null): number {
  const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN;
  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0) {
    return Math.max(0, Math.round(retryAfterSeconds * 1000));
  }
  const expo = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.floor(Math.random() * 260);
  return expo + jitter;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** POST `/api/ai/generate-image`; returns one or more data-URL images. */
export async function fetchGeneratedImages(
  opts: FetchGeneratedImagesOptions,
): Promise<string[]> {
  const {
    prompt,
    assetType,
    aspectRatio,
    resolution,
    numberOfVariations,
    referenceImages = [],
  } = opts;
  const enhancedPrompt = buildImagePrompt(prompt, {
    assetType,
    aspectRatio,
    resolution,
    numberOfVariations,
  });

  let lastStatus = 0;
  let lastServerMessage: string | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const res = await fetch("/api/ai/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: enhancedPrompt,
        assetType,
        aspectRatio,
        resolution,
        numberOfVariations,
        ...(referenceImages.length > 0 ? { referenceImages } : {}),
      }),
    });
    const data: unknown = await res.json().catch(() => null);
    const urls = extractUrls(data);
    const fromServer = serverErrorMessage(data);
    lastStatus = res.status;
    lastServerMessage = fromServer;

    if (res.ok && urls.length > 0) {
      return urls;
    }

    const canRetry =
      attempt < MAX_RETRIES &&
      isTransientHighDemandFailure(res.status, fromServer);

    if (canRetry) {
      const delayMs = retryDelayMs(attempt, res.headers.get("retry-after"));
      console.warn("[fetch-generated-images] transient high-demand failure; retrying", {
        attempt: attempt + 1,
        maxRetries: MAX_RETRIES,
        status: res.status,
        delayMs,
        message: fromServer,
      });
      await wait(delayMs);
      continue;
    }

    if (isTransientHighDemandFailure(res.status, fromServer)) {
      throw new Error(FRIENDLY_HIGH_DEMAND_MESSAGE);
    }
    throw new Error(fromServer || `Image generation failed (${res.status})`);
  }

  if (isTransientHighDemandFailure(lastStatus, lastServerMessage)) {
    throw new Error(FRIENDLY_HIGH_DEMAND_MESSAGE);
  }
  throw new Error("Image generation failed.");
}
