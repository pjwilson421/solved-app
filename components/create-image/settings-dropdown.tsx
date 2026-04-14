"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
import { cn } from "@/lib/utils";

type SettingsMenuHoverContextValue = {
  hoveredItemKey: string | null;
  setHoveredItemKey: (key: string | null) => void;
};

const SettingsMenuHoverContext =
  createContext<SettingsMenuHoverContextValue | null>(null);

export const SETTINGS_CONTROL_ICON_SIZE = 16;

/**
 * Width class on the asset content-type (“Standard”) `SettingsDropdown` root (`variant="desktop"`).
 * Keep in sync with `GenerationSettingsRow` — used for the Create / Edit Image Templates pill width.
 */
export const SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP =
  "w-[min(100%,8.5rem)]";

/** Width class on the asset content-type trigger when `GenerationSettingsRow` `variant="mobile"`. */
export const SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_MOBILE = "min-w-0 w-full";

/** Settings row triggers (Create Image / Create Video): solid panel blue + lighter hover/open. */
export const settingsPillTriggerBase =
  "rounded-full bg-[#07195b] px-3 text-[11px] font-normal text-white transition-colors duration-150 outline-none focus:outline-none";

const triggerOpenHover = "bg-[#0a236f]";

export const settingsMenuPanelClass =
  "rounded-lg bg-[#07195b] py-1 text-[11px] shadow-lg";

/** Layout only — hover/selected are applied in `SettingsMenuOptionButton` so selected styling is not overridden by hover. */
export const settingsMenuItemBase =
  "flex w-full items-center gap-2 rounded-full px-3 py-2 text-left text-[11px] text-white transition-colors duration-150";

export function SettingsTriggerChevron({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "shrink-0 text-[10px] leading-none text-tx-secondary",
        className,
      )}
      aria-hidden
    >
      ▾
    </span>
  );
}

export type SettingsDropdownProps = {
  menuId: string;
  openMenu: string | null;
  setOpenMenu: Dispatch<SetStateAction<string | null>>;
  widthClass: string;
  ariaLabel: string;
  triggerClassName?: string;
  triggerContent: ReactNode;
  children: ReactNode;
  /**
   * Create Image / Create Video / Image Editor — settings row above prompt bar: pill chrome
   * (`globals.css` `.settings-pill-image-pages`) and list panel `bg-[#081030]`.
   */
  imagePagesPillChrome?: boolean;
};

/** Create Image / Create Video settings: hover + click open, single open row, outside close, menu above trigger. */
export function SettingsDropdown({
  menuId,
  openMenu,
  setOpenMenu,
  widthClass,
  ariaLabel,
  triggerClassName,
  triggerContent,
  children,
  imagePagesPillChrome = false,
}: SettingsDropdownProps) {
  const open = openMenu === menuId;
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const [hoveredItemKey, setHoveredItemKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setHoveredItemKey(null);
  }, [open]);

  const handleMenuMouseLeave = useCallback((e: MouseEvent<HTMLUListElement>) => {
    const next = e.relatedTarget;
    if (next instanceof Node && e.currentTarget.contains(next)) return;
    setHoveredItemKey(null);
  }, []);

  const handleRootPointerEnter = useCallback(() => {
    setOpenMenu(menuId);
  }, [menuId, setOpenMenu]);

  const handleRootPointerLeave = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rt = e.relatedTarget;
      if (rt instanceof Node && rootRef.current?.contains(rt)) return;
      setOpenMenu((cur) => (cur === menuId ? null : cur));
    },
    [menuId, setOpenMenu],
  );

  const handleTriggerClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpenMenu((cur) => (cur === menuId ? null : menuId));
    },
    [menuId, setOpenMenu],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const el = e.target as Node;
      if (!rootRef.current?.contains(el)) {
        setOpenMenu(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenMenu(null);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, setOpenMenu]);

  return (
    <div
      ref={rootRef}
      className={cn("relative z-30 min-w-0 shrink-0", widthClass)}
      onPointerEnter={handleRootPointerEnter}
      onPointerLeave={handleRootPointerLeave}
    >
      <button
        type="button"
        className={cn(
          /* h-9 matches TemplatesPanel pill toggle vertical size (Create Image). */
          "flex h-9 min-w-0 w-full cursor-pointer items-center gap-2 text-left",
          imagePagesPillChrome
            ? "settings-pill-image-pages rounded-full px-3 text-[11px] font-normal text-white outline-none focus:outline-none"
            : settingsPillTriggerBase,
          !imagePagesPillChrome &&
            (open ? triggerOpenHover : "hover:bg-[#0a236f]"),
          triggerClassName,
        )}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={handleTriggerClick}
      >
        {triggerContent}
      </button>
      <div
        className={cn(
          "absolute bottom-full left-0 z-[60] min-w-full pt-1 transition-opacity duration-100",
          open
            ? "visible pointer-events-auto opacity-100"
            : "invisible pointer-events-none opacity-0",
        )}
      >
        <ul
          id={listId}
          role="listbox"
          aria-label={ariaLabel}
          className={cn(
            settingsMenuPanelClass,
            imagePagesPillChrome && "bg-[#07195b]",
          )}
          onMouseLeave={handleMenuMouseLeave}
        >
          <SettingsMenuHoverContext.Provider
            value={{ hoveredItemKey, setHoveredItemKey }}
          >
            {children}
          </SettingsMenuHoverContext.Provider>
        </ul>
      </div>
    </div>
  );
}

export type SettingsMenuOptionButtonProps = {
  /** Stable id for this row within its menu — drives hover vs selected visual priority. */
  itemKey: string;
  selected: boolean;
  onPick: () => void;
  children: ReactNode;
};

/**
 * Visual: `activeVisual = hoveredItemKey ? hoveredItemKey === itemKey : selected`
 * (hover temporarily hides selected styling on other rows; mouse leaves menu list → hover clears).
 */
export function SettingsMenuOptionButton({
  itemKey,
  selected,
  onPick,
  children,
}: SettingsMenuOptionButtonProps) {
  const ctx = useContext(SettingsMenuHoverContext);
  const hoveredItemKey = ctx?.hoveredItemKey ?? null;
  const setHoveredItemKey = ctx?.setHoveredItemKey;

  const activeVisual =
    hoveredItemKey !== null && setHoveredItemKey
      ? hoveredItemKey === itemKey
      : selected;

  return (
    <li role="none">
      <button
        type="button"
        role="option"
        aria-selected={selected}
        className={cn(
          settingsMenuItemBase,
          activeVisual && "bg-ix-selected text-white",
        )}
        onMouseEnter={() => setHoveredItemKey?.(itemKey)}
        onClick={() => {
          onPick();
        }}
      >
        {children}
      </button>
    </li>
  );
}
