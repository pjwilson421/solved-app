export type AspectRatio = "16:9" | "1:1" | "4:5" | "9:16";
export type Quality = "1K" | "4K" | "6K" | "8K";

/** Channel / use-case for the generated asset (prompt bar). */
export type AssetContentType =
  | "Standard"
  | "Social Media"
  | "Email"
  | "Digital";

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

/** Asset Type dropdown — exact order rendered in GenerationSettingsRow. */
export const ASSET_TYPE_DROPDOWN_OPTIONS = [
  "Standard",
  "Social Media",
  "Email",
  "Digital",
] as const satisfies readonly AssetContentType[];

export const ASSET_CONTENT_TYPES: AssetContentType[] = [
  ...ASSET_TYPE_DROPDOWN_OPTIONS,
];
export const QUALITIES: Quality[] = ["1K", "4K", "6K", "8K"];
export const VARIATION_OPTIONS = [1, 2, 3, 4] as const;

/** Video export length (prompt bar / settings row on Create Video). */
export type VideoDuration = "5s" | "10s" | "15s" | "30s";

export const VIDEO_DURATIONS: VideoDuration[] = ["5s", "10s", "15s", "30s"];

export const MOCK_TEMPLATES: TemplateDef[] = [
  {
    id: "t1",
    name: "Social",
    thumbnailGradient: "from-sky-500/40 to-cyan-500/30",
    slots: 1,
    layout: "single",
  },
  {
    id: "t2",
    name: "Split",
    thumbnailGradient: "from-sky-500/40 to-cyan-600/30",
    slots: 2,
    layout: "two-col",
  },
  {
    id: "t3",
    name: "Stack",
    thumbnailGradient: "from-emerald-600/40 to-teal-600/30",
    slots: 2,
    layout: "two-row",
  },
  {
    id: "t4",
    name: "Triple",
    thumbnailGradient: "from-amber-600/40 to-orange-600/30",
    slots: 3,
    layout: "triple",
  },
  {
    id: "t5",
    name: "Template 5",
    thumbnailGradient: "from-rose-600/40 to-pink-600/30",
    slots: 1,
    layout: "single",
  },
  {
    id: "t6",
    name: "Template 6",
    thumbnailGradient: "from-cyan-600/40 to-blue-600/30",
    slots: 1,
    layout: "single",
  },
  {
    id: "t7",
    name: "Template 7",
    thumbnailGradient: "from-lime-600/40 to-green-600/30",
    slots: 2,
    layout: "two-col",
  },
  {
    id: "t8",
    name: "Template 8",
    thumbnailGradient: "from-cyan-500/40 to-blue-500/30",
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
