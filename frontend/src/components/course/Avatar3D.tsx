"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect } from "react";

interface AvatarProps {
  pose: string;
  isPlaying: boolean;
  highlightWord: string;
  config?: any;
}

/*
  Realistic Sign Language Avatar
  - Upper body only (waist up)
  - Detailed hand shapes with individual finger control
  - Smooth multi-joint arm movements
  - Realistic sign language poses based on word context
  - Continuous fluid motion when signing
*/

// Each pose controls: shoulder angle, elbow bend, wrist rotation, and individual finger states
interface ArmPose {
  shoulder: number;    // shoulder rotation (deg)
  elbow: number;       // forearm bend (deg)
  wrist: number;       // wrist rotation (deg)
  fingers: [number, number, number, number, number]; // thumb, index, middle, ring, pinky curl (0=straight, 1=fully curled)
}

interface FullPose {
  left: ArmPose;
  right: ArmPose;
  headTilt: number;
  headNod: number;
  bodyLean: number;
  mouthOpen: number;  // 0-1
}

const SIGN_POSES: Record<string, FullPose> = {
  // Neutral / rest
  center: {
    left:  { shoulder: 20,  elbow: -30, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    right: { shoulder: -20, elbow: -30, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    headTilt: 0, headNod: 0, bodyLean: 0, mouthOpen: 0,
  },
  // Explaining — open palms forward, fingers spread
  high: {
    left:  { shoulder: -55, elbow: -45, wrist: -10, fingers: [0.1, 0, 0, 0, 0.1] },
    right: { shoulder: -50, elbow: -40, wrist: 10,  fingers: [0.1, 0, 0, 0, 0.1] },
    headTilt: -3, headNod: 5, bodyLean: -2, mouthOpen: 0.4,
  },
  // Pointing left — index finger extended, others curled
  left: {
    left:  { shoulder: -70, elbow: -20, wrist: -15, fingers: [0.8, 0, 0.9, 0.9, 0.9] },
    right: { shoulder: -10, elbow: -40, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    headTilt: -8, headNod: 0, bodyLean: -3, mouthOpen: 0.2,
  },
  // Pointing right
  right: {
    left:  { shoulder: -10, elbow: -40, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    right: { shoulder: -70, elbow: -20, wrist: 15,  fingers: [0.8, 0, 0.9, 0.9, 0.9] },
    headTilt: 8, headNod: 0, bodyLean: 3, mouthOpen: 0.2,
  },
  // Emphasis — fists raised
  low: {
    left:  { shoulder: -35, elbow: -70, wrist: 5,   fingers: [0.9, 0.9, 0.9, 0.9, 0.9] },
    right: { shoulder: -40, elbow: -65, wrist: -5,  fingers: [0.9, 0.9, 0.9, 0.9, 0.9] },
    headTilt: 0, headNod: -5, bodyLean: 2, mouthOpen: 0.5,
  },
};

// Additional dynamic sign movements
const SIGN_MOVEMENTS: Record<string, FullPose> = {
  // Thumbs up
  agree: {
    left:  { shoulder: -10, elbow: -35, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    right: { shoulder: -45, elbow: -60, wrist: 20,  fingers: [0, 0.9, 0.9, 0.9, 0.9] },
    headTilt: 5, headNod: 8, bodyLean: 0, mouthOpen: 0.3,
  },
  // Peace / counting
  count: {
    left:  { shoulder: -15, elbow: -35, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    right: { shoulder: -50, elbow: -50, wrist: 0,   fingers: [0.8, 0, 0, 0.9, 0.9] },
    headTilt: 3, headNod: 0, bodyLean: 0, mouthOpen: 0.2,
  },
  // Wave / greeting
  wave: {
    left:  { shoulder: -15, elbow: -35, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    right: { shoulder: -80, elbow: -30, wrist: 25,  fingers: [0, 0, 0, 0, 0] },
    headTilt: 5, headNod: 5, bodyLean: 0, mouthOpen: 0.4,
  },
  // Question — palms up
  question: {
    left:  { shoulder: -40, elbow: -50, wrist: -20, fingers: [0.1, 0, 0, 0, 0.1] },
    right: { shoulder: -40, elbow: -50, wrist: 20,  fingers: [0.1, 0, 0, 0, 0.1] },
    headTilt: -5, headNod: 8, bodyLean: 3, mouthOpen: 0.3,
  },
  // Think — finger on chin
  think: {
    left:  { shoulder: -15, elbow: -35, wrist: 0,   fingers: [0.3, 0.5, 0.5, 0.6, 0.7] },
    right: { shoulder: -55, elbow: -80, wrist: -10, fingers: [0.8, 0, 0.9, 0.9, 0.9] },
    headTilt: -8, headNod: 5, bodyLean: -2, mouthOpen: 0.1,
  },
  // Both hands clasped
  important: {
    left:  { shoulder: -40, elbow: -65, wrist: 10,  fingers: [0.7, 0.7, 0.7, 0.7, 0.7] },
    right: { shoulder: -40, elbow: -65, wrist: -10, fingers: [0.7, 0.7, 0.7, 0.7, 0.7] },
    headTilt: 0, headNod: -3, bodyLean: -3, mouthOpen: 0.5,
  },
};

function getSignPose(word: string, basePose: string, idx: number): FullPose {
  const w = word.toLowerCase();
  if (/\?$/.test(w)) return SIGN_MOVEMENTS.question;
  if (/yes|correct|right|good|great|true/.test(w)) return SIGN_MOVEMENTS.agree;
  if (/first|second|third|step|two|three|\d/.test(w)) return SIGN_MOVEMENTS.count;
  if (/hello|hi|welcome|greet/.test(w)) return SIGN_MOVEMENTS.wave;
  if (/think|imagine|consider|maybe/.test(w)) return SIGN_MOVEMENTS.think;
  if (/important|key|main|must|remember|note/.test(w)) return SIGN_MOVEMENTS.important;
  return SIGN_POSES[basePose] || SIGN_POSES.center;
}

// Render a hand with individually controlled fingers
function HandSVG({ fingers, side, wrist }: { fingers: [number, number, number, number, number]; side: "left" | "right"; wrist: number }) {
  const mirror = side === "right" ? -1 : 1;
  const [thumb, index, middle, ring, pinky] = fingers;

  // Finger lengths
  const fLengths = [14, 20, 22, 19, 15]; // thumb, index, middle, ring, pinky
  const fX = side === "left" ? [0, 6, 12, 18, 24] : [24, 18, 12, 6, 0];
  const thumbX = side === "left" ? -4 : 28;

  return (
    <motion.g
      animate={{ rotate: wrist }}
      transition={{ duration: 0.4 }}
    >
      {/* Palm */}
      <rect x="2" y="0" width="26" height="20" rx="5" fill="inherit" />

      {/* Thumb — separate axis */}
      <motion.rect
        x={thumbX} y={4}
        width="7" height={fLengths[0]}
        rx="3.5" fill="inherit"
        animate={{ rotate: thumb * 40 * mirror, y: 4 + thumb * 3 }}
        transition={{ duration: 0.35 }}
        style={{ originX: `${thumbX + 3.5}px`, originY: "4px" }}
      />

      {/* 4 Fingers */}
      {[index, middle, ring, pinky].map((curl, i) => (
        <motion.g key={i}>
          {/* First phalanx */}
          <motion.rect
            x={fX[i + 1]} y={-fLengths[i + 1] + 2}
            width="6" height={fLengths[i + 1] * (1 - curl * 0.3)}
            rx="3" fill="inherit"
            animate={{
              rotate: curl * -60,
              height: fLengths[i + 1] * (1 - curl * 0.3),
            }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            style={{ originX: `${fX[i + 1] + 3}px`, originY: "2px" }}
          />
          {/* Fingertip (second phalanx) */}
          {curl < 0.7 && (
            <motion.circle
              cx={fX[i + 1] + 3}
              cy={-fLengths[i + 1] + 2}
              r="3" fill="inherit"
              animate={{ cy: -fLengths[i + 1] * (1 - curl * 0.3) + 2 }}
              transition={{ duration: 0.3 }}
            />
          )}
          {/* Nail */}
          {curl < 0.5 && (
            <motion.rect
              x={fX[i + 1] + 1} y={-fLengths[i + 1]}
              width="4" height="3" rx="1.5"
              fill="rgba(255,255,255,0.15)"
              animate={{ y: -fLengths[i + 1] * (1 - curl * 0.3) }}
              transition={{ duration: 0.3 }}
            />
          )}
        </motion.g>
      ))}

      {/* Palm lines */}
      <path d="M6,5 Q15,10 24,5" fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
      <path d="M8,12 Q15,15 22,12" fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth="0.5" />
    </motion.g>
  );
}

export default function AvatarScene({ pose, isPlaying, highlightWord, config }: AvatarProps) {
  const skin = config?.skinColor || "#FFCBA4";
  const hair = config?.hairColor || "#3B2314";
  const shirt = config?.shirtColor || "#284ce3";
  const hairStyle = config?.hairStyle || "short";

  const currentPose = isPlaying
    ? getSignPose(highlightWord || "", pose, 0)
    : SIGN_POSES.center;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <motion.svg
        viewBox="0 0 300 300"
        style={{ width: "95%", maxWidth: 420, height: "auto" }}
      >
        <defs>
          <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={shirt} />
            <stop offset="100%" stopColor={darken(shirt, 30)} />
          </linearGradient>
          <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0f1628" stopOpacity="0" />
            <stop offset="100%" stopColor="#0f1628" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* ═══ BODY ═══ */}
        <motion.g
          animate={{ x: currentPose.bodyLean }}
          transition={{ duration: 0.5 }}
        >
          {/* Torso */}
          <rect x="112" y="175" width="76" height="130" rx="14" fill="url(#sg)" />
          <ellipse cx="112" cy="188" rx="16" ry="18" fill="url(#sg)" />
          <ellipse cx="188" cy="188" rx="16" ry="18" fill="url(#sg)" />
          <path d="M132,170 Q150,184 168,170" fill="none" stroke={darken(shirt, 40)} strokeWidth="1.5" />

          {/* Neck */}
          <rect x="140" y="142" width="20" height="34" rx="8" fill={skin} />

          {/* ═══ LEFT ARM ═══ */}
          <motion.g
            style={{ originX: "108px", originY: "186px" }}
            animate={{ rotate: currentPose.left.shoulder }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <rect x="72" y="180" width="24" height="58" rx="12" fill="url(#sg)" />

            <motion.g
              style={{ originX: "84px", originY: "235px" }}
              animate={{ rotate: currentPose.left.elbow }}
              transition={{ duration: 0.45 }}
            >
              <rect x="76" y="232" width="18" height="52" rx="9" fill={skin} />
              <rect x="77" y="278" width="16" height="6" rx="3" fill={darken(skin, 8)} />

              <g transform="translate(70,282)" fill={skin}>
                <HandSVG fingers={currentPose.left.fingers} side="left" wrist={currentPose.left.wrist} />
              </g>
            </motion.g>
          </motion.g>

          {/* ═══ RIGHT ARM ═══ */}
          <motion.g
            style={{ originX: "192px", originY: "186px" }}
            animate={{ rotate: currentPose.right.shoulder }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <rect x="204" y="180" width="24" height="58" rx="12" fill="url(#sg)" />

            <motion.g
              style={{ originX: "216px", originY: "235px" }}
              animate={{ rotate: currentPose.right.elbow }}
              transition={{ duration: 0.45 }}
            >
              <rect x="206" y="232" width="18" height="52" rx="9" fill={skin} />
              <rect x="207" y="278" width="16" height="6" rx="3" fill={darken(skin, 8)} />

              <g transform="translate(200,282)" fill={skin}>
                <HandSVG fingers={currentPose.right.fingers} side="right" wrist={currentPose.right.wrist} />
              </g>
            </motion.g>
          </motion.g>

          {/* ═══ HEAD ═══ */}
          <motion.g
            style={{ originX: "150px", originY: "145px" }}
            animate={{
              rotate: currentPose.headTilt,
              y: currentPose.headNod,
            }}
            transition={{ duration: 0.4 }}
          >
            <ellipse cx="150" cy="105" rx="40" ry="44" fill={skin} />

            {/* Hair */}
            {hairStyle === "short" && (
              <>
                <ellipse cx="150" cy="76" rx="40" ry="24" fill={hair} />
                <rect x="111" y="70" width="78" height="14" rx="7" fill={hair} />
              </>
            )}
            {hairStyle === "long" && (
              <>
                <ellipse cx="150" cy="74" rx="42" ry="26" fill={hair} />
                <rect x="108" y="70" width="16" height="60" rx="8" fill={hair} />
                <rect x="176" y="70" width="16" height="60" rx="8" fill={hair} />
              </>
            )}
            {hairStyle === "curly" && (
              <>
                <ellipse cx="150" cy="72" rx="44" ry="28" fill={hair} />
                {[0,1,2,3,4,5,6,7].map(i => (
                  <circle key={i} cx={116 + i * 10} cy={60 + (i%2)*7} r={6} fill={hair} />
                ))}
              </>
            )}

            {/* Ears */}
            <ellipse cx="110" cy="108" rx="7" ry="11" fill={darken(skin, 8)} />
            <ellipse cx="190" cy="108" rx="7" ry="11" fill={darken(skin, 8)} />

            {/* Eyes */}
            <motion.g
              animate={isPlaying ? { scaleY: [1, 0.05, 1] } : {}}
              transition={{ duration: 0.12, repeat: Infinity, repeatDelay: 4 }}
            >
              <ellipse cx="136" cy="102" rx="6" ry="7" fill="white" />
              <ellipse cx="164" cy="102" rx="6" ry="7" fill="white" />
              <circle cx="137" cy="103" r="3.5" fill="#3D2B1F" />
              <circle cx="165" cy="103" r="3.5" fill="#3D2B1F" />
              <circle cx="137.5" cy="103.5" r="2" fill="#1a1a1a" />
              <circle cx="165.5" cy="103.5" r="2" fill="#1a1a1a" />
              <circle cx="139" cy="101.5" r="1.2" fill="white" />
              <circle cx="167" cy="101.5" r="1.2" fill="white" />
            </motion.g>

            {/* Eyebrows */}
            <motion.path d="M127,90 Q136,86 145,89" fill="none" stroke={hair} strokeWidth="3" strokeLinecap="round"
              animate={isPlaying ? { d: ["M127,90 Q136,86 145,89", "M127,87 Q136,83 145,86", "M127,90 Q136,86 145,89"] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }} />
            <motion.path d="M155,89 Q164,86 173,90" fill="none" stroke={hair} strokeWidth="3" strokeLinecap="round"
              animate={isPlaying ? { d: ["M155,89 Q164,86 173,90", "M155,86 Q164,83 173,87", "M155,89 Q164,86 173,90"] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }} />

            {/* Nose */}
            <path d="M146,114 Q150,122 154,114" fill="none" stroke={darken(skin, 20)} strokeWidth="1.8" strokeLinecap="round" />

            {/* Mouth — shape changes based on signing */}
            <motion.ellipse
              cx="150" cy="130" fill="#C96B5A"
              animate={isPlaying
                ? { rx: [5, 8, 4, 7, 5], ry: [2, currentPose.mouthOpen * 6 + 2, 1.5, currentPose.mouthOpen * 5 + 2, 2] }
                : { rx: 5, ry: 2 }}
              transition={{ duration: 1, repeat: Infinity }}
            />
            {!isPlaying && (
              <path d="M142,128 Q150,134 158,128" fill="none" stroke="#C96B5A" strokeWidth="1.5" strokeLinecap="round" />
            )}
          </motion.g>
        </motion.g>

        {/* Bottom fade */}
        <rect x="0" y="285" width="300" height="15" fill="url(#fade)" />
      </motion.svg>
    </div>
  );
}

function darken(hex: string, amount = 20): string {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (n >> 16) - amount);
    const g = Math.max(0, ((n >> 8) & 0xff) - amount);
    const b = Math.max(0, (n & 0xff) - amount);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  } catch { return hex; }
}
