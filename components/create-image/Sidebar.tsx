"use client";

import type { MouseEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ICONS } from "@/components/icons/icon-paths";
import {
  hrefForSettingsSection,
  type SettingsSection,
} from "@/lib/app-navigation";
import {
  sideNavPanelCornerRadiusClassName,
  sideRailInnerHorizontalGutterClassName,
} from "@/components/ui/right-rail-collapsible";

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
  { id: "create-video", label: "Create Video", iconSrc: ICONS.createVideo },
  { id: "image-editor", label: "Image Editor", iconSrc: ICONS.imageEditor },
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

/**
 * Single ordered list of primary shell destinations (desktop Sidebar: MAIN → ASSETS → Settings).
 * Mobile hamburger menu uses {@link SHELL_NAV_MOBILE_MENU_SECTIONS} in `Header`.
 */
export const SIDEBAR_ORDERED_SHELL_NAV_ITEMS: readonly Item[] = [
  ...mainItems,
  ...assetItems,
  settingsItem,
];

/** Shared with `Header` mobile nav — keep labels/order aligned with Sidebar MAIN / ASSETS. */
export const SIDEBAR_MAIN_NAV_ITEMS: Item[] = mainItems;
export const SIDEBAR_ASSET_NAV_ITEMS: Item[] = assetItems;
export const SIDEBAR_SETTINGS_NAV_ITEM: Item = settingsItem;

/**
 * Mobile hamburger menu only — three sections, fixed order, same items as desktop shell nav.
 * Desktop `Sidebar` layout is separate; keep this in sync with MAIN / ASSETS / settings there.
 */
export const SHELL_NAV_MOBILE_MENU_SECTIONS: readonly {
  id: "main" | "assets" | "general";
  title: string;
  items: readonly Item[];
}[] = [
  { id: "main", title: "MAIN", items: mainItems },
  { id: "assets", title: "ASSETS", items: assetItems },
  { id: "general", title: "GENERAL", items: [settingsItem] },
];

type SidebarProps = {
  activeId?: NavId;
  className?: string;
  onNavigate?: (id: NavId) => void;
};

/** Selected / visible-active pill — unchanged from prior nav spec. */
export const SIDEBAR_NAV_SELECTED_PILL_CLASS = "bg-rail-navy";

/** Hover-only pill — slightly lighter than `SIDEBAR_NAV_SELECTED_PILL_CLASS` for subtle contrast. */
export const SIDEBAR_NAV_HOVER_PILL_CLASS = "hover:bg-[#0d1d5a]";

/**
 * Default: white label + mask icon (`currentColor`), no fill.
 * Selected: `rail-navy` (`--rail-navy`). Hover (non-selected row): `#0d1d5a`.
 */
const navRowClass = (showPill: boolean) =>
  cn(
    "flex h-9 w-full min-w-0 items-center gap-3 rounded-full pl-3 pr-3 text-left text-[14px] leading-none text-white",
    "transition-[background-color] duration-150 ease-out",
    "outline-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
    showPill
      ? SIDEBAR_NAV_SELECTED_PILL_CLASS
      : cn("bg-transparent", SIDEBAR_NAV_HOVER_PILL_CLASS),
  );

const settingsNavTriggerClass = (showPill: boolean) =>
  cn(
    "flex h-9 w-full min-w-0 cursor-pointer items-center gap-3 rounded-full pl-3 pr-3 text-left text-[14px] leading-none text-white",
    "transition-[background-color] duration-150 ease-out",
    "outline-none ring-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
    showPill
      ? SIDEBAR_NAV_SELECTED_PILL_CLASS
      : cn("bg-transparent", SIDEBAR_NAV_HOVER_PILL_CLASS),
  );

/** Raster SVG nav glyphs → tint via mask so `color` / `currentColor` matches label. */
export function SidebarNavIcon({ src }: { src: string }) {
  const mask = `url("${src}")`;
  return (
    <span
      className="block h-6 w-6 shrink-0"
      style={{
        backgroundColor: "currentColor",
        maskImage: mask,
        WebkitMaskImage: mask,
        maskSize: "contain",
        WebkitMaskSize: "contain",
        maskRepeat: "no-repeat",
        WebkitMaskRepeat: "no-repeat",
        maskPosition: "center",
        WebkitMaskPosition: "center",
      }}
      aria-hidden
    />
  );
}

function NavButton({
  item,
  showPill,
  onMouseEnter,
  onClick,
}: {
  item: Item;
  showPill: boolean;
  onMouseEnter: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={navRowClass(showPill)}
    >
      <SidebarNavIcon src={item.iconSrc} />
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
  onTriggerMouseEnter,
  settingsRouteActive,
}: {
  onTriggerMouseEnter: () => void;
  /** True when app shell marks Settings as the active primary route. */
  settingsRouteActive: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: globalThis.MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative w-full"
      onMouseEnter={onTriggerMouseEnter}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={settingsNavTriggerClass(open || settingsRouteActive)}
      >
        <SidebarNavIcon src={settingsItem.iconSrc} />
        <span className="min-w-0 flex-1 truncate font-medium tracking-wide">
          {settingsItem.label}
        </span>
        <span
          className="shrink-0 text-[11px] leading-none text-inherit"
          aria-hidden
        >
          {open ? "▴" : "▾"}
        </span>
      </button>
      {open ? (
        <ul
          className="absolute bottom-full left-0 right-0 z-10 mb-1 rounded-[6.66px] bg-surface-card py-1"
          role="menu"
        >
          {SETTINGS_MENU_ITEMS.map((row) => (
            <li key={row.id} role="none">
              <button
                type="button"
                role="menuitem"
                className={cn(
                  "flex w-full items-center rounded-full px-3 py-2 text-left text-[13px] text-white outline-none ring-0 transition-[background-color] duration-150 ease-out bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-0",
                  SIDEBAR_NAV_HOVER_PILL_CLASS,
                )}
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

/** Matches “MAIN” / “ASSETS” labels — spacing (`mb-3`, `px-4`) stays on the section wrapper only. */
export const SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-white";

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <p className={cn("mb-3 px-4", SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS)}>
      {children}
    </p>
  );
}

export function Sidebar({
  activeId = "create-image",
  className,
  onNavigate,
}: SidebarProps) {
  const [hoveredNavId, setHoveredNavId] = useState<NavId | null>(null);

  useEffect(() => {
    setHoveredNavId(null);
  }, [activeId]);

  /** Settings hover is tracked separately so MAIN/ASSETS rows fall back to route-only pills. */
  const effectiveHoveredNavId =
    hoveredNavId === "settings" ? null : hoveredNavId;

  /**
   * At most one MAIN/ASSETS row looks “active”: if the pointer is over a row, only that row
   * gets the pill; otherwise the route-active row does. (Route stays `activeId` from the shell.)
   */
  const showNavPill = (id: NavId, routeMatch: boolean) => {
    if (id === "settings") return false;
    return effectiveHoveredNavId !== null
      ? effectiveHoveredNavId === id
      : routeMatch;
  };

  const clearHoverIfLeavingNavCard = (e: MouseEvent<HTMLElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setHoveredNavId(null);
  };

  return (
    <aside
      className={cn(
        /* Fills `DesktopThreeColumnShell` rail above dock bottom inset (matches prompt bar). */
        "flex min-h-0 min-w-0 w-full flex-1 shrink-0 flex-col bg-app-bg",
        className,
      )}
    >
      {/* Same flex + overflow chain as HistoryPanel so the grey card fills the rail height. */}
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-hidden pb-0 pt-6",
          sideRailInnerHorizontalGutterClassName,
        )}
      >
        <section
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            "w-full bg-panel-bg",
            sideNavPanelCornerRadiusClassName,
            "py-3",
          )}
          onMouseLeave={clearHoverIfLeavingNavCard}
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
                  showPill={showNavPill(item.id, activeId === item.id)}
                  onMouseEnter={() => setHoveredNavId(item.id)}
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
                  showPill={showNavPill(item.id, activeId === item.id)}
                  onMouseEnter={() => setHoveredNavId(item.id)}
                  onClick={() => onNavigate?.(item.id)}
                />
              ))}
            </nav>
          </div>
          <div className="shrink-0 bg-panel-hover/25 px-1 pb-3 pt-3">
            <SettingsNavDropdown
              onTriggerMouseEnter={() => setHoveredNavId("settings")}
              settingsRouteActive={activeId === "settings"}
            />
          </div>
        </section>
      </div>
    </aside>
  );
}

export { navRowClass as sidebarNavRowClass };
