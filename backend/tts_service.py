"""
tts_service.py

Text-to-speech using edge-tts (free, Microsoft Edge's voice engine,
good Indian-language coverage). Runs on CPU/network -- no GPU needed
for this step, your 4050 is free for Whisper.

Returns raw MP3 bytes that the frontend plays directly in an <audio> tag.
"""

import edge_tts
import io
from language_service import get_tts_voice


async def synthesize_speech(text: str, language_code: str) -> bytes | None:
    """
    Returns MP3 bytes, or None if this language has no available voice
    (caller should fall back to text-only display in that case).
    """
    voice = get_tts_voice(language_code)
    if not voice or not text:
        return None

    communicate = edge_tts.Communicate(text, voice)
    buffer = io.BytesIO()

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buffer.write(chunk["data"])

    buffer.seek(0)
    return buffer.read()
