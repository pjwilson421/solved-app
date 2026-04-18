import type { ShareMenuTarget } from "@/components/create-image/preview-menu-config";

export const COPY_LINK_SUCCESS_EVENT = "solved-app-copy-link-success";

function dispatchCopySuccess(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COPY_LINK_SUCCESS_EVENT, { detail: {} }));
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch {
    return false;
  }
}

export type ShareHandoffOptions = {
  /** URL used for preview / fetch (may be data: or blob:) */
  imageUrl: string;
  /** Prefer a public https URL for UIs that require it (Meta, Pinterest, etc.) */
  shareableHttpUrl?: string | null;
  /**
   * After copy-link or unsupported flows, optionally offer a download so the user can
   * attach manually (e.g. Instagram / TikTok on desktop).
   */
  offerManualDownload?: () => void | Promise<void>;
};

function bestLinkForClipboard(opts: ShareHandoffOptions): string {
  const http = opts.shareableHttpUrl;
  if (http && /^https?:\/\//i.test(http)) return http;
  return opts.imageUrl;
}

/**
 * Try Web Share with attached file (mobile / supported browsers).
 */
async function tryNavigatorShareFiles(imageUrl: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    const res = await fetch(imageUrl);
    const blob = await res.blob();
    const mime = blob.type || "image/png";
    const ext = mime.includes("png")
      ? "png"
      : mime.includes("jpeg") || mime.includes("jpg")
        ? "jpg"
        : mime.includes("webp")
          ? "webp"
          : "png";
    const file = new File([blob], `image.${ext}`, { type: mime });
    if (typeof navigator.canShare === "function") {
      if (!navigator.canShare({ files: [file] })) return false;
    }
    await navigator.share({ files: [file] });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    return false;
  }
}

/**
 * Try native share with URL + text (no file attachment).
 */
export async function tryNavigatorShareUrl(
  url: string,
  title?: string,
): Promise<boolean> {
  if (!navigator.share) return false;
  try {
    await navigator.share({
      title: title ?? "Image",
      text: title ?? "Shared image",
      url,
    });
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") return true;
    return false;
  }
}

function pageOrigin(): string {
  if (typeof window === "undefined") return "";
  return window.location.origin;
}

function buildShareText(url: string): string {
  return `${url}`;
}

async function copyLinkFallback(opts: ShareHandoffOptions): Promise<void> {
  const ok = await copyTextToClipboard(bestLinkForClipboard(opts));
  if (ok) dispatchCopySuccess();
}

/**
 * Instagram / TikTok: file share → URL share → copy → optional download prompt.
 */
async function shareInstagramOrTikTok(opts: ShareHandoffOptions): Promise<void> {
  if (await tryNavigatorShareFiles(opts.imageUrl)) return;
  const link = bestLinkForClipboard(opts);
  if (await tryNavigatorShareUrl(link, "Shared image")) return;
  await copyLinkFallback(opts);
  if (
    typeof window !== "undefined" &&
    window.confirm(
      "This platform usually needs the image file on your device. Download the image now so you can attach it in the app?",
    )
  ) {
    await opts.offerManualDownload?.();
  }
}

export async function handleShareTarget(
  target: ShareMenuTarget,
  opts: ShareHandoffOptions,
): Promise<void> {
  const link = bestLinkForClipboard(opts);
  const text = buildShareText(link);
  const origin = pageOrigin();
  const encUrl = encodeURIComponent(link);
  const encText = encodeURIComponent(text);
  const encOrigin = encodeURIComponent(origin || link);
  const isHttp = /^https?:\/\//i.test(link);

  if (target === "copy-link") {
    await copyLinkFallback(opts);
    return;
  }

  if (target === "instagram" || target === "tiktok") {
    await shareInstagramOrTikTok(opts);
    return;
  }

  if (target === "meta") {
    if (isHttp) {
      if (await tryNavigatorShareUrl(link)) return;
      window.open(
        `https://www.facebook.com/sharer/sharer.php?u=${encUrl}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (await tryNavigatorShareFiles(opts.imageUrl)) return;
    if (await tryNavigatorShareUrl(link)) return;
    await copyLinkFallback(opts);
    await opts.offerManualDownload?.();
    return;
  }

  if (target === "x") {
    const tweet = encodeURIComponent(`${text}`);
    if (await tryNavigatorShareUrl(link)) return;
    window.open(
      `https://twitter.com/intent/tweet?text=${tweet}`,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  if (target === "whatsapp") {
    if (await tryNavigatorShareUrl(link)) return;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  if (target === "pinterest") {
    if (!isHttp) {
      if (await tryNavigatorShareFiles(opts.imageUrl)) return;
      await copyLinkFallback(opts);
      if (
        typeof window !== "undefined" &&
        window.confirm("Pinterest needs an image file or a public image URL. Download the image to upload from your device?")
      ) {
        await opts.offerManualDownload?.();
      }
      return;
    }
    if (await tryNavigatorShareUrl(link)) return;
    window.open(
      `https://www.pinterest.com/pin/create/button/?url=${encOrigin}&media=${encUrl}&description=${encText}`,
      "_blank",
      "noopener,noreferrer",
    );
    return;
  }

  if (target === "linkedin") {
    if (isHttp) {
      if (await tryNavigatorShareUrl(link)) return;
      window.open(
        `https://www.linkedin.com/sharing/share-offsite/?url=${encUrl}`,
        "_blank",
        "noopener,noreferrer",
      );
      return;
    }
    if (await tryNavigatorShareFiles(opts.imageUrl)) return;
    await copyLinkFallback(opts);
    await opts.offerManualDownload?.();
    return;
  }

  await copyLinkFallback(opts);
}
