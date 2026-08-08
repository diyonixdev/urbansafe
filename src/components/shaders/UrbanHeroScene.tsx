"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  applyColorsToUniforms,
  applyScalarsToUniforms,
  createUrbanHeroUniforms,
  resolveColors,
  type UrbanHeroBackgroundProps,
} from "@/lib/shaders";
import UrbanHeroMaterial from "./UrbanHeroMaterial";
import UrbanHeroMouseTracker from "./UrbanHeroMouseTracker";

/**
 * The full 3D scene: full-screen quad + shader material, orthographic
 * camera, per-frame uniform updates (time, resolution, pause).
 */
export default function UrbanHeroScene(props: UrbanHeroBackgroundProps) {
  const { size } = useThree();

  const uniforms = useMemo(() => createUrbanHeroUniforms(), []);
  const resolution = uniforms.uResolution.value as THREE.Vector2;
  const pausedRef = useRef(Boolean(props.pause));

  useEffect(() => {
    pausedRef.current = Boolean(props.pause);
  }, [props.pause]);

  useEffect(() => {
    applyColorsToUniforms(uniforms, resolveColors(props.colors));
  }, [props.colors, uniforms]);

  useEffect(() => {
    applyScalarsToUniforms(uniforms, {
      intensity: props.intensity ?? 1,
      speed: props.speed ?? 1,
      distortion: props.distortion ?? 0.6,
      glow: props.glow ?? 1,
      mouseStrength: props.mouseStrength ?? 1,
    });
  }, [props.intensity, props.speed, props.distortion, props.glow, props.mouseStrength, uniforms]);

  useFrame((state) => {
    if (pausedRef.current) return;
    if (size.width !== resolution.x || size.height !== resolution.y) {
      resolution.set(size.width, size.height);
    }
    uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <>
      <mesh>
        <planeGeometry args={[2, 2]} />
        <UrbanHeroMaterial uniforms={uniforms} />
      </mesh>
      <UrbanHeroMouseTracker mouseUniform={uniforms.uMouse} />
    </>
  );
}
