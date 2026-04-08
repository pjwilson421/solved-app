import { ImageEditorClient } from "@/components/create-image/ImageEditorClient";

type SearchParams = { url?: string | string[]; fileId?: string | string[] };

function safeFileIdParam(v: string | string[] | undefined): string | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 200) {
    return null;
  }
  if (/[<>"']/.test(raw)) return null;
  return raw;
}

export default async function ImageEditorPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const rawUrl = sp.url;
  const url = Array.isArray(rawUrl) ? rawUrl[0] : rawUrl;
  const safeUrl =
    typeof url === "string" &&
    (/^https?:\/\//i.test(url) || url.startsWith("blob:"))
      ? url
      : null;

  const safeFileId = safeFileIdParam(sp.fileId);

  return (
    <ImageEditorClient initialImageUrl={safeUrl} initialFileId={safeFileId} />
  );
}
