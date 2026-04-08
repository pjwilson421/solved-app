"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX } from "./preview-frame-layout";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import {
  hrefForSettingsSection,
  type SettingsSection,
} from "@/lib/app-navigation";

export type NavId =
  | "chat"
  | "create-image"
  | "create-video"
  | "image-editor"
  | "files"
  | "history"
  | "liked"
  | "settings";

type Item = { id: NavId; label: string; iconSrc: string };

const mainItems: Item[] = [
  { id: "chat", label: "Chat", iconSrc: ICONS.chat },
  { id: "create-image", label: "Create Image", iconSrc: ICONS.createImage },
  { id: "image-editor", label: "Image Editor", iconSrc: ICONS.imageEditor },
  { id: "create-video", label: "Create Video", iconSrc: ICONS.createVideo },
];

const assetItems: Item[] = [
  { id: "files", label: "Files", iconSrc: ICONS.files },
  { id: "history", label: "History", iconSrc: ICONS.history },
  { id: "liked", label: "Liked", iconSrc: ICONS.liked },
];

const settingsItem: Item = {
  id: "settings",
  label: "Settings",
  iconSrc: ICONS.settings,
};

type SidebarProps = {
  activeId?: NavId;
  className?: string;
  onNavigate?: (id: NavId) => void;
  /**
   * When set, overrides the default clearance so the nav rail matches a page-specific dock.
   * Default matches `ImageEditorFileInfoPanel` / right rail: `SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX`.
   */
  fixedDockClearancePx?: number;
};

const navRowClass = (active: boolean) =>
  cn(
    "flex h-9 w-full min-w-0 items-center gap-3 rounded-menu-item pl-3 pr-3 text-left text-[14px] leading-none transition-colors",
    active
      ? "bg-[#3ABEFF] text-white"
      : "bg-transparent text-[#8A8A93] hover:bg-[#2A2A2E] hover:text-white",
  );

function NavButton({
  item,
  active,
  onClick,
}: {
  item: Item;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className={navRowClass(active)}>
      <IconAsset
        src={item.iconSrc}
        size={24}
        className={cn(
          "h-6 w-6 shrink-0",
          active
            ? "[&_img]:brightness-0 [&_img]:invert"
            : "[&_img]:opacity-90",
        )}
      />
      <span className="truncate font-medium tracking-wide">{item.label}</span>
    </button>
  );
}

const SETTINGS_MENU_ITEMS: { id: SettingsSection; label: string }[] = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Appearance" },
  { id: "help", label: "Help" },
];

function SettingsNavDropdown({
  active,
}: {
  active: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={navRowClass(active)}
      >
        <IconAsset
          src={settingsItem.iconSrc}
          size={24}
          className={cn(
            "h-6 w-6 shrink-0",
            active
              ? "[&_img]:brightness-0 [&_img]:invert"
              : "[&_img]:opacity-90",
          )}
        />
        <span className="min-w-0 flex-1 truncate font-medium tracking-wide">
          {settingsItem.label}
        </span>
        <span
          className="shrink-0 text-[11px] leading-none text-[#8A8A93]"
          aria-hidden
        >
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul
          className="absolute bottom-full left-0 right-0 z-10 mb-1 rounded-menu-item border border-[#2A2A2E] bg-[#18181B] py-1 shadow-lg"
          role="menu"
        >
          {SETTINGS_MENU_ITEMS.map((row) => (
            <li key={row.id} role="none">
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center px-3 py-2 text-left text-[13px] text-[#A1A1AA] transition-colors hover:bg-[#2A2A2E] hover:text-white"
                onClick={() => {
                  router.push(hrefForSettingsSection(row.id));
                  setOpen(false);
                }}
              >
                {row.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 px-4 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
      {children}
    </p>
  );
}

export function Sidebar({
  activeId = "create-image",
  className,
  onNavigate,
  fixedDockClearancePx,
}: SidebarProps) {
  const bottomClearancePx =
    fixedDockClearancePx ?? SIDEBAR_BOTTOM_DOCK_CLEARANCE_PX;

  return (
    <aside
      className={cn(
        /* Match HistoryPanel desktop aside: same flex shell + same height/bottom clearance rule. */
        "flex min-h-0 min-w-0 w-[300px] shrink-0 flex-col self-start bg-transparent",
        className,
      )}
      style={{
        /* Shorter rail when clearing a fixed bottom dock (see `fixedDockClearancePx`). */
        height: `calc(100% - ${bottomClearancePx}px)`,
      }}
    >
      {/* Same flex + overflow chain as HistoryPanel so the grey card fills the rail height. */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-0 pl-5 pr-5 pt-6">
        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            "w-full rounded-panel border border-[#2A2A2E] bg-[#18181B]",
            "py-3",
          )}
        >
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col gap-0 overflow-y-auto",
            )}
          >
            <SectionHeading>MAIN</SectionHeading>
            <nav className="flex flex-col gap-1 px-1">
              {mainItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activeId === item.id}
                  onClick={() => onNavigate?.(item.id)}
                />
              ))}
            </nav>

            <div className="mt-5">
              <SectionHeading>ASSETS</SectionHeading>
            </div>
            <nav className="flex flex-col gap-1 px-1">
              {assetItems.map((item) => (
                <NavButton
                  key={item.id}
                  item={item}
                  active={activeId === item.id}
                  onClick={() => onNavigate?.(item.id)}
                />
              ))}
            </nav>
          </div>
          <div className="shrink-0 border-t border-[#2A2A2E]/40 px-1 pb-3 pt-3">
            <SettingsNavDropdown active={activeId === "settings"} />
          </div>
        </section>
      </div>
    </aside>
  );
}
