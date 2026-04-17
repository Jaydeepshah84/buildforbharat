"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AvatarProps {
  pose: string;
  isPlaying: boolean;
  highlightWord: string;
  config?: any;
}

// Word → emoji hand mapping
const WORD_EMOJIS: Record<string, string> = {
  hello: "👋", hi: "👋", welcome: "🙏", namaste: "🙏",
  yes: "👍", correct: "👍", right: "👍", good: "👍", great: "👍",
  no: "🙅", wrong: "❌", not: "🚫",
  think: "🤔", imagine: "🤔", consider: "🤔",
  question: "❓", what: "❓", how: "❓", why: "❓", when: "❓",
  important: "☝️", remember: "☝️", key: "☝️", note: "☝️",
  first: "1️⃣", second: "2️⃣", third: "3️⃣", one: "1️⃣", two: "✌️", three: "3️⃣",
  love: "❤️", like: "👍", happy: "😊",
  learn: "📚", study: "📖", read: "📖", write: "✍️", book: "📕",
  see: "👀", look: "👁️", watch: "👀",
  speak: "🗣️", talk: "💬", say: "🗣️", tell: "💬",
  listen: "👂", hear: "👂",
  help: "🤝", please: "🙏", thanks: "🙏", thank: "🙏",
  stop: "✋", wait: "🤚", go: "👉", come: "🫳",
  big: "🤲", small: "🤏", up: "👆", down: "👇",
  me: "🫵", you: "👉", we: "👥", they: "👥",
  time: "⏰", day: "☀️", night: "🌙",
  home: "🏠", school: "🏫", work: "💼",
  friend: "🤝", family: "👨‍👩‍👧‍👦", teacher: "🧑‍🏫",
  animal: "🐾", plant: "🌱", sun: "☀️", star: "⭐", earth: "🌍",
};

const POSE_EMOJIS: Record<string, string> = {
  center: "🤲", high: "🖐️", left: "👈", right: "👉", low: "✊",
};

function getHandEmoji(word: string, basePose: string): string {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (WORD_EMOJIS[w]) return WORD_EMOJIS[w];
  if (/\?$/.test(word)) return "❓";
  if (/!$/.test(word)) return "❗";
  return POSE_EMOJIS[basePose] || "🖐️";
}

// Arm angles per pose
const ARM_POSES: Record<string, { la: number; ra: number; le: number; re: number; hd: number }> = {
  center: { la: 20,  ra: -20, le: -25, re: -25, hd: 0 },
  high:   { la: -55, ra: -50, le: -45, re: -40, hd: -3 },
  left:   { la: -65, ra: -10, le: -20, re: -30, hd: -6 },
  right:  { la: -10, ra: -65, le: -30, re: -20, hd: 6 },
  low:    { la: -35, ra: -40, le: -65, re: -60, hd: 0 },
};

export default function AvatarScene({ pose, isPlaying, highlightWord, config }: AvatarProps) {
  const skin = config?.skinColor || "#FFCBA4";
  const hair = config?.hairColor || "#3B2314";
  const shirt = config?.shirtColor || "#284ce3";
  const hairStyle = config?.hairStyle || "short";

  const a = ARM_POSES[pose] || ARM_POSES.center;
  const handEmoji = isPlaying ? getHandEmoji(highlightWord || "", pose) : "🤲";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", position: "relative" }}>

      {/* SVG Avatar Body */}
      <svg viewBox="0 0 300 300" style={{ width: "95%", maxWidth: 420, height: "auto" }}>
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

        {/* Torso */}
        <rect x="112" y="175" width="76" height="130" rx="14" fill="url(#sg)" />
        <ellipse cx="112" cy="188" rx="16" ry="18" fill="url(#sg)" />
        <ellipse cx="188" cy="188" rx="16" ry="18" fill="url(#sg)" />
        <path d="M132,170 Q150,184 168,170" fill="none" stroke={darken(shirt, 40)} strokeWidth="1.5" />

        {/* Neck */}
        <rect x="140" y="142" width="20" height="34" rx="8" fill={skin} />

        {/* Left Arm + emoji hand at end */}
        <motion.g
          style={{ originX: "108px", originY: "186px" }}
          animate={{ rotate: isPlaying ? a.la : 20 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <rect x="72" y="180" width="24" height="50" rx="12" fill="url(#sg)" />
          <motion.g
            style={{ originX: "84px", originY: "228px" }}
            animate={{ rotate: isPlaying ? a.le : -25 }}
            transition={{ duration: 0.4 }}
          >
            <rect x="76" y="226" width="18" height="40" rx="9" fill={skin} />
            {/* Emoji hand at wrist */}
            <foreignObject x="58" y="258" width="50" height="50">
              <motion.div
                animate={isPlaying ? { rotate: [0, 5, -5, 0] } : {}}
                transition={{ duration: 0.8, repeat: Infinity }}
                style={{ fontSize: 34, lineHeight: 1, textAlign: "center" }}
              >
                {handEmoji}
              </motion.div>
            </foreignObject>
          </motion.g>
        </motion.g>

        {/* Right Arm + emoji hand at end */}
        <motion.g
          style={{ originX: "192px", originY: "186px" }}
          animate={{ rotate: isPlaying ? a.ra : -20 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <rect x="204" y="180" width="24" height="50" rx="12" fill="url(#sg)" />
          <motion.g
            style={{ originX: "216px", originY: "228px" }}
            animate={{ rotate: isPlaying ? a.re : -25 }}
            transition={{ duration: 0.4 }}
          >
            <rect x="206" y="226" width="18" height="40" rx="9" fill={skin} />
            {/* Emoji hand at wrist */}
            <foreignObject x="192" y="258" width="50" height="50">
              <motion.div
                animate={isPlaying ? { rotate: [0, -5, 5, 0] } : {}}
                transition={{ duration: 0.8, repeat: Infinity, delay: 0.3 }}
                style={{ fontSize: 34, lineHeight: 1, textAlign: "center" }}
              >
                {handEmoji}
              </motion.div>
            </foreignObject>
          </motion.g>
        </motion.g>

        {/* Head */}
        <motion.g
          style={{ originX: "150px", originY: "145px" }}
          animate={{ rotate: isPlaying ? a.hd : 0 }}
          transition={{ duration: 0.4 }}
        >
          <ellipse cx="150" cy="105" rx="40" ry="44" fill={skin} />

          {/* Hair */}
          {hairStyle === "short" && (
            <><ellipse cx="150" cy="76" rx="40" ry="24" fill={hair} /><rect x="111" y="70" width="78" height="14" rx="7" fill={hair} /></>
          )}
          {hairStyle === "long" && (
            <><ellipse cx="150" cy="74" rx="42" ry="26" fill={hair} /><rect x="108" y="70" width="16" height="60" rx="8" fill={hair} /><rect x="176" y="70" width="16" height="60" rx="8" fill={hair} /></>
          )}
          {hairStyle === "curly" && (
            <><ellipse cx="150" cy="72" rx="44" ry="28" fill={hair} />{[0,1,2,3,4,5,6,7].map(i=><circle key={i} cx={116+i*10} cy={60+(i%2)*7} r={6} fill={hair}/>)}</>
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

          {/* Mouth */}
          <motion.ellipse cx="150" cy="130" fill="#C96B5A"
            animate={isPlaying ? { rx: [5, 8, 4, 7, 5], ry: [2, 5, 1.5, 4, 2] } : { rx: 5, ry: 2 }}
            transition={{ duration: 1.2, repeat: Infinity }} />
          {!isPlaying && <path d="M142,128 Q150,134 158,128" fill="none" stroke="#C96B5A" strokeWidth="1.5" strokeLinecap="round" />}
        </motion.g>

        {/* Bottom fade */}
        <rect x="0" y="285" width="300" height="15" fill="url(#fade)" />
      </svg>

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
