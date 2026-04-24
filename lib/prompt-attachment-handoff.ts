export type PromptAttachmentDestination =
  | "chat"
  | "create-image"
  | "image-editor"
  | "create-video";

export type PendingPromptAttachment = {
  target: PromptAttachmentDestination;
  fileId: string;
  name: string;
  url: string;
};

type StoredPendingPromptAttachment = PendingPromptAttachment & {
  v: 1;
};

const KEY = "solved-app-pending-prompt-attachment-v1";

function isValidDestination(
  value: unknown,
): value is PromptAttachmentDestination {
  return (
    value === "chat" ||
    value === "create-image" ||
    value === "image-editor" ||
    value === "create-video"
  );
}

function parseStored(raw: string): StoredPendingPromptAttachment | null {
  const data = JSON.parse(raw) as unknown;
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;
  if (obj.v !== 1) return null;
  if (!isValidDestination(obj.target)) return null;
  if (typeof obj.fileId !== "string" || obj.fileId.length === 0) return null;
  if (typeof obj.name !== "string" || obj.name.length === 0) return null;
  if (typeof obj.url !== "string" || obj.url.length === 0) return null;
  return {
    v: 1,
    target: obj.target,
    fileId: obj.fileId,
    name: obj.name,
    url: obj.url,
  };
}

export function writePendingPromptAttachment(
  payload: PendingPromptAttachment,
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify({ ...payload, v: 1 }));
  } catch {
    /* ignore */
  }
}

export function consumePendingPromptAttachment(
  target: PromptAttachmentDestination,
): PendingPromptAttachment | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = parseStored(raw);
    if (!parsed) {
      window.sessionStorage.removeItem(KEY);
      return null;
    }
    if (parsed.target !== target) return null;
    window.sessionStorage.removeItem(KEY);
    return {
      target: parsed.target,
      fileId: parsed.fileId,
      name: parsed.name,
      url: parsed.url,
    };
  } catch {
    return null;
  }
}
