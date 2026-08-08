import * as THREE from "three";
import { DEFAULT_COLORS, DEFAULT_PROPS } from "./constants";
import type { UrbanHeroColors } from "./types";

/**
 * Create the full uniform set for the hero shader with default values.
 * The object is created once and reused; React components update `.value`
 * on the same instances to avoid re-uploading.
 */
export function createUrbanHeroUniforms(): Record<string, THREE.IUniform> {
  return {
    uTime: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uMouse: { value: new THREE.Vector2(0.5, 0.5) },
    uIntensity: { value: DEFAULT_PROPS.intensity },
    uSpeed: { value: DEFAULT_PROPS.speed },
    uDistortion: { value: DEFAULT_PROPS.distortion },
    uGlow: { value: DEFAULT_PROPS.glow },
    uMouseStrength: { value: DEFAULT_PROPS.mouseStrength },
    uColorBackground: { value: new THREE.Color(DEFAULT_COLORS.background) },
    uColorPrimary: { value: new THREE.Color(DEFAULT_COLORS.primary) },
    uColorSecondary: { value: new THREE.Color(DEFAULT_COLORS.secondary) },
    uColorDanger: { value: new THREE.Color(DEFAULT_COLORS.danger) },
    uColorPurple: { value: new THREE.Color(DEFAULT_COLORS.purple) },
    uColorWhite: { value: new THREE.Color(DEFAULT_COLORS.white) },
  };
}

/** Write a resolved palette into the color uniforms. */
export function applyColorsToUniforms(uniforms: Record<string, THREE.IUniform>, colors: UrbanHeroColors) {
  (uniforms.uColorBackground.value as THREE.Color).set(colors.background);
  (uniforms.uColorPrimary.value as THREE.Color).set(colors.primary);
  (uniforms.uColorSecondary.value as THREE.Color).set(colors.secondary);
  (uniforms.uColorDanger.value as THREE.Color).set(colors.danger);
  (uniforms.uColorPurple.value as THREE.Color).set(colors.purple);
  (uniforms.uColorWhite.value as THREE.Color).set(colors.white);
}

/** Write scalar tuning props into the numeric uniforms. */
export function applyScalarsToUniforms(
  uniforms: Record<string, THREE.IUniform>,
  values: { intensity: number; speed: number; distortion: number; glow: number; mouseStrength: number }
) {
  uniforms.uIntensity.value = values.intensity;
  uniforms.uSpeed.value = values.speed;
  uniforms.uDistortion.value = values.distortion;
  uniforms.uGlow.value = values.glow;
  uniforms.uMouseStrength.value = values.mouseStrength;
}
