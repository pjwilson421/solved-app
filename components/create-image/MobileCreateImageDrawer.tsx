"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import type { IconPath } from "@/components/icons/icon-paths";
import { HistoryPanel } from "./HistoryPanel";
import type { HistoryItem } from "./types";
import type { NavId } from "./Sidebar";
import {
  hrefForSettingsSection,
  pushPrimaryNav,
  type PrimaryNavId,
  type SettingsSection,
} from "@/lib/app-navigation";
import { useShellNavReset } from "@/lib/shell-nav-reset-context";

export type MediaScopeFilter = "all" | "chats" | "images" | "videos";

const SCOPE_ROWS: { id: MediaScopeFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "chats", label: "Chats" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
];

/** Matches desktop Sidebar nav: ~14px labels with proportionally scaled icons. */
const MENU_ICON = 24;

/** Primary nav order: Chat → Create Image → Create Video → Image Editor → Files → History → Liked → Settings */
const NAV_ICONS: Record<Exclude<NavId, "liked" | "settings">, IconPath> = {
  chat: ICONS.chat,
  "create-image": ICONS.createImage,
  "create-video": ICONS.createVideo,
  "image-editor": ICONS.imageEditor,
  files: ICONS.files,
  history: ICONS.history,
};

type MobileCreateImageDrawerProps = {
  open: boolean;
  onClose: () => void;
  historyItems: HistoryItem[];
  activeHistoryId: string | null;
  onSelectHistory: (id: string) => void;
  onHistoryMenuAction: (itemId: string, action: string) => void;
  /** Which primary nav row is active (default: Create Image). */
  activeMainNav?:
    | "chat"
    | "create-image"
    | "create-video"
    | "image-editor"
    | "files"
    | "history"
    | "liked"
    | "settings";
  /** Primary routes — defaults to shared `pushPrimaryNav` when omitted. */
  onSelectMainNav?: (id: PrimaryNavId) => void;
};

function RowIcon({ src }: { src: IconPath }) {
  return (
    <IconAsset
      src={src}
      size={MENU_ICON}
      className="h-5 w-5 shrink-0 [&_img]:opacity-90"
    />
  );
}

export function MobileCreateImageDrawer({
  open,
  onClose,
  historyItems,
  activeHistoryId,
  onSelectHistory,
  onHistoryMenuAction,
  activeMainNav = "create-image",
  onSelectMainNav,
}: MobileCreateImageDrawerProps) {
  const router = useRouter();
  const { bumpFiles, bumpHistory, bumpLiked } = useShellNavReset();
  const [likedScopeOpen, setLikedScopeOpen] = useState(false);
  const [likedFilter, setLikedFilter] = useState<MediaScopeFilter>("all");
  const [settingsScopeOpen, setSettingsScopeOpen] = useState(false);

  const goMainNav = (id: PrimaryNavId) => {
    if (onSelectMainNav) onSelectMainNav(id);
    else {
      if (id === "files") bumpFiles();
      else if (id === "history") bumpHistory();
      else if (id === "liked") bumpLiked();
      pushPrimaryNav(router, id);
    }
  };

  const goSettings = (section: SettingsSection) => {
    router.push(hrefForSettingsSection(section));
    setSettingsScopeOpen(false);
    onClose();
  };

  if (!open) return null;

  const rowPad =
    "flex w-full items-center gap-3 px-5 py-2 text-left text-[14px] leading-none";

  const simpleRow = (active: boolean) =>
    cn(
      rowPad,
      "transition-colors",
      active
        ? "bg-[#3ABEFF] text-white"
        : "text-[#A1A1AA] hover:bg-[#2A2A2E] hover:text-white",
    );

  const expandableRow = (expanded: boolean) =>
    cn(
      rowPad,
      "justify-between transition-colors",
      expanded
        ? "bg-[#252530] text-white"
        : "text-[#A1A1AA] hover:bg-[#2A2A2E] hover:text-white",
    );

  const subBtn = (selected: boolean) =>
    cn(
      "w-full rounded-menu-item py-2 pl-3 pr-2 text-left text-[12px] leading-snug transition-colors active:bg-[#2A2A2E]/90",
      selected
        ? "bg-[#3ABEFF]/60 text-white"
        : "text-[#A1A1AA] hover:bg-[#2A2A2E]/90 hover:text-white",
    );

  const chevron = (expanded: boolean) => (
    <span
      className="flex h-5 w-8 shrink-0 items-center justify-center text-[11px] leading-none text-[#8A8A93]"
      aria-hidden
    >
      {expanded ? "▴" : "▾"}
    </span>
  );

  return (
    <div className="fixed inset-0 z-[1100] xl:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/90 backdrop-blur-[3px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <nav className="absolute right-0 top-0 flex h-full w-[min(100%,252px)] min-w-0 flex-col overflow-hidden border-l border-[#2A2A2E] bg-[#141418] shadow-2xl">
        <p className="shrink-0 border-b border-[#2A2A2E] px-5 pb-2.5 pt-2 text-[10px] font-bold tracking-[0.1em] text-[#8A8A93]">
          MENU
        </p>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overscroll-y-contain">
          <ul className="shrink-0 py-1">
            <li>
              <button
                type="button"
                className={simpleRow(activeMainNav === "chat")}
                onClick={() => {
                  goMainNav("chat");
                  onClose();
                }}
              >
                <RowIcon src={NAV_ICONS.chat} />
                <span className="min-w-0 flex-1 font-normal">Chat</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={simpleRow(activeMainNav === "create-image")}
                onClick={() => {
                  goMainNav("create-image");
                  onClose();
                }}
              >
                <RowIcon src={NAV_ICONS["create-image"]} />
                <span className="min-w-0 flex-1 font-normal">
                  Create Image
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={simpleRow(activeMainNav === "create-video")}
                onClick={() => {
                  goMainNav("create-video");
                  onClose();
                }}
              >
                <RowIcon src={NAV_ICONS["create-video"]} />
                <span className="min-w-0 flex-1 font-normal">
                  Create Video
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={simpleRow(activeMainNav === "image-editor")}
                onClick={() => {
                  goMainNav("image-editor");
                  onClose();
                }}
              >
                <RowIcon src={NAV_ICONS["image-editor"]} />
                <span className="min-w-0 flex-1 font-normal">
                  Image Editor
                </span>
              </button>
            </li>
            <li>
              <button
                type="button"
                className={simpleRow(activeMainNav === "files")}
                onClick={() => {
                  goMainNav("files");
                  onClose();
                }}
              >
                <RowIcon src={NAV_ICONS.files} />
                <span className="min-w-0 flex-1 font-normal">Files</span>
              </button>
            </li>

            <li>
              <button
                type="button"
                className={simpleRow(activeMainNav === "history")}
                onClick={() => {
                  goMainNav("history");
                  onClose();
                }}
              >
                <RowIcon src={NAV_ICONS.history} />
                <span className="min-w-0 flex-1 font-normal">History</span>
              </button>
            </li>

            <li>
              <div
                className={cn(
                  "flex w-full min-w-0 items-stretch",
                  likedScopeOpen || activeMainNav === "liked"
                    ? "bg-[#252530] text-white"
                    : "text-[#A1A1AA]",
                )}
              >
                <button
                  type="button"
                  className={cn(
                    rowPad,
                    "min-w-0 flex-1 justify-start transition-colors hover:bg-[#2A2A2E] hover:text-white",
                  )}
                  onClick={() => {
                    goMainNav("liked");
                    onClose();
                  }}
                >
                  <RowIcon src={ICONS.liked} />
                  <span className="min-w-0 flex-1 text-left font-normal">
                    Liked
                  </span>
                </button>
                <button
                  type="button"
                  className="flex w-10 shrink-0 items-center justify-center transition-colors hover:bg-[#2A2A2E] hover:text-white"
                  aria-expanded={likedScopeOpen}
                  aria-label="Liked filters"
                  onClick={() => setLikedScopeOpen((o) => !o)}
                >
                  {chevron(likedScopeOpen)}
                </button>
              </div>
              {likedScopeOpen ? (
                <ul
                  className="mx-3 mb-1 mt-0.5 rounded-card border border-[#2A2A2E]/80 bg-[#1A1A1F] py-1.5 pl-2 pr-1"
                  role="list"
                >
                  {SCOPE_ROWS.map((row) => (
                    <li key={row.id}>
                      <button
                        type="button"
                        className={subBtn(likedFilter === row.id)}
                        onClick={() => setLikedFilter(row.id)}
                      >
                        {row.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>

            <li>
              <button
                type="button"
                className={expandableRow(
                  settingsScopeOpen || activeMainNav === "settings",
                )}
                aria-expanded={settingsScopeOpen}
                onClick={() => setSettingsScopeOpen((o) => !o)}
              >
                <RowIcon src={ICONS.settings} />
                <span className="min-w-0 flex-1 font-normal">Settings</span>
                {chevron(settingsScopeOpen)}
              </button>
              {settingsScopeOpen ? (
                <ul
                  className="mx-3 mb-1 mt-0.5 rounded-card border border-[#2A2A2E]/80 bg-[#1A1A1F] py-1.5 pl-2 pr-1"
                  role="list"
                >
                  {(
                    [
                      ["general", "General"],
                      ["appearance", "Appearance"],
                      ["help", "Help"],
                    ] as const
                  ).map(([id, label]) => (
                    <li key={id}>
                      <button
                        type="button"
                        className={subBtn(false)}
                        onClick={() => goSettings(id)}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          </ul>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col border-t border-[#2A2A2E]/50 pt-1.5">
            <HistoryPanel
              fillParent
              hideTitle
              items={historyItems}
              activeId={activeHistoryId}
              onSelect={(id) => {
                onSelectHistory(id);
                onClose();
              }}
              onMenuAction={onHistoryMenuAction}
              className="min-h-0 border-0 bg-transparent"
            />
          </div>
        </div>
      </nav>
    </div>
  );
}
