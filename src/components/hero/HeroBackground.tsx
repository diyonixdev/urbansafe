"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { QUALITY_DPR, type UrbanHeroBackgroundProps } from "@/lib/shaders";
import UrbanHeroScene from "@/components/shaders/UrbanHeroScene";

/**
 * Full-viewport WebGL background layer for the hero.
 *
 * - Fills its container: absolute inset-0, pointer-events: none
 * - Adaptive resolution from the `quality` prop
 * - Pauses rendering while the tab is hidden or `pause` is true
 *   (frameloop="never" stops the requestAnimationFrame loop entirely)
 */
export default function HeroBackground(props: UrbanHeroBackgroundProps) {
  const { quality = "high", pause = false } = props;
  const [tabHidden, setTabHidden] = useState(false);

  useEffect(() => {
    const onVisibility = () => setTabHidden(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const [maxDpr, setMaxDpr] = useState(() =>
    Math.min(typeof window !== "undefined" ? window.devicePixelRatio : 1, QUALITY_DPR[quality])
  );

  useEffect(() => {
    const onResize = () =>
      setMaxDpr(Math.min(window.devicePixelRatio, QUALITY_DPR[quality]));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [quality]);

  const paused = pause || tabHidden;

  return (
    <div
      className="absolute inset-0 z-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <Canvas
        frameloop={paused ? "never" : "always"}
        dpr={[Math.min(0.75, maxDpr), maxDpr]}
        camera={{ left: -1, right: 1, top: 1, bottom: -1, near: 0.1, far: 2, position: [0, 0, 1] }}
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <UrbanHeroScene {...props} />
      </Canvas>
    </div>
  );
}
