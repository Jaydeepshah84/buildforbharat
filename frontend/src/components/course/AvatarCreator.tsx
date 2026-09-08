"use client";

import { useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";
import { useRef } from "react";
import { motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";

export interface AvatarConfig {
  skinColor: string;
  hairColor: string;
  hairStyle: "short" | "long" | "curly" | "bald";
  shirtColor: string;
  pantsColor: string;
  gender: "male" | "female";
}

const DEFAULT_CONFIG: AvatarConfig = {
  skinColor: "#e8b89d",
  hairColor: "#2d1b0e",
  hairStyle: "short",
  shirtColor: "#1e40af",
  pantsColor: "#1e293b",
  gender: "female",
};

// ── 3D Preview Avatar ──
function PreviewAvatar({ config }: { config: AvatarConfig }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 0.01;
    }
  });

  const isFemale = config.gender === "female";

  return (
    <group ref={groupRef} position={[0, -1.3, 0]}>
      {/* Head */}
      <group position={[0, 1.55, 0]}>
        <mesh>
          <sphereGeometry args={[0.22, 32, 32]} />
          <meshStandardMaterial color={config.skinColor} roughness={0.5} />
        </mesh>

        {/* Hair */}
        {config.hairStyle === "short" && (
          <>
            <mesh position={[0, 0.08, -0.02]}>
              <sphereGeometry args={[0.23, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
              <meshStandardMaterial color={config.hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, 0.12, 0.12]} rotation={[0.3, 0, 0]}>
              <boxGeometry args={[0.38, 0.05, 0.1]} />
              <meshStandardMaterial color={config.hairColor} roughness={0.8} />
            </mesh>
          </>
        )}
        {config.hairStyle === "long" && (
          <>
            <mesh position={[0, 0.06, -0.04]}>
              <sphereGeometry args={[0.24, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.6]} />
              <meshStandardMaterial color={config.hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0, -0.1, -0.1]}>
              <capsuleGeometry args={[0.2, 0.3, 8, 16]} />
              <meshStandardMaterial color={config.hairColor} roughness={0.8} />
            </mesh>
            {/* Side hair */}
            <mesh position={[-0.2, -0.05, 0]}>
              <capsuleGeometry args={[0.04, 0.25, 8, 8]} />
              <meshStandardMaterial color={config.hairColor} roughness={0.8} />
            </mesh>
            <mesh position={[0.2, -0.05, 0]}>
              <capsuleGeometry args={[0.04, 0.25, 8, 8]} />
              <meshStandardMaterial color={config.hairColor} roughness={0.8} />
            </mesh>
          </>
        )}
        {config.hairStyle === "curly" && (
          <>
            <mesh position={[0, 0.1, 0]}>
              <sphereGeometry args={[0.26, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
              <meshStandardMaterial color={config.hairColor} roughness={1} />
            </mesh>
            {/* Curly bumps */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} position={[
                Math.cos(i * Math.PI / 3) * 0.22,
                0.1 + Math.sin(i * 0.8) * 0.05,
                Math.sin(i * Math.PI / 3) * 0.22,
              ]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial color={config.hairColor} roughness={1} />
              </mesh>
            ))}
          </>
        )}
        {/* bald = no hair mesh */}

        {/* Eyes */}
        <mesh position={[-0.07, 0.02, 0.18]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[0.07, 0.02, 0.18]}>
          <sphereGeometry args={[0.04, 16, 16]} />
          <meshStandardMaterial color="white" />
        </mesh>
        <mesh position={[-0.07, 0.02, 0.2]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        <mesh position={[0.07, 0.02, 0.2]}>
          <sphereGeometry args={[0.025, 16, 16]} />
          <meshStandardMaterial color="#1a1a2e" />
        </mesh>
        {/* Nose */}
        <mesh position={[0, -0.04, 0.2]}>
          <sphereGeometry args={[0.022, 12, 12]} />
          <meshStandardMaterial color={config.skinColor} roughness={0.4} />
        </mesh>
        {/* Mouth */}
        <mesh position={[0, -0.1, 0.18]} scale={[1.2, 0.4, 0.5]}>
          <sphereGeometry args={[0.03, 12, 12]} />
          <meshStandardMaterial color="#c47a6a" />
        </mesh>
        {/* Ears */}
        <mesh position={[-0.22, 0, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={config.skinColor} />
        </mesh>
        <mesh position={[0.22, 0, 0]}>
          <sphereGeometry args={[0.035, 12, 12]} />
          <meshStandardMaterial color={config.skinColor} />
        </mesh>
        {/* Eyebrows */}
        <mesh position={[-0.07, 0.08, 0.18]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.06, 0.012, 0.02]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
        <mesh position={[0.07, 0.08, 0.18]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.06, 0.012, 0.02]} />
          <meshStandardMaterial color={config.hairColor} />
        </mesh>
      </group>

      {/* Neck */}
      <mesh position={[0, 1.32, 0]}>
        <cylinderGeometry args={[0.05, 0.06, 0.1, 16]} />
        <meshStandardMaterial color={config.skinColor} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 1.0, 0]}>
        <capsuleGeometry args={[isFemale ? 0.18 : 0.2, 0.4, 8, 16]} />
        <meshStandardMaterial color={config.shirtColor} roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Arms */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.28, 1.15, 0]}>
          <mesh position={[side * 0.1, -0.05, 0]} rotation={[0, 0, side * 0.3]}>
            <capsuleGeometry args={[0.05, 0.22, 8, 16]} />
            <meshStandardMaterial color={config.shirtColor} roughness={0.4} />
          </mesh>
          <mesh position={[side * 0.18, -0.25, 0]}>
            <capsuleGeometry args={[0.035, 0.2, 8, 16]} />
            <meshStandardMaterial color={config.skinColor} />
          </mesh>
          {/* Hand */}
          <mesh position={[side * 0.18, -0.42, 0]}>
            <boxGeometry args={[0.07, 0.08, 0.035]} />
            <meshStandardMaterial color={config.skinColor} />
          </mesh>
        </group>
      ))}

      {/* Hips */}
      <mesh position={[0, 0.68, 0]}>
        <capsuleGeometry args={[isFemale ? 0.19 : 0.17, 0.08, 8, 16]} />
        <meshStandardMaterial color={config.pantsColor} />
      </mesh>

      {/* Legs */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.1, 0.35, 0]}>
            <capsuleGeometry args={[0.065, 0.35, 8, 16]} />
            <meshStandardMaterial color={config.pantsColor} roughness={0.6} />
          </mesh>
          <mesh position={[side * 0.1, 0.02, 0.03]}>
            <boxGeometry args={[0.09, 0.05, 0.14]} />
            <meshStandardMaterial color="#111827" roughness={0.3} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Color picker button ──
function ColorBtn({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-8 h-8 rounded-full border-2 transition-all ${selected ? "border-white scale-110 shadow-lg" : "border-transparent hover:scale-105"}`}
      style={{ backgroundColor: color }}
    >
      {selected && <Check className="w-3 h-3 text-white mx-auto" />}
    </button>
  );
}

// ── Main Avatar Creator ──
interface Props {
  onSave: (config: AvatarConfig) => void;
  onCancel?: () => void;
  initialConfig?: AvatarConfig;
}

export default function AvatarCreator({ onSave, onCancel, initialConfig }: Props) {
  const [config, setConfig] = useState<AvatarConfig>(initialConfig || DEFAULT_CONFIG);

  const update = (key: keyof AvatarConfig, value: string) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const skinColors = ["#f5d0b5", "#e8b89d", "#d4956b", "#c27c4e", "#8d5524", "#5c3310"];
  const hairColors = ["#2d1b0e", "#4a2c14", "#8b6914", "#d4a017", "#c0392b", "#e74c3c", "#2c3e50", "#ecf0f1"];
  const shirtColors = ["#1e40af", "#e74c3c", "#27ae60", "#8e44ad", "#f39c12", "#1abc9c", "#2c3e50", "#e91e63"];
  const pantsColors = ["#1e293b", "#2c3e50", "#1a1a2e", "#3b3b5c", "#4a4a4a", "#1e3a5f"];

  return (
    <div className="bg-[#0f1628] rounded-2xl overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left: 3D Preview */}
        <div className="h-[400px] lg:h-[500px] relative">
          <Canvas camera={{ position: [0, 0.3, 3], fov: 28 }} gl={{ antialias: true, alpha: true }}>
            <ambientLight intensity={0.5} />
            <directionalLight position={[3, 5, 5]} intensity={0.9} />
            <directionalLight position={[-2, 3, 2]} intensity={0.3} color="#1e40af" />
            <Environment preset="studio" />
            <ContactShadows position={[0, -1.3, 0]} opacity={0.5} scale={4} blur={2} />
            <PreviewAvatar config={config} />
          </Canvas>

          {/* Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-primary-600/90 backdrop-blur rounded-full px-3 py-1.5">
            <span className="text-[10px] text-white font-bold uppercase tracking-wider">Avatar Creator</span>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="p-6 space-y-6 bg-[#141a2e]">
          <div>
            <h2 className="text-xl font-extrabold text-white mb-1">Create Your Avatar</h2>
            <p className="text-white/40 text-sm">Customize your sign language interpreter</p>
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Gender</label>
            <div className="flex gap-2">
              {(["female", "male"] as const).map((g) => (
                <button key={g} onClick={() => update("gender", g)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${config.gender === g ? "bg-primary-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                  {g === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </div>

          {/* Skin Color */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Skin Tone</label>
            <div className="flex gap-2">
              {skinColors.map((c) => <ColorBtn key={c} color={c} selected={config.skinColor === c} onClick={() => update("skinColor", c)} />)}
            </div>
          </div>

          {/* Hair Style */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Hair Style</label>
            <div className="flex gap-2">
              {(["short", "long", "curly", "bald"] as const).map((h) => (
                <button key={h} onClick={() => update("hairStyle", h)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold capitalize transition-all ${config.hairStyle === h ? "bg-primary-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
                  {h}
                </button>
              ))}
            </div>
          </div>

          {/* Hair Color */}
          {config.hairStyle !== "bald" && (
            <div>
              <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Hair Color</label>
              <div className="flex gap-2 flex-wrap">
                {hairColors.map((c) => <ColorBtn key={c} color={c} selected={config.hairColor === c} onClick={() => update("hairColor", c)} />)}
              </div>
            </div>
          )}

          {/* Shirt Color */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Shirt Color</label>
            <div className="flex gap-2 flex-wrap">
              {shirtColors.map((c) => <ColorBtn key={c} color={c} selected={config.shirtColor === c} onClick={() => update("shirtColor", c)} />)}
            </div>
          </div>

          {/* Pants Color */}
          <div>
            <label className="text-xs font-bold text-white/50 uppercase tracking-wider mb-2 block">Pants Color</label>
            <div className="flex gap-2">
              {pantsColors.map((c) => <ColorBtn key={c} color={c} selected={config.pantsColor === c} onClick={() => update("pantsColor", c)} />)}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setConfig(DEFAULT_CONFIG)}
              className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 text-sm font-medium hover:bg-white/15 transition flex items-center gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
            {onCancel && (
              <button onClick={onCancel}
                className="px-4 py-2.5 rounded-xl bg-white/10 text-white/60 text-sm font-medium hover:bg-white/15 transition">
                Cancel
              </button>
            )}
            <button onClick={() => { localStorage.setItem("avatar_config", JSON.stringify(config)); onSave(config); }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-500 transition shadow-lg shadow-primary-600/30">
              Save Avatar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_CONFIG };
export type { AvatarConfig as AvatarConfigType };
