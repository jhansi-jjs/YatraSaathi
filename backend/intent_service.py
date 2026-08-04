"""
intent_service.py

Dynamic NLU & Entity Extraction Engine for Yatra Saathi.
Extracts origin, destination, date, and intent from natural speech in 12 Indian languages.
No hardcoded defaults.
"""

import json
import os
import re
import datetime
from language_service import get_language_name, LANGUAGES

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
    # Visakhapatnam
    "visakhapatnam": "Visakhapatnam", "vizag": "Visakhapatnam", "visakha": "Visakhapatnam", "visag": "Visakhapatnam", "vizakhapatnam": "Visakhapatnam", "vishakhapatnam": "Visakhapatnam", "vishakapatnam": "Visakhapatnam",
    "వైజాగ్": "Visakhapatnam", "విశాఖపట్నం": "Visakhapatnam", "विशाखापट्टनम": "Visakhapatnam",
    "விசாகப்பட்டினம்": "Visakhapatnam", "ವಿಶಾಖಪಟ್ಟಣ": "Visakhapatnam", "വിശാഖപട്ടണം": "Visakhapatnam",
    "વિશાખાપટ્ટનમ": "Visakhapatnam", "విశాఖ": "Visakhapatnam",

    # Hyderabad
    "hyderabad": "Hyderabad", "hyd": "Hyderabad", "హైదరాబాద్": "Hyderabad", "హైదరాబాదు": "Hyderabad",
    "हैदराबाद": "Hyderabad", "ஹைதராபாத்": "Hyderabad", "ಹೈದರಾಬಾದ್": "Hyderabad", "ഹൈദരാബാദ്": "Hyderabad",
    "હૈદરાબાદ": "Hyderabad", "হায়দ্রাবাদ": "Hyderabad", "حیدرآباد": "Hyderabad",

    # Vijayawada
    "vijayawada": "Vijayawada", "vja": "Vijayawada", "bezawada": "Vijayawada",
    "విజయవాడ": "Vijayawada", "బెజవాడ": "Vijayawada", "विजयवाड़ा": "Vijayawada", "விஜயவாடா": "Vijayawada",
    "ವಿಜಯವಾಡ": "Vijayawada", "വിജയവാഡ": "Vijayawada", "વિજયવાડા": "Vijayawada",

    # Chennai
    "chennai": "Chennai", "madras": "Chennai", "చెన్నై": "Chennai", "మద్రాస్": "Chennai",
    "चेन्नई": "Chennai", "मद्रास": "Chennai", "சென்னை": "Chennai", "மதராஸ்": "Chennai",
    "ಚೆನ್ನೈ": "Chennai", "ചെന്നൈ": "Chennai", "ચેન્નઈ": "Chennai",

    # Bengaluru
    "bengaluru": "Bengaluru", "bangalore": "Bengaluru", "banglore": "Bengaluru", "blr": "Bengaluru",
    "బెంగళూరు": "Bengaluru", "బెంగుళూరు": "Bengaluru", "बेंगलुरु": "Bengaluru", "बैंगलोर": "Bengaluru",
    "பெங்களூரு": "Bengaluru", "ಬೆಂಗಳೂರು": "Bengaluru", "ബംഗളൂരു": "Bengaluru", "બેંગલુરુ": "Bengaluru",

    # Tirupati
    "tirupati": "Tirupati", "తిరుపతి": "Tirupati", "तिरुपति": "Tirupati", "திருப்பதி": "Tirupati",
    "ತಿರುಪತಿ": "Tirupati", "തിരുപ്പതി": "Tirupati", "તિરુપતિ": "Tirupati",

    # Guntur
    "guntur": "Guntur", "గుంటూరు": "Guntur", "गुंटूर": "Guntur", "குண்டூர்": "Guntur",
    "ಗುಂಟೂರು": "Guntur", "ഗുണ്ടൂർ": "Guntur", "ગુંટૂર": "Guntur",

    # Rajahmundry
    "rajahmundry": "Rajahmundry", "rajahmundri": "Rajahmundry", "రాజమండ్రి": "Rajahmundry",
    "राजमुंदरी": "Rajahmundry", "ராஜமுந்திரி": "Rajahmundry", "ರಾಜಮಂಡ್ರಿ": "Rajahmundry",
    "രാജമണ്ഡ്രി": "Rajahmundry", "રાજામુંડરી": "Rajahmundry",

    # Kakinada
    "kakinada": "Kakinada", "కాకినాడ": "Kakinada", "काकीनाडा": "Kakinada", "காக்கிநாடா": "Kakinada",
    "ಕಾಕಿನಾಡ": "Kakinada", "കാക്കിനട": "Kakinada", "કાકીનાડા": "Kakinada",

    # Nellore
    "nellore": "Nellore", "నెల్లూరు": "Nellore", "नेल्लोर": "Nellore", "நெல்லூர்": "Nellore",
    "ನೆಲ್ಲೂರು": "Nellore", "നെല്ലൂർ": "Nellore", "નેલ્લોર": "Nellore",

    # Kurnool
    "kurnool": "Kurnool", "కర్నూలు": "Kurnool", "कुर्नूल": "Kurnool", "கர்நூல்": "Kurnool",
    "ಕರ್ನೂಲು": "Kurnool", "കർണൂൽ": "Kurnool", "કુર્નૂલ": "Kurnool",

    # Anantapur
    "anantapur": "Anantapur", "అనంతపురం": "Anantapur", "अनंतपुर": "Anantapur", "அனந்தபூர்": "Anantapur",
    "ಅನಂತಪುರ": "Anantapur", "അനന്തപൂർ": "Anantapur", "અનંતપુર": "Anantapur",

    # Warangal
    "warangal": "Warangal", "వరంగల్": "Warangal", "वरंगल": "Warangal", "வரங்கல்": "Warangal",
    "ವರಂಗಲ್": "Warangal", "വരംഗൽ": "Warangal", "વરંગલ": "Warangal",

    # Karimnagar
    "karimnagar": "Karimnagar", "కరీంనగర్": "Karimnagar", "करीमनगर": "Karimnagar", "கரீம்நகர்": "Karimnagar",
    "ಕರೀಂನಗರ": "Karimnagar", "കരീംനഗർ": "Karimnagar", "કરીમનગર": "Karimnagar",

    # Mumbai
    "mumbai": "Mumbai", "bombay": "Mumbai", "ముంబై": "Mumbai", "బొంబాయి": "Mumbai",
    "मुंबई": "Mumbai", "बंबई": "Mumbai", "மும்பை": "Mumbai", "ಮುಂಬೈ": "Mumbai",
    "മുംബൈ": "Mumbai", "મુંબઈ": "Mumbai",

    # Pune
    "pune": "Pune", "పుణే": "Pune", "పూనే": "Pune", "पुणे": "Pune",
    "புனே": "Pune", "పుಣೆ": "Pune", "പുനെ": "Pune", "પુણે": "Pune",

    # Delhi
    "delhi": "Delhi", "dilli": "Delhi", "ఢిల్లీ": "Delhi", "ఢిల్లి": "Delhi",
    "दिल्ली": "Delhi", "दिल्लि": "Delhi", "டெல்லி": "Delhi", "ದೆಹಲಿ": "Delhi",
    "ഡൽഹി": "Delhi", "દિલ્હી": "Delhi",

    # Kolkata
    "kolkata": "Kolkata", "calcutta": "Kolkata", "కోల్‌కతా": "Kolkata", "కలకత్తా": "Kolkata",
    "कोलकाता": "Kolkata", "कलकत्ता": "Kolkata", "கொல்கத்தா": "Kolkata", "କୋଲକାତା": "Kolkata",
    "കൊൽക്കത്ത": "Kolkata", "કોલકાતા": "Kolkata",

    # Kochi
    "kochi": "Kochi", "cochin": "Kochi", "కొచ్చి": "Kochi", "కోచి": "Kochi",
    "कोच्चि": "Kochi", "कोचीन": "Kochi", "கொச்சி": "Kochi", "కొచ్చి": "Kochi",
    "കൊച്ചി": "Kochi", "કોચી": "Kochi",

    # Coimbatore
    "coimbatore": "Coimbatore", "కోయంబత్తూర్": "Coimbatore", "कोयंबटूर": "Coimbatore",
    "கோயம்புத்தூர்": "Coimbatore", "ಕೊಯಮತ್ತೂರು": "Coimbatore", "കോയമ്പത്തൂർ": "Coimbatore",
    "કોઈમ્બતૂર": "Coimbatore",

    # Madurai
    "madurai": "Madurai", "మదురై": "Madurai", "मदुराइ": "Madurai", "मदुरै": "Madurai",
    "மதுரை": "Madurai", "ಮಧುರೈ": "Madurai", "മധുര": "Madurai", "મદુરાઈ": "Madurai",

    # Mysuru
    "mysuru": "Mysuru", "mysore": "Mysuru", "మైసూరు": "Mysuru", "మైసూర్": "Mysuru",
    "मैसूरु": "Mysuru", "मैसूर": "Mysuru", "மைசூரு": "Mysuru", "ಮೈಸೂರು": "Mysuru",
    "മൈസൂരു": "Mysuru", "મૈસુરુ": "Mysuru",
}

LANGUAGE_KEYWORD_MAP = {
    "telugu": "te", "తెలుగు": "te",
    "hindi": "hi", "हिंदी": "hi", "हिन्दी": "hi",
    "tamil": "ta", "தமிழ்": "ta",
    "kannada": "kn", "ಕನ್ನಡ": "kn",
    "malayalam": "ml", "മലയാളം": "ml",
    "marathi": "mr", "मराठी": "mr",
    "gujarati": "gu", "ગુજરાતી": "gu",
    "bengali": "bn", "বাংলা": "bn",
    "urdu": "ur", "اردو": "ur",
    "punjabi": "pa", "ਪੰਜਾਬੀ": "pa",
    "english": "en",
}

CLARIFICATIONS = {
    "te": "దయచేసి మీరు ఏ నగరం నుండి ఏ నగరానికి వెళ్లాలనుకుంటున్నారో చెప్పండి (ఉదా: కొచ్చి నుండి వరంగల్).",
    "hi": "कृपया प्रस्थान और गंतव्य शहर बताएं (जैसे: कोच्चि से वारंगल)।",
    "ta": "தயவுசெய்து நீங்கள் புறப்படும் மற்றும் செல்லும் நகரத்தைக் கூறுங்கள்.",
    "kn": "ದಯವಿಟ್ಟು ಹೊರಡುವ ಮತ್ತು ತಲುಪುವ ನಗರವನ್ನು ತಿಳಿಸಿ.",
    "ml": "ദയവായി പുറപ്പെടുന്ന നഗരവും എത്തുന്ന നഗരവും പറയുക (ഉദാ: കൊച്ചിയിൽ നിന്ന് വരംഗലിലേക്ക്).",
    "mr": "कृपया प्रस्थान आणि गंतव्य शहर सांगा.",
    "gu": "કૃપા કરીને ઉપડવાનું અને પહોંચવાનું શહેર જણાવો.",
    "bn": "অনুগ্রহ করে যাত্রার শহর এবং গন্তব্য জানান।",
    "ur": "براہ کرم روانگی کا شہر اور منزل بتائیں۔",
    "pa": "ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਅਤੇ ਪਹੁੰਚਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ।",
    "or": "ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ଏବଂ ଗନ୍ତବ୍ୟ ସହର କୁହନ୍ତୁ।",
    "en": "Please specify your origin and destination cities (e.g., Kochi to Warangal).",
}

def _levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        return _levenshtein(b, a)
    if len(b) == 0:
        return len(a)
    previous_row = range(len(b) + 1)
    for i, c1 in enumerate(a):
        current_row = [i + 1]
        for j, c2 in enumerate(b):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]


def _local_intent_extraction(transcript: str, selected_lang: str | None, detected_lang: str | None) -> dict:
    text_lower = transcript.lower().strip()
    lang = selected_lang or detected_lang or "en"

    # Script auto-detection
    if re.search(r'[\u0C00-\u0C7F]', transcript):
        lang = "te"
    elif re.search(r'[\u0900-\u097F]', transcript):
        lang = "hi"
    elif re.search(r'[\u0B80-\u0BFF]', transcript):
        lang = "ta"
    elif re.search(r'[\u0C80-\u0CFF]', transcript):
        lang = "kn"
    elif re.search(r'[\u0D00-\u0D7F]', transcript):
        lang = "ml"
    elif re.search(r'[\u0A80-\u0AFF]', transcript):
        lang = "gu"

    for kw, lcode in LANGUAGE_KEYWORD_MAP.items():
        if kw in text_lower:
            lang = lcode
            break

    found_cities = []
    for word, city in CITY_ALIASES.items():
        if word.lower() in text_lower and city not in found_cities:
            found_cities.append(city)

    # Fuzzy fallback for phonetics
    if not found_cities:
        tokens = text_lower.split()
        for token in tokens:
            if len(token) < 3:
                continue
            for word, city in CITY_ALIASES.items():
                if _levenshtein(token, word) <= 2 and city not in found_cities:
                    found_cities.append(city)
                    break

    origin = None
    destination = None

    if len(found_cities) >= 2:
        origin = found_cities[0]
        destination = found_cities[1]
    elif len(found_cities) == 1:
        destination = found_cities[0]

    today_str = datetime.date.today().isoformat()
    tomorrow_str = (datetime.date.today() + datetime.timedelta(days=1)).isoformat()
    date_val = today_str
    if any(k in text_lower for k in ["tomorrow", "రేపు", "कल", "நாளை", "ನಾಳೆ", "നാളെ", "ഉद्या"]):
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
    local_intent = _local_intent_extraction(transcript, user_selected_language, detected_language_hint)
    
    if local_intent.get("origin") and local_intent.get("destination"):
        return local_intent

    if genai and GEMINI_KEY:
        try:
            lang = user_selected_language or detected_language_hint or "en"
            model = genai.GenerativeModel(
                MODEL,
                generation_config={"response_mime_type": "application/json"},
            )
            prompt = f"""
            Extract bus travel intent from natural speech: "{transcript}".
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

    if lang == "te":
        return f"సరే! మీరు {origin} నుండి {destination}కు ప్రయాణించాలనుకుంటున్నారు. అందుబాటులో ఉన్న బస్సులను చూపిస్తున్నాను."
    elif lang == "hi":
        return f"ठीक है! हम आपको {origin} से {destination} जाने वाली बसें दिखा रहे हैं।"
    elif lang == "ta":
        return f"சரி! நாங்கள் உங்களுக்கு {origin} இலிருந்து {destination} செல்லும் பேருந்துகளைக் காட்டுகிறோம்."
    elif lang == "kn":
        return f"ಸರಿ! ನಾವು ನಿಮಗೆ {origin} ದಿಂದ {destination} ಗೆ ಹೋಗುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ."
    elif lang == "ml":
        return f"ശരി! ഞങ്ങൾ നിങ്ങൾക്ക് {origin} ൽ നിന്ന് {destination} ലേക്ക് പോകുന്ന ബസുകൾ കാണിക്കുന്നു."
    elif lang == "mr":
        return f"ठीक आहे! आम्ही तुम्हाला {origin} ते {destination} जाणाऱ्या बसेस दाखवत आहोत."
    elif lang == "gu":
        return f"બરાબર! અમે તમને {origin} થી {destination} જતી બસો બતાવી રહ્યા છીએ."
    elif lang == "bn":
        return f"ঠিক আছে! আমরা আপনাকে {origin} থেকে {destination} যাওয়ার বাসগুলো দেখাচ্ছি।"
    elif lang == "ur":
        return f"ٹھیک ہے! ہم آپ کو {origin} سے {destination} جانے والی بسیں دکھا رہے ہیں۔"
    elif lang == "pa":
        return f"ਠੀਕ ਹੈ! ਅਸੀਂ ਤੁਹਾਨੂੰ {origin} ਤੋਂ {destination} ਜਾਣ ਵਾਲੀਆਂ ਬੱਸਾਂ ਦਿਖਾ ਰਹੇ ਹਾਂ।"
    elif lang == "or":
        return f"ଠିକ୍ ଅଛି! ଆମେ ଆପଣଙ୍କୁ {origin} ରୁ {destination} ଯାଉଥିବା ବସ୍ ଦେଖାଉଛୁ।"

    return f"Great! Showing you buses from {origin} to {destination}."