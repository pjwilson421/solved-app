import type {
  AspectRatio,
  AssetContentType,
  Quality,
} from "@/components/create-image/types";

export type FetchGeneratedImagesOptions = {
  prompt: string;
  assetType: AssetContentType;
  aspectRatio: AspectRatio;
  resolution: Quality;
  numberOfVariations: number;
  referenceImages?: { mimeType: string; data: string }[];
};

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

  const res = await fetch("/api/ai/generate-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt,
      assetType,
      aspectRatio,
      resolution,
      numberOfVariations,
      ...(referenceImages.length > 0 ? { referenceImages } : {}),
    }),
  });
  const data: unknown = await res.json().catch(() => null);

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

  if (!res.ok || urls.length === 0) {
    const fromServer =
      data &&
      typeof data === "object" &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : null;
    throw new Error(fromServer || `Image generation failed (${res.status})`);
  }
  return urls;
}
