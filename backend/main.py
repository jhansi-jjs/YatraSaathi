"""
main.py

FastAPI app: voice/text -> intent extraction -> spoken confirmation.
"""

import os
import asyncio
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from fastapi.concurrency import run_in_threadpool
from pydantic import BaseModel

_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")
os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")

from voice_service import transcribe_audio_bytes, get_model
from intent_service import extract_bus_intent, generate_confirmation
from tts_service import synthesize_speech
from language_service import get_language_list

app = FastAPI(title="Bharat Bus Voice Assistant")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    # Pre-warm Whisper model in background thread on server start
    asyncio.create_task(run_in_threadpool(get_model))


class TextSearchRequest(BaseModel):
    text: str
    language_hint: str | None = None
    selected_language: str | None = None
    valid_cities: list[str] | None = None


class TTSRequest(BaseModel):
    text: str
    language: str


@app.get("/languages")
async def languages():
    return {"languages": get_language_list()}


@app.post("/tts")
async def tts(req: TTSRequest):
    audio_bytes = await synthesize_speech(req.text, req.language)
    if audio_bytes is None:
        return Response(status_code=204)
    return Response(content=audio_bytes, media_type="audio/mpeg")


@app.post("/voice-search")
async def voice_search(
    audio: UploadFile = File(...),
    selected_language: str | None = Form(None),
    valid_cities: str | None = Form(None),
):
    audio_bytes = await audio.read()
    cities = valid_cities.split(",") if valid_cities else None

    try:
        transcription = await run_in_threadpool(
            transcribe_audio_bytes, audio_bytes, filename_hint=audio.filename or "audio.webm"
        )
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Speech recognition failed: {exc}") from exc

    if not transcription.get("text"):
        raise HTTPException(
            status_code=422,
            detail="Could not hear anything in the recording. Try speaking closer to the mic.",
        )

    intent = await run_in_threadpool(
        extract_bus_intent,
        transcription["text"],
        transcription["detected_language"],
        selected_language,
        cities,
    )

    return await _resolve_intent(transcription["text"], intent)


@app.post("/text-search")
async def text_search(req: TextSearchRequest):
    intent = await run_in_threadpool(
        extract_bus_intent,
        req.text,
        req.language_hint,
        req.selected_language,
        req.valid_cities,
    )
    return await _resolve_intent(req.text, intent)


async def _resolve_intent(transcript: str, intent: dict) -> dict:
    if intent.get("clarification_needed"):
        return {
            "transcript": transcript,
            "intent": intent,
            "spoken_text": intent["clarification_needed"],
            "needs_clarification": True,
            "ready_to_search": False,
        }

    confirmation = await run_in_threadpool(generate_confirmation, intent)
    return {
        "transcript": transcript,
        "intent": intent,
        "spoken_text": confirmation,
        "needs_clarification": False,
        "ready_to_search": True,
    }


@app.get("/health")
async def health():
    return {"status": "ok"}