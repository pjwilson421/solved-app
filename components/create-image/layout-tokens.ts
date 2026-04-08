/** Measured from public/design/Desktop-Main-Create-Image-16x9.svg */

/**
 * Square tile in `DesktopTemplatesStrip` (xl+).
 * Also used for Start/End frame slots on Create Video (`VideoFrameReferences` at `xl:`).
 */
export const DESKTOP_TEMPLATE_TILE_PX = 120;

export const DESKTOP = {
  sidebarWidth: 300,
  mainGutter: 36,
  historyWidth: 300,
  preview16x9: { w: 1000, h: 562.5 },
  preview1x1: { w: 563.97, h: 563.97 },
  preview4x5: { w: 451.18, h: 563.97 },
  preview9x16: { w: 317.23, h: 563.97 },
  previewToMetaGap: 25.78,
  metaBlockToSeparator: 23,
  separatorToTemplates: 34,
  contentLineWidth: 879.23,
  nav: {
    sectionInsetX: 52,
    buttonW: 199.61,
    buttonH: 39.78,
    radius: 6.66,
  },
  history: {
    thumbW: 300,
    thumbH: 168.75,
    thumbToPrompt: 15.35,
  },
  promptBar: {
    plusRadius: 14,
    generateRadius: 18,
    rowCy: 845,
  },
} as const;

/** Mid / tablet: single centered column cap (between mobile and full desktop rail). */
export const TABLET = {
  contentMaxPx: 900,
} as const;

export const MOBILE = {
  headerH: 78,
  titleLeft: 58,
  contentInsetX: 32,
  preview16x9: { w: 311, h: 175 },
  labelToPreview: 14,
  previewToHelper: 25,
  helperToDivider: 20,
  dividerToTemplates: 24,
  templatesToSettings: 30,
  settingsToPrompt: 30,
  templateThumb: { w: 92, h: 64, gap: 17 },
  promptRow: {
    plusR: 12,
    generateR: 18,
    plusCx: 54,
    textX: 76,
    generateCx: 315.61,
  },
} as const;
