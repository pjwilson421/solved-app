"use client";

import { useCallback, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconAsset } from "@/components/icons/IconAsset";
import { ICONS } from "@/components/icons/icon-paths";
import {
  SettingsDropdown,
  SettingsMenuOptionButton,
  SettingsTriggerChevron,
  SETTINGS_CONTROL_ICON_SIZE,
} from "./settings-dropdown";
import type { AspectRatio, Quality, VideoDuration } from "./types";
import { ASPECT_RATIOS, QUALITIES, VIDEO_DURATIONS } from "./types";

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

export type VideoGenerationSettingsRowProps = {
  aspectRatio: AspectRatio;
  onAspectRatio: (v: AspectRatio) => void;
  quality: Quality;
  onQuality: (v: Quality) => void;
  duration: VideoDuration;
  onDuration: (v: VideoDuration) => void;
  variant?: "desktop" | "mobile";
  className?: string;
  /** Create Video dock row above prompt bar — matches Create Image / Image Editor pill + menu panel. */
  imagePagesPillStyle?: boolean;
};

export function VideoGenerationSettingsRow({
  aspectRatio,
  onAspectRatio,
  quality,
  onQuality,
  duration,
  onDuration,
  variant = "desktop",
  className,
  imagePagesPillStyle = false,
}: VideoGenerationSettingsRowProps) {
  const isDesktop = variant === "desktop";
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const close = useCallback(() => setOpenMenu(null), []);
  const chevronClassName = imagePagesPillStyle ? "text-white" : undefined;

  const aspectWidth = isDesktop ? "w-[5.5rem]" : "min-w-0 w-full";
  const qualityWidth = isDesktop ? "w-[5.625rem]" : "min-w-0 w-full";
  const durationWidth = isDesktop ? "w-[4.5rem]" : "min-w-0 w-full";

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

  const durationTrigger: ReactNode = (
    <>
      <span className="min-w-0 flex-1 truncate leading-normal tabular-nums">
        {duration}
      </span>
      <SettingsTriggerChevron className={chevronClassName} />
    </>
  );

  const durationOptions = VIDEO_DURATIONS.map((d) => (
    <SettingsMenuOptionButton
      key={d}
      itemKey={d}
      selected={duration === d}
      onPick={() => {
        onDuration(d);
        close();
      }}
    >
      <span className="min-w-0">{d}</span>
    </SettingsMenuOptionButton>
  ));

  return (
    <div
      className={cn("w-fit max-w-full shrink-0", className)}
      role="group"
      aria-label="Video generation settings"
    >
      {isDesktop ? (
        <div className="flex flex-nowrap items-center justify-start gap-x-3">
          <SettingsDropdown
            menuId="video-aspect"
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
            menuId="video-quality"
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
            menuId="video-duration"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={durationWidth}
            ariaLabel="Duration"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={durationTrigger}
          >
            {durationOptions}
          </SettingsDropdown>
        </div>
      ) : (
        <div className="inline-grid w-fit max-w-full grid-cols-2 justify-items-stretch gap-x-3 gap-y-1.5">
          <SettingsDropdown
            menuId="video-aspect"
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
            menuId="video-quality"
            openMenu={openMenu}
            setOpenMenu={setOpenMenu}
            widthClass={qualityWidth}
            ariaLabel="Quality"
            imagePagesPillChrome={imagePagesPillStyle}
            triggerContent={qualityTrigger}
          >
            {qualityOptions}
          </SettingsDropdown>

          <div className="col-span-2 w-full">
            <SettingsDropdown
              menuId="video-duration"
              openMenu={openMenu}
              setOpenMenu={setOpenMenu}
              widthClass="min-w-0 w-full"
              ariaLabel="Duration"
              imagePagesPillChrome={imagePagesPillStyle}
              triggerContent={durationTrigger}
            >
              {durationOptions}
            </SettingsDropdown>
          </div>
        </div>
      )}
    </div>
  );
}
