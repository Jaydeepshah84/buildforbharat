"use client";
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

/*
  AI Teacher Avatar — shows the teacher image with lip-sync mouth animation.
  No bobbing/shaking. Static image, only mouth moves during speech.
*/

const MOUTH_MAP: Record<string, number> = {
  a:1, e:.7, i:.5, o:.9, u:.8,
  b:0, p:0, m:0, f:.2, v:.2,
  l:.4, r:.5, n:.1, d:.1, t:.1,
  s:.3, z:.3, w:.7, y:.4, k:.6, g:.6, h:.5,
  ' ':0, ',':0, '.':0, '!':0, '?':0,
};

export default function AITeacherAvatar({
  isSpeaking = false,
  text = '',
  position = 'bottom-right',
  size = 'md',
  visible = true,
  inline = false,
}) {
  const [mouthOpen, setMouthOpen] = useState(0);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const sizeMap: Record<string, number> = { sm: 140, md: 180, lg: 220 };
  const px = sizeMap[size] || 160;
  const posMap: Record<string, string> = { 'bottom-right': 'bottom-2 right-2', 'bottom-left': 'bottom-2 left-2' };

  // Lip sync
  useEffect(() => {
    if (isSpeaking && text) {
      indexRef.current = 0;
      intervalRef.current = setInterval(() => {
        const ch = text[indexRef.current % text.length] || ' ';
        setMouthOpen(MOUTH_MAP[ch.toLowerCase()] ?? 0);
        indexRef.current++;
      }, 75);
    } else {
      clearInterval(intervalRef.current);
      setMouthOpen(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [isSpeaking, text]);

  if (!visible) return null;

  const mouthW = px * 0.09 + mouthOpen * px * 0.04;
  const mouthH = mouthOpen * px * 0.045;

  return (
    <div
      className={`${inline ? 'relative' : `fixed ${posMap[position] || 'bottom-2 right-2'}`} z-50 select-none pointer-events-none`}
      style={{ width: px }}
    >
      <div className="relative">
        {/* Static teacher image — NO animation on the container */}
        <img
          src="/teacher-avatar.png"
          alt="AI Teacher"
          className="w-full h-auto"
          draggable={false}
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))' }}
          onError={(e) => { (e.target as HTMLImageElement).src = '/teacher-avatar.svg'; }}
        />

        {/* Mouth overlay — only this animates */}
        {isSpeaking && mouthOpen > 0.05 && (
          <div className="absolute" style={{
            top: px * 0.555,
            left: px * 0.47,
            width: mouthW,
            height: Math.max(mouthH, 1),
            background: mouthOpen > 0.4
              ? 'radial-gradient(ellipse, #8B0000 30%, #5C0000 100%)'
              : 'radial-gradient(ellipse, #993333 30%, #661111 100%)',
            borderRadius: mouthOpen > 0.5 ? '50%' : '40%',
            transition: 'all 0.05s ease',
            opacity: Math.min(mouthOpen * 1.5, 0.85),
          }} />
        )}
      </div>

    </div>
  );
}
