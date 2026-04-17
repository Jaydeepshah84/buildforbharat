"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CameraOff, Eye, EyeOff } from "lucide-react";

/*
  EmotionDetector — Real-time emotion detection using face-api.js
  Shows mini camera feed + emotion badge in top-right corner
  Detects: happy, sad, angry, disgusted, fearful, surprised, neutral → mapped to learning states
*/

const EMOTION_MAP: Record<string, { emoji: string; label: string; color: string; learning: string }> = {
  happy:      { emoji: "😊", label: "Happy",      color: "bg-emerald-500", learning: "engaged" },
  neutral:    { emoji: "😐", label: "Focused",     color: "bg-blue-500",    learning: "focused" },
  sad:        { emoji: "😢", label: "Confused",     color: "bg-amber-500",   learning: "struggling" },
  angry:      { emoji: "😤", label: "Frustrated",  color: "bg-red-500",     learning: "frustrated" },
  surprised:  { emoji: "😮", label: "Surprised",   color: "bg-purple-500",  learning: "curious" },
  fearful:    { emoji: "😰", label: "Anxious",     color: "bg-orange-500",  learning: "anxious" },
  disgusted:  { emoji: "😣", label: "Bored",       color: "bg-gray-500",    learning: "bored" },
};

interface Props {
  enabled?: boolean;
  checkInterval?: number;      // ms between checks (default 30000 = 30s)
  displayDuration?: number;    // ms to show result (default 6000 = 6s)
  onEmotionDetected?: (emotion: string, attention: number) => void;
}

export default function EmotionDetector({
  enabled = true,
  checkInterval = 30000,
  displayDuration = 6000,
  onEmotionDetected,
}: Props) {
  const [cameraOn, setCameraOn] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [emotion, setEmotion] = useState<string>("neutral");
  const [attention, setAttention] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [minimized, setMinimized] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceApiRef = useRef<any>(null);
  const checkTimerRef = useRef<any>(null);
  const hideTimerRef = useRef<any>(null);

  // Load face-api.js models
  const loadModels = useCallback(async () => {
    try {
      const faceapi = await import("face-api.js");
      faceApiRef.current = faceapi;

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceExpressionNet.loadFromUri("/models"),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri("/models"),
      ]);

      setModelsLoaded(true);
      console.log("[Emotion] Face-api.js models loaded");
    } catch (err) {
      console.warn("[Emotion] Failed to load models:", err);
    }
  }, []);

  // Start camera
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraOn(true);
    } catch (err) {
      console.warn("[Emotion] Camera access denied");
      setCameraOn(false);
    }
  }, []);

  // Stop camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  }, []);

  // Detect emotion from current video frame
  const detectEmotion = useCallback(async () => {
    const faceapi = faceApiRef.current;
    const video = videoRef.current;
    if (!faceapi || !video || !cameraOn || !modelsLoaded) return;

    try {
      const detection = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks(true)
        .withFaceExpressions();

      if (detection) {
        const expressions = detection.expressions;
        // Find dominant expression
        let maxExpr = "neutral";
        let maxVal = 0;
        Object.entries(expressions).forEach(([key, val]: [string, any]) => {
          if (val > maxVal) { maxVal = val; maxExpr = key; }
        });

        // Calculate attention based on face position and expression
        const box = detection.detection.box;
        const centerX = (box.x + box.width / 2) / 320;
        const centerY = (box.y + box.height / 2) / 240;
        const gazeOffset = Math.abs(centerX - 0.5) + Math.abs(centerY - 0.5);
        const attentionLevel = Math.max(0, Math.min(1, 1 - gazeOffset));

        setEmotion(maxExpr);
        setAttention(Math.round(attentionLevel * 100) / 100);
        onEmotionDetected?.(maxExpr, attentionLevel);

        // Show result popup
        setShowResult(true);
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowResult(false), displayDuration);
      }
    } catch (err) {
      console.warn("[Emotion] Detection error:", err);
    }
  }, [cameraOn, modelsLoaded, displayDuration, onEmotionDetected]);

  // Initialize
  useEffect(() => {
    if (!enabled) return;
    loadModels();
    return () => { stopCamera(); clearInterval(checkTimerRef.current); clearTimeout(hideTimerRef.current); };
  }, [enabled, loadModels, stopCamera]);

  // Start camera after models load
  useEffect(() => {
    if (modelsLoaded && enabled) {
      startCamera();
    }
  }, [modelsLoaded, enabled, startCamera]);

  // Schedule periodic detection
  useEffect(() => {
    if (cameraOn && modelsLoaded) {
      // First check after 3 seconds
      setTimeout(detectEmotion, 3000);
      checkTimerRef.current = setInterval(detectEmotion, checkInterval);
    }
    return () => clearInterval(checkTimerRef.current);
  }, [cameraOn, modelsLoaded, checkInterval, detectEmotion]);

  if (!enabled) return null;

  const e = EMOTION_MAP[emotion] || EMOTION_MAP.neutral;

  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col items-end gap-2">
      {/* Mini camera feed */}
      {!minimized && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className="relative w-36 h-28 rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-gray-900">
          <video ref={videoRef} autoPlay playsInline muted
            className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
          <canvas ref={canvasRef} className="hidden" />

          {!cameraOn && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-1">
              <CameraOff className="w-5 h-5 text-gray-600" />
              <span className="text-[10px] text-gray-600">{modelsLoaded ? "Camera off" : "Loading AI..."}</span>
            </div>
          )}

          {/* Recording indicator */}
          {cameraOn && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] text-white/70 font-medium">LIVE</span>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-1 right-1 flex gap-1">
            <button onClick={() => cameraOn ? stopCamera() : startCamera()}
              className="p-1 rounded-md bg-black/40 text-white/70 hover:text-white text-[10px]">
              {cameraOn ? <Camera className="w-3 h-3" /> : <CameraOff className="w-3 h-3" />}
            </button>
            <button onClick={() => setMinimized(true)}
              className="p-1 rounded-md bg-black/40 text-white/70 hover:text-white">
              <EyeOff className="w-3 h-3" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Minimized dot */}
      {minimized && (
        <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }}
          onClick={() => setMinimized(false)}
          className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:shadow-xl transition-shadow">
          <Eye className="w-4 h-4 text-gray-600" />
        </motion.button>
      )}

      {/* Emotion result popup */}
      <AnimatePresence>
        {showResult && (
          <motion.div initial={{ opacity: 0, x: 20, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-white rounded-xl shadow-xl border border-gray-100 px-4 py-3 flex items-center gap-3 min-w-[200px]">
            <span className="text-4xl">{e.emoji}</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{e.label}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-gray-500">Attention</span>
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${
                    attention > 0.6 ? "bg-emerald-500" : attention > 0.3 ? "bg-amber-500" : "bg-red-500"
                  }`} style={{ width: `${attention * 100}%` }} />
                </div>
                <span className="text-[10px] font-medium text-gray-500">{Math.round(attention * 100)}%</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
