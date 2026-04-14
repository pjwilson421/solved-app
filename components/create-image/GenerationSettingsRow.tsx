"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import {
  SettingsDropdown,
  SettingsMenuOptionButton,
  SettingsTriggerChevron,
  SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP,
  SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_MOBILE,
  SETTINGS_CONTROL_ICON_SIZE,
} from "./settings-dropdown";
import type { AspectRatio, AssetContentType, Quality } from "./types";
import {
  ASPECT_RATIOS,
  ASSET_TYPE_DROPDOWN_OPTIONS,
  QUALITIES,
  VARIATION_OPTIONS,
} from "./types";

function assetContentTypeIconSrc(type: AssetContentType): string {
  switch (type) {
    case "Standard":
      return "/icons/img-settings-image-icon.svg";
    case "Social Media":
      return ICONS.socialMedia;
    case "Email":
      return ICONS.email;
    case "Digital":
      return ICONS.digitalMedia;
    default:
      return ICONS.imagePlaceholder;
  }
}

function aspectIconSrc(ratio: AspectRatio): string {
  switch (ratio) {
    case "16:9":
      return ICONS.aspect16x9;
    case "1:1":
      return ICONS.aspect1x1;
    case "4:5":
      return ICONS.aspect4x5;
    case "9:16":
      return ICONS.aspect9x16;
    default:
      return ICONS.aspect16x9;
  }
}

export type GenerationSettingsRowProps = {
  assetContentType: AssetContentType;
  onAssetContentType: (v: AssetContentType) => void;
  aspectRatio: AspectRatio;
  onAspectRatio: (v: AspectRatio) => void;
  quality: Quality;
  onQuality: (v: Quality) => void;
  variations: number;
  onVariations: (v: number) => void;
  variant?: "desktop" | "mobile";
  className?: string;
  /**
   * Create Image / Image Editor dock row: pill chrome + dropdown panel `bg-[#081030]`
   * (`SettingsDropdown` `imagePagesPillChrome`).
   */
  imagePagesPillStyle?: boolean;
};

export function GenerationSettingsRow({
  assetContentType,
  onAssetContentType,
  aspectRatio,
  onAspectRatio,
  quality,
  onQuality,
  variations,
  onVariations,
  variant = "desktop",
  className,
  imagePagesPillStyle = false,
}: GenerationSettingsRowProps) {
  const isDesktop = variant === "desktop";
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const close = useCallback(() => setOpenMenu(null), []);
  const chevronClassName = imagePagesPillStyle ? "text-white" : undefined;

  const contentWidth = isDesktop
    ? SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_DESKTOP
    : SETTINGS_ASSET_CONTENT_TRIGGER_WIDTH_MOBILE;
  const aspectWidth = isDesktop ? "w-[5.5rem]" : "min-w-0 w-full";
  const qualityWidth = isDesktop ? "w-[5.625rem]" : "min-w-0 w-full";
  const variationsWidth = isDesktop ? "w-14" : "min-w-0 w-full";

  const assetTrigger: ReactNode = (
    <>
      <IconAsset
        src={assetContentTypeIconSrc(assetContentType)}
        size={SETTINGS_CONTROL_ICON_SIZE}
        className="size-4 shrink-0 opacity-90 [&_img]:block"
      />
      <span className="min-w-0 flex-1 truncate leading-normal">
        {assetContentType}
      </span>
      <SettingsTriggerChevron className={chevronClassName} />
    </>
  );

  const assetOptions = ASSET_TYPE_DROPDOWN_OPTIONS.map((opt) => (
    <SettingsMenuOptionButton
      key={opt}
      itemKey={opt}
      selected={assetContentType === opt}
      onPick={() => {
        onAssetContentType(opt);
        close();
      }}
    >
      <IconAsset
        src={assetContentTypeIconSrc(opt)}
        size={SETTINGS_CONTROL_ICON_SIZE}
        className="size-4 shrink-0 opacity-90 [&_img]:block"
      />
      <span className="min-w-0">{opt}</span>
    </SettingsMenuOptionButton>
  ));

  const aspectTrigger: ReactNode = (
    <>
      <IconAsset
        src={aspectIconSrc(aspectRatio)}
        size={SETTINGS_CONTROL_ICON_SIZE}
        className="size-4 shrink-0 [&_img]:block"
      />
      <span className="min-w-0 flex-1 truncate leading-normal tabular-nums">
        {aspectRatio}
      </span>
      <SettingsTriggerChevron className={chevronClassName} />
    </>
  );

  const aspectOptions = ASPECT_RATIOS.map((a) => (
    <SettingsMenuOptionButton
      key={a}
      itemKey={a}
      selected={aspectRatio === a}
      onPick={() => {
        onAspectRatio(a);
        close();
      }}
    >
      <IconAsset
        src={aspectIconSrc(a)}
        size={SETTINGS_CONTROL_ICON_SIZE}
        className="size-4 shrink-0 [&_img]:block"
      />
      <span className="min-w-0">{a}</span>
    </SettingsMenuOptionButton>
  ));

  const qualityTrigger: ReactNode = (
    <>
      <IconAsset
        src={ICONS.resolutionDiamond}
        size={SETTINGS_CONTROL_ICON_SIZE}
        className="size-4 shrink-0 [&_img]:block"
      />
      <span className="min-w-0 flex-1 truncate leading-normal tabular-nums">
        {quality}
      </span>
      <SettingsTriggerChevron className={chevronClassName} />
    </>
  );

  const qualityOptions = QUALITIES.map((q) => (
    <SettingsMenuOptionButton
      key={q}
      itemKey={q}
      selected={quality === q}
      onPick={() => {
        onQuality(q);
        close();
      }}
    >
      <IconAsset
        src={ICONS.resolutionDiamond}
        size={SETTINGS_CONTROL_ICON_SIZE}
        className="size-4 shrink-0 [&_img]:block"
      />
      <span className="min-w-0">{q}</span>
    </SettingsMenuOptionButton>
  ));

  const variationsTrigger: ReactNode = (
    <>
      <span className="min-w-0 flex-1 truncate leading-normal tabular-nums">
        {variations}/4
      </span>
      <SettingsTriggerChevron className={chevronClassName} />
    </>
  );

  const variationsOptions = VARIATION_OPTIONS.map((n) => (
    <SettingsMenuOptionButton
      key={n}
      itemKey={String(n)}
      selected={variations === n}
      onPick={() => {
        onVariations(n);
        close();
      }}
    >
      <span className="min-w-0">{n}/4</span>
    </SettingsMenuOptionButton>
  ));

  return (
    <div
      className={cn("w-fit max-w-full shrink-0", className)}
      role="group"
      aria-label="Generation settings"
    >
      {isDesktop ? (
        <div className="flex flex-nowrap items-center justify-start gap-x-3">
          <SettingsDropdown
            menuId="asset"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={contentWidth}
            ariaLabel="Content type"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={assetTrigger}
          >
            {assetOptions}
          </SettingsDropdown>

          <SettingsDropdown
            menuId="aspect"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={aspectWidth}
            ariaLabel="Aspect ratio"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={aspectTrigger}
          >
            {aspectOptions}
          </SettingsDropdown>

          <SettingsDropdown
            menuId="quality"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={qualityWidth}
            ariaLabel="Quality"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={qualityTrigger}
          >
            {qualityOptions}
          </SettingsDropdown>

          <SettingsDropdown
            menuId="variations"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={variationsWidth}
            ariaLabel="Variations"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={variationsTrigger}
          >
            {variationsOptions}
          </SettingsDropdown>
        </div>
      ) : (
        <div className="inline-grid w-fit max-w-full grid-cols-2 justify-items-stretch gap-x-3 gap-y-1.5">
          <SettingsDropdown
            menuId="asset"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={contentWidth}
            ariaLabel="Content type"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={assetTrigger}
          >
            {assetOptions}
          </SettingsDropdown>

          <SettingsDropdown
            menuId="aspect"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={aspectWidth}
            ariaLabel="Aspect ratio"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={aspectTrigger}
          >
            {aspectOptions}
          </SettingsDropdown>

          <SettingsDropdown
            menuId="quality"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={qualityWidth}
            ariaLabel="Quality"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={qualityTrigger}
          >
            {qualityOptions}
          </SettingsDropdown>

          <SettingsDropdown
            menuId="variations"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={variationsWidth}
            ariaLabel="Variations"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={variationsTrigger}
          >
            {variationsOptions}
          </SettingsDropdown>
        </div>
      )}
    </div>
  );
}
