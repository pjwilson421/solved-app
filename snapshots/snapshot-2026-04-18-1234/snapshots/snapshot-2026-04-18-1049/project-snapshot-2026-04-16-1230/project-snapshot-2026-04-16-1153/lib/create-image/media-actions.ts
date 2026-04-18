/** Prefer a public `https` URL for share dialogs; otherwise `null` (caller uses `imageUrl`). */
export function pickShareableHttpUrl(
  entry:
    | {
        fullResolutionUrl?: string;
        imageUrl?: string;
        imageUrls?: string[];
      }
    | null
    | undefined,
  displayUrl: string,
): string | null {
  if (/^https?:\/\//i.test(displayUrl)) return displayUrl;
  if (!entry) return null;
  for (const u of [
    entry.fullResolutionUrl,
    entry.imageUrl,
    entry.imageUrls?.[0],
  ]) {
    if (typeof u === "string" && /^https?:\/\//i.test(u)) return u;
  }
  return null;
}

/** Best in-session quality URL for a generated image entry. */
export function bestImageUrlForEntry(entry: {
  fullResolutionUrl?: string;
  imageUrls?: string[];
  imageUrl?: string;
  thumbnailUrl?: string;
}): string | undefined {
  const fromFull = entry.fullResolutionUrl;
  if (typeof fromFull === "string" && fromFull.length > 0) return fromFull;
  const u0 = entry.imageUrls?.[0];
  if (typeof u0 === "string" && u0.length > 0) return u0;
  if (typeof entry.imageUrl === "string" && entry.imageUrl.length > 0) {
    return entry.imageUrl;
  }
  if (typeof entry.thumbnailUrl === "string" && entry.thumbnailUrl.length > 0) {
    return entry.thumbnailUrl;
  }
  return undefined;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** `generated-image-YYYY-MM-DD-HHMMSS` + extension */
export function generatedImageDownloadBasename(d: Date): string {
  return `generated-image-${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}-${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

/**
 * Download image using an anchor (triggers save dialog). Prefers PNG filename per product spec.
 */
export async function downloadImageFromUrl(
  url: string,
  occurredAt: Date | null | undefined,
): Promise<void> {
  const stamp = generatedImageDownloadBasename(occurredAt ?? new Date());
  const filename = `${stamp}.png`;

  if (url.startsWith("data:") || url.startsWith("blob:")) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  try {
    const res = await fetch(url, { mode: "cors" });
    const blob = await res.blob();
    const obj = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = obj;
    a.download = filename;
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(obj);
  } catch {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

export function openImageInNewTab(url: string): void {
  const w = window.open(url, "_blank", "noopener,noreferrer");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
