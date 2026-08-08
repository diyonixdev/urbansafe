# Urban Intelligence Hero Shader

A custom, original WebGL hero background for the AI Urban Safety Intelligence
Platform — a living holographic city of flowing road networks, neural
pathways, safety grids, electromagnetic rings and cursor-reactive ripples.

Built with React Three Fiber + Three.js + GLSL. Not a port of any existing
shader.

## Architecture

```
src/lib/shaders/           GLSL sources + uniform plumbing (framework-free)
  heroVertexShader.ts      Fullscreen-quad vertex shader
  heroFragmentShader.ts    All visual logic
  types.ts                 UrbanHeroBackgroundProps / UrbanHeroColors
  constants.ts             DEFAULT_COLORS, DEFAULT_PROPS, QUALITY_DPR
  uniforms.ts              createUrbanHeroUniforms() + sync helpers
  index.ts                 barrel
src/components/shaders/    React Three Fiber layers
  UrbanHeroMaterial.tsx    ShaderMaterial wrapper (transparent, additive-safe)
  UrbanHeroMouseTracker.tsx  Eased cursor → uMouse uniform
  UrbanHeroScene.tsx       Camera, mesh, per-frame uniform updates
src/components/hero/
  HeroBackground.tsx       <Canvas> wrapper (adaptive DPR, tab pause)
  HeroSection.tsx          Full hero section (background + framer-motion content)
```

## Shader uniforms

| Uniform | Type | Default | Description |
| --- | --- | --- | --- |
| `uTime` | `float` | 0 | Elapsed seconds, multiplied by `uSpeed` inside the shader. Drives every motion. |
| `uResolution` | `vec2` | 1×1 | Canvas size in CSS pixels. Used for aspect-corrected, centered coordinates. |
| `uMouse` | `vec2` | (0.5, 0.5) | Cursor position normalized 0..1, top-left origin. Eased per frame (exponential damp). |
| `uIntensity` | `float` | 1 | Master energy multiplier. Scales final color brightness. |
| `uSpeed` | `float` | 1 | Animation speed. 0 freezes motion; 2 doubles it. |
| `uDistortion` | `float` | 0.6 | Domain-warp strength of the flow field — how strongly the grid/roads bend. |
| `uGlow` | `float` | 1 | Brightness of every light source (roads, filaments, nodes, rings, rim). |
| `uMouseStrength` | `float` | 1 | Cursor interaction: lens distortion falloff + ripple pulse amplitude. |
| `uColorBackground` | `vec3` | #050816 | Deep navy base. |
| `uColorPrimary` | `vec3` | #00E5FF | Neon cyan — roads, rings, ripple, rim light. |
| `uColorSecondary` | `vec3` | #00FF9D | Neon green — neural filaments, scan band. |
| `uColorDanger` | `vec3` | #FF4D6D | Alert red — drifting threat pulses. |
| `uColorPurple` | `vec3` | #7C3AED | Violet — safety grid lattice. |
| `uColorWhite` | `vec3` | #FFFFFF | White — sparse data node highlights. |

## Props (exposed on `HeroBackground` / `HeroSection`)

| Prop | Type | Default | Effect |
| --- | --- | --- | --- |
| `intensity` | `number` | 1 | 0..2. Overall energy/brightness. |
| `speed` | `number` | 1 | 0..3. Animation velocity. |
| `distortion` | `number` | 0.6 | 0..2. Flow-field bending of grid and roads. |
| `glow` | `number` | 1 | 0..2. Light-source brightness. |
| `mouseStrength` | `number` | 1 | 0..2. Cursor ripple + lens strength. |
| `colors` | `Partial<UrbanHeroColors>` | default palette | Override any of the six hex colors. |
| `pause` | `boolean` | false | Freezes rendering (`frameloop="never"`). |
| `quality` | `"low" \| "medium" \| "high" \| "ultra"` | `"high"` | Max device pixel ratio: 0.75 / 1 / 1.5 / 2 (adaptive resolution). |

## Customizing colors

```tsx
<HeroBackground
  colors={{
    primary: "#22D3EE",
    secondary: "#A3E635",
    danger: "#FB7185",
    background: "#020617",
  }}
/>
```

Any subset is fine — unspecified colors keep their defaults.

## Customizing animation speed

```tsx
<HeroBackground speed={0.6} />        // calmer flow
<HeroBackground speed={1.8} />        // faster city traffic
```

## Integration example

```tsx
<section className="relative min-h-screen overflow-hidden">
  <HeroBackground />
  <div className="relative z-10">Your content</div>
</section>
```

## Performance

- Single full-screen quad, one draw call, 4-octave FBM (no dynamic loops).
- Adaptive resolution via the `quality` prop (DPR 0.75 → 2.0).
- Rendering pauses automatically when the tab is hidden (`visibilitychange`
  → `frameloop="never"`).
- React Three Fiber's loop is built on `requestAnimationFrame`; the cursor is
  exponentially damped per frame for smooth, calm motion.
- Cursor tracking uses a `window` `pointermove` listener (passive) so the
  effect works even when the canvas sits behind `pointer-events: none`
  glassmorphism layers.
