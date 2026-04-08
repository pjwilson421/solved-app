import type { AspectRatio } from "./types";

/** Helper lines under preview — aligned with `MOBILE-image-16x9.svg` Create Image artboards. */
export function mobileCreateImageHelperLines(aspect: AspectRatio): [string, string] {
  switch (aspect) {
    case "16:9":
      return [
        "Create high-quality 16:9 images from prompts, templates,",
        "and reference images. Output preview scales to export size.",
      ];
    case "1:1":
      return [
        "Create 1:1 images for square social posts, product cards,",
        "and clean layouts. Preview scales to final export size.",
      ];
    case "4:5":
      return [
        "Create 4:5 images for portrait social posts, editorial layouts,",
        "and vertical promotional content. Preview scales to export size.",
      ];
    case "9:16":
      return [
        "Create 9:16 images for stories, reels, and vertical placements.",
        "Preview scales to match your export size.",
      ];
    default:
      return [
        "Create images from prompts, templates, and reference images.",
        "Preview scales to export size.",
      ];
  }
}
