/**
 * Downscale a raster URL (http(s), data, or blob) to a smaller JPEG data URL
 * suitable for history thumbnails and localStorage caps.
 */
export async function makePersistableThumbnail(
  url: string,
): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const img = new window.Image();
    if (!/^https?:\/\//i.test(url)) {
      img.crossOrigin = "anonymous";
    }
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("thumbnail decode failed"));
    });
    img.src = url;
    await loaded;

    const sourceW = Math.max(1, img.naturalWidth || 1);
    const sourceH = Math.max(1, img.naturalHeight || 1);
    const maxEdge = 560;
    const scale = Math.min(1, maxEdge / Math.max(sourceW, sourceH));
    const targetW = Math.max(1, Math.round(sourceW * scale));
    const targetH = Math.max(1, Math.round(sourceH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    return canvas.toDataURL("image/jpeg", 0.72);
  } catch {
    return undefined;
  }
}
