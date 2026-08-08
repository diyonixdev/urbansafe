/**
 * Vertex shader for the Urban Intelligence hero background.
 *
 * A full-screen quad (PlaneGeometry 2x2) rendered with an orthographic
 * camera — `position` already contains clip-space coordinates, so the
 * mesh is passed straight through. `vUv` carries the 0..1 texture
 * coordinates to the fragment shader.
 */
export const heroVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;
