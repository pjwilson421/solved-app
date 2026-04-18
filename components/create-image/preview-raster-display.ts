/**
 * Shared rules for the main Create Image / Image Editor raster preview.
 *
 * The preview shell is sized to the selected aspect ratio (`computePreviewFrameSize` /
 * PreviewPanel frame classes). Generation targets the same aspect ratio and resolution.
 * Use `contain` so the full image is always visible (no cropping). When the output
 * matches that aspect ratio, the image fills the frame with no letterboxing.
 */
export const PREVIEW_RASTER_OBJECT_FIT = "contain" as const;

/**
 * `next/image` `sizes` for the main preview — wide enough for retina + high-res outputs
 * so the optimizer does not pick an unnecessarily small source.
 */
export const PREVIEW_RASTER_IMAGE_SIZES =
  "(min-width: 2048px) min(100vw, 2560px), (min-width: 1280px) min(96vw, 1800px), min(100vw - 2rem, 1200px)";
