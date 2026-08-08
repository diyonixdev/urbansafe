"use client";

import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface UrbanHeroMouseTrackerProps {
  /** uMouse uniform to drive from the cursor. */
  mouseUniform: THREE.IUniform;
}

/**
 * Tracks the cursor on `window` (works behind pointer-events:none overlays)
 * and eases the value into the shader so motion stays calm and premium.
 */
export default function UrbanHeroMouseTracker({ mouseUniform }: UrbanHeroMouseTrackerProps) {
  const target = useRef(new THREE.Vector2(0.5, 0.5));
  const current = useRef(new THREE.Vector2(0.5, 0.5));

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      target.current.set(event.clientX / window.innerWidth, event.clientY / window.innerHeight);
    };
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", onPointerMove);
  }, []);

  useFrame((_, delta) => {
    const k = 1 - Math.exp(-3.5 * delta);
    current.current.lerp(target.current, k);
    (mouseUniform.value as THREE.Vector2).copy(current.current);
  });

  return null;
}
