"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

/*
  MacBook Accelerometer Tap Detector
  ──────────────────────────────────
  Uses the DeviceMotion API to detect physical taps/impacts on the device.

  - 1 tap  → navigate to home (/)
  - 2 taps → navigate to dashboard (/dashboard)

  The Sudden Motion Sensor (SMS) data is exposed via the browser's
  DeviceMotionEvent on supported devices. On devices without accelerometer
  access, this component is a no-op.
*/

const TAP_THRESHOLD = 2.5;       // acceleration magnitude to count as a tap (m/s²)
const DOUBLE_TAP_WINDOW = 500;   // ms window to detect second tap
const COOLDOWN = 1500;           // ms cooldown after action to prevent repeats
const SINGLE_TAP_DELAY = 600;    // ms to wait before confirming single tap

export default function TapDetector() {
  const router = useRouter();
  const [supported, setSupported] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const tapTimestamps = useRef<number[]>([]);
  const cooldownRef = useRef(false);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Check if DeviceMotion is available
    if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) return;

    // On iOS 13+ Safari requires permission
    const requestPermission = async () => {
      if (
        typeof (DeviceMotionEvent as any).requestPermission === "function"
      ) {
        try {
          const permission = await (DeviceMotionEvent as any).requestPermission();
          if (permission !== "granted") return;
        } catch {
          return;
        }
      }
      setSupported(true);
    };

    requestPermission();
  }, []);

  useEffect(() => {
    if (!supported) return;

    const showFeedback = (msg: string) => {
      setFeedback(msg);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
      feedbackTimer.current = setTimeout(() => setFeedback(null), 2000);
    };

    const handleMotion = (event: DeviceMotionEvent) => {
      if (cooldownRef.current) return;

      const acc = event.accelerationIncludingGravity;
      if (!acc || acc.x == null || acc.y == null || acc.z == null) return;

      // Calculate magnitude of acceleration change (subtract gravity ~9.8)
      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2) - 9.8;

      if (magnitude > TAP_THRESHOLD) {
        const now = Date.now();
        tapTimestamps.current.push(now);

        // Keep only recent taps
        tapTimestamps.current = tapTimestamps.current.filter(
          (t) => now - t < DOUBLE_TAP_WINDOW * 2
        );

        // Check for double tap (2 taps within window)
        const recentTaps = tapTimestamps.current.filter(
          (t) => now - t < DOUBLE_TAP_WINDOW
        );

        if (recentTaps.length >= 2) {
          // Double tap detected → Dashboard
          if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
          tapTimestamps.current = [];
          cooldownRef.current = true;
          setTimeout(() => (cooldownRef.current = false), COOLDOWN);

          showFeedback("Double tap — Opening Dashboard");
          router.push("/dashboard");
          return;
        }

        // Wait to see if a second tap comes (single tap)
        if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
        singleTapTimer.current = setTimeout(() => {
          // Single tap confirmed → Home
          tapTimestamps.current = [];
          cooldownRef.current = true;
          setTimeout(() => (cooldownRef.current = false), COOLDOWN);

          showFeedback("Single tap — Opening Home");
          router.push("/");
        }, SINGLE_TAP_DELAY);
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, [supported, router]);

  // Don't render anything if not supported
  if (!supported) return null;

  return (
    <AnimatePresence>
      {feedback && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ duration: 0.3 }}
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl bg-gray-900/90 backdrop-blur-xl text-white text-sm font-semibold shadow-2xl flex items-center gap-3"
        >
          <span className="w-2 h-2 rounded-full bg-[#284ce3] animate-pulse" />
          {feedback}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
