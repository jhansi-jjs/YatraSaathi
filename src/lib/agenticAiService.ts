import { CITY_ALIASES } from '../components/VoiceSearchBar';
import { CITIES } from '../components/SearchForm';
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

  let responseText = '';
  let breakRoutes: BreakJourneyRoute[] = [];

  if (isComplete) {
    if (detectedLang === 'te') {
      responseText = `మీకు ${updatedOrigin} నుండి ${updatedDest} కు లభించే బస్సు వివరాలను చూపిస్తున్నాను. direct బస్సులు మరియు ప్రత్యామ్నాయ రూట్‌లు ఇక్కడ ఉన్నాయి:`;
    } else if (detectedLang === 'hi') {
      responseText = `हम आपको ${updatedOrigin} से ${updatedDest} के लिए उपलब्ध बसें दिखा रहे हैं। डायरेक्ट और कनेक्टिंग रूट्स नीचे दिए गए हैं:`;
    } else if (detectedLang === 'ta') {
      responseText = `நாங்கள் உங்களுக்கு ${updatedOrigin} இலிருந்து ${updatedDest} செல்லக்கூடிய பேருந்துகளைக் காட்டுகிறோம்:`;
    } else {
      responseText = `I have found available buses and smart connected routes from ${updatedOrigin} to ${updatedDest} for ${updatedDate}:`;
    }

    breakRoutes = computeBreakJourneyRoutes(updatedOrigin!, updatedDest!, updatedDate);
  } else if (!updatedOrigin) {
    if (detectedLang === 'te') {
      responseText = 'మీరు ఏ నగరం నుండి ప్రయాణించాలనుకుంటున్నారు? (ఉదా: విశాఖపట్నం, హైదరాబాద్)';
    } else if (detectedLang === 'hi') {
      responseText = 'आप किस शहर से यात्रा शुरू करना चाहते हैं? (जैसे: दिल्ली, मुंबई)';
    } else {
      responseText = 'Where would you like to travel from? (e.g., Visakhapatnam, Hyderabad, Kochi)';
    }
  } else {
    if (detectedLang === 'te') {
      responseText = `${updatedOrigin} నుండి మీరు ఏ నగరానికి వెళ్లాలి? (ఉదా: హైదరాబాద్, బెంగళూరు)`;
    } else if (detectedLang === 'hi') {
      responseText = `${updatedOrigin} से आप किस शहर जाना चाहते हैं?`;
    } else {
      responseText = `Where would you like to go from ${updatedOrigin}? (e.g., Hyderabad, Bengaluru)`;
    }
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
