/**
 * Canonical output sizes for Create Image (aspect ratio × resolution).
 * Used by `/api/ai/generate-image` for prompts, Gemini config, and post-normalization.
 */
export const GENERATION_DIMENSION_MAP: Record<
  string,
  Record<string, { width: number; height: number }>
> = {
  "16:9": {
    "1K": { width: 1024, height: 576 },
    "2K": { width: 2048, height: 1152 },
    "4K": { width: 4096, height: 2304 },
    "8K": { width: 8192, height: 4608 },
  },
  "1:1": {
    "1K": { width: 1024, height: 1024 },
    "2K": { width: 2048, height: 2048 },
    "4K": { width: 4096, height: 4096 },
    "8K": { width: 8192, height: 8192 },
  },
  "4:5": {
    "1K": { width: 1024, height: 1280 },
    "2K": { width: 2048, height: 2560 },
    "4K": { width: 4096, height: 5120 },
    "8K": { width: 8192, height: 10240 },
  },
  "9:16": {
    "1K": { width: 576, height: 1024 },
    "2K": { width: 1152, height: 2048 },
    "4K": { width: 2304, height: 4096 },
    "8K": { width: 4608, height: 8192 },
  },
};

export type GenerationResolutionKey = "1K" | "2K" | "4K" | "8K";

export function resolveGenerationDimensions(
  aspectRatio: string,
  resolution: GenerationResolutionKey,
): { width: number; height: number } {
  const byAspect = GENERATION_DIMENSION_MAP[aspectRatio];
  if (byAspect?.[resolution]) return byAspect[resolution];
  return (
    GENERATION_DIMENSION_MAP["16:9"][resolution] ??
    GENERATION_DIMENSION_MAP["16:9"]["4K"]
  );
}
