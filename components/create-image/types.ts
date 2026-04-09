export type AspectRatio = "16:9" | "1:1" | "4:5" | "9:16";
export type Quality = "1K" | "4K" | "6K" | "8K";

/** Channel / use-case for the generated asset (prompt bar). */
export type AssetContentType = "Social Media" | "Email" | "Digital Media";

export type TemplateLayout = "single" | "two-col" | "two-row" | "triple";

export type TemplateDef = {
  id: string;
  name: string;
  thumbnailGradient: string;
  slots: number;
  layout: TemplateLayout;
};

export type ReferenceFile = {
  id: string;
  url: string;
  name: string;
};

export type HistoryItem = {
  id: string;
  prompt: string;
  createdAt: Date;
  imageUrls: string[];
  /** Set for Create Video generations — poster stays in `imageUrls[0]`. */
  videoUrl?: string;
};

export const ASPECT_RATIOS: AspectRatio[] = ["16:9", "1:1", "4:5", "9:16"];
export const ASSET_CONTENT_TYPES: AssetContentType[] = [
  "Social Media",
  "Email",
  "Digital Media",
];
export const QUALITIES: Quality[] = ["1K", "4K", "6K", "8K"];
export const VARIATION_OPTIONS = [1, 2, 3, 4] as const;

/** Video export length (prompt bar / settings row on Create Video). */
export type VideoDuration = "5s" | "10s" | "15s" | "30s";

export const VIDEO_DURATIONS: VideoDuration[] = ["5s", "10s", "15s", "30s"];

/** Thumbnail gradients use only theme colors (`globals.css`). */
export const MOCK_TEMPLATES: TemplateDef[] = [
  {
    id: "t1",
    name: "Social",
    thumbnailGradient: "from-primary/45 to-primary-active/35",
    slots: 1,
    layout: "single",
  },
  {
    id: "t2",
    name: "Split",
    thumbnailGradient: "from-primary/40 to-surface-pressed/50",
    slots: 2,
    layout: "two-col",
  },
  {
    id: "t3",
    name: "Stack",
    thumbnailGradient: "from-primary-active/45 to-surface-elevated/50",
    slots: 2,
    layout: "two-row",
  },
  {
    id: "t4",
    name: "Triple",
    thumbnailGradient: "from-surface-elevated/80 to-primary/35",
    slots: 3,
    layout: "triple",
  },
  {
    id: "t5",
    name: "Template 5",
    thumbnailGradient: "from-primary-hover/50 to-surface-panel/70",
    slots: 1,
    layout: "single",
  },
  {
    id: "t6",
    name: "Template 6",
    thumbnailGradient: "from-primary/35 to-surface-hover/60",
    slots: 1,
    layout: "single",
  },
  {
    id: "t7",
    name: "Template 7",
    thumbnailGradient: "from-surface-pressed/70 to-primary/40",
    slots: 2,
    layout: "two-col",
  },
  {
    id: "t8",
    name: "Template 8",
    thumbnailGradient: "from-primary-active/40 to-primary/30",
    slots: 1,
    layout: "single",
  },
];

export function formatCreatedAt(d: Date): string {
  const now = new Date();
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  if (isToday) return `Today • ${time}`;
  return `${d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  })} • ${time}`;
}
