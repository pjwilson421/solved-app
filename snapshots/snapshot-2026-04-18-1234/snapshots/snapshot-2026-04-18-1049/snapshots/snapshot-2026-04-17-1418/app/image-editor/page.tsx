import { ImageEditorClient } from "@/components/create-image/ImageEditorClient";
import type { EditorHandoffMode } from "@/lib/create-image/pending-editor-image";

type SearchParams = {
  url?: string | string[];
  fileId?: string | string[];
  activityId?: string | string[];
  mode?: string | string[];
};

function safeFileIdParam(v: string | string[] | undefined): string | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 200) {
    return null;
  }
  if (/[<>"']/.test(raw)) return null;
  return raw;
}

function safeHandoffMode(
  v: string | string[] | undefined,
): EditorHandoffMode | null {
  const raw = Array.isArray(v) ? v[0] : v;
  if (raw === "edit" || raw === "upscale") return raw;
  return null;
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
  const safeActivityId = safeFileIdParam(sp.activityId);
  const initialHandoffMode = safeHandoffMode(sp.mode);

  return (
    <ImageEditorClient
      initialImageUrl={safeUrl}
      initialFileId={safeFileId}
      initialActivityId={safeActivityId}
      initialHandoffMode={initialHandoffMode}
    />
  );
}
