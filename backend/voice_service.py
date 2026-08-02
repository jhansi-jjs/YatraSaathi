"""
voice_service.py

Speech-to-text using faster-whisper with comprehensive telemetry logging,
ffmpeg audio decoding, debug upload persistence, and VAD filter tuning.
"""

from __future__ import annotations

import logging
import os
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from faster_whisper import WhisperModel

logging.basicConfig(level=logging.INFO, format="[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s")
logger = logging.getLogger(__name__)

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "tiny")
LOCAL_MODEL_PATH = os.getenv("WHISPER_LOCAL_PATH")

_model = None
_model_lock = threading.Lock()

UPLOADS_DIR = Path(__file__).resolve().parent / "uploads"
UPLOADS_DIR.mkdir(exist_ok=True)


def _model_ref() -> str:
    if LOCAL_MODEL_PATH and os.path.exists(LOCAL_MODEL_PATH):
        return LOCAL_MODEL_PATH
    return MODEL_SIZE


def _build_model() -> WhisperModel:
    model_name = _model_ref()
    cpu_threads = min(4, os.cpu_count() or 2)
    device = "cuda" if os.getenv("USE_CUDA") == "true" else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"

    logger.info("==================================================")
    logger.info("Initializing Whisper STT Model: '%s'", model_name)
    logger.info("Device: %s | Compute Type: %s | CPU Threads: %d", device, compute_type, cpu_threads)
    logger.info("==================================================")

    start_time = time.time()
    model = WhisperModel(
        model_name,
        device=device,
        compute_type=compute_type,
        cpu_threads=cpu_threads,
    )
    logger.info("Whisper Model '%s' successfully loaded in %.2f seconds", model_name, time.time() - start_time)
    return model


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = _build_model()
    return _model


def _ffmpeg_exe() -> str:
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except ImportError:
        return "ffmpeg"


def _prepare_audio_path(raw_path: str, suffix: str) -> str:
    if suffix.lower() in {".wav", ".wave"}:
        return raw_path

    wav_path = raw_path + ".wav"
    ffmpeg = _ffmpeg_exe()
    logger.info("[FFmpeg Decode] Converting input '%s' (%s) -> 16kHz mono WAV...", raw_path, suffix)

    result = subprocess.run(
        [ffmpeg, "-y", "-i", raw_path, "-ar", "16000", "-ac", "1", wav_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        logger.error("[FFmpeg Error] Decode failed: %s", result.stderr[-500:])
        raise RuntimeError(f"Could not decode audio ({suffix}): {result.stderr[-500:]}")

    wav_size = os.path.getsize(wav_path)
    logger.info("[FFmpeg Decode] Successfully generated WAV file: %s (%d bytes)", wav_path, wav_size)
    os.remove(raw_path)
    return wav_path


def transcribe_audio_bytes(audio_bytes: bytes, filename_hint: str = "recording.webm", mime_type: str = "audio/webm") -> dict:
    file_size_kb = round(len(audio_bytes) / 1024, 2)
    logger.info("--------------------------------------------------")
    logger.info("[STEP 1: Upload Received] File: '%s' | MIME: '%s' | Size: %.2f KB (%d bytes)",
                filename_hint, mime_type, file_size_kb, len(audio_bytes))

    if len(audio_bytes) == 0:
        logger.error("[STEP 1 Error] Uploaded audio payload is 0 bytes! Halting pipeline.")
        return {
            "text": "",
            "detected_language": "en",
            "language_probability": 0.0,
            "error": "Uploaded audio payload is 0 bytes",
        }

    # STEP 2: Save uploaded debug recording for manual inspection
    debug_path = UPLOADS_DIR / "debug_last_recording.webm"
    try:
        with open(debug_path, "wb") as f:
            f.write(audio_bytes)
        logger.info("[STEP 2: Debug File Saved] Saved last audio to: %s", debug_path)
    except Exception as e:
        logger.warning("[STEP 2 Warning] Could not save debug file: %s", e)

    suffix = os.path.splitext(filename_hint)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        audio_path = _prepare_audio_path(tmp_path, suffix)
        return _transcribe_file(audio_path)
    except Exception as exc:
        logger.error("[STT Pipeline Exception] %s", exc, exc_info=True)
        raise exc
    finally:
        for path in {tmp_path, tmp_path + ".wav"}:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


def _transcribe_file(audio_path: str) -> dict:
    # STEP 3: Load Whisper model & log execution
    t0 = time.time()
    model = get_model()

    logger.info("[STEP 3: Whisper Transcribe] Processing audio file '%s'...", audio_path)

    # Disable strict VAD filter to prevent dropping short user speech clips
    segments, info = model.transcribe(
        audio_path,
        beam_size=3,
        best_of=3,
        vad_filter=False,
    )

    segment_list = list(segments)
    text = " ".join(seg.text.strip() for seg in segment_list).strip()
    elapsed = round(time.time() - t0, 3)

    # STEP 4: Log transcript details
    logger.info("--------------------------------------------------")
    logger.info("[STEP 4: Whisper Result]")
    logger.info("Raw Transcript: '%s'", text)
    logger.info("Detected Language: '%s' | Prob: %.3f | Time: %.3fs",
                info.language, info.language_probability, elapsed)
    logger.info("--------------------------------------------------")

    return {
        "text": text,
        "detected_language": info.language,
        "language_probability": round(info.language_probability, 3),
        "transcribe_time_sec": elapsed,
    }
