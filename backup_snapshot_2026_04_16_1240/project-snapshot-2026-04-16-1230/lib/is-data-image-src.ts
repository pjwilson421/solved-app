/** Next/Image requires `unoptimized` for data-URL sources. */
export function isDataImageSrc(src: string): boolean {
  return src.startsWith("data:image/");
}
