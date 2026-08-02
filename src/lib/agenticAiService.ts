import { CITY_ALIASES } from '../components/VoiceSearchBar';
import { computeBreakJourneyRoutes, BreakJourneyRoute } from './breakJourneyService';

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
  busType: string | null;
  maxBudget: number | null;
  language: string;
  step: 'origin' | 'destination' | 'date' | 'preferences' | 'complete';
}

const BOARDING_POINTS: Record<string, string[]> = {
  Visakhapatnam: ['RTC Complex', 'Maddilapalem', 'Gajuwaka', 'NAD Junction'],
  Hyderabad: ['MGBS', 'Lakdikapul', 'Ameerpet', 'Kukatpally', 'Gachibowli'],
  Vijayawada: ['Pandit Nehru Bus Station (PNBS)', 'Benz Circle', 'Ramavarappadu'],
  Bengaluru: ['Majestic (BSK)', 'Shantinagar', 'KBS', 'Silk Board', 'Electronic City'],
  Chennai: ['Koyambedu (CMBT)', 'Tambaram', 'Guindy', 'Ashok Nagar'],
  Tirupati: ['RTC Bus Stand', 'Alipiri', 'Tirumala Bypass'],
};

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
  return currentLang;
}

export function extractCitiesFromInput(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const [alias, canonical] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias.toLowerCase()) && !found.includes(canonical)) {
      found.push(canonical);
    }
  }
  return found;
}

export function getNearbyBoardingPoints(city: string): string[] {
  return BOARDING_POINTS[city] || ['Main Bus Station', 'City Central Stop'];
}

// Complete Multilingual Native Response Matrix for 12 Indian Languages
const MULTILINGUAL_RESPONSES: Record<string, {
  complete: (o: string, d: string, date: string) => string;
  needOrigin: string;
  needDest: (o: string) => string;
}> = {
  te: {
    complete: (o, d) => `మీకు ${o} నుండి ${d} వెళ్లే లభ్యత ఉన్న బస్సులను చూపిస్తున్నాను. direct బస్సులు మరియు smart ప్రత్యామ్నాయ మార్గాలు ఇక్కడ ఉన్నాయి:`,
    needOrigin: 'దయచేసి మీరు ఏ నగరం నుండి బయలుదేరాలనుకుంటున్నారో చెప్పండి (ఉదా: వైజాగ్, హైదరాబాద్).',
    needDest: (o) => `మీరు ${o} నుండి ఏ నగరానికి వెళ్లాలనుకుంటున్నారు? (ఉదా: హైదరాబాద్, విజయవాడ).`,
  },
  hi: {
    complete: (o, d) => `हम आपको ${o} से ${d} जाने वाली उपलब्ध बसें दिखा रहे हैं। डायरेक्ट और कनेक्टिंग रूट्स नीचे दिए गए हैं:`,
    needOrigin: 'कृपया बताएं कि आप किस शहर से यात्रा शुरू करना चाहते हैं (जैसे: दिल्ली, मुंबई, विशाखापट्टनम)।',
    needDest: (o) => `${o} से आप किस शहर जाना चाहते हैं? (जैसे: जयपुर, हैदराबाद)।`,
  },
  ta: {
    complete: (o, d) => `நாங்கள் உங்களுக்கு ${o} இலிருந்து ${d} செல்லும் பேருந்துகளைக் காட்டுகிறோம்:`,
    needOrigin: 'தயவுசெய்து நீங்கள் புறப்படும் நகரத்தைக் கூறுங்கள்.',
    needDest: (o) => `${o} இலிருந்து நீங்கள் எந்த நகரத்திற்குச் செல்ல விரும்புகிறீர்கள்?`,
  },
  kn: {
    complete: (o, d) => `ನಾವು ನಿಮಗೆ ${o} ದಿಂದ ${d} ಗೆ ಹೋಗುವ ಲಭ್ಯವಿರುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ:`,
    needOrigin: 'ದಯವಿಟ್ಟು ನೀವು ಹೊರಡುವ ನಗರವನ್ನು ತಿಳಿಸಿ.',
    needDest: (o) => `${o} ದಿಂದ ನೀವು ಯಾವ ನಗರಕ್ಕೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?`,
  },
  ml: {
    complete: (o, d) => `ഞങ്ങൾ നിങ്ങൾക്ക് ${o} ൽ നിന്ന് ${d} ലേക്ക് പോകുന്ന ലഭ്യമായ ബസുകൾ കാണിക്കുന്നു:`,
    needOrigin: 'ദയവായി നിങ്ങൾ പുറപ്പെടുന്ന നഗരം പറയുക.',
    needDest: (o) => `${o} ൽ നിന്ന് ഏത് നഗരത്തിലേക്കാണ് പോകേണ്ടത്?`,
  },
  mr: {
    complete: (o, d) => `आम्ही तुम्हाला ${o} ते ${d} जाणाऱ्या बसेस दाखवत आहोत:`,
    needOrigin: 'कृपया प्रस्थान शहर सांगा.',
    needDest: (o) => `${o} वरून तुम्हाला कोणत्या शहरात जायचे आहे?`,
  },
  gu: {
    complete: (o, d) => `અમે તમને ${o} થી ${d} જતી ઉપલબ્ધ બસો બતાવી રહ્યા છીએ:`,
    needOrigin: 'કૃપા કરીને ઉપડવાનું શહેર જણાવો.',
    needDest: (o) => `${o} થી તમે કયા શહેરે જવા માંગો છો?`,
  },
  bn: {
    complete: (o, d) => `আমরা আপনাকে ${o} থেকে ${d} যাওয়ার বাসগুলো দেখাচ্ছি:`,
    needOrigin: 'অনুগ্রহ করে যাত্রার প্রারম্ভিক শহর জানান।',
    needDest: (o) => `${o} থেকে আপনি কোন শহরে যেতে চান?`,
  },
  ur: {
    complete: (o, d) => `ہم آپ کو ${o} سے ${d} جانے والی بسیں دکھا رہے ہیں:`,
    needOrigin: 'براہ کرم روانگی کا شہر بتائیں۔',
    needDest: (o) => `${o} سے آپ کس شہر جانا چاہتے ہیں؟`,
  },
  pa: {
    complete: (o, d) => `ਅਸੀਂ ਤੁਹਾਨੂੰ ${o} ਤੋਂ ${d} ਜਾਣ ਵਾਲੀਆਂ ਬੱਸਾਂ ਦਿਖਾ ਰਹੇ ਹਾਂ:`,
    needOrigin: 'ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ।',
    needDest: (o) => `${o} ਤੋਂ ਤੁਸੀਂ ਕਿਸ ਸ਼ਹਿਰ ਜਾਣਾ ਚਾਹੁੰਦੇ ਹੋ?`,
  },
  or: {
    complete: (o, d) => `ଆମେ ଆପଣଙ୍କୁ ${o} ରୁ ${d} ଯାଉଥିବା ବସ୍ ଦେଖାଉଛୁ:`,
    needOrigin: 'ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ସହର କୁହନ୍ତୁ।',
    needDest: (o) => `${o} ରୁ ଆପଣ କେଉଁ ସହରକୁ ଯିବାକୁ ଚାହାଁନ୍ତି?`,
  },
  en: {
    complete: (o, d) => `Showing available buses and smart connecting routes from ${o} to ${d}:`,
    needOrigin: 'Please tell me your origin city (e.g. Visakhapatnam, Hyderabad).',
    needDest: (o) => `Where would you like to travel from ${o}? (e.g. Hyderabad, Vijayawada).`,
  },
};

export function processUserMessage(
  userText: string,
  currentState: ConversationState
): {
  responseMessage: ChatMessage;
  nextState: ConversationState;
} {
  const detectedLang = detectLanguageFromText(userText, currentState.language);
  const citiesFound = extractCitiesFromInput(userText);

  let updatedOrigin = currentState.origin;
  let updatedDest = currentState.destination;
  let updatedDate = currentState.date || new Date().toISOString().split('T')[0];

  if (citiesFound.length >= 2) {
    updatedOrigin = citiesFound[0];
    updatedDest = citiesFound[1];
  } else if (citiesFound.length === 1) {
    if (!updatedOrigin) {
      updatedOrigin = citiesFound[0];
    } else if (citiesFound[0].toLowerCase() !== updatedOrigin.toLowerCase()) {
      updatedDest = citiesFound[0];
    }
  }

  const isComplete = Boolean(updatedOrigin && updatedDest);

  const langRes = MULTILINGUAL_RESPONSES[detectedLang] || MULTILINGUAL_RESPONSES['en'];
  let responseText = '';
  let breakRoutes: BreakJourneyRoute[] = [];

  if (isComplete) {
    responseText = langRes.complete(updatedOrigin!, updatedDest!, updatedDate);
    breakRoutes = computeBreakJourneyRoutes(updatedOrigin!, updatedDest!, updatedDate);
  } else if (!updatedOrigin) {
    responseText = langRes.needOrigin;
  } else {
    responseText = langRes.needDest(updatedOrigin);
  }

  const responseMessage: ChatMessage = {
    id: `msg-${Date.now()}`,
    sender: 'assistant',
    text: responseText,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    language: detectedLang,
    actionChips: isComplete
      ? ['💰 Cheapest Bus', '⭐ Best Rated', '🛏 Sleeper', '❄ AC', '📍 My Location']
      : ['🚌 Visakhapatnam to Hyderabad', '🚌 Kochi to Bangalore', '🚌 Delhi to Jaipur'],
    breakRoutes: breakRoutes.length > 0 ? breakRoutes : undefined,
  };

  const nextState: ConversationState = {
    origin: updatedOrigin,
    destination: updatedDest,
    date: updatedDate,
    busType: currentState.busType,
    maxBudget: currentState.maxBudget,
    language: detectedLang,
    step: isComplete ? 'complete' : !updatedOrigin ? 'origin' : 'destination',
  };

  return { responseMessage, nextState };
}
