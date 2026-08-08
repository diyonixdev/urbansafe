"use client";

import { useEffect, useRef } from "react";

type Props = { enabled: boolean };

export default function LivingNebulaShader({ enabled }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const THREE = (window as Window & { THREE?: any }).THREE;
    if (!enabled || !container || !THREE) return;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.cssText = "display:block;width:100%;height:100%;";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();
    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(1, 1) },
      iMouse: { value: new THREE.Vector2(0, 0) },
    };

    const vertexShader = `void main() { gl_Position = vec4(position, 1.0); }`;
    const fragmentShader = `
      precision highp float;
      uniform vec2 iResolution; uniform float iTime; uniform vec2 iMouse;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y);
      }
      float fbm(vec2 p) {
        float v = 0., a = .5;
        for (int i = 0; i < 5; i++) { v += a * noise(p); p = mat2(1.6, -1.2, 1.2, 1.6) * p; a *= .5; }
        return v;
      }
      void main() {
        vec2 uv = (gl_FragCoord.xy - .5 * iResolution.xy) / iResolution.y;
        vec2 mouse = (iMouse - .5 * iResolution.xy) / iResolution.y;
        vec2 delta = uv - mouse; float distanceToMouse = max(length(delta), .001);
        uv += normalize(delta) * .035 * smoothstep(.42, 0., distanceToMouse);
        float time = iTime * .075;
        vec2 flow = uv + vec2(time, -time * .7);
        float cloudA = fbm(flow * 2.1);
        float cloudB = fbm(flow * 3.8 + vec2(-time * 1.4, time));
        float ribbon = smoothstep(.48, .95, sin((uv.x + cloudA * .55) * 7. - time * 2.) * .5 + .5);
        vec3 deepNavy = vec3(.005, .025, .085), electricBlue = vec3(.03, .25, 1.);
        vec3 neonCyan = vec3(0., .95, 1.), emerald = vec3(0., .88, .55);
        vec3 energy = mix(electricBlue, neonCyan, smoothstep(.30, .72, cloudA));
        energy = mix(energy, emerald, smoothstep(.52, .84, cloudB) * .48);
        float density = smoothstep(.42, .78, cloudA) * .72 + ribbon * cloudB * .22;
        float vignette = 1. - smoothstep(.32, .94, length(uv));
        gl_FragColor = vec4(mix(deepNavy, energy, density) * (.55 + ribbon * .45), density * vignette * .31);
      }
    `;
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Mesh(geometry, material));

    const resize = () => {
      const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
      renderer.setSize(width, height, false);
      uniforms.iResolution.value.set(width * renderer.getPixelRatio(), height * renderer.getPixelRatio());
    };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container); resize();
    const moveMouse = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect(), pixelRatio = renderer.getPixelRatio();
      uniforms.iMouse.value.set((event.clientX - rect.left) * pixelRatio, (rect.bottom - event.clientY) * pixelRatio);
    };
    window.addEventListener("pointermove", moveMouse, { passive: true });
    let frameId = 0;
    const render = () => { uniforms.iTime.value = clock.getElapsedTime(); renderer.render(scene, camera); frameId = requestAnimationFrame(render); };
    render();

    return () => {
      cancelAnimationFrame(frameId); window.removeEventListener("pointermove", moveMouse); resizeObserver.disconnect();
      geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, [enabled]);

  return <div ref={containerRef} aria-hidden="true" className="absolute inset-0 z-0 overflow-hidden pointer-events-none" />;
}
