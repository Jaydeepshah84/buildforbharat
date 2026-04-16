"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import {
  Play, Pause, SkipForward, SkipBack, Maximize2, Minimize2,
  ChevronRight, RotateCcw, Loader2, Hand,
  ThumbsUp, Bookmark, Type,
} from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ═══════════════════════════════════════════════════════════════
   REALISTIC SIGN LANGUAGE AVATAR
   Full upper-body character with detailed hands & fingers
   ═══════════════════════════════════════════════════════════════ */

interface SignPose {
  label: string;
  // Each arm: upper arm angle, forearm angle, hand angle, hand x/y offset from natural position
  leftUpper: number;   // shoulder angle (0 = down, negative = raised)
  leftFore: number;    // elbow bend angle
  leftHandRot: number;
  leftHandType: string;
  rightUpper: number;
  rightFore: number;
  rightHandRot: number;
  rightHandType: string;
  headTilt: number;
  bodyLean: number;
}

const POSES: SignPose[] = [
  // 0: Rest
  { label: 'rest', leftUpper: 20, leftFore: 90, leftHandRot: 0, leftHandType: 'relaxed', rightUpper: -20, rightFore: -90, rightHandRot: 0, rightHandType: 'relaxed', headTilt: 0, bodyLean: 0 },
  // 1: Explain (right hand up, open palm)
  { label: 'explain', leftUpper: 15, leftFore: 80, leftHandRot: 0, leftHandType: 'relaxed', rightUpper: -60, rightFore: -40, rightHandRot: -10, rightHandType: 'open', headTilt: 3, bodyLean: 1 },
  // 2: Both hands concept
  { label: 'concept', leftUpper: -45, leftFore: 50, leftHandRot: 10, leftHandType: 'open', rightUpper: 45, rightFore: -50, rightHandRot: -10, rightHandType: 'open', headTilt: 0, bodyLean: 0 },
  // 3: Point right
  { label: 'point', leftUpper: 15, leftFore: 85, leftHandRot: 0, leftHandType: 'fist', rightUpper: -70, rightFore: -20, rightHandRot: -25, rightHandType: 'point', headTilt: 4, bodyLean: 2 },
  // 4: List / count
  { label: 'list', leftUpper: -50, leftFore: 40, leftHandRot: 5, leftHandType: 'count', rightUpper: -35, rightFore: -55, rightHandRot: -5, rightHandType: 'flat', headTilt: -2, bodyLean: -1 },
  // 5: Emphasize (both hands press)
  { label: 'emphasize', leftUpper: -35, leftFore: 55, leftHandRot: -15, leftHandType: 'flat', rightUpper: 35, rightFore: -55, rightHandRot: 15, rightHandType: 'flat', headTilt: 0, bodyLean: 3 },
  // 6: Think (hand near chin)
  { label: 'think', leftUpper: 15, leftFore: 80, leftHandRot: 0, leftHandType: 'relaxed', rightUpper: -75, rightFore: -15, rightHandRot: 10, rightHandType: 'pinch', headTilt: -5, bodyLean: -2 },
  // 7: Connect (hands approach each other)
  { label: 'connect', leftUpper: -40, leftFore: 50, leftHandRot: 20, leftHandType: 'hook', rightUpper: 40, rightFore: -50, rightHandRot: -20, rightHandType: 'hook', headTilt: 2, bodyLean: 1 },
  // 8: Question (palms up, shrug-like)
  { label: 'question', leftUpper: -35, leftFore: 55, leftHandRot: 25, leftHandType: 'open', rightUpper: 35, rightFore: -55, rightHandRot: -25, rightHandType: 'open', headTilt: -4, bodyLean: -1 },
  // 9: Wave / greet
  { label: 'greet', leftUpper: 15, leftFore: 80, leftHandRot: 0, leftHandType: 'relaxed', rightUpper: -80, rightFore: -15, rightHandRot: 15, rightHandType: 'spread', headTilt: 5, bodyLean: 2 },
];

/* ── Realistic Hand with visible fingers ── */
function RealisticHand({ type, mirror = false }: { type: string; mirror?: boolean }) {
  const skin = '#e8a870';
  const skinL = '#f0bb8a';
  const skinD = '#d4915a';
  const nail = '#f5d5c0';
  const joint = '#d09060';
  const sx = mirror ? -1 : 1;

  // Each finger: [startX, startY, midX, midY, tipX, tipY, width]
  type Finger = { base: [number, number]; mid: [number, number]; tip: [number, number]; w: number };

  const fingerSets: Record<string, { palm: string; fingers: Finger[]; thumb: Finger }> = {
    open: {
      palm: 'M-18,10 Q-20,-2 -12,-8 L12,-8 Q20,-2 18,10 Q18,22 0,26 Q-18,22 -18,10Z',
      fingers: [
        { base: [-14, -8], mid: [-16, -26], tip: [-17, -42], w: 7 },  // index
        { base: [-5, -10], mid: [-5, -30], tip: [-5, -48], w: 7 },    // middle
        { base: [5, -10], mid: [5, -29], tip: [5, -46], w: 7 },       // ring
        { base: [13, -7], mid: [15, -23], tip: [17, -38], w: 6.5 },   // pinky
      ],
      thumb: { base: [-20, 8], mid: [-32, -2], tip: [-40, -12], w: 8 },
    },
    flat: {
      palm: 'M-18,10 Q-20,-2 -12,-8 L12,-8 Q20,-2 18,10 Q18,22 0,26 Q-18,22 -18,10Z',
      fingers: [
        { base: [-13, -8], mid: [-13, -26], tip: [-13, -42], w: 7 },
        { base: [-4, -10], mid: [-4, -30], tip: [-4, -48], w: 7 },
        { base: [5, -10], mid: [5, -29], tip: [5, -46], w: 7 },
        { base: [13, -8], mid: [13, -24], tip: [13, -38], w: 6.5 },
      ],
      thumb: { base: [-20, 6], mid: [-30, 0], tip: [-36, -6], w: 8 },
    },
    fist: {
      palm: 'M-16,12 Q-18,0 -14,-6 L14,-6 Q18,0 16,12 Q16,24 0,26 Q-16,24 -16,12Z',
      fingers: [
        { base: [-12, -6], mid: [-8, -12], tip: [0, -10], w: 7 },
        { base: [-4, -8], mid: [0, -14], tip: [6, -10], w: 7 },
        { base: [4, -8], mid: [8, -13], tip: [12, -8], w: 7 },
        { base: [11, -5], mid: [14, -10], tip: [16, -5], w: 6 },
      ],
      thumb: { base: [-18, 6], mid: [-20, -4], tip: [-14, -10], w: 9 },
    },
    point: {
      palm: 'M-16,12 Q-18,0 -14,-6 L14,-6 Q18,0 16,12 Q16,24 0,26 Q-16,24 -16,12Z',
      fingers: [
        { base: [-13, -6], mid: [-14, -28], tip: [-15, -48], w: 7 },   // index extended!
        { base: [-4, -8], mid: [0, -14], tip: [6, -10], w: 7 },        // curled
        { base: [4, -8], mid: [8, -13], tip: [12, -8], w: 7 },         // curled
        { base: [11, -5], mid: [14, -10], tip: [16, -5], w: 6 },       // curled
      ],
      thumb: { base: [-18, 6], mid: [-22, -2], tip: [-18, -10], w: 9 },
    },
    spread: {
      palm: 'M-18,10 Q-20,-2 -12,-8 L12,-8 Q20,-2 18,10 Q18,22 0,26 Q-18,22 -18,10Z',
      fingers: [
        { base: [-14, -8], mid: [-22, -28], tip: [-28, -44], w: 7 },
        { base: [-5, -10], mid: [-8, -32], tip: [-10, -50], w: 7 },
        { base: [5, -10], mid: [8, -31], tip: [10, -48], w: 7 },
        { base: [13, -7], mid: [20, -24], tip: [26, -38], w: 6.5 },
      ],
      thumb: { base: [-20, 8], mid: [-36, 0], tip: [-46, -10], w: 8 },
    },
    count: {
      palm: 'M-16,12 Q-18,0 -14,-6 L14,-6 Q18,0 16,12 Q16,24 0,26 Q-16,24 -16,12Z',
      fingers: [
        { base: [-13, -6], mid: [-14, -26], tip: [-15, -44], w: 7 },  // extended
        { base: [-4, -8], mid: [-4, -28], tip: [-4, -46], w: 7 },     // extended
        { base: [4, -8], mid: [8, -13], tip: [12, -8], w: 7 },        // curled
        { base: [11, -5], mid: [14, -10], tip: [16, -5], w: 6 },      // curled
      ],
      thumb: { base: [-18, 6], mid: [-22, -2], tip: [-18, -10], w: 9 },
    },
    pinch: {
      palm: 'M-16,12 Q-18,0 -14,-6 L14,-6 Q18,0 16,12 Q16,24 0,26 Q-16,24 -16,12Z',
      fingers: [
        { base: [-13, -6], mid: [-16, -22], tip: [-20, -30], w: 7 },
        { base: [-4, -8], mid: [-2, -20], tip: [2, -14], w: 7 },
        { base: [4, -8], mid: [8, -14], tip: [12, -10], w: 7 },
        { base: [11, -5], mid: [14, -10], tip: [16, -6], w: 6 },
      ],
      thumb: { base: [-18, 6], mid: [-24, -8], tip: [-20, -18], w: 9 },
    },
    hook: {
      palm: 'M-16,12 Q-18,0 -14,-6 L14,-6 Q18,0 16,12 Q16,24 0,26 Q-16,24 -16,12Z',
      fingers: [
        { base: [-13, -6], mid: [-14, -22], tip: [-8, -18], w: 7 },
        { base: [-4, -8], mid: [-4, -24], tip: [2, -18], w: 7 },
        { base: [4, -8], mid: [4, -22], tip: [10, -16], w: 7 },
        { base: [11, -5], mid: [12, -18], tip: [16, -12], w: 6 },
      ],
      thumb: { base: [-18, 6], mid: [-22, -2], tip: [-16, -8], w: 9 },
    },
    relaxed: {
      palm: 'M-17,10 Q-19,-1 -12,-6 L12,-6 Q19,-1 17,10 Q17,22 0,25 Q-17,22 -17,10Z',
      fingers: [
        { base: [-13, -6], mid: [-15, -20], tip: [-14, -32], w: 7 },
        { base: [-4, -8], mid: [-5, -24], tip: [-4, -38], w: 7 },
        { base: [5, -8], mid: [4, -22], tip: [4, -36], w: 7 },
        { base: [12, -5], mid: [13, -18], tip: [13, -28], w: 6.5 },
      ],
      thumb: { base: [-19, 7], mid: [-28, 0], tip: [-34, -6], w: 8 },
    },
  };

  const hand = fingerSets[type] || fingerSets.relaxed;

  function renderFinger(f: Finger, idx: number) {
    const isThumb = idx === -1;
    return (
      <g key={idx}>
        {/* Finger segments with joints */}
        <path
          d={`M${f.base[0]},${f.base[1]} Q${(f.base[0]+f.mid[0])/2},${(f.base[1]+f.mid[1])/2} ${f.mid[0]},${f.mid[1]}`}
          stroke={skin} strokeWidth={f.w} strokeLinecap="round" fill="none"
        />
        <path
          d={`M${f.mid[0]},${f.mid[1]} Q${(f.mid[0]+f.tip[0])/2},${(f.mid[1]+f.tip[1])/2} ${f.tip[0]},${f.tip[1]}`}
          stroke={skinL} strokeWidth={f.w * 0.9} strokeLinecap="round" fill="none"
        />
        {/* Joint circle */}
        <circle cx={f.mid[0]} cy={f.mid[1]} r={f.w * 0.35} fill={joint} opacity="0.3"/>
        {/* Fingertip / nail */}
        {!isThumb && (
          <ellipse cx={f.tip[0]} cy={f.tip[1] - 1} rx={f.w * 0.38} ry={f.w * 0.28} fill={nail} opacity="0.7"/>
        )}
      </g>
    );
  }

  return (
    <svg viewBox="-50 -55 100 90" className="w-full h-full overflow-visible">
      <g transform={`scale(${sx}, 1)`}>
        {/* Fingers behind palm */}
        {hand.fingers.map((f, i) => renderFinger(f, i))}
        {/* Thumb */}
        {renderFinger(hand.thumb, -1)}
        {/* Palm */}
        <path d={hand.palm} fill={skin} stroke={skinD} strokeWidth="1"/>
        {/* Palm lines */}
        <path d="M-10,4 Q0,10 10,4" fill="none" stroke={joint} strokeWidth="0.6" opacity="0.3"/>
        <path d="M-8,10 Q0,15 8,10" fill="none" stroke={joint} strokeWidth="0.5" opacity="0.2"/>
      </g>
    </svg>
  );
}

/* ── Full Avatar Component ── */
function SignAvatar({ pose, expression, isSigning }: { pose: SignPose; expression: string; isSigning: boolean }) {
  const [blink, setBlink] = useState(false);
  const [breathOffset, setBr] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 150); }, 2800 + Math.random() * 2200);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    let t = 0, frame: number;
    const loop = () => { t += 0.025; setBr(Math.sin(t) * 1.5); frame = requestAnimationFrame(loop); };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const browLift = expression === 'emphasize' ? -5 : expression === 'thinking' ? -3 : 0;

  return (
    <motion.svg viewBox="0 0 500 600" className="w-full h-full" animate={{ y: breathOffset }}>
      <defs>
        <radialGradient id="sg" cx="50%" cy="35%"><stop offset="0%" stopColor="#f5cda0"/><stop offset="100%" stopColor="#e8a870"/></radialGradient>
        <linearGradient id="shirt" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#5b6abf"/><stop offset="100%" stopColor="#3d4a9e"/></linearGradient>
        <linearGradient id="shirtSleeve" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#5b6abf"/><stop offset="100%" stopColor="#4a58ad"/></linearGradient>
        <radialGradient id="blush"><stop offset="0%" stopColor="#f0a0a0" stopOpacity="0.45"/><stop offset="100%" stopColor="#f0a0a0" stopOpacity="0"/></radialGradient>
        <filter id="ds"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.18"/></filter>
        <filter id="dsLight"><feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.12"/></filter>
      </defs>

      {/* ── Body lean ── */}
      <motion.g animate={{ rotate: pose.bodyLean }} transition={{ duration: 0.5, ease: 'easeInOut' }} style={{ originX: '250px', originY: '350px' }}>

        {/* ── Neck ── */}
        <path d="M230,230 L230,265 Q230,275 240,275 L260,275 Q270,275 270,265 L270,230" fill="url(#sg)"/>

        {/* ── Torso ── */}
        <path d="M160,275 Q160,260 210,260 L290,260 Q340,260 340,275 L355,520 Q355,540 330,540 L170,540 Q145,540 145,520Z" fill="url(#shirt)" filter="url(#ds)"/>
        {/* Collar V-neck */}
        <path d="M220,260 L250,300 L280,260" fill="none" stroke="#fff" strokeWidth="3" opacity="0.85" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Shirt center line */}
        <line x1="250" y1="300" x2="250" y2="500" stroke="#3d4a9e" strokeWidth="1.5" opacity="0.25"/>
        {/* Shirt buttons */}
        {[320, 370, 420].map(y => <circle key={y} cx="250" cy={y} r="3" fill="#4a58ad" stroke="#3d4a9e" strokeWidth="0.5"/>)}

        {/* ── LEFT ARM ── */}
        <motion.g
          animate={{ rotate: pose.leftUpper }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ originX: '165px', originY: '280px' }}
        >
          {/* Upper arm (sleeve) */}
          <path d="M165,275 Q140,290 120,340" stroke="url(#shirtSleeve)" strokeWidth="42" strokeLinecap="round" fill="none" filter="url(#dsLight)"/>
          {/* Forearm */}
          <motion.g
            animate={{ rotate: pose.leftFore }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            style={{ originX: '120px', originY: '340px' }}
          >
            {/* Bare forearm skin */}
            <path d="M120,340 Q100,380 85,415" stroke="#e8a870" strokeWidth="32" strokeLinecap="round" fill="none"/>
            <path d="M120,340 Q100,380 85,415" stroke="#f0bb8a" strokeWidth="24" strokeLinecap="round" fill="none" opacity="0.5"/>
            {/* Wrist */}
            <ellipse cx="85" cy="418" rx="16" ry="12" fill="#e8a870"/>
            {/* Hand */}
            <motion.g
              animate={{ rotate: pose.leftHandRot }}
              transition={{ duration: 0.4 }}
              style={{ originX: '85px', originY: '425px' }}
            >
              <g transform="translate(85, 440)">
                <g style={{ width: 80, height: 80 }}>
                  <RealisticHand type={pose.leftHandType} mirror={true}/>
                </g>
              </g>
            </motion.g>
          </motion.g>
        </motion.g>

        {/* ── RIGHT ARM ── */}
        <motion.g
          animate={{ rotate: pose.rightUpper }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ originX: '335px', originY: '280px' }}
        >
          <path d="M335,275 Q360,290 380,340" stroke="url(#shirtSleeve)" strokeWidth="42" strokeLinecap="round" fill="none" filter="url(#dsLight)"/>
          <motion.g
            animate={{ rotate: pose.rightFore }}
            transition={{ duration: 0.45, ease: 'easeInOut' }}
            style={{ originX: '380px', originY: '340px' }}
          >
            <path d="M380,340 Q400,380 415,415" stroke="#e8a870" strokeWidth="32" strokeLinecap="round" fill="none"/>
            <path d="M380,340 Q400,380 415,415" stroke="#f0bb8a" strokeWidth="24" strokeLinecap="round" fill="none" opacity="0.5"/>
            <ellipse cx="415" cy="418" rx="16" ry="12" fill="#e8a870"/>
            <motion.g
              animate={{ rotate: pose.rightHandRot }}
              transition={{ duration: 0.4 }}
              style={{ originX: '415px', originY: '425px' }}
            >
              <g transform="translate(415, 440)">
                <g style={{ width: 80, height: 80 }}>
                  <RealisticHand type={pose.rightHandType}/>
                </g>
              </g>
            </motion.g>
          </motion.g>
        </motion.g>

        {/* ── HEAD ── */}
        <motion.g animate={{ rotate: pose.headTilt }} transition={{ duration: 0.5 }} style={{ originX: '250px', originY: '220px' }}>
          {/* Hair back volume */}
          <ellipse cx="250" cy="130" rx="78" ry="82" fill="#1a0e0a"/>
          {/* Head shape */}
          <ellipse cx="250" cy="148" rx="68" ry="78" fill="url(#sg)" filter="url(#ds)"/>
          {/* Ears */}
          <ellipse cx="182" cy="158" rx="12" ry="20" fill="#e8a870"/>
          <ellipse cx="182" cy="158" rx="7" ry="13" fill="#d4915a" opacity="0.3"/>
          <ellipse cx="318" cy="158" rx="12" ry="20" fill="#e8a870"/>
          <ellipse cx="318" cy="158" rx="7" ry="13" fill="#d4915a" opacity="0.3"/>
          {/* Hair front */}
          <path d="M185,110 Q200,70 250,62 Q300,70 315,110 Q300,85 250,78 Q200,85 185,110Z" fill="#1a0e0a"/>
          <path d="M185,110 Q180,95 183,130" stroke="#1a0e0a" strokeWidth="10" fill="none" strokeLinecap="round"/>
          <path d="M315,110 Q320,95 317,130" stroke="#1a0e0a" strokeWidth="10" fill="none" strokeLinecap="round"/>
          {/* Hair highlights */}
          <path d="M210,80 Q230,72 245,75" stroke="#2a1a12" strokeWidth="2" fill="none" opacity="0.3"/>

          {/* Eyebrows */}
          <motion.path animate={{ d: `M215,${128 + browLift} Q228,${120 + browLift} 240,${125 + browLift}` }}
            fill="none" stroke="#1a0e0a" strokeWidth="3.5" strokeLinecap="round" transition={{ duration: 0.3 }}/>
          <motion.path animate={{ d: `M260,${125 + browLift + (expression === 'thinking' ? 3 : 0)} Q272,${120 + browLift + (expression === 'thinking' ? 4 : 0)} 285,${128 + browLift + (expression === 'thinking' ? 5 : 0)}` }}
            fill="none" stroke="#1a0e0a" strokeWidth="3.5" strokeLinecap="round" transition={{ duration: 0.3 }}/>

          {/* Eyes */}
          <g>
            {/* Left eye */}
            <ellipse cx="228" cy="148" rx="14" ry={blink ? 1.5 : 10} fill="white"/>
            {!blink && <>
              <circle cx="230" cy="149" r="7" fill="#2d1b0e"/>
              <circle cx="230" cy="149" r="4.5" fill="#1a0e0a"/>
              <circle cx="232" cy="146" r="2.5" fill="white"/>
              <circle cx="228" cy="151" r="1.2" fill="white" opacity="0.5"/>
            </>}
            {/* Eyelashes */}
            <path d="M214,146 Q216,142 218,144" stroke="#1a0e0a" strokeWidth="1" fill="none" opacity="0.5"/>
            {/* Right eye */}
            <ellipse cx="272" cy="148" rx="14" ry={blink ? 1.5 : 10} fill="white"/>
            {!blink && <>
              <circle cx="270" cy="149" r="7" fill="#2d1b0e"/>
              <circle cx="270" cy="149" r="4.5" fill="#1a0e0a"/>
              <circle cx="272" cy="146" r="2.5" fill="white"/>
              <circle cx="268" cy="151" r="1.2" fill="white" opacity="0.5"/>
            </>}
            <path d="M286,146 Q284,142 282,144" stroke="#1a0e0a" strokeWidth="1" fill="none" opacity="0.5"/>
          </g>

          {/* Nose */}
          <path d="M248,162 Q250,174 246,178 Q250,181 254,178 Q250,174 252,162" fill="none" stroke="#d4915a" strokeWidth="1.5" opacity="0.45"/>
          {/* Nose shadow */}
          <ellipse cx="250" cy="178" rx="6" ry="3" fill="#d4915a" opacity="0.12"/>

          {/* Cheeks */}
          <circle cx="210" cy="172" r="14" fill="url(#blush)"/>
          <circle cx="290" cy="172" r="14" fill="url(#blush)"/>

          {/* Mouth */}
          {expression === 'smile' ? (
            <g>
              <path d="M235,192 Q250,206 265,192" fill="#c27060" stroke="#b0604f" strokeWidth="1"/>
              <path d="M238,192 Q250,188 262,192" fill="#c27060" stroke="none"/>
              {/* Teeth hint */}
              <path d="M240,192 Q250,196 260,192" fill="white" opacity="0.6"/>
            </g>
          ) : expression === 'emphasize' ? (
            <ellipse cx="250" cy="194" rx="10" ry="7" fill="#c27060" stroke="#b0604f" strokeWidth="1"/>
          ) : expression === 'thinking' ? (
            <g>
              <path d="M240,195 Q250,192 260,195" fill="none" stroke="#c27060" strokeWidth="2.5" strokeLinecap="round"/>
              <circle cx="262" cy="194" r="1" fill="#c27060"/>
            </g>
          ) : (
            <path d="M238,194 Q250,200 262,194" fill="#c27060" stroke="#b0604f" strokeWidth="1"/>
          )}

          {/* Chin definition */}
          <path d="M230,210 Q250,225 270,210" fill="none" stroke="#d4915a" strokeWidth="0.8" opacity="0.15"/>
        </motion.g>
      </motion.g>

      {/* Signing glow */}
      {isSigning && (
        <motion.ellipse cx="250" cy="380" rx="180" ry="160" fill="none" stroke="#8b5cf6" strokeWidth="2"
          animate={{ opacity: [0.05, 0.15, 0.05], rx: [170, 190, 170] }}
          transition={{ duration: 2.5, repeat: Infinity }}/>
      )}
    </motion.svg>
  );
}

/* ── Utilities ── */
function splitIntoSlides(text: string) {
  if (!text) return [];
  const parts = text.split(/\n\n+/).filter((p: string) => p.trim());
  if (parts.length === 0) return [{ content: text }];
  if (parts.length === 1) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const slides: { content: string }[] = [];
    for (let i = 0; i < sentences.length; i += 2) slides.push({ content: sentences.slice(i, i + 2).join(' ').trim() });
    return slides.length > 0 ? slides : [{ content: text }];
  }
  return parts.map((p: string) => ({ content: p.trim() }));
}

function splitIntoPhrases(text: string): string[] {
  const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, ' ').trim();
  const words = clean.split(/\s+/);
  const phrases: string[] = [];
  let cur: string[] = [];
  for (const w of words) { cur.push(w); if (cur.length >= 5 || /[.!?,]$/.test(w)) { phrases.push(cur.join(' ')); cur = []; } }
  if (cur.length > 0) phrases.push(cur.join(' '));
  return phrases.filter(Boolean);
}

function choosePose(word: string, idx: number): number {
  const w = word.toLowerCase();
  if (w.includes('?')) return 8;
  if (w.includes('!')) return 5;
  if (/example|like|such|means/.test(w)) return 1;
  if (/important|key|main|must|critical/.test(w)) return 5;
  if (/first|second|third|step|\d/.test(w)) return 4;
  if (/think|imagine|consider|wonder/.test(w)) return 6;
  if (/connect|relate|between|link/.test(w)) return 7;
  if (/hello|welcome|hi|hey/.test(w)) return 9;
  return [1, 2, 3, 1, 2, 7, 3, 8][idx % 8];
}

/* ════════════════════════════════════════════
   Main SignLanguagePlayer Component
   ════════════════════════════════════════════ */
interface Props { topic: any; language?: string; onNext?: (() => void) | null; onPrev?: (() => void) | null; }

export default function SignLanguagePlayer({ topic, language = 'en', onNext, onPrev }: Props) {
  const [slides, setSlides] = useState<{ content: string }[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [captionSize, setCaptionSize] = useState<'normal' | 'large' | 'xlarge'>('large');
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentPhraseIdx, setCurrentPhraseIdx] = useState(0);
  const [currentPhrase, setCurrentPhrase] = useState('');
  const [highlightWord, setHighlightWord] = useState('');
  const [phrases, setPhrases] = useState<string[]>([]);
  const [signPoseIdx, setSignPoseIdx] = useState(0);
  const [avatarExpression, setAvatarExpression] = useState<'neutral' | 'smile' | 'thinking' | 'emphasize'>('neutral');

  const containerRef = useRef<HTMLDivElement>(null);
  const stopRef = useRef(false);
  const controlsTimerRef = useRef<any>(null);
  const slidesRef = useRef<{ content: string }[]>([]);
  const topicTitle = typeof topic === 'string' ? topic : (topic?.title || 'Topic');

  useEffect(() => { slidesRef.current = slides; }, [slides]);

  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isPlaying) controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
  }, [isPlaying]);

  useEffect(() => { if (!isPlaying) setShowControls(true); else resetControlsTimer(); }, [isPlaying]);

  // Fetch content
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setSlides([]); setCurrentSlide(0); stopRef.current = true; setIsPlaying(false);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const langMap: Record<string, string> = { hi: 'Hindi', hindi: 'Hindi', gu: 'Gujarati', gujarati: 'Gujarati', es: 'Spanish' };
    const li = langMap[language] ? ` Respond entirely in ${langMap[language]}.` : '';

    fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ message: `Explain "${topicTitle}" clearly for a student. Use simple language, short sentences. Write 4-5 short paragraphs.${li}`, topic: topicTitle, history: [] }),
    }).then(async resp => {
      const reader = resp.body?.getReader(); if (!reader) return;
      const decoder = new TextDecoder(); let full = '';
      while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of decoder.decode(value, { stream: true }).split('\n')) { if (!line.startsWith('data: ')) continue; try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; } catch {} } }
      if (!cancelled && full) { const sl = splitIntoSlides(full); setSlides(sl); setLoading(false); setTimeout(() => { setIsPlaying(true); slidesRef.current = sl; playFrom(0); }, 800); }
    }).catch(() => { if (!cancelled) { setSlides([{ content: 'Unable to load content.' }]); setLoading(false); } });
    return () => { cancelled = true; };
  }, [topicTitle, language]);

  // Animation
  async function animatePhrase(phrase: string, pi: number): Promise<void> {
    return new Promise(resolve => {
      if (stopRef.current) { resolve(); return; }
      setCurrentPhrase(phrase);
      const words = phrase.split(/\s+/);
      const interval = Math.max(500, 2200 / (words.length + 1));
      let wi = 0;
      const iv = setInterval(() => {
        if (stopRef.current) { clearInterval(iv); resolve(); return; }
        if (wi < words.length) {
          const w = words[wi]; setHighlightWord(w);
          setSignPoseIdx(choosePose(w, pi * 10 + wi));
          if (w.endsWith('?')) setAvatarExpression('thinking');
          else if (w.endsWith('!')) setAvatarExpression('emphasize');
          else if (wi === words.length - 1) setAvatarExpression('smile');
          else setAvatarExpression('neutral');
          wi++;
        } else { clearInterval(iv); resolve(); }
      }, interval);
    });
  }

  async function playSlide(si: number): Promise<void> {
    if (stopRef.current || si >= slidesRef.current.length) return;
    setCurrentSlide(si);
    const phrs = splitIntoPhrases(slidesRef.current[si]?.content || '');
    setPhrases(phrs);
    for (let i = 0; i < phrs.length; i++) {
      if (stopRef.current) return;
      setCurrentPhraseIdx(i); await animatePhrase(phrs[i], i);
      if (stopRef.current) return; await new Promise(r => setTimeout(r, 350));
    }
    await new Promise(r => setTimeout(r, 700));
  }

  async function playFrom(idx: number) {
    stopRef.current = false;
    for (let i = idx; i < slidesRef.current.length; i++) { if (stopRef.current) return; await playSlide(i); }
    setIsPlaying(false); setAvatarExpression('smile'); setSignPoseIdx(0);
  }

  function handlePlay() { if (isPlaying) { stopRef.current = true; setIsPlaying(false); } else { setIsPlaying(true); playFrom(currentSlide); } }
  function goTo(idx: number) { stopRef.current = true; const c = Math.max(0, Math.min(idx, slides.length - 1)); setCurrentSlide(c); setCurrentPhrase(''); setPhrases([]); setCurrentPhraseIdx(0); setHighlightWord(''); if (isPlaying) setTimeout(() => playFrom(c), 300); }
  function handleRestart() { stopRef.current = true; setIsPlaying(false); setCurrentSlide(0); setCurrentPhrase(''); setCurrentPhraseIdx(0); setAvatarExpression('neutral'); setSignPoseIdx(0); setHighlightWord(''); }
  function toggleFS() { if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); } else { document.exitFullscreen(); setIsFullscreen(false); } }

  useEffect(() => { const h = () => { if (!document.fullscreenElement) setIsFullscreen(false); }; document.addEventListener('fullscreenchange', h); return () => document.removeEventListener('fullscreenchange', h); }, []);
  useEffect(() => () => { stopRef.current = true; }, []);

  const progressFraction = slides.length > 0 ? (currentSlide / Math.max(1, slides.length - 1)) : 0;
  const slide = slides[currentSlide] || { content: '' };
  const currentPose = POSES[signPoseIdx] || POSES[0];
  const captionCls = { normal: 'text-base md:text-lg', large: 'text-lg md:text-xl lg:text-2xl', xlarge: 'text-xl md:text-2xl lg:text-3xl' };

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center">
          <div className="relative mx-auto w-24 h-24 mb-5">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400"/>
            <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center"><Hand className="w-8 h-8 text-purple-400" /></div>
          </div>
          <p className="text-white font-medium text-sm">Preparing Sign Language Lesson...</p>
          <p className="text-gray-400 text-xs mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div ref={containerRef} className={`bg-[#1a1a2e] overflow-hidden flex flex-col relative group ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl'}`}
        onMouseMove={resetControlsTimer} onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ aspectRatio: isFullscreen ? undefined : '16/9', height: isFullscreen ? '100vh' : undefined }}>

        <div className="flex-1 relative overflow-hidden flex" onClick={handlePlay}>
          {/* Avatar side */}
          <div className="w-[44%] lg:w-[40%] relative flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 55%, #1f2d50 0%, #151d35 55%, #0d1220 100%)' }}>
            {/* Ambient light from top */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-40 bg-gradient-to-b from-indigo-500/8 to-transparent pointer-events-none"/>
            {/* Floor */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0e1a] to-transparent pointer-events-none"/>

            <div className="w-[90%] max-w-[320px] h-[95%] flex items-end justify-center pb-2">
              <SignAvatar pose={currentPose} expression={avatarExpression} isSigning={isPlaying}/>
            </div>

            {/* Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-purple-600/80 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Hand className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] text-white font-bold uppercase tracking-wider">Sign Language</span>
            </div>

            {/* Pose label */}
            {isPlaying && currentPose.label !== 'rest' && (
              <motion.div key={currentPose.label} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-3 left-3 right-3 text-center">
                <span className="text-[10px] bg-white/10 backdrop-blur-sm text-white/50 rounded-full px-3 py-1 capitalize">{currentPose.label}</span>
              </motion.div>
            )}
          </div>

          {/* Caption side */}
          <div className="flex-1 relative flex flex-col justify-center p-5 md:p-8 lg:p-10"
            style={{ background: 'linear-gradient(135deg, #0f2847 0%, #1a1a2e 50%, #16132e 100%)' }}>
            <AnimatePresence mode="wait">
              <motion.div key={`${currentSlide}-${currentPhraseIdx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col justify-center">
                {currentPhrase && (
                  <div className={`font-bold leading-relaxed mb-6 ${captionCls[captionSize]}`}>
                    {currentPhrase.split(/\s+/).map((word, i) => (
                      <span key={i} className={`inline-block mr-[0.3em] transition-colors duration-200 ${word === highlightWord ? 'text-yellow-300' : 'text-white'}`}>{word}</span>
                    ))}
                  </div>
                )}
                <div className={`text-white/30 leading-relaxed space-y-2 max-h-[35vh] overflow-y-auto pr-2 ${captionSize === 'xlarge' ? 'text-sm' : 'text-xs'}`}>
                  <ReactMarkdown components={{
                    p: ({ children }: any) => <p className="mb-2">{children}</p>,
                    strong: ({ children }: any) => <strong className="text-yellow-400/40">{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                  }}>{slide.content}</ReactMarkdown>
                </div>
              </motion.div>
            </AnimatePresence>
            {phrases.length > 1 && (
              <div className="flex items-center gap-1.5 mt-4">
                {phrases.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === currentPhraseIdx ? 'bg-purple-400 w-6' : i < currentPhraseIdx ? 'bg-purple-600 w-2' : 'bg-white/10 w-2'}`}/>)}
              </div>
            )}
            <AnimatePresence>{!isPlaying && !loading && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="w-16 h-16 rounded-full bg-purple-600/60 backdrop-blur-sm flex items-center justify-center"><Play className="w-8 h-8 text-white ml-1" /></div>
              </motion.div>
            )}</AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
          <div className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); const r = e.currentTarget.getBoundingClientRect(); goTo(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (slides.length - 1))); }}>
            <div className="absolute inset-0 bg-white/20"/>
            <div className="absolute inset-y-0 left-0 bg-purple-500 transition-all duration-300" style={{ width: `${progressFraction * 100}%` }}/>
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 opacity-0 group-hover/progress:opacity-100 transition-opacity" style={{ left: `${progressFraction * 100}%`, transform: 'translate(-50%, -50%)' }}/>
          </div>
          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide - 1); }} disabled={currentSlide === 0} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><SkipBack className="w-5 h-5"/></button>
              <button onClick={(e) => { e.stopPropagation(); handlePlay(); }} className="p-2 rounded-full hover:bg-white/10 text-white">{isPlaying ? <Pause className="w-6 h-6"/> : <Play className="w-6 h-6 ml-0.5"/>}</button>
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide + 1); }} disabled={currentSlide >= slides.length - 1} className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30"><SkipForward className="w-5 h-5"/></button>
              <span className="text-xs text-white/60 ml-3 font-mono">Slide {currentSlide + 1} / {slides.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setCaptionSize(p => p === 'normal' ? 'large' : p === 'large' ? 'xlarge' : 'normal'); }}
                className="p-2 rounded-full hover:bg-white/10 text-white flex items-center gap-1"><Type className="w-4 h-4"/><span className="text-[10px] text-white/60">{captionSize === 'normal' ? 'A' : captionSize === 'large' ? 'A+' : 'A++'}</span></button>
              <button onClick={(e) => { e.stopPropagation(); handleRestart(); }} className="p-2 rounded-full hover:bg-white/10 text-white"><RotateCcw className="w-4 h-4"/></button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="p-2 rounded-full hover:bg-white/10 text-white">{isFullscreen ? <Minimize2 className="w-5 h-5"/> : <Maximize2 className="w-5 h-5"/>}</button>
            </div>
          </div>
        </div>
      </div>

      {/* Info below player */}
      <div className="mt-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold"><Hand className="w-3 h-3"/> Sign Language Mode</span>
          <span className="text-[11px] text-gray-400">No audio required</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{topicTitle}</h1>
        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-500"><span>{slides.length} slides</span><span>Visual captions</span></div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-purple-700' : ''}`}/> Like</button>
            <button onClick={() => setSaved(!saved)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-purple-700' : ''}`}/> Save</button>
            {onNext && (<button onClick={onNext} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium ml-2">Next Topic <ChevronRight className="w-4 h-4"/></button>)}
          </div>
        </div>
      </div>
    </div>
  );
}
