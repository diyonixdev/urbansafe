/**
 * Shared types for the Urban Intelligence hero shader.
 */

/** Adaptive resolution presets. Higher quality renders at higher DPR. */
export type HeroQuality = "low" | "medium" | "high" | "ultra";

/** User-facing color palette, hex strings. */
export interface UrbanHeroColors {
  /** Deep navy base the city glow sits on (#050816). */
  background: string;
  /** Neon cyan — road networks, rings, holographic energy (#00E5FF). */
  primary: string;
  /** Neon green — neural pathway filaments (#00FF9D). */
  secondary: string;
  /** Alert red — threat marker pulses (#FF4D6D). */
  danger: string;
  /** Violet — safety grid lattice (#7C3AED). */
  purple: string;
  /** Pure white — data node highlights (#FFFFFF). */
  white: string;
}

/**
 * All tunable props for the hero background. Every value is optional and
 * maps directly to a shader uniform (see src/lib/shaders/README.md).
 */
export interface UrbanHeroBackgroundProps {
  /** Master energy multiplier (0..2). Scales overall brightness. */
  intensity?: number;
  /** Animation speed multiplier (0..3). 1 = normal. */
  speed?: number;
  /** Domain-warp strength of the flow field (0..2). */
  distortion?: number;
  /** Glow brightness of all light sources (0..2). */
  glow?: number;
  /** Cursor interaction strength: ripple + lens push (0..2). */
  mouseStrength?: number;
  /** Palette overrides. Any subset of the six colors. */
  colors?: Partial<UrbanHeroColors>;
  /** Freeze the animation (used when the tab is hidden). */
  pause?: boolean;
  /** Adaptive resolution preset. */
  quality?: HeroQuality;
}
