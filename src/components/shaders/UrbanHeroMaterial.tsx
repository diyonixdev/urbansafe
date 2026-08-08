"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { heroFragmentShader, heroVertexShader } from "@/lib/shaders";

interface UrbanHeroMaterialProps {
  /** Stable uniform set created by the scene. */
  uniforms: Record<string, THREE.IUniform>;
}

/**
 * Wraps the hero ShaderMaterial in a reusable React component.
 * - transparent + depthWrite false so it composites over the page
 * - toneMapped false keeps the neon colors punchy and bloom-friendly
 */
export default function UrbanHeroMaterial({ uniforms }: UrbanHeroMaterialProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: heroVertexShader,
        fragmentShader: heroFragmentShader,
        uniforms,
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    [uniforms]
  );

  return <primitive object={material} attach="material" />;
}
