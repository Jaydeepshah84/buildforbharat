"use client";

/* Hero object: three dark glass lesson panels with lit edges and an accent
   core, on a dark studio environment. Pointer parallax, slow drift.
   Renders nothing when WebGL is unavailable. */

import React, { Component, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Edges, Environment, Float, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

const ACCENT = "#6366f1";
const ACCENT_2 = "#22d3ee";

function Panel({
  position,
  rotation = 0,
  edge,
  tone,
}: {
  position: [number, number, number];
  rotation?: number;
  edge: string;
  tone: string;
}) {
  return (
    <RoundedBox args={[3.1, 0.1, 2.05]} radius={0.05} smoothness={6} position={position} rotation={[0, rotation, 0]}>
      <meshPhysicalMaterial color={tone} roughness={0.28} metalness={0.55} clearcoat={1} clearcoatRoughness={0.2} envMapIntensity={1.1} />
      <Edges color={edge} threshold={20} />
    </RoundedBox>
  );
}

function Core() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35;
  });
  return (
    <group position={[0.05, 0.05, 0]}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[0.42, 0]} />
        <meshPhysicalMaterial color="#c7d2fe" emissive={ACCENT} emissiveIntensity={0.55} roughness={0.15} metalness={0.3} clearcoat={1} />
      </mesh>
      <pointLight color={ACCENT} intensity={14} distance={5} />
    </group>
  );
}

function Rig({ children, still }: { children: React.ReactNode; still: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

  useFrame((state, dt) => {
    const g = ref.current;
    if (!g) return;
    const d = Math.min(dt, 0.05);
    const tx = still ? 0 : pointer.current.y * 0.1;
    const ty = still ? 0 : pointer.current.x * 0.22;
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, tx, 2.5, d);
    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, ty, 2.5, d);
    const base = state.size.width < 640 ? 0.8 : 1;
    g.scale.setScalar(THREE.MathUtils.damp(g.scale.x, base, 3, d));
  });

  return <group ref={ref}>{children}</group>;
}

function Scene({ still }: { still: boolean }) {
  const F = ({ children, ...rest }: any) => (still ? <group>{children}</group> : <Float {...rest}>{children}</Float>);
  return (
    <>
      <ambientLight intensity={0.25} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} />
      <pointLight position={[-4, 1, 3]} color={ACCENT} intensity={26} distance={14} />
      <pointLight position={[5, -2, 2]} color={ACCENT_2} intensity={16} distance={14} />

      <Environment resolution={128} frames={1} background={false}>
        <Lightformer form="rect" intensity={1.6} color="#ffffff" scale={[8, 3, 1]} position={[0, 6, -2]} rotation={[Math.PI / 2, 0, 0]} />
        <Lightformer form="rect" intensity={3} color={ACCENT} scale={[7, 5, 1]} position={[-7, 1, 1]} rotation={[0, Math.PI / 2, 0]} />
        <Lightformer form="rect" intensity={2.2} color={ACCENT_2} scale={[7, 5, 1]} position={[7, 1, 1]} rotation={[0, -Math.PI / 2, 0]} />
        <Lightformer form="circle" intensity={1.4} color="#a5b4fc" scale={3} position={[0, -4, 3]} />
      </Environment>

      <Rig still={still}>
        <group rotation={[0.44, -0.6, 0]}>
          <F speed={1} rotationIntensity={0.06} floatIntensity={0.4}>
            <Panel position={[0, -0.82, 0]} rotation={0.05} tone="#131318" edge="rgba(255,255,255,0.22)" />
            <Panel position={[0.16, -0.06, -0.08]} rotation={-0.04} tone="#17171e" edge="rgba(148,163,255,0.5)" />
            <Panel position={[-0.08, 0.7, 0.12]} rotation={0.08} tone="#1b1b24" edge="rgba(99,102,241,0.85)" />
          </F>
          <F speed={1.5} rotationIntensity={0} floatIntensity={0.7}>
            <Core />
          </F>
        </group>
      </Rig>
    </>
  );
}

export class SceneBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {}
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export default function HeroScene({ still = false }: { still?: boolean }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(true);

  useEffect(() => setReady(hasWebGL()), []);
  useEffect(() => {
    const el = wrap.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className="pointer-events-none h-full w-full" aria-hidden>
      {ready && (
        <SceneBoundary>
          <Canvas
            dpr={[1, 2]}
            camera={{ position: [0, 0.5, 8], fov: 32, near: 0.1, far: 50 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            frameloop={visible ? "always" : "never"}
            style={{ pointerEvents: "none" }}
            onCreated={({ gl }) => {
              gl.toneMapping = THREE.ACESFilmicToneMapping;
              gl.toneMappingExposure = 1.15;
            }}
          >
            <Scene still={still} />
          </Canvas>
        </SceneBoundary>
      )}
    </div>
  );
}
