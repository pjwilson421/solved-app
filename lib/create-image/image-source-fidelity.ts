type SourceContext = {
  fullResolutionUrl?: string;
  imageUrls?: string[];
  imageUrl?: string;
  previewUrl?: string;
  thumbnailUrl?: string;
};

function clean(url: string | undefined): string {
  return typeof url === "string" ? url.trim() : "";
}

function inImageUrls(url: string, imageUrls: string[] | undefined): boolean {
  if (!imageUrls || imageUrls.length === 0) return false;
  return imageUrls.some((u) => clean(u) === url);
}

function baseScore(url: string): number {
  if (!url) return 0;
  if (/^https?:\/\//i.test(url)) return 220;
  if (/^data:image\//i.test(url)) {
    return 200 + Math.min(120, Math.floor(url.length / 50_000));
  }
  if (/^blob:/i.test(url)) return 180;
  return 100;
}

export function sourceFidelityScore(url: string, context: SourceContext): number {
  const normalized = clean(url);
  if (!normalized) return 0;

  const full = clean(context.fullResolutionUrl);
  const thumb = clean(context.thumbnailUrl);
  const primary = clean(context.imageUrl);
  const preview = clean(context.previewUrl);

  if (full && normalized === full) return 500;
  if (inImageUrls(normalized, context.imageUrls) && (!thumb || normalized !== thumb)) {
    return 420;
  }
  if (primary && normalized === primary && (!thumb || normalized !== thumb)) {
    return 390;
  }
  if (preview && normalized === preview && (!thumb || normalized !== thumb)) {
    return 320;
  }
  if (thumb && normalized === thumb) return 120;

  return baseScore(normalized);
}

export function isCandidateHigherFidelity(args: {
  currentUrl: string | undefined;
  candidateUrl: string | undefined;
  context: SourceContext;
}): boolean {
  const current = clean(args.currentUrl);
  const candidate = clean(args.candidateUrl);
  if (!candidate) return false;
  if (!current) return true;
  if (current === candidate) return false;
  return (
    sourceFidelityScore(candidate, args.context) >
    sourceFidelityScore(current, args.context)
  );
}

export function selectBestImageSource(context: SourceContext): string | undefined {
  const full = clean(context.fullResolutionUrl);
  if (full) return full;

  const thumb = clean(context.thumbnailUrl);
  const imageUrls = (context.imageUrls ?? [])
    .map((u) => clean(u))
    .filter((u) => u.length > 0);

  const nonThumbFromList = imageUrls.find((u) => !thumb || u !== thumb);
  if (nonThumbFromList) return nonThumbFromList;

  const primary = clean(context.imageUrl);
  if (primary && (!thumb || primary !== thumb)) return primary;

  const preview = clean(context.previewUrl);
  if (preview && (!thumb || preview !== thumb)) return preview;

  if (thumb) return thumb;
  if (imageUrls[0]) return imageUrls[0];
  if (primary) return primary;
  if (preview) return preview;
  return undefined;
}
