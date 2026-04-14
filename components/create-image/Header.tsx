"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import { IconCloseNav, IconMenu } from "./icons";
import {
  SHELL_NAV_MOBILE_MENU_SECTIONS,
  SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS,
  SidebarNavIcon,
  sidebarNavRowClass,
} from "./Sidebar";
import type { NavId } from "./Sidebar";
import { hrefForSettingsSection } from "@/lib/app-navigation";
import { useShellNav } from "@/lib/use-shell-nav";

type HeaderProps = {
  className?: string;
  variant?: "desktop" | "mobile";
  /**
   * Mobile: primary label beside logo (MOBILE layout SVG uses “CREATE”).
   * Omit to show “SOLVED” with desktop-style tracking.
   */
  mobileTitle?: string;
  /**
   * Mobile: where the hamburger / X + dropdown sit. `"start"` (default) = before logo;
   * `"end"` = after the fire icon (e.g. Chat narrow mobile header).
   */
  mobileNavTriggerSide?: "start" | "end";
};

function MobileNavDropdown({
  open,
  onClose,
  activeMainNav,
  onNavigate,
  onSettings,
  align,
}: {
  open: boolean;
  onClose: () => void;
  activeMainNav: NavId;
  onNavigate: (id: NavId) => void;
  onSettings: () => void;
  align: "start" | "end";
}) {
  if (!open) return null;

  return (
    <div
      id="mobile-main-nav-dropdown"
      className={cn(
        "absolute top-full z-[1060] mt-2 max-h-[calc(100dvh-5.75rem)] w-[min(calc(100vw-2.5rem),280px)] min-w-[220px] overflow-y-auto overscroll-y-contain rounded-xl border border-edge-subtle bg-panel-bg py-2 shadow-xl",
        align === "end" ? "right-0 left-auto" : "left-0 right-auto",
      )}
    >
      <nav
        className="flex flex-col px-1.5"
        aria-label="Main navigation"
      >
        {SHELL_NAV_MOBILE_MENU_SECTIONS.map((section, sectionIndex) => (
          <div
            key={section.id}
            className={cn(sectionIndex > 0 && "mt-5")}
          >
            <p
              className={cn(
                "mb-3 px-4",
                SIDEBAR_SECTION_HEADING_TYPOGRAPHY_CLASS,
              )}
            >
              {section.title}
            </p>
            <ul className="flex flex-col gap-1 px-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={cn(
                      "flex min-h-11 w-full min-w-0 items-center gap-3 rounded-full px-3 text-left text-[14px] leading-none text-white outline-none transition-[background-color] duration-150 ease-out",
                      sidebarNavRowClass(activeMainNav === item.id),
                    )}
                    onClick={() => {
                      if (item.id === "settings") {
                        onSettings();
                      } else {
                        onNavigate(item.id);
                      }
                      onClose();
                    }}
                  >
                    <SidebarNavIcon src={item.iconSrc} />
                    <span className="min-w-0 flex-1 truncate font-medium tracking-wide">
                      {item.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

export function Header({
  className,
  variant = "desktop",
  mobileTitle,
  mobileNavTriggerSide = "start",
}: HeaderProps) {
  const showCreateStyle = variant === "mobile" && mobileTitle != null;
  const pathname = usePathname();
  const router = useRouter();
  const { navigate, activeMainNav } = useShellNav();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const mobileNavRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (mobileNavRootRef.current?.contains(t)) return;
      setMobileNavOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [mobileNavOpen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNavOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

  const onMobileNavigate = (id: NavId) => {
    if (id === "settings") return;
    navigate(id);
  };

  const onMobileSettings = () => {
    router.push(hrefForSettingsSection("general"));
  };

  const dropdownAlign = mobileNavTriggerSide === "end" ? "end" : "start";

  const mobileNavTrigger =
    variant === "mobile" ? (
      <div ref={mobileNavRootRef} className="relative shrink-0">
        <button
          type="button"
          onClick={() => setMobileNavOpen((o) => !o)}
          className="flex h-8 w-8 items-center justify-center rounded-full text-tx-secondary transition-colors hover:bg-panel-hover hover:text-white focus-visible:outline-none focus-visible:ring-0 focus-visible:bg-panel-hover focus-visible:text-white"
          aria-expanded={mobileNavOpen}
          aria-haspopup="true"
          aria-controls={
            mobileNavOpen ? "mobile-main-nav-dropdown" : undefined
          }
          aria-label={mobileNavOpen ? "Close menu" : "Open menu"}
        >
          {mobileNavOpen ? (
            <IconCloseNav className="h-5 w-5" />
          ) : (
            <IconMenu className="h-5 w-5" />
          )}
        </button>
        <MobileNavDropdown
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
          activeMainNav={activeMainNav}
          onNavigate={onMobileNavigate}
          onSettings={onMobileSettings}
          align={dropdownAlign}
        />
      </div>
    ) : null;

  return (
    <header
      className={cn(
        "flex shrink-0 items-start bg-app-bg px-5",
        variant === "desktop" ? "h-16 pt-[22px]" : "h-[72px] pt-[26px]",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {variant === "mobile" && mobileNavTriggerSide === "start"
            ? mobileNavTrigger
            : null}
          <Link
            href="/chat"
            className="shrink-0 rounded-full outline-none transition-[opacity,background-color] duration-150 hover:opacity-90 focus-visible:opacity-100 focus-visible:bg-panel-hover/60"
            aria-label="Go to chat"
          >
            <IconAsset
              src={ICONS.solvedLogo}
              size={36}
              className="pointer-events-none shrink-0"
            />
          </Link>
          <span
            className={cn(
              "min-w-0 truncate text-white",
              showCreateStyle
                ? "text-[13px] font-semibold tracking-[0.08em]"
                : "text-sm font-bold tracking-[0.14em]",
            )}
          >
            {mobileTitle ?? "SOLVED"}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className="animate-header-fire inline-flex size-9 shrink-0 select-none items-center justify-center text-[26px] leading-none"
            aria-hidden
          >
            🔥
          </span>
          {variant === "mobile" && mobileNavTriggerSide === "end"
            ? mobileNavTrigger
            : null}
        </div>
      </div>
    </header>
  );
}
