"""
Ed.Ai Voice AI Service
- TTS: AI4Bharat Indic-TTS (Hindi/Indian languages) + Edge Neural TTS (other languages)
- STT: Faster Whisper (real-time speech-to-text)
"""

import os
import io
import asyncio
import tempfile
import threading
import base64
import json
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Dedicated event loop for async edge-tts ──────────────────
_loop = asyncio.new_event_loop()
_loop_thread = threading.Thread(target=_loop.run_forever, daemon=True)
_loop_thread.start()

def run_async(coro):
    """Run async coroutine safely from sync Flask context."""
    future = asyncio.run_coroutine_threadsafe(coro, _loop)
    return future.result(timeout=30)

# ── TTS Voices (best for educational content) ────────────────
DEFAULT_VOICES = {
    "en": "en-US-AriaNeural",
    "hi": "hi-IN-SwaraNeural",        # Female — most natural Hindi voice
    "gu": "gu-IN-DhwaniNeural",       # Female — natural Gujarati
    "es": "es-ES-ElviraNeural",
    "ta": "ta-IN-PallaviNeural",
    "te": "te-IN-ShrutiNeural",
    "bn": "bn-IN-TanishaaNeural",
    "mr": "mr-IN-AarohiNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
}

MALE_VOICES = {
    "en": "en-US-GuyNeural",
    "hi": "hi-IN-MadhurNeural",
    "gu": "gu-IN-NiranjanNeural",
    "es": "es-ES-AlvaroNeural",
}

# ── Whisper Model ────────────────────────────────────────────
whisper_model = None

def get_whisper():
    global whisper_model
    if whisper_model is None:
        from faster_whisper import WhisperModel
        print("Loading Faster Whisper model (base)...")
        whisper_model = WhisperModel("base", device="cpu", compute_type="int8")
        print("Whisper model loaded!")
    return whisper_model


# ── Enhanced Indic TTS (SSML-enhanced Edge TTS for natural Hindi) ──
INDIC_LANGUAGES = {"hi", "gu", "bn", "ta", "te", "mr", "ml", "kn", "pa", "or", "as"}

def generate_indic_tts(text, language="hi", gender="female"):
    """Generate natural Hindi speech using Edge TTS with SSML for prosody control."""
    import subprocess, sys, uuid

    # Best voices for natural Indian language speech
    indic_voices = {
        "hi": {"female": "hi-IN-SwaraNeural", "male": "hi-IN-MadhurNeural"},
        "gu": {"female": "gu-IN-DhwaniNeural", "male": "gu-IN-NiranjanNeural"},
        "bn": {"female": "bn-IN-TanishaaNeural", "male": "bn-IN-BashkarNeural"},
        "ta": {"female": "ta-IN-PallaviNeural", "male": "ta-IN-ValluvarNeural"},
        "te": {"female": "te-IN-ShrutiNeural", "male": "te-IN-MohanNeural"},
        "mr": {"female": "mr-IN-AarohiNeural", "male": "mr-IN-ManoharNeural"},
    }

    voice_map = indic_voices.get(language, indic_voices["hi"])
    voice = voice_map.get(gender, voice_map["female"])

    # Use SSML for natural prosody (pauses, emphasis, natural rhythm)
    ssml_text = f"""<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="{language}-IN">
    <voice name="{voice}">
        <prosody rate="-3%" pitch="+2%">
            <mstts:express-as xmlns:mstts="http://www.w3.org/2001/mstts" style="chat" styledegree="1.5">
                {text}
            </mstts:express-as>
        </prosody>
    </voice>
</speak>"""

    try:
        tmp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp_audio.close()

        # Write SSML to temp file
        ssml_path = os.path.join(tempfile.gettempdir(), f"edai_ssml_{uuid.uuid4().hex}.xml")
        with open(ssml_path, "w", encoding="utf-8") as f:
            f.write(ssml_text)

        # Try SSML first
        cmd = [sys.executable, "-m", "edge_tts", "--voice", voice, "-f", ssml_path, "--write-media", tmp_audio.name]
        result = subprocess.run(cmd, capture_output=True, timeout=25)
        os.unlink(ssml_path)

        if result.returncode != 0 or os.path.getsize(tmp_audio.name) < 100:
            # Fallback: plain text with natural tuning
            txt_path = os.path.join(tempfile.gettempdir(), f"edai_tts_{uuid.uuid4().hex}.txt")
            with open(txt_path, "w", encoding="utf-8") as f:
                f.write(text)

            cmd = [sys.executable, "-m", "edge_tts", "--voice", voice, "--rate", "-3%", "--pitch", "+2%", "-f", txt_path, "--write-media", tmp_audio.name]
            result = subprocess.run(cmd, capture_output=True, timeout=25)
            os.unlink(txt_path)

        if result.returncode == 0 and os.path.exists(tmp_audio.name) and os.path.getsize(tmp_audio.name) > 100:
            with open(tmp_audio.name, "rb") as f:
                audio_bytes = f.read()
            os.unlink(tmp_audio.name)
            print(f"[Indic-TTS] {voice}: {len(audio_bytes)} bytes")
            return audio_bytes, "audio/mpeg"

        if os.path.exists(tmp_audio.name):
            os.unlink(tmp_audio.name)
    except Exception as e:
        print(f"[Indic-TTS] Error: {e}")

    return None, None


# ── TTS Core (Edge Neural — fallback) ────────────────────────
async def _generate_audio(text, voice, rate="+0%"):
    import edge_tts
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    buf.seek(0)
    return buf


@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "tts_engine": "edge-tts (Microsoft Neural TTS)",
        "stt_engine": "faster-whisper",
        "languages": list(DEFAULT_VOICES.keys()),
        "whisper_loaded": whisper_model is not None,
    })


@app.route("/voices", methods=["GET"])
def voices():
    return jsonify({
        "female_voices": DEFAULT_VOICES,
        "male_voices": MALE_VOICES,
        "languages": list(DEFAULT_VOICES.keys()),
        "coqui_available": True,
    })


@app.route("/tts", methods=["POST"])
def tts():
    try:
        data = request.get_json(force=True)
        text = data.get("text", "").strip()
        language = data.get("language", "en")
        gender = data.get("gender", "female")
        speed_val = float(data.get("speed", 1.0))

        if not text:
            return jsonify({"error": "Text is required"}), 400

        print(f"[TTS] Generating: lang={language}, chars={len(text)}")

        # ── Try AI4Bharat Indic-TTS first for Indian languages ──
        if language in INDIC_LANGUAGES:
            audio_data, content_type = generate_indic_tts(text, language, gender)
            if audio_data:
                buf = io.BytesIO(audio_data)
                buf.seek(0)
                return send_file(buf, mimetype=content_type, download_name="speech.wav")
            print(f"[TTS] AI4Bharat unavailable, falling back to Edge TTS")

        # ── Fallback: Edge Neural TTS ──
        # Pick voice
        voice = data.get("voice")
        if not voice:
            voice = DEFAULT_VOICES.get(language, "en-US-AriaNeural")

        # Per-language tuning for natural pronunciation
        LANG_TUNING = {
            "hi": { "rate": "-5%",  "pitch": "+0Hz" },    # SwaraNeural is naturally good, slight slow for clarity
            "gu": { "rate": "-5%",  "pitch": "+0Hz" },
            "en": { "rate": "+0%",  "pitch": "+0Hz" },
        }
        tuning = LANG_TUNING.get(language, { "rate": "+0%", "pitch": "+0Hz" })

        # Apply user speed on top of language tuning
        base_rate = int(tuning["rate"].replace("%", "").replace("+", ""))
        user_rate = int((speed_val - 1.0) * 100)
        final_rate = base_rate + user_rate
        rate = f"+{final_rate}%" if final_rate >= 0 else f"{final_rate}%"
        pitch = tuning["pitch"]

        # Generate using edge-tts CLI with text file (handles Unicode correctly)
        import subprocess, sys, uuid
        tmp_audio = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        tmp_audio.close()
        txt_path = os.path.join(tempfile.gettempdir(), f"edai_tts_{uuid.uuid4().hex}.txt")
        with open(txt_path, "w", encoding="utf-8") as f:
            f.write(text)
        tmp_text = type("obj", (object,), {"name": txt_path})()

        cmd = [sys.executable, "-m", "edge_tts", "--voice", voice, "--rate", rate, "--pitch", pitch, "-f", tmp_text.name, "--write-media", tmp_audio.name]
        result = subprocess.run(cmd, capture_output=True, timeout=20)
        os.unlink(tmp_text.name)

        if result.returncode != 0 or not os.path.exists(tmp_audio.name) or os.path.getsize(tmp_audio.name) < 100:
            if os.path.exists(tmp_audio.name): os.unlink(tmp_audio.name)
            return jsonify({"error": f"TTS failed: {result.stderr.decode(errors='replace')}"}), 500

        return send_file(tmp_audio.name, mimetype="audio/mpeg", download_name="speech.mp3")
    except Exception as e:
        print(f"TTS Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/stt", methods=["POST"])
def stt():
    try:
        if "audio" in request.files:
            audio_file = request.files["audio"]
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
            audio_file.save(tmp.name)
            tmp.close()
            audio_path = tmp.name
        elif request.data:
            tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".webm")
            tmp.write(request.data)
            tmp.close()
            audio_path = tmp.name
        else:
            return jsonify({"error": "No audio provided"}), 400

        model = get_whisper()
        segments, info = model.transcribe(
            audio_path, beam_size=5,
            language=request.args.get("language"),
            vad_filter=True,
        )

        text_parts = []
        segment_list = []
        for segment in segments:
            text_parts.append(segment.text)
            segment_list.append({
                "start": round(segment.start, 2),
                "end": round(segment.end, 2),
                "text": segment.text.strip(),
            })

        os.unlink(audio_path)

        return jsonify({
            "text": " ".join(text_parts).strip(),
            "language": info.language,
            "language_probability": round(info.language_probability, 2),
            "segments": segment_list,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("TTS_PORT", 5001))
    print(f"\nEd.Ai Voice AI Service")
    print(f"  Server: http://localhost:{port}")
    print(f"  TTS: Edge Neural TTS ({len(DEFAULT_VOICES)} languages)")
    print(f"  STT: Faster Whisper\n")
    get_whisper()
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
