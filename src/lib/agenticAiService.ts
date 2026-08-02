import { CITY_ALIASES } from '../components/VoiceSearchBar';
import { CITIES } from '../components/SearchForm';
import { computeBreakJourneyRoutes, BreakJourneyRoute } from './breakJourneyService';
import { CITY_TRANSLATIONS } from '../context/LanguageContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  language?: string;
  actionChips?: string[];
  results?: any[];
  breakRoutes?: BreakJourneyRoute[];
}

export interface ConversationState {
  origin: string | null;
  destination: string | null;
  date: string | null;
  time: string | null;
  busType: string | null;
  seatType: string | null;
  maxBudget: number | null;
  language: string;
  step: 'origin' | 'destination' | 'date' | 'preferences' | 'complete';
  confidence: 'high' | 'medium' | 'low';
}

export interface StructuredAiIntent {
  language: string;
  source: string | null;
  destination: string | null;
  date: string | null;
  time: string | null;
  seat_type: string | null;
  bus_type: string | null;
  budget: string | null;
  confidence: number;
}

const BOARDING_POINTS: Record<string, string[]> = {
  Visakhapatnam: ['RTC Complex', 'Maddilapalem', 'Gajuwaka', 'NAD Junction'],
  Hyderabad: ['MGBS', 'Lakdikapul', 'Ameerpet', 'Kukatpally', 'Gachibowli'],
  Vijayawada: ['Pandit Nehru Bus Station (PNBS)', 'Benz Circle', 'Ramavarappadu'],
  Bengaluru: ['Majestic (BSK)', 'Shantinagar', 'KBS', 'Silk Board', 'Electronic City'],
  Chennai: ['Koyambedu (CMBT)', 'Tambaram', 'Guindy', 'Ashok Nagar'],
  Tirupati: ['RTC Bus Stand', 'Alipiri', 'Tirumala Bypass'],
};

// Levenshtein distance for fuzzy speech-to-text error correction
export function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

export function detectLanguageFromText(text: string, currentLang: string): string {
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta';
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn';
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml';
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu';
  if (/[\u0980-\u09FF]/.test(text)) return 'bn';
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa';
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or';

  const lower = text.toLowerCase();
  if (lower.includes('nenu') || lower.includes('nundi') || lower.includes('nunchi') || lower.includes('vellali')) return 'te';
  if (lower.includes('mujhe') || lower.includes('jana hai') || lower.includes('se') || lower.includes('tak')) return 'hi';
  if (lower.includes('enikku') || lower.includes('ninnu') || lower.includes('pokanam')) return 'ml';
  if (lower.includes('enakku') || lower.includes('irundhu') || lower.includes('poganum')) return 'ta';
  if (lower.includes('nanage') || lower.includes('hoga') || lower.includes('beku')) return 'kn';

  return currentLang;
}

// RapidFuzz & N-Gram City Normalizer matching strictly against CITIES dropdown dataset
export function extractCitiesFromInput(text: string): { cities: string[]; confidence: 'high' | 'medium' | 'low'; lowConfCity?: string } {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/[\s,.-]+/);
  const found: string[] = [];

  // 1. Check exact multi-script aliases (e.g. "వైజాగ్", "vijayawada", "bezawada", "vja")
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias.toLowerCase()) && !found.includes(canonical)) {
      found.push(canonical);
    }
  }

  // 2. Check canonical dropdown city names directly
  for (const canonical of CITIES) {
    if (lower.includes(canonical.toLowerCase()) && !found.includes(canonical)) {
      found.push(canonical);
    }
  }

  // 3. Multi-word N-Gram combinations (e.g., "vijay wada" -> Vijayawada, "visakha patnam" -> Visakhapatnam)
  for (let i = 0; i < words.length - 1; i++) {
    const bigram = `${words[i]}${words[i + 1]}`;
    const bigramSpaced = `${words[i]} ${words[i + 1]}`;
    for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
      if ((alias.toLowerCase() === bigram || alias.toLowerCase() === bigramSpaced) && !found.includes(canonical)) {
        found.push(canonical);
      }
    }
    for (const canonical of CITIES) {
      if (canonical.toLowerCase().replace(/\s+/g, '') === bigram && !found.includes(canonical)) {
        found.push(canonical);
      }
    }
  }

  // 4. Fuzzy Levenshtein phonetic matching for STT mishearings (e.g., "third" / "vijawada" -> Vijayawada)
  let lowConfCity: string | undefined = undefined;
  let confidence: 'high' | 'medium' | 'low' = found.length >= 2 ? 'high' : found.length === 1 ? 'medium' : 'low';

  if (found.length === 0) {
    for (const word of words) {
      if (word.length < 3) continue;
      for (const canonical of CITIES) {
        const dist = levenshteinDistance(word, canonical.toLowerCase());
        if (dist <= 2 && !found.includes(canonical)) {
          found.push(canonical);
          confidence = 'medium';
          break;
        } else if (dist === 3 && !lowConfCity) {
          lowConfCity = canonical;
          confidence = 'low';
        }
      }
    }
  }

  return { cities: found, confidence, lowConfCity };
}

// Continuous natural sentence entity extraction for Time, Bus Type & Seat Type
export function extractContinuousPreferences(text: string): {
  date: string;
  time: string | null;
  busType: string | null;
  seatType: string | null;
} {
  const lower = text.toLowerCase();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  let date = today;
  if (
    lower.includes('tomorrow') ||
    lower.includes('రేపు') ||
    lower.includes('कल') ||
    lower.includes('நாளை') ||
    lower.includes('ನಾಳೆ') ||
    lower.includes('നാളെ') ||
    lower.includes('उद्या') ||
    lower.includes('આવતીકાલે') ||
    lower.includes('আগামীকাল') ||
    lower.includes('کل')
  ) {
    date = tomorrow;
  }

  let time: string | null = null;
  if (lower.includes('evening') || lower.includes('సాయంత్రం') || lower.includes('వైകുന്നేరం')) time = 'Evening (after 6 PM)';
  else if (lower.includes('morning') || lower.includes('ఉదయం') || lower.includes('सुबह') || lower.includes('காலையில்')) time = 'Morning (before 12 PM)';
  else if (lower.includes('night') || lower.includes('రాత్రి') || lower.includes('रात')) time = 'Night (after 9 PM)';
  else if (lower.includes('6 pm') || lower.includes('6pm')) time = 'After 6 PM';

  let busType: string | null = null;
  if (lower.includes('ac') && !lower.includes('non-ac') && !lower.includes('non ac')) busType = 'AC';
  else if (lower.includes('non-ac') || lower.includes('non ac')) busType = 'Non-AC';
  else if (lower.includes('volvo') || lower.includes('ev') || lower.includes('electric')) busType = 'Volvo / EV';

  let seatType: string | null = null;
  if (lower.includes('sleeper') || lower.includes('స్లీపర్') || lower.includes('स्लीपर')) seatType = 'Sleeper';
  else if (lower.includes('seater') || lower.includes('సీటర్') || lower.includes('सीटर')) seatType = 'Seater';

  return { date, time, busType, seatType };
}

export function getNearbyBoardingPoints(city: string): string[] {
  return BOARDING_POINTS[city] || ['Main Bus Station', 'City Central Stop'];
}

// Complete 12-Language Native Response Generator
const MULTILINGUAL_RESPONSES: Record<string, {
  complete: (o: string, d: string, date: string, detailsStr?: string) => string;
  needOrigin: string;
  needDest: (o: string) => string;
  lowConfidencePrompt: (city: string) => string;
}> = {
  te: {
    complete: (o, d, date, details) => `సరే! మీరు ${o} నుండి ${d} కు ${details ? details + ' లో ' : ''}ప్రయాణించాలనుకుంటున్నారు. అందుబాటులో ఉన్న బస్సుల వివరాలను చూపిస్తున్నాను:`,
    needOrigin: 'దయచేసి మీరు ఏ నగరం నుండి ప్రయాణించాలనుకుంటున్నారో చెప్పండి (ఉదా: విజయవాడ, హైదరాబాద్, కొచ్చి).',
    needDest: (o) => `సరే! మీరు ${o} నుండి ప్రయాణిస్తున్నారు. మీరు ఏ నగరానికి వెళ్లాలనుకుంటున్నారు? (ఉదా: హైదరాబాద్, వరంగల్).`,
    lowConfidencePrompt: (c) => `మీరు ${c} అని అంటున్నారా? దయచేసి అవును అని చెప్పండి లేదా మీ నగర పేరును మళ్లీ చెప్పండి.`,
  },
  hi: {
    complete: (o, d, date, details) => `ठीक है! आप ${o} से ${d} की ${details ? details + ' ' : ''}यात्रा करना चाहते हैं। उपलब्ध बसें दिखाई जा रही हैं:`,
    needOrigin: 'कृपया बताएं कि आप किस शहर से प्रस्थान करना चाहते हैं (जैसे: विजयवाड़ा, हैदराबाद, कोच्चि)।',
    needDest: (o) => `ठीक है! आप ${o} से यात्रा कर रहे हैं। आप किस शहर जाना चाहते हैं? (जैसे: हैदराबाद, वारंगल)।`,
    lowConfidencePrompt: (c) => `क्या आपका मतलब ${c} है? कृपया पुष्टि करें।`,
  },
  ta: {
    complete: (o, d, date, details) => `சரி! நீங்கள் ${o} இலிருந்து ${d} செல்ல விரும்புகிறீர்கள். பேருந்துகளைக் காட்டுகிறோம்:`,
    needOrigin: 'தயவுசெய்து நீங்கள் புறப்படும் நகரத்தைக் கூறுங்கள்.',
    needDest: (o) => `சரி! நீங்கள் ${o} இலிருந்து புறப்படுகிறீர்கள். எந்த நகரத்திற்குச் செல்ல வேண்டும்?`,
    lowConfidencePrompt: (c) => `நீங்கள் ${c} என்று குறிப்பிடுகிறீர்களா?`,
  },
  kn: {
    complete: (o, d, date, details) => `ಸರಿ! ನೀವು ${o} ದಿಂದ ${d} ಗೆ ಪ್ರಯಾಣಿಸಲು ಬಯಸುತ್ತೀರಿ. ಲಭ್ಯವಿರುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ:`,
    needOrigin: 'ದಯವಿಟ್ಟು ನೀವು ಹೊರಡುವ ನಗರವನ್ನು ತಿಳಿಸಿ.',
    needDest: (o) => `ಸರಿ! ನೀವು ${o} ದಿಂದ ಹೊರಡುತ್ತಿದ್ದೀರಿ. ಯಾವ ನಗರಕ್ಕೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?`,
    lowConfidencePrompt: (c) => `ನಿಮ್ಮ ಉದ್ದೇಶ ${c} ಎಂದೇ?`,
  },
  ml: {
    complete: (o, d, date, details) => `ശരി! നിങ്ങൾ ${o} ൽ നിന്ന് ${d} ലേക്ക് യാത്ര ചെയ്യാൻ ആഗ്രഹിക്കുന്നു. ലഭ്യമായ ബസുകൾ കാണിക്കുന്നു:`,
    needOrigin: 'ദയവായി നിങ്ങൾ പുറപ്പെടുന്ന നഗരം പറയുക (ഉദാ: കൊച്ചി).',
    needDest: (o) => `ശരി! നിങ്ങൾ ${o} ൽ നിന്നാണ് പുറപ്പെടുന്നത്. ഏത് നഗരത്തിലേക്കാണ് പോകേണ്ടത്? (ഉദാ: വരംഗൽ).`,
    lowConfidencePrompt: (c) => `നിങ്ങൾ ${c} എന്നാണോ ഉദ്ദേശിച്ചത്?`,
  },
  mr: {
    complete: (o, d, date, details) => `ठीक आहे! तुम्ही ${o} ते ${d} प्रवास करू इच्छिता. आम्ही तुम्हाला उपलब्ध बसेस दाखवत आहोत:`,
    needOrigin: 'कृपया प्रस्थान शहर सांगा.',
    needDest: (o) => `ठीक आहे! तुम्ही ${o} वरून निघत आहात. तुम्हाला कोणत्या शहरात जायचे आहे?`,
    lowConfidencePrompt: (c) => `तुमचा अर्थ ${c} असा आहे का?`,
  },
  gu: {
    complete: (o, d, date, details) => `બરાબર! તમે ${o} થી ${d} ની મુસાફરી કરવા માંગો છો. તમને ઉપલબ્ધ બસો બતાવી રહ્યા છીએ:`,
    needOrigin: 'કૃપા કરીને ઉપડવાનું શહેર જણાવો.',
    needDest: (o) => `બરાબર! તમે ${o} થી ઉપડી રહ્યા છો. તમે કયા શહેરે જવા માંગો છો?`,
    lowConfidencePrompt: (c) => `શું તમારો મતલબ ${c} છે?`,
  },
  bn: {
    complete: (o, d, date, details) => `ঠিক আছে! আপনি ${o} থেকে ${d} ভ্রমণ করতে চান। উপলব্ধ বাসগুলি দেখানো হচ্ছে:`,
    needOrigin: 'অনুগ্রহ করে যাত্রার প্রারম্ভিক শহর জানান।',
    needDest: (o) => `ঠিক আছে! আপনি ${o} থেকে যাত্রা শুরু করছেন। আপনি কোন শহরে যেতে চান?`,
    lowConfidencePrompt: (c) => `আপনি কি ${c} বলতে চেয়েছেন?`,
  },
  ur: {
    complete: (o, d, date, details) => `ٹھیک ہے! آپ ${o} سے ${d} کا سفر کرنا چاہتے ہیں۔ دستیاب بسیں دکھائی جا رہی ہیں۔`,
    needOrigin: 'براہ کرم روانگی کا شہر بتائیں۔',
    needDest: (o) => `ٹھیک ہے! آپ ${o} سے روانہ ہو رہے ہیں۔ آپ کس شہر جانا چاہتے ہیں؟`,
    lowConfidencePrompt: (c) => `کیا آپ کا مطلب ${c} ہے؟`,
  },
  pa: {
    complete: (o, d, date, details) => `ਠੀਕ ਹੈ! ਤੁਸੀਂ ${o} ਤੋਂ ${d} ਜਾਣ ਦੀ ਯਾਤਰਾ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ। ਉਪਲਬਧ ਬੱਸਾਂ ਦਿਖਾਈਆਂ ਜਾ ਰਹੀਆਂ ਹਨ:`,
    needOrigin: 'ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ।',
    needDest: (o) => `ਠੀਕ ਹੈ! ਤੁਸੀਂ ${o} ਤੋਂ ਚੱਲ ਰਹੇ ਹੋ। ਤੁਸੀਂ ਕਿਸ ਸ਼ਹਿਰ ਜਾਣਾ ਚਾਹੁੰਦੇ ਹੋ?`,
    lowConfidencePrompt: (c) => `ਕੀ ਤੁਹਾਡਾ ਮਤਲਬ ${c} ਹੈ?`,
  },
  or: {
    complete: (o, d, date, details) => `ଠିକ୍ ଅଛି! ଆପଣ ${o} ରୁ ${d} ଯାତ୍ରା କରିବାକୁ ଚାହାଁନ୍ତି। ବସ୍ ଗୁଡ଼ିକ ଦେଖାଯାଉଛି:`,
    needOrigin: 'ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ସହର କୁହନ୍ତୁ।',
    needDest: (o) => `ଠିକ୍ ଅଛି! ଆପଣ ${o} ରୁ ବାହାରୁଛନ୍ତି। ଆପଣ କେଉଁ ସହରକୁ ଯିବେ?`,
    lowConfidencePrompt: (c) => `ଆପଣଙ୍କ ଅର୍ଥ ${c} କି?`,
  },
  en: {
    complete: (o, d, date, details) => `Got it! You're planning to travel from ${o} to ${d} ${details ? details + ' ' : ''}. Showing available buses for you:`,
    needOrigin: 'Please specify your origin city (e.g., Vijayawada, Kochi, Hyderabad).',
    needDest: (o) => `Got it! You are departing from ${o}. Where would you like to travel to? (e.g. Hyderabad, Warangal).`,
    lowConfidencePrompt: (c) => `Did you mean ${c}? Please confirm.`,
  },
};

export function processUserMessage(
  userText: string,
  currentState: ConversationState
): {
  responseMessage: ChatMessage;
  nextState: ConversationState;
  structuredIntent: StructuredAiIntent;
} {
  const detectedLang = detectLanguageFromText(userText, currentState.language);
  const cityResult = extractCitiesFromInput(userText);
  const prefResult = extractContinuousPreferences(userText);

  let updatedOrigin = currentState.origin;
  let updatedDest = currentState.destination;
  let updatedDate = prefResult.date || currentState.date || new Date().toISOString().split('T')[0];
  let updatedTime = prefResult.time || currentState.time;
  let updatedBusType = prefResult.busType || currentState.busType;
  let updatedSeatType = prefResult.seatType || currentState.seatType;

  // Context memory extraction
  if (cityResult.cities.length >= 2) {
    updatedOrigin = cityResult.cities[0];
    updatedDest = cityResult.cities[1];
  } else if (cityResult.cities.length === 1) {
    const singleCity = cityResult.cities[0];
    if (!updatedOrigin) {
      updatedOrigin = singleCity;
    } else if (singleCity.toLowerCase() !== updatedOrigin.toLowerCase()) {
      updatedDest = singleCity;
    }
  }

  const isComplete = Boolean(updatedOrigin && updatedDest);

  const originNative = updatedOrigin
    ? CITY_TRANSLATIONS[updatedOrigin]?.[detectedLang] || updatedOrigin
    : '';
  const destNative = updatedDest
    ? CITY_TRANSLATIONS[updatedDest]?.[detectedLang] || updatedDest
    : '';

  const langRes = MULTILINGUAL_RESPONSES[detectedLang] || MULTILINGUAL_RESPONSES['en'];
  let responseText = '';
  let breakRoutes: BreakJourneyRoute[] = [];

  const detailsList: string[] = [];
  if (updatedDate && updatedDate !== new Date().toISOString().split('T')[0]) detailsList.push('Tomorrow');
  if (updatedTime) detailsList.push(updatedTime);
  if (updatedBusType) detailsList.push(updatedBusType);
  if (updatedSeatType) detailsList.push(updatedSeatType);
  const detailsStr = detailsList.join(' ');

  if (cityResult.confidence === 'low' && cityResult.lowConfCity && !isComplete) {
    responseText = langRes.lowConfidencePrompt(cityResult.lowConfCity);
  } else if (isComplete) {
    responseText = langRes.complete(originNative, destNative, updatedDate, detailsStr);
    breakRoutes = computeBreakJourneyRoutes(updatedOrigin!, updatedDest!, updatedDate);
  } else if (!updatedOrigin) {
    responseText = langRes.needOrigin;
  } else {
    responseText = langRes.needDest(originNative);
  }

  const responseMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    text: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    language: detectedLang,
    actionChips: isComplete
      ? ['💰 Cheapest Bus', '⭐ Best Rated', '🛏 Sleeper', '❄ AC', '📍 Pickup Points']
      : updatedOrigin
      ? [`🚌 ${updatedOrigin} to Hyderabad`, `🚌 ${updatedOrigin} to Warangal`, `🚌 ${updatedOrigin} to Bengaluru`]
      : ['🚌 Vijayawada to Hyderabad', '🚌 Kochi to Warangal', '🚌 Visakhapatnam to Hyderabad'],
    breakRoutes: breakRoutes.length > 0 ? breakRoutes : undefined,
  };

  const nextState: ConversationState = {
    origin: updatedOrigin,
    destination: updatedDest,
    date: updatedDate,
    time: updatedTime,
    busType: updatedBusType,
    seatType: updatedSeatType,
    maxBudget: currentState.maxBudget,
    language: detectedLang,
    step: isComplete ? 'complete' : !updatedOrigin ? 'origin' : 'destination',
    confidence: cityResult.confidence,
  };

  const structuredIntent: StructuredAiIntent = {
    language: detectedLang,
    source: updatedOrigin,
    destination: updatedDest,
    date: updatedDate,
    time: updatedTime,
    seat_type: updatedSeatType,
    bus_type: updatedBusType,
    budget: currentState.maxBudget ? `₹${currentState.maxBudget}` : null,
    confidence: cityResult.confidence === 'high' ? 0.98 : cityResult.confidence === 'medium' ? 0.85 : 0.60,
  };

  return { responseMessage, nextState, structuredIntent };
}
