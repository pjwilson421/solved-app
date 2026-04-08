/**
 * Client-side mock “edit”: grayscale + darken + blue frame + EDITED badge.
 * Returns a `data:image/jpeg` URL when the source can be painted to a canvas;
 * otherwise a distinct picsum URL (still different from a typical unedited seed).
 */

function picsumDistinctFallback(seed: string): string {
  const compact = seed.replace(/\W+/g, "").slice(0, 36) || "fb";
  return `https://picsum.photos/seed/edited-${compact}/1600/900`;
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL("image/jpeg", quality);
}

/**
 * Produces a visibly edited raster for persistence (Files) and History thumbnails.
 */
export async function createMockVisuallyEditedImage(
  sourceUrl: string | undefined,
  seedForFallback: string,
): Promise<{ dataUrl: string } | { remoteUrl: string }> {
  if (!sourceUrl?.trim()) {
    return { remoteUrl: picsumDistinctFallback(seedForFallback) };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const done = (remote: boolean) => {
      if (remote) resolve({ remoteUrl: picsumDistinctFallback(seedForFallback) });
    };

    img.onload = () => {
      try {
        const maxW = 1024;
        const maxH = 1024;
        let w = img.naturalWidth;
        let h = img.naturalHeight;
        if (!w || !h) {
          done(true);
          return;
        }
        const scale = Math.min(1, maxW / w, maxH / h);
        w = Math.round(w * scale);
        h = Math.round(h * scale);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          done(true);
          return;
        }

        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const r = d[i]!;
          const g = d[i + 1]!;
          const b = d[i + 2]!;
          const y = 0.299 * r + 0.587 * g + 0.114 * b;
          const dark = Math.min(255, y * 0.72);
          d[i] = dark;
          d[i + 1] = dark;
          d[i + 2] = dark;
        }
        ctx.putImageData(imageData, 0, 0);

        const border = Math.max(3, Math.round(Math.min(w, h) * 0.014));
        ctx.strokeStyle = "rgba(124, 92, 255, 0.95)";
        ctx.lineWidth = border;
        ctx.strokeRect(
          border / 2,
          border / 2,
          w - border,
          h - border,
        );

        const pad = Math.max(10, Math.round(Math.min(w, h) * 0.02));
        const fontPx = Math.max(16, Math.round(w * 0.045));
        ctx.font = `bold ${fontPx}px ui-sans-serif, system-ui, sans-serif`;
        const label = "EDITED";
        const tw = ctx.measureText(label).width;
        const bh = Math.round(fontPx * 1.6);
        ctx.fillStyle = "rgba(0,0,0,0.62)";
        ctx.fillRect(pad, pad, tw + pad * 2, bh);
        ctx.fillStyle = "#fafafa";
        ctx.fillText(label, pad + pad, pad + fontPx * 1.1);

        const dataUrl = canvasToJpegDataUrl(canvas, 0.88);
        if (!dataUrl.startsWith("data:image/")) {
          done(true);
          return;
        }
        resolve({ dataUrl });
      } catch {
        done(true);
      }
    };

    img.onerror = () => done(true);
    img.src = sourceUrl;
  });
}
