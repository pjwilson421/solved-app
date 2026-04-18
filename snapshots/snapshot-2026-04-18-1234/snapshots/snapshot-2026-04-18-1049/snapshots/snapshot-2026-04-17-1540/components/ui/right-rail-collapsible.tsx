import { cn } from "@/lib/utils";

/**
 * Shared horizontal inset inside 300px side rails (left nav wrapper + right history / file-info).
 * Keeps viewport → panel edges symmetric with {@link Sidebar} (`1.25rem` = Tailwind `px-5`).
 * Source of truth: `--desktop-side-rail-inner-gutter-x` in `app/globals.css`.
 */
export const sideRailInnerHorizontalGutterClassName = "px-5";

/**
 * Outer corner radius of the left {@link Sidebar} nav card (`rounded-[11px]`).
 * Right-rail title strips and dropdown surfaces use this so corners match the nav panel exactly.
 */
export const sideNavPanelCornerRadiusClassName = "rounded-[11px]";

/**
 * Solid fill for the right-rail history / file-info title strip and dropdown body
 * (Chat, Create Image, Create Video, Image Editor — not the left nav `--panel-bg`).
 */
/** Solid fill for right rail unified panel — uses `rail-navy` in `app/globals.css`. */
export const historyPanelRightRailSurfaceBgClassName = "bg-rail-navy";

/** Shared shell for unified right-rail panel (radius + border + fill + column flex). */
export const historyPanelRightRailUnifiedPanelBaseClassName = cn(
  sideNavPanelCornerRadiusClassName,
  "border border-edge-subtle",
  historyPanelRightRailSurfaceBgClassName,
  "flex min-h-0 min-w-0 flex-col overflow-hidden",
);

/**
 * Desktop / drawer: fills rail height above the dock when the menu body is open so the list can scroll.
 */
export const historyPanelRightRailUnifiedShellClassName = cn(
  historyPanelRightRailUnifiedPanelBaseClassName,
  "flex-1",
);

/**
 * Collapsed right-rail panel: same border/fill as {@link historyPanelRightRailUnifiedShellClassName}
 * but does not grow — only the title row’s blue pill is visible (no empty fill below).
 */
export const historyPanelRightRailUnifiedShellCollapsedClassName = cn(
  historyPanelRightRailUnifiedPanelBaseClassName,
  "w-full min-w-0 shrink-0 self-start",
);

/** Mobile Chat header strip: does not grow into the message column (`shrink-0`). */
export const historyPanelRightRailUnifiedShellShrinkWrapClassName = cn(
  historyPanelRightRailUnifiedPanelBaseClassName,
  "w-full shrink-0 pt-3",
);

/**
 * Title / toggle row padding inside {@link historyPanelRightRailUnifiedShellClassName}.
 * Horizontal `px-4` matches the left `Sidebar` section labels (“MAIN” / “ASSETS”, `px-4` on the heading).
 * Vertical inset uses {@link historyPanelRailDesktopTitleAreaWrapperClassName} `pt-3` to mirror the
 * left nav card’s top `py-3`.
 */
export const historyPanelRailTitleSurfaceClassName = cn("min-w-0 px-4 py-0");

/** Desktop right-rail inner shell — `pb-0` matches left `Sidebar` rail inner so both rails share one bottom line. */
export const historyPanelRailInnerClassName = cn(
  "flex min-h-0 flex-1 flex-col overflow-hidden pb-0 pt-6",
  sideRailInnerHorizontalGutterClassName,
);

/** Spacing below the title row — same as `Sidebar` section label `mb-3` before nav items. */
export const historyPanelRailTitleRowClassName = "shrink-0 pb-3";

/**
 * Wraps the right-rail header stack on desktop. `pt-3` matches the left nav grey card’s top `py-3`
 * so the title and chevron align with “MAIN”; bottom spacing uses {@link historyPanelRailTitleRowClassName} only.
 */
export const historyPanelRailDesktopTitleAreaWrapperClassName =
  "relative z-20 shrink-0 bg-transparent pt-3";

/** Same classes as HistoryPanel desktop `<h2>` (“IMAGE HISTORY”). */
export const historyPanelRailTitleHeadingClassName =
  "text-left text-[10px] font-bold tracking-[0.08em] text-white";

/**
 * Title label inside a full-width header toggle: grows so the chevron sits on the far right
 * of the blue title rectangle (`flex-1` + truncation).
 */
export const historyPanelRailTitleToggleLabelClassName = cn(
  historyPanelRailTitleHeadingClassName,
  "min-w-0 flex-1 truncate text-left",
);

/** Toggle row focus/hover styles without horizontal padding (padding comes from {@link historyPanelRailInnerClassName}). */
export const historyPanelRailHeaderButtonClassName = cn(
  "flex w-full min-w-0 items-center gap-0 text-left outline-none",
  "transition-opacity duration-150 hover:opacity-90",
  "focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
);

/** Shared toggle row for Image Editor file info + Chat history right rails. */
export const rightRailPanelHeaderToggleClassName = cn(
  "flex w-full min-w-0 items-center gap-0 px-4 py-0 text-left outline-none",
  "transition-opacity duration-150 hover:opacity-90",
  "focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 focus-visible:ring-offset-app-bg",
);

export const rightRailPanelTitleClassName =
  "text-[10px] font-bold uppercase tracking-[0.08em] text-white";

/**
 * Scrollable body inside {@link historyPanelRightRailUnifiedShellClassName} (same fill as shell — no second surface).
 * No vertical padding here — gap under the header matches `Sidebar` via {@link historyPanelRailTitleRowClassName}
 * (`pb-3`); list rows supply their own vertical rhythm.
 */
export const railHistoryDropdownPanelSurfaceClassName = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pt-0 pb-0",
);

/**
 * Horizontal inset for right-rail dropdown rows (list items, empty copy, thumbnails).
 * Matches {@link historyPanelRailTitleSurfaceClassName} `px-4` / Sidebar “MAIN” label rhythm.
 */
export const historyPanelRailListRowInsetClassName = "px-4";

/**
 * Anchors 3-dots / preview overflow on a history or chat row: `right-0` with row
 * {@link historyPanelRailListRowInsetClassName} makes the trigger’s outer edge line up with the
 * row’s inner horizontal edge (same inset as left-aligned text).
 */
export const historyPanelRailRowActionsAnchorClassName =
  "pointer-events-auto absolute right-0 top-2 z-20";

/**
 * 3-dots trigger layout for right-rail list rows: `h-8 w-8` with `justify-end` so the 16×16 dots
 * glyph shares the same **right edge** as {@link RightRailPanelChevron} in the header (both sit in
 * the `px-4` inset column). Compose with `threeDotsMenuTriggerButtonClassName` from
 * `@/components/ui/three-dots-menu-trigger`.
 */
export const historyPanelRailRowActionsTriggerButtonClassName = cn(
  "flex h-8 w-8 shrink-0 items-center justify-end",
);

export function RightRailPanelChevron({
  expanded,
  className,
}: {
  expanded: boolean;
  className?: string;
}) {
  return (
    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[6px] bg-rail-navy">
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn(
          "shrink-0 text-[#22C55E] transition-transform duration-200",
          className,
          expanded && "rotate-180",
        )}
        aria-hidden
      >
        <path
          d="M6 9l6 6 6-6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
