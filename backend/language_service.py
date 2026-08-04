"""
language_service.py

Central config for the 22 scheduled Indian languages.

Honesty note: not every language listed here has a real TTS voice
available anywhere yet (this is true industry-wide, not a gap specific
to this project). `tts_voice` is None for languages without production
voice support -- the app should fall back to text-only display for those,
with a clear message to the user, rather than silently failing or faking it.

edge-tts voice names below are current as of this writing; verify with
`edge-tts --list-voices` since Microsoft adds new ones periodically --
worth rerunning that check before your actual demo/launch.
"""

LANGUAGES = {
    "hi": {"name": "Hindi", "native_name": "हिन्दी", "tts_voice": "hi-IN-SwaraNeural"},
    "te": {"name": "Telugu", "native_name": "తెలుగు", "tts_voice": "te-IN-ShrutiNeural"},
    "ta": {"name": "Tamil", "native_name": "தமிழ்", "tts_voice": "ta-IN-PallaviNeural"},
    "kn": {"name": "Kannada", "native_name": "ಕನ್ನಡ", "tts_voice": "kn-IN-SapnaNeural"},
    "ml": {"name": "Malayalam", "native_name": "മലയാളം", "tts_voice": "ml-IN-SobhanaNeural"},
    "mr": {"name": "Marathi", "native_name": "मराठी", "tts_voice": "mr-IN-AarohiNeural"},
    "gu": {"name": "Gujarati", "native_name": "ગુજરાતી", "tts_voice": "gu-IN-DhwaniNeural"},
    "bn": {"name": "Bengali", "native_name": "বাংলা", "tts_voice": "bn-IN-TanishaaNeural"},
    "ur": {"name": "Urdu", "native_name": "اردو", "tts_voice": "ur-IN-GulNeural"},
    "en": {"name": "English", "native_name": "English", "tts_voice": "en-IN-NeerjaNeural"},
    "pa": {"name": "Punjabi", "native_name": "ਪੰਜਾਬੀ", "tts_voice": None},
    "or": {"name": "Odia", "native_name": "ଓଡ଼ିଆ", "tts_voice": None},
    "as": {"name": "Assamese", "native_name": "অসমীয়া", "tts_voice": None},
    "ne": {"name": "Nepali", "native_name": "नेपाली", "tts_voice": "ne-NP-HemkalaNeural"},
    "sa": {"name": "Sanskrit", "native_name": "संस्कृतम्", "tts_voice": None},
    "kok": {"name": "Konkani", "native_name": "कोंकणी", "tts_voice": None},
    "ks": {"name": "Kashmiri", "native_name": "कॉशुर", "tts_voice": None},
    "mni": {"name": "Manipuri", "native_name": "ꯃꯤꯇꯩꯂꯣꯟ", "tts_voice": None},
    "brx": {"name": "Bodo", "native_name": "बड़ो", "tts_voice": None},
    "doi": {"name": "Dogri", "native_name": "डोगरी", "tts_voice": None},
    "mai": {"name": "Maithili", "native_name": "मैथिली", "tts_voice": None},
    "sd": {"name": "Sindhi", "native_name": "سنڌي", "tts_voice": None},
    "sat": {"name": "Santali", "native_name": "ᱥᱟᱱᱛᱟᱲᱤ", "tts_voice": None},
}


# The 12 languages the app actually supports end to end (UI translations + STT + NLU).
# MUST stay in step with SUPPORTED_LANGUAGES in src/lib/languages.ts — the frontend no
# longer builds its language picker from this endpoint (that is exactly how the two
# sets drifted apart), but /languages should still not advertise languages the app
# cannot handle.
SUPPORTED_CODES_FRONTEND = ["en", "te", "hi", "ta", "kn", "ml", "mr", "gu", "bn", "ur", "pa", "or"]


def get_language_list() -> list[dict]:
    """For diagnostics and parity checks: code, name, native_name, voice_available."""
    return [
        {
            "code": code,
            "name": LANGUAGES[code]["name"],
            "native_name": LANGUAGES[code]["native_name"],
            "voice_available": LANGUAGES[code]["tts_voice"] is not None,
        }
        for code in SUPPORTED_CODES_FRONTEND
        if code in LANGUAGES
    ]


def get_tts_voice(language_code: str) -> str | None:
    return LANGUAGES.get(language_code, {}).get("tts_voice")


def get_language_name(language_code: str) -> str:
    return LANGUAGES.get(language_code, {}).get("name", "English")
