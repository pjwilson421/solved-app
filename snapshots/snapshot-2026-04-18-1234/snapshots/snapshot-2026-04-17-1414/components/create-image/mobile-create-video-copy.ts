import type { AspectRatio } from "./types";

/** Helper lines under the video preview on mobile (MOBILE-Video.svg). */
export function mobileCreateVideoHelperLines(
  aspect: AspectRatio,
): [string, string] {
  switch (aspect) {
    case "16:9":
      return [
        "Create 16:9 videos from prompts, and",
        "reference images. Preview scales to export size.",
      ];
    case "1:1":
      return [
        "Create square videos from prompts and reference frames.",
        "Preview scales to export size.",
      ];
    case "4:5":
      return [
        "Create portrait videos from prompts and reference frames.",
        "Preview scales to export size.",
      ];
    case "9:16":
      return [
        "Create vertical videos from prompts and reference frames.",
        "Preview scales to export size.",
      ];
    default:
      return [
        "Create videos from prompts, and reference images.",
        "Preview scales to export size.",
      ];
  }
}
