import type { HeroQuality, UrbanHeroColors } from "./types";

/** Default palette — AI Urban Safety Intelligence Platform. */
export const DEFAULT_COLORS: UrbanHeroColors = {
  background: "#050816",
  primary: "#00E5FF",
  secondary: "#00FF9D",
  danger: "#FF4D6D",
  purple: "#7C3AED",
  white: "#FFFFFF",
};

/** Default prop values (documented in src/lib/shaders/README.md). */
export const DEFAULT_PROPS = {
  intensity: 1,
  speed: 1,
  distortion: 0.6,
  glow: 1,
  mouseStrength: 1,
  quality: "high",
} as const;

/** Max device pixel ratio per quality preset (adaptive resolution). */
export const QUALITY_DPR: Record<HeroQuality, number> = {
  low: 0.75,
  medium: 1,
  high: 1.5,
  ultra: 2,
};

/** Merge user palette overrides with the defaults. */
export function resolveColors(colors?: Partial<UrbanHeroColors>): UrbanHeroColors {
  return { ...DEFAULT_COLORS, ...colors };
}
