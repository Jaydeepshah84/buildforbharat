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

/* ── Avatar pose system — realistic upper body sign language poses ── */
interface AvatarPose {
  label: string;
  // Arm positions: x,y offsets from shoulder, rotation, forearm rotation
  leftArm: { shoulderRot: number; elbowRot: number; handY: number; handX: number; handRot: number; handShape: string };
  rightArm: { shoulderRot: number; elbowRot: number; handY: number; handX: number; handRot: number; handShape: string };
  bodyTilt: number;
  headTilt: number;
}

const SIGN_POSES: AvatarPose[] = [
  // Neutral / rest
  { label: 'rest', leftArm: { shoulderRot: 15, elbowRot: 80, handY: 0, handX: 0, handRot: 0, handShape: 'open' }, rightArm: { shoulderRot: -15, elbowRot: -80, handY: 0, handX: 0, handRot: 0, handShape: 'open' }, bodyTilt: 0, headTilt: 0 },
  // Explain (right hand up, palm forward)
  { label: 'explain', leftArm: { shoulderRot: 20, elbowRot: 60, handY: -10, handX: -5, handRot: -5, handShape: 'open' }, rightArm: { shoulderRot: -45, elbowRot: -40, handY: -50, handX: 15, handRot: 10, handShape: 'flat' }, bodyTilt: 0, headTilt: 2 },
  // Both hands up (concept / big idea)
  { label: 'concept', leftArm: { shoulderRot: 40, elbowRot: 30, handY: -55, handX: -20, handRot: -15, handShape: 'spread' }, rightArm: { shoulderRot: -40, elbowRot: -30, handY: -55, handX: 20, handRot: 15, handShape: 'spread' }, bodyTilt: 0, headTilt: 0 },
  // Point (right index finger)
  { label: 'point', leftArm: { shoulderRot: 15, elbowRot: 75, handY: -5, handX: 0, handRot: 0, handShape: 'fist' }, rightArm: { shoulderRot: -55, elbowRot: -25, handY: -60, handX: 30, handRot: 20, handShape: 'point' }, bodyTilt: 2, headTilt: 3 },
  // List / enumerate (left count, right support)
  { label: 'list', leftArm: { shoulderRot: 45, elbowRot: 20, handY: -45, handX: -10, handRot: -10, handShape: 'count' }, rightArm: { shoulderRot: -30, elbowRot: -50, handY: -30, handX: 10, handRot: 5, handShape: 'flat' }, bodyTilt: -1, headTilt: -2 },
  // Emphasize (both hands press down)
  { label: 'emphasize', leftArm: { shoulderRot: 35, elbowRot: 45, handY: -25, handX: -15, handRot: -20, handShape: 'flat' }, rightArm: { shoulderRot: -35, elbowRot: -45, handY: -25, handX: 15, handRot: 20, handShape: 'flat' }, bodyTilt: 3, headTilt: 0 },
  // Think (right hand near chin)
  { label: 'think', leftArm: { shoulderRot: 18, elbowRot: 70, handY: -5, handX: 0, handRot: 0, handShape: 'open' }, rightArm: { shoulderRot: -60, elbowRot: -15, handY: -75, handX: 5, handRot: -10, handShape: 'pinch' }, bodyTilt: -2, headTilt: -4 },
  // Connect / relate (hands move toward each other)
  { label: 'connect', leftArm: { shoulderRot: 40, elbowRot: 35, handY: -35, handX: 10, handRot: 15, handShape: 'hook' }, rightArm: { shoulderRot: -40, elbowRot: -35, handY: -35, handX: -10, handRot: -15, handShape: 'hook' }, bodyTilt: 1, headTilt: 1 },
  // Question (both palms up)
  { label: 'question', leftArm: { shoulderRot: 35, elbowRot: 40, handY: -30, handX: -20, handRot: 30, handShape: 'open' }, rightArm: { shoulderRot: -35, elbowRot: -40, handY: -30, handX: 20, handRot: -30, handShape: 'open' }, bodyTilt: -1, headTilt: -3 },
  // Wave / greet
  { label: 'greet', leftArm: { shoulderRot: 15, elbowRot: 75, handY: 0, handX: 0, handRot: 0, handShape: 'open' }, rightArm: { shoulderRot: -70, elbowRot: -10, handY: -80, handX: 25, handRot: 15, handShape: 'spread' }, bodyTilt: 2, headTilt: 3 },
];

/* ── SVG Hand shapes ── */
function HandSVG({ shape, mirror = false, size = 44 }: { shape: string; mirror?: boolean; size?: number }) {
  const s = mirror ? -1 : 1;
  const fill = '#e8a86d';
  const stroke = '#c4884d';

  const hands: Record<string, JSX.Element> = {
    open: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="8" rx="14" ry="10" fill={fill} stroke={stroke} strokeWidth="1"/>
        {/* Fingers */}
        <rect x="-10" y="-14" width="4" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(-8, -8, -5)"/>
        <rect x="-4" y="-18" width="4" height="22" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8"/>
        <rect x="2" y="-17" width="4" height="21" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(5, 4, -5)"/>
        <rect x="8" y="-14" width="4" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(12, 10, -5)"/>
        {/* Thumb */}
        <rect x="-16" y="-2" width="4" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(35, -14, 5)"/>
      </g>
    ),
    flat: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="6" rx="15" ry="9" fill={fill} stroke={stroke} strokeWidth="1"/>
        <rect x="-11" y="-12" width="4.5" height="16" rx="2.2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(-3, -9, -4)"/>
        <rect x="-4.5" y="-15" width="4.5" height="19" rx="2.2" fill={fill} stroke={stroke} strokeWidth="0.8"/>
        <rect x="1.5" y="-14" width="4.5" height="18" rx="2.2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(3, 3.5, -4)"/>
        <rect x="7.5" y="-11" width="4.5" height="15" rx="2.2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(8, 9.5, -3)"/>
        <rect x="-17" y="0" width="4" height="12" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(50, -15, 6)"/>
      </g>
    ),
    fist: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="2" rx="12" ry="14" fill={fill} stroke={stroke} strokeWidth="1"/>
        <rect x="-13" y="-2" width="4" height="11" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(40, -11, 3)"/>
        {/* Knuckle lines */}
        <path d="M-7,-10 Q0,-13 7,-10" fill="none" stroke={stroke} strokeWidth="0.6" opacity="0.5"/>
      </g>
    ),
    point: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="6" rx="11" ry="12" fill={fill} stroke={stroke} strokeWidth="1"/>
        {/* Index finger extended */}
        <rect x="-2.5" y="-22" width="5" height="26" rx="2.5" fill={fill} stroke={stroke} strokeWidth="0.8"/>
        {/* Fingertip */}
        <circle cx="0" cy="-22" r="2.8" fill={fill} stroke={stroke} strokeWidth="0.6"/>
        <rect x="-14" y="0" width="4" height="10" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(45, -12, 5)"/>
      </g>
    ),
    spread: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="8" rx="13" ry="9" fill={fill} stroke={stroke} strokeWidth="1"/>
        <rect x="-12" y="-14" width="4" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(-18, -10, -5)"/>
        <rect x="-5" y="-18" width="4" height="22" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(-6, -3, -7)"/>
        <rect x="1" y="-18" width="4" height="22" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(6, 3, -7)"/>
        <rect x="8" y="-14" width="4" height="18" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(18, 10, -5)"/>
        <rect x="-18" y="-2" width="4" height="14" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(45, -16, 5)"/>
      </g>
    ),
    count: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="6" rx="12" ry="12" fill={fill} stroke={stroke} strokeWidth="1"/>
        <rect x="-3" y="-20" width="4.5" height="24" rx="2.2" fill={fill} stroke={stroke} strokeWidth="0.8"/>
        <rect x="3" y="-18" width="4.5" height="22" rx="2.2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(8, 5, -7)"/>
        <rect x="-14" y="0" width="4" height="11" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(40, -12, 5)"/>
      </g>
    ),
    pinch: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="6" rx="11" ry="11" fill={fill} stroke={stroke} strokeWidth="1"/>
        <rect x="-2" y="-16" width="4" height="20" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(8, 0, -6)"/>
        <rect x="-12" y="-8" width="4" height="16" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(55, -10, 0)"/>
        <circle cx="0" cy="-17" r="3" fill={fill} stroke={stroke} strokeWidth="0.5"/>
      </g>
    ),
    hook: (
      <g transform={`scale(${s}, 1)`}>
        <ellipse cx="0" cy="4" rx="12" ry="13" fill={fill} stroke={stroke} strokeWidth="1"/>
        <path d="M-3,-8 Q-3,-18 3,-16 Q8,-14 6,-8" fill={fill} stroke={stroke} strokeWidth="0.8"/>
        <rect x="-14" y="0" width="4" height="11" rx="2" fill={fill} stroke={stroke} strokeWidth="0.8" transform="rotate(40, -12, 5)"/>
      </g>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="-22 -26 44 44" className="overflow-visible">
      {hands[shape] || hands.open}
    </svg>
  );
}

/* ── Full Avatar SVG component ── */
function SignAvatar({ pose, expression, isSigning }: { pose: AvatarPose; expression: string; isSigning: boolean }) {
  const skinLight = '#f5c9a0';
  const skinMid = '#e8a86d';
  const skinDark = '#d4915a';
  const hairColor = '#1a0e0a';
  const shirtColor = '#4a6cf7';
  const shirtDark = '#3451d1';
  const eyeWhite = '#fff';
  const eyeIris = '#2d1b0e';
  const lipColor = '#c27060';

  // Blink
  const [blink, setBlink] = useState(false);
  useEffect(() => {
    const iv = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
    }, 3000 + Math.random() * 2000);
    return () => clearInterval(iv);
  }, []);

  // Breathing
  const [breathe, setBreathe] = useState(0);
  useEffect(() => {
    let frame: number;
    let t = 0;
    const loop = () => {
      t += 0.03;
      setBreathe(Math.sin(t) * 2);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  const mouthHeight = expression === 'smile' ? 4 : expression === 'emphasize' ? 6 : expression === 'thinking' ? 2 : 3;
  const mouthWidth = expression === 'smile' ? 18 : expression === 'emphasize' ? 14 : 12;
  const mouthCurve = expression === 'smile' ? 5 : expression === 'thinking' ? -2 : 1;
  const browLift = expression === 'emphasize' ? -4 : expression === 'thinking' ? -2 : 0;
  const browTiltR = expression === 'thinking' ? 5 : 0;

  return (
    <motion.svg
      viewBox="0 0 300 380"
      className="w-full h-full"
      style={{ maxHeight: '100%' }}
      animate={{ y: breathe }}
      transition={{ type: 'tween', duration: 0 }}
    >
      <defs>
        <radialGradient id="skinGrad" cx="50%" cy="40%">
          <stop offset="0%" stopColor={skinLight}/>
          <stop offset="100%" stopColor={skinMid}/>
        </radialGradient>
        <linearGradient id="shirtGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shirtColor}/>
          <stop offset="100%" stopColor={shirtDark}/>
        </linearGradient>
        <radialGradient id="cheekGrad">
          <stop offset="0%" stopColor="#f5a0a0" stopOpacity="0.5"/>
          <stop offset="100%" stopColor="#f5a0a0" stopOpacity="0"/>
        </radialGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#000" floodOpacity="0.15"/>
        </filter>
      </defs>

      <motion.g
        animate={{ rotate: pose.bodyTilt }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ originX: '50%', originY: '60%' }}
      >
        {/* ── Neck ── */}
        <rect x="137" y="148" width="26" height="30" rx="12" fill="url(#skinGrad)"/>

        {/* ── Torso / Shirt ── */}
        <path d="M100,175 Q100,165 130,165 L170,165 Q200,165 200,175 L210,320 Q210,340 190,340 L110,340 Q90,340 90,320 Z" fill="url(#shirtGrad)" filter="url(#shadow)"/>
        {/* Collar */}
        <path d="M130,165 L150,185 L170,165" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
        {/* Shirt detail line */}
        <line x1="150" y1="185" x2="150" y2="320" stroke={shirtDark} strokeWidth="1" opacity="0.3"/>

        {/* ── Left arm + hand ── */}
        <motion.g
          animate={{
            rotate: pose.leftArm.shoulderRot,
            y: pose.leftArm.handY,
            x: pose.leftArm.handX,
          }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ originX: '100px', originY: '180px' }}
        >
          {/* Upper arm */}
          <path d="M100,180 Q75,200 65,230" stroke={shirtColor} strokeWidth="28" strokeLinecap="round" fill="none"/>
          {/* Forearm */}
          <motion.g
            animate={{ rotate: pose.leftArm.elbowRot }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{ originX: '65px', originY: '230px' }}
          >
            <path d="M65,230 Q55,255 50,270" stroke={skinMid} strokeWidth="20" strokeLinecap="round" fill="none"/>
            {/* Wrist */}
            <ellipse cx="50" cy="272" rx="10" ry="8" fill={skinMid}/>
            {/* Hand */}
            <motion.g
              animate={{ rotate: pose.leftArm.handRot }}
              transition={{ duration: 0.35 }}
              style={{ originX: '50px', originY: '280px' }}
            >
              <g transform="translate(50, 284)">
                <HandSVG shape={pose.leftArm.handShape} mirror={true} size={48}/>
              </g>
            </motion.g>
          </motion.g>
        </motion.g>

        {/* ── Right arm + hand ── */}
        <motion.g
          animate={{
            rotate: pose.rightArm.shoulderRot,
            y: pose.rightArm.handY,
            x: pose.rightArm.handX,
          }}
          transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
          style={{ originX: '200px', originY: '180px' }}
        >
          <path d="M200,180 Q225,200 235,230" stroke={shirtColor} strokeWidth="28" strokeLinecap="round" fill="none"/>
          <motion.g
            animate={{ rotate: pose.rightArm.elbowRot }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{ originX: '235px', originY: '230px' }}
          >
            <path d="M235,230 Q245,255 250,270" stroke={skinMid} strokeWidth="20" strokeLinecap="round" fill="none"/>
            <ellipse cx="250" cy="272" rx="10" ry="8" fill={skinMid}/>
            <motion.g
              animate={{ rotate: pose.rightArm.handRot }}
              transition={{ duration: 0.35 }}
              style={{ originX: '250px', originY: '280px' }}
            >
              <g transform="translate(250, 284)">
                <HandSVG shape={pose.rightArm.handShape} size={48}/>
              </g>
            </motion.g>
          </motion.g>
        </motion.g>

        {/* ── Head ── */}
        <motion.g
          animate={{ rotate: pose.headTilt }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          style={{ originX: '150px', originY: '140px' }}
        >
          {/* Hair back */}
          <ellipse cx="150" cy="82" rx="52" ry="55" fill={hairColor}/>

          {/* Face */}
          <ellipse cx="150" cy="95" rx="46" ry="52" fill="url(#skinGrad)" filter="url(#shadow)"/>

          {/* Ears */}
          <ellipse cx="104" cy="100" rx="9" ry="14" fill={skinMid}/>
          <ellipse cx="104" cy="100" rx="5" ry="9" fill={skinDark} opacity="0.3"/>
          <ellipse cx="196" cy="100" rx="9" ry="14" fill={skinMid}/>
          <ellipse cx="196" cy="100" rx="5" ry="9" fill={skinDark} opacity="0.3"/>

          {/* Hair front / bangs */}
          <path d="M105,70 Q120,45 150,42 Q180,45 195,70 Q185,55 150,52 Q115,55 105,70Z" fill={hairColor}/>
          {/* Hair side */}
          <path d="M105,70 Q100,60 104,85" fill={hairColor} stroke={hairColor} strokeWidth="6"/>
          <path d="M195,70 Q200,60 196,85" fill={hairColor} stroke={hairColor} strokeWidth="6"/>

          {/* Eyebrows */}
          <motion.path
            d={`M124,${82 + browLift} Q133,${77 + browLift} 140,${80 + browLift}`}
            fill="none" stroke={hairColor} strokeWidth="2.5" strokeLinecap="round"
            animate={{ d: `M124,${82 + browLift} Q133,${77 + browLift} 140,${80 + browLift}` }}
            transition={{ duration: 0.3 }}
          />
          <motion.path
            d={`M160,${80 + browLift} Q167,${77 + browLift + browTiltR} 176,${82 + browLift + browTiltR}`}
            fill="none" stroke={hairColor} strokeWidth="2.5" strokeLinecap="round"
            animate={{ d: `M160,${80 + browLift} Q167,${77 + browLift + browTiltR} 176,${82 + browLift + browTiltR}` }}
            transition={{ duration: 0.3 }}
          />

          {/* Eyes */}
          <g>
            {/* Left eye */}
            <ellipse cx="132" cy="94" rx="10" ry={blink ? 1 : 7} fill={eyeWhite}/>
            {!blink && <>
              <circle cx="133" cy="95" r="4.5" fill={eyeIris}/>
              <circle cx="134.5" cy="93.5" r="1.8" fill="white"/>
            </>}
            {/* Right eye */}
            <ellipse cx="168" cy="94" rx="10" ry={blink ? 1 : 7} fill={eyeWhite}/>
            {!blink && <>
              <circle cx="167" cy="95" r="4.5" fill={eyeIris}/>
              <circle cx="165.5" cy="93.5" r="1.8" fill="white"/>
            </>}
          </g>

          {/* Nose */}
          <path d="M148,103 Q150,112 147,114 Q150,116 153,114 Q150,112 152,103" fill="none" stroke={skinDark} strokeWidth="1.2" opacity="0.5"/>

          {/* Cheeks */}
          <circle cx="118" cy="110" r="10" fill="url(#cheekGrad)"/>
          <circle cx="182" cy="110" r="10" fill="url(#cheekGrad)"/>

          {/* Mouth */}
          <motion.g animate={{ scaleY: expression === 'emphasize' ? 1.2 : 1 }} transition={{ duration: 0.3 }}>
            {expression === 'smile' ? (
              <path d={`M${150 - mouthWidth/2},120 Q150,${120 + mouthCurve + mouthHeight} ${150 + mouthWidth/2},120`}
                fill={lipColor} stroke={lipColor} strokeWidth="1.5" strokeLinecap="round"/>
            ) : (
              <ellipse cx="150" cy="121" rx={mouthWidth/2} ry={mouthHeight/2} fill={lipColor} opacity="0.85"/>
            )}
          </motion.g>
        </motion.g>
      </motion.g>

      {/* Signing indicator glow */}
      {isSigning && (
        <motion.circle
          cx="150" cy="250"
          r="120"
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="2"
          opacity="0.15"
          animate={{ r: [110, 130, 110], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.svg>
  );
}

/* ── Utility functions ── */
function splitIntoSlides(text: string) {
  if (!text) return [];
  const parts = text.split(/\n\n+/).filter((p: string) => p.trim());
  if (parts.length === 0) return [{ content: text }];
  if (parts.length === 1) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const slides: { content: string }[] = [];
    for (let i = 0; i < sentences.length; i += 2) {
      slides.push({ content: sentences.slice(i, i + 2).join(' ').trim() });
    }
    return slides.length > 0 ? slides : [{ content: text }];
  }
  return parts.map((p: string) => ({ content: p.trim() }));
}

function splitIntoPhrases(text: string): string[] {
  const clean = text.replace(/[#*_`\[\]()>|]/g, '').replace(/\n+/g, ' ').trim();
  const words = clean.split(/\s+/);
  const phrases: string[] = [];
  let current: string[] = [];
  for (const w of words) {
    current.push(w);
    if (current.length >= 5 || w.endsWith('.') || w.endsWith('!') || w.endsWith('?') || w.endsWith(',')) {
      phrases.push(current.join(' '));
      current = [];
    }
  }
  if (current.length > 0) phrases.push(current.join(' '));
  return phrases.filter(Boolean);
}

// Choose a contextual pose based on the word/phrase
function choosePose(word: string, idx: number): number {
  const w = word.toLowerCase();
  if (w.includes('?')) return 8; // question
  if (w.includes('!')) return 5; // emphasize
  if (w.includes('example') || w.includes('like') || w.includes('such')) return 1; // explain
  if (w.includes('important') || w.includes('key') || w.includes('main')) return 5; // emphasize
  if (w.includes('first') || w.includes('second') || w.includes('third') || /^\d/.test(w)) return 4; // list
  if (w.includes('think') || w.includes('imagine') || w.includes('consider')) return 6; // think
  if (w.includes('connect') || w.includes('relate') || w.includes('between')) return 7; // connect
  if (w.includes('hello') || w.includes('welcome') || w.includes('hi')) return 9; // greet
  // Cycle through explain, concept, point for general words
  return [1, 2, 3, 1, 2][idx % 5];
}

/* ── Main Component ── */
interface Props {
  topic: any;
  language?: string;
  onNext?: (() => void) | null;
  onPrev?: (() => void) | null;
}

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
    if (isPlaying) {
      controlsTimerRef.current = setTimeout(() => setShowControls(false), 4000);
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!isPlaying) setShowControls(true);
    else resetControlsTimer();
  }, [isPlaying]);

  // ── Fetch content ──
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setSlides([]); setCurrentSlide(0);
    stopRef.current = true; setIsPlaying(false);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
    const langMap: Record<string, string> = { hi: 'Hindi', hindi: 'Hindi', gu: 'Gujarati', gujarati: 'Gujarati', es: 'Spanish' };
    const li = langMap[language] ? ` Respond entirely in ${langMap[language]}.` : '';

    fetch(`${API}/voice/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        message: `Explain "${topicTitle}" clearly for a student. Use simple language, short sentences. Write 4-5 short paragraphs. Keep sentences very clear and concise for sign language interpretation.${li}`,
        topic: topicTitle, history: [],
      }),
    }).then(async resp => {
      const reader = resp.body?.getReader();
      if (!reader) return;
      const decoder = new TextDecoder();
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value, { stream: true }).split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try { const d = JSON.parse(line.slice(6)); if (d.text) full += d.text; } catch {}
        }
      }
      if (!cancelled && full) {
        const sl = splitIntoSlides(full);
        setSlides(sl); setLoading(false);
        setTimeout(() => { setIsPlaying(true); slidesRef.current = sl; playFrom(0); }, 800);
      }
    }).catch(() => {
      if (!cancelled) { setSlides([{ content: 'Unable to load content.' }]); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [topicTitle, language]);

  // ── Animation loop ──
  async function animatePhrase(phrase: string, phraseIndex: number): Promise<void> {
    return new Promise((resolve) => {
      if (stopRef.current) { resolve(); return; }
      setCurrentPhrase(phrase);
      const words = phrase.split(/\s+/);
      const poseInterval = Math.max(550, 2200 / (words.length + 1));
      let wordIdx = 0;

      const interval = setInterval(() => {
        if (stopRef.current) { clearInterval(interval); resolve(); return; }
        if (wordIdx < words.length) {
          const word = words[wordIdx];
          setHighlightWord(word);
          setSignPoseIdx(choosePose(word, phraseIndex * 10 + wordIdx));
          if (word.endsWith('?')) setAvatarExpression('thinking');
          else if (word.endsWith('!')) setAvatarExpression('emphasize');
          else if (wordIdx === words.length - 1) setAvatarExpression('smile');
          else setAvatarExpression('neutral');
          wordIdx++;
        } else {
          clearInterval(interval);
          resolve();
        }
      }, poseInterval);
    });
  }

  async function playSlide(slideIdx: number): Promise<void> {
    if (stopRef.current || slideIdx >= slidesRef.current.length) return;
    setCurrentSlide(slideIdx);
    const phrs = splitIntoPhrases(slidesRef.current[slideIdx]?.content || '');
    setPhrases(phrs);
    for (let i = 0; i < phrs.length; i++) {
      if (stopRef.current) return;
      setCurrentPhraseIdx(i);
      await animatePhrase(phrs[i], i);
      if (stopRef.current) return;
      await new Promise(r => setTimeout(r, 350));
    }
    await new Promise(r => setTimeout(r, 700));
  }

  async function playFrom(idx: number) {
    stopRef.current = false;
    for (let i = idx; i < slidesRef.current.length; i++) {
      if (stopRef.current) return;
      await playSlide(i);
    }
    setIsPlaying(false);
    setAvatarExpression('smile');
    setSignPoseIdx(0);
  }

  function handlePlay() {
    if (isPlaying) { stopRef.current = true; setIsPlaying(false); }
    else { setIsPlaying(true); playFrom(currentSlide); }
  }

  function goTo(idx: number) {
    stopRef.current = true;
    const c = Math.max(0, Math.min(idx, slides.length - 1));
    setCurrentSlide(c); setCurrentPhrase(''); setPhrases([]); setCurrentPhraseIdx(0); setHighlightWord('');
    if (isPlaying) setTimeout(() => playFrom(c), 300);
  }

  function handleRestart() {
    stopRef.current = true; setIsPlaying(false); setCurrentSlide(0);
    setCurrentPhrase(''); setCurrentPhraseIdx(0); setAvatarExpression('neutral'); setSignPoseIdx(0); setHighlightWord('');
  }

  function toggleFS() {
    if (!document.fullscreenElement) { containerRef.current?.requestFullscreen(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  }

  useEffect(() => {
    const h = () => { if (!document.fullscreenElement) setIsFullscreen(false); };
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  useEffect(() => () => { stopRef.current = true; }, []);

  const progressFraction = slides.length > 0 ? (currentSlide / Math.max(1, slides.length - 1)) : 0;
  const slide = slides[currentSlide] || { content: '' };
  const currentPose = SIGN_POSES[signPoseIdx] || SIGN_POSES[0];

  const captionSizeClasses = {
    normal: 'text-base md:text-lg',
    large: 'text-lg md:text-xl lg:text-2xl',
    xlarge: 'text-xl md:text-2xl lg:text-3xl',
  };

  if (loading) {
    return (
      <div className="bg-[#1a1a2e] rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full">
        <div className="text-center">
          <div className="relative mx-auto w-24 h-24 mb-5">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-purple-500/30 border-t-purple-400"/>
            <div className="absolute inset-3 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Hand className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <p className="text-white font-medium text-sm">Preparing Sign Language Lesson...</p>
          <p className="text-gray-400 text-xs mt-1">"{topicTitle}"</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        ref={containerRef}
        className={`bg-[#1a1a2e] overflow-hidden flex flex-col relative group ${isFullscreen ? 'fixed inset-0 z-50' : 'rounded-xl'}`}
        onMouseMove={resetControlsTimer}
        onMouseLeave={() => isPlaying && setShowControls(false)}
        style={{ aspectRatio: isFullscreen ? undefined : '16/9', height: isFullscreen ? '100vh' : undefined }}
      >
        {/* ── Main split layout ── */}
        <div className="flex-1 relative overflow-hidden flex" onClick={handlePlay}>
          {/* Left: Avatar */}
          <div className="w-[42%] lg:w-[38%] relative flex items-center justify-center overflow-hidden"
            style={{ background: 'radial-gradient(ellipse at 50% 60%, #1e2a4a 0%, #131a30 60%, #0d1220 100%)' }}>
            {/* Subtle stage light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-32 bg-gradient-to-b from-purple-500/5 to-transparent pointer-events-none"/>
            {/* Floor reflection */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#0d1220] to-transparent pointer-events-none"/>

            <div className="w-[85%] max-w-[280px] h-[90%] flex items-center justify-center">
              <SignAvatar pose={currentPose} expression={avatarExpression} isSigning={isPlaying}/>
            </div>

            {/* Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-purple-600/80 backdrop-blur-sm rounded-full px-3 py-1.5">
              <Hand className="w-3.5 h-3.5 text-white" />
              <span className="text-[10px] text-white font-bold uppercase tracking-wider">Sign Language</span>
            </div>

            {/* Current sign label */}
            {isPlaying && currentPose.label !== 'rest' && (
              <motion.div
                key={currentPose.label}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-3 left-3 right-3 text-center"
              >
                <span className="text-[10px] bg-white/10 backdrop-blur-sm text-white/60 rounded-full px-3 py-1 capitalize">
                  {currentPose.label}
                </span>
              </motion.div>
            )}
          </div>

          {/* Right: Caption area */}
          <div className="flex-1 relative flex flex-col justify-center p-5 md:p-8 lg:p-10"
            style={{ background: 'linear-gradient(135deg, #0f2847 0%, #1a1a2e 50%, #16132e 100%)' }}>

            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentSlide}-${currentPhraseIdx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 flex flex-col justify-center"
              >
                {/* Current phrase with word highlight */}
                {currentPhrase && (
                  <div className={`font-bold leading-relaxed mb-6 ${captionSizeClasses[captionSize]}`}>
                    {currentPhrase.split(/\s+/).map((word, i) => (
                      <span key={i} className={`inline-block mr-[0.3em] transition-colors duration-200 ${
                        word === highlightWord
                          ? 'text-yellow-300 scale-105'
                          : 'text-white'
                      }`}>
                        {word}
                      </span>
                    ))}
                  </div>
                )}

                {/* Full slide text */}
                <div className={`text-white/30 leading-relaxed space-y-2 max-h-[35vh] overflow-y-auto pr-2 ${
                  captionSize === 'xlarge' ? 'text-sm' : 'text-xs'
                }`}>
                  <ReactMarkdown components={{
                    p: ({ children }: any) => <p className="mb-2">{children}</p>,
                    strong: ({ children }: any) => <strong className="text-yellow-400/40">{children}</strong>,
                    li: ({ children }: any) => <li className="ml-4 mb-1 list-disc">{children}</li>,
                  }}>{slide.content}</ReactMarkdown>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Phrase progress */}
            {phrases.length > 1 && (
              <div className="flex items-center gap-1.5 mt-4">
                {phrases.map((_, i) => (
                  <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentPhraseIdx ? 'bg-purple-400 w-6' :
                    i < currentPhraseIdx ? 'bg-purple-600 w-2' : 'bg-white/10 w-2'
                  }`}/>
                ))}
              </div>
            )}

            {/* Center play overlay */}
            <AnimatePresence>
              {!isPlaying && !loading && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-16 h-16 rounded-full bg-purple-600/60 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-8 h-8 text-white ml-1" />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ── Controls ── */}
        <div className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
          {/* Progress bar */}
          <div className="relative h-[3px] group/progress hover:h-[5px] transition-all cursor-pointer"
            onClick={(e) => { e.stopPropagation(); const rect = e.currentTarget.getBoundingClientRect(); goTo(Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * (slides.length - 1))); }}>
            <div className="absolute inset-0 bg-white/20" />
            <div className="absolute inset-y-0 left-0 bg-purple-500 transition-all duration-300" style={{ width: `${progressFraction * 100}%` }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-purple-500 opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md"
              style={{ left: `${progressFraction * 100}%`, transform: 'translate(-50%, -50%)' }}/>
          </div>

          <div className="flex items-center justify-between px-3 py-2">
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide - 1); }} disabled={currentSlide === 0}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors"><SkipBack className="w-5 h-5" /></button>
              <button onClick={(e) => { e.stopPropagation(); handlePlay(); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
              </button>
              <button onClick={(e) => { e.stopPropagation(); goTo(currentSlide + 1); }} disabled={currentSlide >= slides.length - 1}
                className="p-2 rounded-full hover:bg-white/10 text-white disabled:opacity-30 transition-colors"><SkipForward className="w-5 h-5" /></button>
              <span className="text-xs text-white/60 ml-3 font-mono">Slide {currentSlide + 1} / {slides.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={(e) => { e.stopPropagation(); setCaptionSize(prev => prev === 'normal' ? 'large' : prev === 'large' ? 'xlarge' : 'normal'); }}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors flex items-center gap-1" title="Caption size">
                <Type className="w-4 h-4" /><span className="text-[10px] text-white/60">{captionSize === 'normal' ? 'A' : captionSize === 'large' ? 'A+' : 'A++'}</span>
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleRestart(); }} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors" title="Restart"><RotateCcw className="w-4 h-4" /></button>
              <button onClick={(e) => { e.stopPropagation(); toggleFS(); }} className="p-2 rounded-full hover:bg-white/10 text-white transition-colors">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Below player ── */}
      <div className="mt-3 px-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 text-[11px] font-bold">
            <Hand className="w-3 h-3" /> Sign Language Mode
          </span>
          <span className="text-[11px] text-gray-400">No audio required</span>
        </div>
        <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight">{topicTitle}</h1>

        <div className="flex items-center justify-between mt-3 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span>{slides.length} slides</span>
            <span>Visual captions</span>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setLiked(!liked)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${liked ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <ThumbsUp className={`w-4 h-4 ${liked ? 'fill-purple-700' : ''}`} /> Like
            </button>
            <button onClick={() => setSaved(!saved)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${saved ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
              <Bookmark className={`w-4 h-4 ${saved ? 'fill-purple-700' : ''}`} /> Save
            </button>
            {onNext && (
              <button onClick={onNext} className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors ml-2">
                Next Topic <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
