/**
 * Fragment shader — Urban Intelligence hero background.
 *
 * Original design for an AI Urban Safety Intelligence Platform. Renders a
 * living holographic city: flowing road networks, neural pathway filaments,
 * a safety grid lattice, electromagnetic wave rings, threat pulses and
 * cursor-reactive ripples. No galaxy/space/lava content.
 *
 * All tunables arrive as uniforms — see src/lib/shaders/README.md.
 */
export const heroFragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;

  uniform vec2  uResolution;   // canvas size in CSS pixels
  uniform float uTime;         // elapsed seconds
  uniform vec2  uMouse;        // normalized cursor, 0..1 (top-left origin)
  uniform float uIntensity;    // master energy multiplier
  uniform float uSpeed;        // animation speed multiplier
  uniform float uDistortion;   // flow-field warp strength
  uniform float uGlow;         // glow brightness
  uniform float uMouseStrength;// cursor ripple + lens strength

  uniform vec3 uColorBackground;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorDanger;
  uniform vec3 uColorPurple;
  uniform vec3 uColorWhite;

  /* ---- procedural noise ------------------------------------------------- */

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = m * p;
      a *= 0.5;
    }
    return v;
  }

  /* ---- main -------------------------------------------------------------- */

  void main() {
    float t = uTime * uSpeed;
    float invH = 1.0 / max(uResolution.y, 1.0);

    // Aspect-corrected, centered, y-up coordinates in "screen-height" units.
    vec2 p = (gl_FragCoord.xy - 0.5 * uResolution.xy) * invH;

    // Cursor in the same space (uMouse is 0..1, top-left origin).
    vec2 mouse = (vec2(uMouse.x, 1.0 - uMouse.y) * uResolution.xy - 0.5 * uResolution.xy) * invH;
    float md = length(p - mouse);

    // Gentle holographic lens + ripple push around the cursor.
    float mouseFalloff = exp(-md * 4.5) * uMouseStrength;
    p -= normalize(p - mouse + 1e-3) * mouseFalloff * 0.05 * uDistortion;

    // Domain-warped flow field — the "living energy" of the city.
    vec2 q = p * 1.6;
    vec2 warp = vec2(
      fbm(q + vec2(t * 0.05, -t * 0.035)),
      fbm(q - vec2(t * 0.03, -t * 0.06))
    ) - 0.5;
    vec2 dw = q + warp * 1.4 * uDistortion;

    // Holographic safety grid lattice.
    vec2 cell = dw * 3.4;
    vec2 g = abs(fract(cell) - 0.5);
    vec2 gw = fwidth(cell);
    float grid = 1.0 - smoothstep(0.015, 0.015 + max(gw.x, gw.y) * 1.6, min(g.x, g.y));
    float gridMask = grid * 0.5;

    // Flowing road networks — diagonal traffic lanes drifting with the warp.
    float flowCoord = dot(dw, vec2(0.7071, 0.7071)) + warp.y * 1.2 - t * 0.14;
    float flowW = fwidth(flowCoord) * 1.6;
    float road = 1.0 - smoothstep(0.0, 0.02 + flowW, abs(fract(flowCoord * 2.0) - 0.5));
    road *= 0.6 + 0.4 * sin(t * 0.5 + warp.x * 5.0);

    // Neural pathway filaments — bright curved data streams.
    float nx = sin((dw.x * 2.2 + warp.y * 2.0 + t * 0.22) * 6.283);
    float ny = sin((dw.y * 2.2 + warp.x * 2.0 - t * 0.16) * 6.283);
    float filament = pow(max(nx * ny, 0.0), 10.0);

    // Electromagnetic wave rings radiating from the center.
    float rings = pow(max(sin(length(p) * 16.0 - t * 0.8), 0.0), 3.0) * 0.4;

    // Cursor ripple pulses — circular shockwaves.
    float ripple = pow(max(sin(md * 24.0 - t * 6.0), 0.0), 2.0) * exp(-md * 5.0) * uMouseStrength * 1.2;

    // Threat markers — drifting danger pulses.
    float threatField = fbm(dw * 1.8 + vec2(-t * 0.05, t * 0.08));
    float threat = smoothstep(0.72, 0.84, threatField);
    threat *= 0.5 + 0.5 * sin(t * 1.3 + threatField * 16.0);

    // White data node highlights — sparse blinking junction points.
    vec2 nodeCell = floor(dw * 7.0);
    float nodeHash = hash21(nodeCell);
    float node = step(0.993, nodeHash) * max(0.5 + 0.5 * sin(t * 1.6 + nodeHash * 42.0), 0.0);

    // ---- compose ---------------------------------------------------------

    vec3 col = uColorBackground * 0.35;

    col += uColorPrimary * road * 1.15 * uGlow;
    col += uColorSecondary * filament * 1.7 * uGlow;
    col += uColorPurple * gridMask * 1.1 * uGlow;
    col += uColorWhite * node * 2.0 * uGlow;
    col += uColorDanger * threat * 1.5 * uGlow;
    col += uColorPrimary * rings * 0.55 * uGlow;
    col += (uColorPrimary * 0.65 + uColorWhite * 0.35) * ripple * 0.9 * uGlow;

    // Holographic chromatic fringing in high-energy zones.
    float energy = road + filament * 1.5 + ripple;
    col.r += energy * 0.022;
    col.b -= energy * 0.018;

    col *= 0.25 + uIntensity * 0.75;

    // Soft edge lighting + vignette (dark center accent, glowing rim).
    float rad = length(p);
    float vignette = smoothstep(1.25, 0.35, rad);
    float edgeGlow = smoothstep(0.5, 1.05, rad) * 0.14 * uGlow;
    col = col * (0.35 + 0.65 * vignette) + uColorPrimary * edgeGlow;

    // Subtle scanlines + drifting holographic scan band.
    float scan = 0.965 + 0.035 * sin(vUv.y * 600.0 + t * 0.25);
    float band = pow(max(sin(vUv.y * 3.14159 + t * 0.4), 0.0), 24.0) * 0.08;
    col += uColorSecondary * band;

    // Alpha: near-opaque navy core, translucent rim so the page bleeds
    // through softly at the edges.
    float alpha = 0.28 + 0.6 * vignette;
    alpha += (road * 0.35 + filament * 0.35 + ripple * 0.25 + threat * 0.3) * 0.3;
    alpha = clamp(alpha * scan, 0.0, 1.0);

    gl_FragColor = vec4(col * scan, alpha);
  }
`;
