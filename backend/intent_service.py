"""
intent_service.py

Turns a raw transcript into a structured bus-search intent.
Uses Google Gemini API when available, with a fast local regex fallback
if GEMINI_API_KEY is missing or the network call fails.
"""

import json
import os
import re
import datetime
from language_service import get_language_name, LANGUAGES

# Attempt Gemini configuration if key exists
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()
genai = None
if GEMINI_KEY:
    try:
        import google.generativeai as genai_module
        genai_module.configure(api_key=GEMINI_KEY)
        genai = genai_module
    except Exception:
        genai = None

MODEL = "gemini-1.5-flash"
SUPPORTED_CODES = ", ".join(LANGUAGES.keys())

CITY_ALIASES = {
    "vizag": "Visakhapatnam",
    "visakha": "Visakhapatnam",
    "visakhapatnam": "Visakhapatnam",
    "hyd": "Hyderabad",
    "hyderabad": "Hyderabad",
    "vja": "Vijayawada",
    "vijayawada": "Vijayawada",
    "bezawada": "Vijayawada",
    "chennai": "Chennai",
    "madras": "Chennai",
    "blr": "Bengaluru",
    "bangalore": "Bengaluru",
    "bengaluru": "Bengaluru",
    "tirupati": "Tirupati",
    "guntur": "Guntur",
    "rajahmundry": "Rajahmundry",
    "rajahmundri": "Rajahmundry",
    "kakinada": "Kakinada",
    "nellore": "Nellore",
    "kurnool": "Kurnool",
    "anantapur": "Anantapur",
    "warangal": "Warangal",
    "karimnagar": "Karimnagar",
    "mumbai": "Mumbai",
    "bombay": "Mumbai",
    "pune": "Pune",
    "delhi": "Delhi",
    "dilli": "Delhi",
    "kolkata": "Kolkata",
    "calcutta": "Kolkata",
    "kochi": "Kochi",
    "cochin": "Kochi",
    "coimbatore": "Coimbatore",
    "madurai": "Madurai",
    "mysuru": "Mysuru",
    "mysore": "Mysuru",
}

LANGUAGE_KEYWORD_MAP = {
    "telugu": "te",
    "తెలుగు": "te",
    "hindi": "hi",
    "हिंदी": "hi",
    "हिन्दी": "hi",
    "tamil": "ta",
    "தமிழ்": "ta",
    "kannada": "kn",
    "ಕನ್ನಡ": "kn",
    "malayalam": "ml",
    "മലയാളം": "ml",
    "marathi": "mr",
    "मराठी": "mr",
    "gujarati": "gu",
    "ગુજરાતી": "gu",
    "bengali": "bn",
    "বাংলা": "bn",
    "urdu": "ur",
    "اردو": "ur",
    "punjabi": "pa",
    "ਪੰਜਾਬੀ": "pa",
    "english": "en",
}

CLARIFICATIONS = {
    "te": "దయచేసి మీరు బయలుదేరే నగరం మరియు చేరుకునే నగరాన్ని చెప్పండి. (ఉదా: విశాఖపట్నం నుండి హైదరాబాద్)",
    "hi": "कृपया बताएं कि आप किस शहर से किस शहर जाना चाहते हैं। (जैसे: दिल्ली से जयपुर)",
    "ta": "தயவுசெய்து நீங்கள் புறப்படும் மற்றும் செல்லும் நகரத்தைக் கூறுங்கள்.",
    "kn": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಪ್ರಯಾಣದ ಆರಂಭಿಕ ಮತ್ತು ತಲುಪುವ ನಗರವನ್ನು ತಿಳಿಸಿ.",
    "ml": "ദയവായി താങ്കളുടെ യാത്ര പുറപ്പെടുന്ന നഗരവും എത്തുന്ന നഗരവും പറയുക.",
    "mr": "कृपया तुमचे प्रस्थान आणि गंतव्य शहर सांगा.",
    "gu": "કૃપા કરીને તમારું ઉપડવાનું અને પહોંચવાનું શહેર જણાવો.",
    "bn": "অনুগ্রহ করে আপনার যাত্রার শহর এবং গন্তব্য জানান।",
    "ur": "براہ کرم اپنا روانگی کا شہر اور منزل بتائیں۔",
    "en": "Please specify your departure city and destination city. (e.g. Hyderabad to Vijayawada)",
}


def _local_intent_extraction(transcript: str, selected_lang: str | None, detected_lang: str | None) -> dict:
    text_lower = transcript.lower()
    lang = selected_lang or detected_lang or "en"

    # Check for explicit language switch request in voice transcript
    for kw, lcode in LANGUAGE_KEYWORD_MAP.items():
        if f"change language to {kw}" in text_lower or f"switch to {kw}" in text_lower or f"speak in {kw}" in text_lower or kw in text_lower:
            if "language" in text_lower or "भाषा" in text_lower or "భాష" in text_lower or "switch" in text_lower:
                lang = lcode

    found_cities = []
    for word, city in CITY_ALIASES.items():
        if re.search(r'\b' + re.escape(word) + r'\b', text_lower):
            if city not in found_cities:
                found_cities.append(city)

    origin = None
    destination = None

    if len(found_cities) >= 2:
        origin = found_cities[0]
        destination = found_cities[1]
    elif len(found_cities) == 1:
        destination = found_cities[0]

    # Date parsing
    today_str = datetime.date.today().isoformat()
    tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    date_val = today_str
    if "tomorrow" in text_lower or "రేపు" in text_lower or "कल" in text_lower or "நாளை" in text_lower or "ನಾಳೆ" in text_lower:
        date_val = tomorrow_str

    clarification = None
    if not origin or not destination:
        clarification = CLARIFICATIONS.get(lang, CLARIFICATIONS["en"])

    return {
        "origin": origin,
        "destination": destination,
        "date": date_val,
        "language": lang,
        "confidence": "high" if (origin and destination) else "medium",
        "clarification_needed": clarification,
    }


def extract_bus_intent(
    transcript: str,
    detected_language_hint: str | None = None,
    user_selected_language: str | None = None,
    valid_cities: list[str] | None = None,
) -> dict:
    # Perform fast local extraction immediately
    local_intent = _local_intent_extraction(transcript, user_selected_language, detected_language_hint)
    
    # If local extraction found origin + destination, return instantly for 0.01s speed!
    if local_intent.get("origin") and local_intent.get("destination"):
        return local_intent

    # Otherwise try Gemini if key exists
    if genai and GEMINI_KEY:
        try:
            lang = user_selected_language or detected_language_hint or "en"
            model = genai.GenerativeModel(
                MODEL,
                generation_config={"response_mime_type": "application/json"},
            )
            prompt = f"""
            Extract bus search intent from transcript: "{transcript}".
            Languages: {SUPPORTED_CODES}.
            Return JSON:
            {{
              "origin": string or null,
              "destination": string or null,
              "date": string or null,
              "language": "{lang}",
              "confidence": "high" | "medium" | "low",
              "clarification_needed": string or null
            }}
            """
            res = model.generate_content(prompt)
            raw = res.text.strip()
            if raw.startswith("```"):
                raw = raw.strip("`")
                if raw.startswith("json"):
                    raw = raw[4:].strip()
            parsed = json.loads(raw)
            if user_selected_language:
                parsed["language"] = user_selected_language
            return parsed
        except Exception:
            pass

    return local_intent


def generate_confirmation(intent: dict) -> str:
    lang = intent.get("language", "en")
    origin = intent.get("origin", "")
    destination = intent.get("destination", "")
    date_val = intent.get("date", "today")

    if lang == "te":
        return f"{origin} నుండి {destination} కు ప్రయాణించే బస్సుల వివరాలు చూపిస్తున్నాము."
    elif lang == "hi":
        return f"{origin} से {destination} के लिए बसें खोजी जा रही हैं।"
    elif lang == "ta":
        return f"{origin} முதல் {destination} வரையிலான பேருந்துகளைத் தேடுகிறோம்."
    elif lang == "kn":
        return f"{origin} ದಿಂದ {destination} ಗೆ ಬಸ್‌ಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇವೆ."
    elif lang == "ml":
        return f"{origin} ൽ നിന്ന് {destination} ലേക്കുള്ള ബസുകൾ കാണിക്കുന്നു."
    elif lang == "mr":
        return f"{origin} ते {destination} साठी बस शोधत आहोत."
    elif lang == "gu":
        return f"{origin} થી {destination} માટેની બસો શોધી રહ્યા છીએ."
    elif lang == "bn":
        return f"{origin} থেকে {destination} এর জন্য বাস খোঁজা হচ্ছে।"
    elif lang == "ur":
        return f"{origin} سے {destination} کے لیے بسیں تلاش کی جا رہی ہیں۔"

    return f"Searching buses from {origin} to {destination}."