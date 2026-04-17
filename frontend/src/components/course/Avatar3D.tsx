"use client";

/*
  Lightweight CSS Avatar for Sign Language
  No Three.js, no Canvas, no heavy dependencies.
  Pure HTML/CSS with Framer Motion animations.
*/

import { motion } from "framer-motion";

interface AvatarProps {
  pose: string;
  isPlaying: boolean;
  highlightWord: string;
  config?: any;
}

export default function AvatarScene({ pose, isPlaying, highlightWord, config }: AvatarProps) {
  const skin = config?.skinColor || "#e8b89d";
  const hair = config?.hairColor || "#2d1b0e";
  const shirt = config?.shirtColor || "#284ce3";
  const pants = config?.pantsColor || "#1e293b";
  const hairStyle = config?.hairStyle || "short";

  const armPoses: Record<string, { left: string; right: string }> = {
    center: { left: "rotate(20deg)", right: "rotate(-20deg)" },
    high:   { left: "rotate(-50deg)", right: "rotate(30deg)" },
    low:    { left: "rotate(40deg)", right: "rotate(40deg)" },
    left:   { left: "rotate(-60deg)", right: "rotate(-10deg)" },
    right:  { left: "rotate(-10deg)", right: "rotate(-60deg)" },
  };

  const arms = armPoses[pose] || armPoses.center;

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Avatar body */}
      <motion.div
        className="relative"
        style={{ width: 140, height: 280 }}
        animate={{ y: isPlaying ? [0, -3, 0] : 0 }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* ── Hair (behind head) ── */}
        {hairStyle === "long" && (
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 6, width: 72, height: 80, borderRadius: "50% 50% 30% 30%", background: hair, zIndex: 0 }} />
        )}

        {/* ── Head ── */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 rounded-full"
          style={{ top: 10, width: 60, height: 65, background: skin, zIndex: 2 }}
          animate={{ rotateZ: isPlaying ? (pose === "left" ? -5 : pose === "right" ? 5 : 0) : 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Hair top */}
          {hairStyle === "short" && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2" style={{ width: 58, height: 30, borderRadius: "50% 50% 0 0", background: hair }} />
          )}
          {hairStyle === "curly" && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2" style={{ width: 66, height: 38, borderRadius: "50%", background: hair }} />
          )}
          {hairStyle !== "bald" && hairStyle !== "long" && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2" style={{ width: 56, height: 12, borderRadius: "0 0 50% 50%", background: hair }} />
          )}

          {/* Eyes */}
          <motion.div
            className="absolute flex gap-3 justify-center w-full"
            style={{ top: 24 }}
            animate={isPlaying ? { scaleY: [1, 0.1, 1] } : {}}
            transition={{ duration: 0.15, repeat: Infinity, repeatDelay: 3 }}
          >
            <div className="w-2.5 h-3 rounded-full bg-[#1a1a2e]" />
            <div className="w-2.5 h-3 rounded-full bg-[#1a1a2e]" />
          </motion.div>

          {/* Eyebrows */}
          <div className="absolute flex gap-5 justify-center w-full" style={{ top: 18 }}>
            <motion.div className="w-3.5 h-1 rounded-full" style={{ background: hair }}
              animate={isPlaying ? { y: [0, -2, 0] } : {}} transition={{ duration: 2, repeat: Infinity }} />
            <motion.div className="w-3.5 h-1 rounded-full" style={{ background: hair }}
              animate={isPlaying ? { y: [0, -2, 0] } : {}} transition={{ duration: 2, repeat: Infinity }} />
          </div>

          {/* Nose */}
          <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 33, width: 6, height: 7, borderRadius: "50%", background: skin, filter: "brightness(0.92)" }} />

          {/* Mouth */}
          <motion.div
            className="absolute left-1/2 -translate-x-1/2 rounded-full"
            style={{ top: 44, background: "#c47a6a" }}
            animate={isPlaying ? { width: [14, 18, 10, 14], height: [5, 8, 4, 5] } : { width: 14, height: 5 }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />

          {/* Ears */}
          <div className="absolute" style={{ left: -5, top: 22, width: 10, height: 14, borderRadius: "50%", background: skin, filter: "brightness(0.95)" }} />
          <div className="absolute" style={{ right: -5, top: 22, width: 10, height: 14, borderRadius: "50%", background: skin, filter: "brightness(0.95)" }} />
        </motion.div>

        {/* ── Neck ── */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 72, width: 16, height: 14, background: skin, zIndex: 1 }} />

        {/* ── Body ── */}
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 82, width: 70, height: 80, borderRadius: "20px 20px 8px 8px", background: shirt, zIndex: 1 }} />

        {/* ── Left Arm ── */}
        <motion.div
          className="absolute"
          style={{ left: 5, top: 88, width: 20, height: 80, transformOrigin: "top center", zIndex: 0 }}
          animate={{ transform: isPlaying ? arms.left : "rotate(20deg)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Upper arm */}
          <div style={{ width: 18, height: 40, borderRadius: 10, background: shirt }} />
          {/* Forearm */}
          <div style={{ width: 16, height: 35, borderRadius: 10, background: skin, marginTop: -4, marginLeft: 1 }} />
          {/* Hand */}
          <motion.div
            style={{ width: 18, height: 16, borderRadius: "50%", background: skin, marginTop: -2 }}
            animate={isPlaying ? { rotate: [0, 15, -15, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          />
        </motion.div>

        {/* ── Right Arm ── */}
        <motion.div
          className="absolute"
          style={{ right: 5, top: 88, width: 20, height: 80, transformOrigin: "top center", zIndex: 0 }}
          animate={{ transform: isPlaying ? arms.right : "rotate(-20deg)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <div style={{ width: 18, height: 40, borderRadius: 10, background: shirt }} />
          <div style={{ width: 16, height: 35, borderRadius: 10, background: skin, marginTop: -4, marginLeft: 1 }} />
          <motion.div
            style={{ width: 18, height: 16, borderRadius: "50%", background: skin, marginTop: -2 }}
            animate={isPlaying ? { rotate: [0, -15, 15, 0] } : {}}
            transition={{ duration: 1, repeat: Infinity, delay: 0.5 }}
          />
        </motion.div>

        {/* ── Legs ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-2" style={{ top: 160, zIndex: 1 }}>
          <div style={{ width: 24, height: 70, borderRadius: "8px 8px 6px 6px", background: pants }} />
          <div style={{ width: 24, height: 70, borderRadius: "8px 8px 6px 6px", background: pants }} />
        </div>

        {/* ── Shoes ── */}
        <div className="absolute left-1/2 -translate-x-1/2 flex gap-2" style={{ top: 228, zIndex: 1 }}>
          <div style={{ width: 28, height: 12, borderRadius: "4px 8px 4px 4px", background: "#111827" }} />
          <div style={{ width: 28, height: 12, borderRadius: "8px 4px 4px 4px", background: "#111827" }} />
        </div>
      </motion.div>

      {/* Shadow */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-20 h-3 rounded-full bg-white/10 blur-sm" />
    </div>
  );
}
