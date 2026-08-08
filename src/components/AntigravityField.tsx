"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor } from "@react-three/drei";
import * as THREE from "three";

/* ─────────────────────────────────────────────
   Configuration
   ───────────────────────────────────────────── */

const DEFAULT_COLORS = ["#059669", "#fbbf24", "#1e3a5f", "#ffffff"];

const FIELD_SIZE = { x: 20, y: 20, z: 10 } as const;

const PARTICLE_SCALE = { min: 0.2, max: 0.8 } as const;
const PARTICLE_SPEED = { min: 0.5, max: 1.0 } as const;
const PARTICLE_PULSE = 0.2;

const DRIFT = {
  vertical: 0.02,
  horizontal: 0.35,
  phase: 0.5,
} as const;

const MOUSE_REPULSION = {
  radius: 3.5,
  strength: 0.08,
} as const;

const FOG_COLOR = "#0f172a";
const FOG_NEAR = 8;
const FOG_FAR = 24;

const CAMERA_POSITION: [number, number, number] = [0, 0, 14];
const CAMERA_FOV = 60;

const SEGMENTS = 16;
const FRAME_DELTA_CLAMP = 0.05;

interface AntigravityFieldProps {
  className?: string;
  particleCount?: number;
  colors?: string[];
  mouseRadius?: number;
  mouseForce?: number;
  driftSpeed?: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
  speed: number;
  scale: number;
}

/* ─────────────────────────────────────────────
   Particle Field
   ───────────────────────────────────────────── */

interface ParticleFieldProps {
  count: number;
  colors: string[];
  mouseRadius: number;
  mouseForce: number;
  driftSpeed: number;
  mouseRef: React.RefObject<THREE.Vector3>;
}

function ParticleField({
  count,
  colors,
  mouseRadius,
  mouseForce,
  driftSpeed,
  mouseRef,
}: ParticleFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { viewport } = useThree();

  const geometry = useMemo(() => new THREE.SphereGeometry(1, SEGMENTS, SEGMENTS), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        emissive: new THREE.Color("#ffffff"),
        emissiveIntensity: 1.6,
        toneMapped: false,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    []
  );

  const particles = useMemo<Particle[]>(() => {
    const list: Particle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * FIELD_SIZE.x,
          (Math.random() - 0.5) * FIELD_SIZE.y,
          (Math.random() - 0.5) * FIELD_SIZE.z
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.02,
          Math.random() * DRIFT.vertical + DRIFT.vertical * 0.5,
          (Math.random() - 0.5) * 0.02
        ),
        phase: Math.random() * Math.PI * 2,
        speed: PARTICLE_SPEED.min + Math.random() * (PARTICLE_SPEED.max - PARTICLE_SPEED.min),
        scale: PARTICLE_SCALE.min + Math.random() * (PARTICLE_SCALE.max - PARTICLE_SCALE.min),
      });
    }
    return list;
  }, [count]);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  const groupScale = useMemo(() => {
    const smallestDimension = Math.min(viewport.width, viewport.height);
    return THREE.MathUtils.clamp(smallestDimension / 12, 0.55, 1.6);
  }, [viewport.width, viewport.height]);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      mesh.setColorAt(i, color.set(colors[i % colors.length]));
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, colors]);

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;

    const time = state.clock.elapsedTime;
    const mouse = mouseRef.current;
    const dt = Math.min(delta, FRAME_DELTA_CLAMP);

    for (let i = 0; i < count; i++) {
      const p = particles[i];

      p.position.y += p.velocity.y * p.speed * driftSpeed * dt;
      p.position.x += Math.sin(time * DRIFT.phase + p.phase) * DRIFT.horizontal * dt;
      p.position.z += Math.cos(time * DRIFT.phase * 0.6 + p.phase) * DRIFT.horizontal * 0.6 * dt;

      const dx = p.position.x - mouse.x;
      const dy = p.position.y - mouse.y;
      const dz = p.position.z - mouse.z;
      const distanceSquared = dx * dx + dy * dy + dz * dz;

      if (distanceSquared < mouseRadius * mouseRadius && distanceSquared > 1e-6) {
        const distance = Math.sqrt(distanceSquared);
        const falloff = 1 - distance / mouseRadius;
        const force = falloff * falloff * mouseForce;
        p.position.x += (dx / distance) * force;
        p.position.y += (dy / distance) * force;
        p.position.z += (dz / distance) * force;
      }

      if (p.position.y > FIELD_SIZE.y * 0.5) {
        p.position.y = -FIELD_SIZE.y * 0.5;
        p.position.x = (Math.random() - 0.5) * FIELD_SIZE.x;
        p.position.z = (Math.random() - 0.5) * FIELD_SIZE.z;
      }

      dummy.position.copy(p.position);
      const pulse = 1 + Math.sin(time * 2 + p.phase) * PARTICLE_PULSE;
      dummy.scale.setScalar(p.scale * pulse);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group scale={groupScale}>
      <instancedMesh ref={meshRef} args={[geometry, material, count]} frustumCulled={false} />
    </group>
  );
}

/* ─────────────────────────────────────────────
   Mouse Tracker
   ───────────────────────────────────────────── */

function MouseTracker({ target }: { target: React.RefObject<THREE.Vector3> }) {
  const { camera, gl } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const rect = gl.domElement.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      ndc.set(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      raycaster.setFromCamera(ndc, camera);
      raycaster.ray.intersectPlane(plane, target.current);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [camera, gl, raycaster, plane, ndc, target]);

  return null;
}

/* ─────────────────────────────────────────────
   Scene Setup
   ───────────────────────────────────────────── */

interface SceneProps {
  count: number;
  colors: string[];
  mouseRadius: number;
  mouseForce: number;
  driftSpeed: number;
}

function Scene({ count, colors, mouseRadius, mouseForce, driftSpeed }: SceneProps) {
  const mouseRef = useRef(new THREE.Vector3(9999, 9999, 9999));

  return (
    <>
      <fog attach="fog" args={[FOG_COLOR, FOG_NEAR, FOG_FAR]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} decay={0} color="#fbbf24" />
      <pointLight position={[-10, -5, -5]} intensity={0.8} decay={0} color="#059669" />
      <ParticleField
        count={count}
        colors={colors}
        mouseRadius={mouseRadius}
        mouseForce={mouseForce}
        driftSpeed={driftSpeed}
        mouseRef={mouseRef}
      />
      <MouseTracker target={mouseRef} />
    </>
  );
}

/* ─────────────────────────────────────────────
   Exported Component
   ───────────────────────────────────────────── */

export default function AntigravityField({
  className = "",
  particleCount = 800,
  colors = DEFAULT_COLORS,
  mouseRadius = MOUSE_REPULSION.radius,
  mouseForce = MOUSE_REPULSION.strength,
  driftSpeed = DRIFT.vertical,
}: AntigravityFieldProps) {
  const [dpr, setDpr] = useState(1.5);

  return (
    <div className={`absolute inset-0 -z-10 pointer-events-none ${className}`} aria-hidden="true">
      <Canvas
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        dpr={dpr}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ width: "100%", height: "100%" }}
      >
        <AdaptiveDpr pixelated />
        <PerformanceMonitor onIncline={() => setDpr(2)} onDecline={() => setDpr(1)}>
          <Scene
            count={particleCount}
            colors={colors}
            mouseRadius={mouseRadius}
            mouseForce={mouseForce}
            driftSpeed={driftSpeed}
          />
        </PerformanceMonitor>
      </Canvas>
    </div>
  );
}
