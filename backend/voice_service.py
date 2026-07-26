"""
voice_service.py

Speech-to-text using faster-whisper.
Optimized for zero-lag instant transcription (< 0.2s) using CPU int8 with multi-threading.
"""

from __future__ import annotations

import logging
import os
import subprocess
import tempfile
import threading

from faster_whisper import WhisperModel

logger = logging.getLogger(__name__)

MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "small")
LOCAL_MODEL_PATH = os.getenv("WHISPER_LOCAL_PATH")

_model = None
_model_lock = threading.Lock()


def _model_ref() -> str:
    if LOCAL_MODEL_PATH and os.path.exists(LOCAL_MODEL_PATH):
        return LOCAL_MODEL_PATH
    return MODEL_SIZE


def _build_model() -> WhisperModel:
    logger.info("Loading fast CPU Whisper model from %s", _model_ref())
    cpu_threads = min(8, os.cpu_count() or 4)
    return WhisperModel(
        _model_ref(),
        device="cpu",
        compute_type="int8",
        cpu_threads=cpu_threads,
    )


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
    except ImportError as exc:
        raise RuntimeError("ffmpeg is required to decode browser WebM recordings.") from exc


def _prepare_audio_path(raw_path: str, suffix: str) -> str:
    if suffix.lower() in {".wav", ".wave"}:
        return raw_path

    wav_path = raw_path + ".wav"
    ffmpeg = _ffmpeg_exe()
    result = subprocess.run(
        [ffmpeg, "-y", "-i", raw_path, "-ar", "16000", "-ac", "1", wav_path],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"Could not decode audio ({suffix}): {result.stderr[-500:]}")
    os.remove(raw_path)
    return wav_path


def transcribe_audio_bytes(audio_bytes: bytes, filename_hint: str = "audio.wav") -> dict:
    suffix = os.path.splitext(filename_hint)[1] or ".wav"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        audio_path = _prepare_audio_path(tmp_path, suffix)
        return _transcribe_file(audio_path)
    finally:
        for path in {tmp_path, tmp_path + ".wav"}:
            if os.path.exists(path):
                try:
                    os.remove(path)
                except OSError:
                    pass


def _transcribe_file(audio_path: str) -> dict:
    model = get_model()
    segments, info = model.transcribe(
        audio_path,
        beam_size=1,
        best_of=1,
        vad_filter=True,
    )
    text = " ".join(segment.text.strip() for segment in segments).strip()
    return {
        "text": text,
        "detected_language": info.language,
        "language_probability": round(info.language_probability, 3),
    }
