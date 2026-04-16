#!/usr/bin/env python3
"""
Learnify Tap + Voice Launcher — MacBook Pro M1 Pro
====================================================
TAP your desk  → opens pages by tap count
SPEAK a command → "open dashboard", "open courses", etc.

Uses Whisper (offline, no internet needed) for voice recognition.
"""

import subprocess
import sys
import time
import threading

import numpy as np
import sounddevice as sd
import whisper
from scipy.signal import resample

# ══════════════════════════════════════════════════════════════
# CONFIG
# ══════════════════════════════════════════════════════════════

SAMPLE_RATE = 48000
BLOCK_SIZE = 256
CHANNELS = 1

# Tap
TAP_THRESHOLD = 0.15
MULTI_TAP_WINDOW = 0.50
COOLDOWN = 2.5
MIN_TAP_GAP = 0.15

# Voice
VOICE_RMS_THRESHOLD = 0.025    # speech energy threshold
VOICE_SILENCE_TIMEOUT = 1.2    # silence to end phrase
VOICE_MIN_DURATION = 0.6       # min speech length
VOICE_MAX_DURATION = 4.0       # max recording

# URLs
VOICE_KEYWORDS = {
    "website": "/", "home": "/", "learn": "/", "learnify": "/",
    "dashboard": "/dashboard",
    "course": "/courses", "courses": "/courses",
    "quiz": "/quiz",
    "tutor": "/tutor",
    "homework": "/homework",
    "note": "/notes", "notes": "/notes",
    "setting": "/settings", "settings": "/settings",
    "planner": "/study-planner",
    "career": "/career",
    "analytic": "/analytics", "analytics": "/analytics",
    "classroom": "/classroom",
    "lab": "/visual-lab", "visual": "/visual-lab",
    "exam": "/exam",
}

TAP_URLS = {
    1: "http://localhost:3000",
    2: "http://localhost:3000/dashboard",
    3: "http://localhost:3000/courses",
}

# ══════════════════════════════════════════════════════════════
# GLOBALS
# ══════════════════════════════════════════════════════════════

tap_times = []
last_trigger = 0.0
last_tap = 0.0
tap_timer = None
tap_lock = threading.Lock()
running = True

voice_buffer = []
voice_active = False
voice_start = 0.0
silence_start = 0.0
voice_processing = False

whisper_model = None


def open_browser(url):
    try:
        subprocess.run(["open", url], check=True)
    except Exception as e:
        print(f"  Error: {e}")


# ══════════════════════════════════════════════════════════════
# TAP DETECTION
# ══════════════════════════════════════════════════════════════

def fire_tap():
    global tap_times, last_trigger, tap_timer
    with tap_lock:
        count = min(len(tap_times), 3)
        tap_times = []
        tap_timer = None
    if count == 0:
        return
    url = TAP_URLS.get(count, TAP_URLS[1])
    labels = {1: "SINGLE TAP", 2: "DOUBLE TAP", 3: "TRIPLE TAP"}
    print(f"\n  ★ {labels[count]} → {url}\n")
    open_browser(url)
    last_trigger = time.time()


def on_tap():
    global tap_timer
    now = time.time()
    if now - last_trigger < COOLDOWN:
        return
    with tap_lock:
        tap_times.append(now)
        count = len(tap_times)
    print(f"  TAP #{count}!")
    if tap_timer:
        tap_timer.cancel()
    tap_timer = threading.Timer(MULTI_TAP_WINDOW, fire_tap)
    tap_timer.daemon = True
    tap_timer.start()


# ══════════════════════════════════════════════════════════════
# VOICE RECOGNITION (Whisper offline)
# ══════════════════════════════════════════════════════════════

def process_voice(audio_48k):
    """Resample to 16kHz, run Whisper, match command."""
    global last_trigger, voice_processing

    voice_processing = True
    try:
        # Resample 48kHz → 16kHz for Whisper
        n_samples_16k = int(len(audio_48k) * 16000 / 48000)
        audio_16k = resample(audio_48k, n_samples_16k).astype(np.float32)

        # Pad to at least 1 second (Whisper needs minimum length)
        if len(audio_16k) < 16000:
            audio_16k = np.pad(audio_16k, (0, 16000 - len(audio_16k)))

        result = whisper_model.transcribe(audio_16k, fp16=False, language="en")
        text = result["text"].strip().lower()

        if not text or text in ["you", "thank you", "thanks", "bye", "."]:
            return  # Whisper hallucination on silence

        print(f'  🎤 Heard: "{text}"')

        # Stop command
        if "stop" in text and ("listen" in text or "quit" in text or "exit" in text):
            global running
            running = False
            print("\n  Stopping...")
            return

        # Match "open ___" command
        if "open" in text:
            for kw, path in VOICE_KEYWORDS.items():
                if kw in text:
                    url = f"http://localhost:3000{path}"
                    now = time.time()
                    if now - last_trigger > COOLDOWN:
                        print(f'\n  ★ VOICE: "open {kw}" → {url}\n')
                        open_browser(url)
                        last_trigger = now
                    return
            print("  (command not recognized)")

    except Exception as e:
        print(f"  Voice error: {e}")
    finally:
        voice_processing = False


# ══════════════════════════════════════════════════════════════
# AUDIO CALLBACK — tap + voice detection
# ══════════════════════════════════════════════════════════════

def audio_callback(indata, frames, time_info, status):
    global last_tap, voice_active, voice_start, voice_buffer, silence_start

    audio = indata[:, 0].copy()
    peak = float(np.max(np.abs(audio)))
    rms = float(np.sqrt(np.mean(audio.astype(np.float64) ** 2)))
    now = time.time()

    # ── TAP ──
    if peak > TAP_THRESHOLD:
        if now - last_tap > MIN_TAP_GAP and now - last_trigger > COOLDOWN:
            last_tap = now
            bar = "█" * min(int(peak * 30), 50)
            print(f"  SPIKE: {peak:.3f} {bar}")
            on_tap()
        return  # Don't count tap audio as speech

    # ── VOICE ──
    if voice_processing or now - last_trigger < COOLDOWN:
        return

    is_speech = rms > VOICE_RMS_THRESHOLD

    if is_speech:
        if not voice_active:
            voice_active = True
            voice_start = now
            voice_buffer = []
            silence_start = 0
            print("  🎤 Listening...")
        voice_buffer.append(audio)
        silence_start = 0
    elif voice_active:
        voice_buffer.append(audio)

        if silence_start == 0:
            silence_start = now

        duration = now - voice_start
        silence = now - silence_start

        if silence > VOICE_SILENCE_TIMEOUT or duration > VOICE_MAX_DURATION:
            voice_active = False
            if duration > VOICE_MIN_DURATION and len(voice_buffer) > 0:
                audio_np = np.concatenate(voice_buffer).astype(np.float32)
                voice_buffer = []
                print("  🎤 Processing...")
                threading.Thread(target=process_voice, args=(audio_np,), daemon=True).start()
            else:
                voice_buffer = []
            silence_start = 0


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

def main():
    global running, whisper_model

    print()
    print("  ╔═══════════════════════════════════════════╗")
    print("  ║     LEARNIFY TAP + VOICE LAUNCHER         ║")
    print("  ╠═══════════════════════════════════════════╣")
    print("  ║                                           ║")
    print("  ║  TAP YOUR DESK:                           ║")
    print("  ║    1 tap  → Home                          ║")
    print("  ║    2 taps → Dashboard                     ║")
    print("  ║    3 taps → Courses                       ║")
    print("  ║                                           ║")
    print("  ║  OR SPEAK:                                ║")
    print('  ║    "open website"   → Home                ║')
    print('  ║    "open dashboard" → Dashboard           ║')
    print('  ║    "open courses"   → Courses             ║')
    print('  ║    "open quiz"      → Quiz                ║')
    print('  ║    "open tutor"     → AI Tutor            ║')
    print("  ║                                           ║")
    print("  ║  Ctrl+C to quit                           ║")
    print("  ╚═══════════════════════════════════════════╝")
    print()

    print("  Loading Whisper model (tiny)...")
    whisper_model = whisper.load_model("tiny")
    print("  Whisper ready! (offline speech recognition)")
    print()

    print(f"  Mic: {sd.query_devices(sd.default.device[0])['name']}")
    print(f"  Tap threshold: {TAP_THRESHOLD}")
    print()
    print("  Listening for TAPS and VOICE...\n")

    try:
        with sd.InputStream(
            samplerate=SAMPLE_RATE,
            blocksize=BLOCK_SIZE,
            channels=CHANNELS,
            callback=audio_callback,
        ):
            while running:
                time.sleep(0.5)
    except KeyboardInterrupt:
        pass

    running = False
    print("\n  Bye!")


if __name__ == "__main__":
    main()
