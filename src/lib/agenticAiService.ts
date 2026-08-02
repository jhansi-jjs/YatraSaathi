import { CITY_ALIASES } from './cities';
import { CITIES } from '../components/SearchForm';
import { BreakJourneyRoute } from './breakJourneyService';
import { CITY_TRANSLATIONS } from '../context/LanguageContext';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  language?: string;
  actionChips?: string[];
  results?: unknown[];
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

// Unicode script ranges are the most reliable signal: when speech is transcribed in
// its native script (recognition.lang set correctly), a single range check nails it.
const SCRIPT_RANGES: { lang: string; re: RegExp }[] = [
  { lang: 'te', re: /[\u0C00-\u0C7F]/ },
  { lang: 'kn', re: /[\u0C80-\u0CFF]/ },
  { lang: 'ml', re: /[\u0D00-\u0D7F]/ },
  { lang: 'ta', re: /[\u0B80-\u0BFF]/ },
  { lang: 'gu', re: /[\u0A80-\u0AFF]/ },
  { lang: 'bn', re: /[\u0980-\u09FF]/ },
  { lang: 'pa', re: /[\u0A00-\u0A7F]/ },
  { lang: 'or', re: /[\u0B00-\u0B7F]/ },
  { lang: 'ur', re: /[\u0600-\u06FF]/ },
  // Devanagari is shared by Hindi and Marathi; disambiguated below by keywords.
  { lang: 'hi', re: /[\u0900-\u097F]/ },
];

// Romanized keyword hints, matched with WORD BOUNDARIES so "se" no longer matches
// inside "buses" and "to" no longer matches inside "tomorrow". Latin-only tokens.
const ROMANIZED_HINTS: Record<string, RegExp[]> = {
  te: [/\bnenu\b/, /\bnundi\b/, /\bnunchi\b/, /\bnunchee\b/, /\bvellali\b/, /\bkavali\b/],
  hi: [/\bmujhe\b/, /\bjana\b/, /\bjaana\b/, /\bchahiye\b/, /\bse\b/, /\btak\b/, /\bkal\b/],
  mr: [/\bmala\b/, /\bpahije\b/, /\bpasun\b/, /\bhava\b/, /\bjaycha\b/],
  ml: [/\benikku\b/, /\bninnu\b/, /\bpokanam\b/, /\bvenam\b/, /\bcheyyu\b/],
  ta: [/\benakku\b/, /\birundhu\b/, /\bponganum\b/, /\bvendum\b/, /\bpoga\b/],
  kn: [/\bnanage\b/, /\bbeku\b/, /\binda\b/, /\bhoga\b/, /\bhogabeku\b/],
  gu: [/\bmare\b/, /\bjoiye\b/, /\bthi\b/, /\bjavu\b/],
  bn: [/\bamake\b/, /\btheke\b/, /\bjete\b/, /\bchai\b/],
  pa: [/\bmainu\b/, /\bjana\b/, /\bton\b/, /\bchahida\b/],
  ur: [/\bmujhe\b/, /\bjana\b/, /\bchahiye\b/],
  or: [/\bmote\b/, /\bjibi\b/, /\bru\b/, /\bku\b/],
};

// Marathi vs Hindi (both Devanagari) \u2014 a few unambiguous Marathi markers.
const MARATHI_MARKERS = ['\u092A\u093E\u0938\u0942\u0928', '\u092A\u093E\u0939\u093F\u091C\u0947', '\u0939\u0935\u0902', '\u0939\u0935\u0947', '\u091C\u093E\u092F\u091A\u0902', '\u092E\u0932\u093E'];

export function detectLanguageFromText(text: string, currentLang: string): string {
  const trimmed = (text || '').trim();
  if (!trimmed) return currentLang;

  for (const { lang, re } of SCRIPT_RANGES) {
    if (re.test(trimmed)) {
      if (lang === 'hi' && MARATHI_MARKERS.some((m) => trimmed.includes(m))) return 'mr';
      return lang;
    }
  }

  // Latin transcript: score romanized hints per language with word boundaries.
  const lower = ` ${trimmed.toLowerCase()} `;
  let best: string | null = null;
  let bestScore = 0;
  for (const [lang, patterns] of Object.entries(ROMANIZED_HINTS)) {
    const score = patterns.reduce((acc, re) => acc + (re.test(lower) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  if (best && bestScore > 0) return best;

  // No strong signal: keep the user's selected language rather than forcing English.
  return currentLang;
}

// Directional connectives. We only key off ENGLISH PREPOSITIONS here ("from"/"to"),
// which sit BEFORE their city, so "the city after the marker" is a valid rule.
// Indic connectives ("se", "nunchi", "ku", …) are POSTPOSITIONS that follow the
// origin, so plain left-to-right position order already resolves them correctly —
// no marker override needed (and applying one would invert origin/destination).
const ORIGIN_MARKERS = ['from', 'frm', 'starting from', 'departing from'];
const DEST_MARKERS = ['to', 'towards', 'going to', 'reaching'];

function isAsciiToken(token: string): boolean {
  return /^[a-z\s]+$/i.test(token);
}

// Index of the earliest occurrence of any marker in `lower`, or -1.
function firstMarkerIndex(lower: string, markers: string[]): number {
  let earliest = -1;
  for (const m of markers) {
    const needle = m.toLowerCase();
    let idx = -1;
    if (isAsciiToken(needle)) {
      const re = new RegExp(`\\b${needle.trim()}\\b`);
      const match = re.exec(lower);
      idx = match ? match.index : -1;
    } else {
      idx = lower.indexOf(needle);
    }
    if (idx >= 0 && (earliest === -1 || idx < earliest)) earliest = idx;
  }
  return earliest;
}

interface CityMatch {
  city: string;
  index: number;
}

// Record the earliest text position for a city (keeps only the first occurrence).
function recordMatch(matches: CityMatch[], city: string, index: number) {
  if (index < 0) return;
  const existing = matches.find((m) => m.city === city);
  if (!existing) matches.push({ city, index });
  else if (index < existing.index) existing.index = index;
}

// Normalize to NFC so native-script cities match regardless of how the STT engine
// composed the combining vowel signs (a common cause of missed Telugu/Tamil/etc.
// city matches). Also lowercases for Latin.
function normalizeText(s: string): string {
  return (s || '').normalize('NFC');
}

// Precompute normalized+lowercased lookup tables once at module load.
const NORM_ALIAS_ENTRIES: [string, string][] = Object.entries(CITY_ALIASES).map(
  ([alias, canonical]) => [normalizeText(alias).toLowerCase(), canonical] as [string, string]
);
const NORM_CITY_ENTRIES: [string, string][] = CITIES.map(
  (c) => [normalizeText(c).toLowerCase(), c] as [string, string]
);

// RapidFuzz & N-Gram City Normalizer matching strictly against CITIES dropdown dataset.
// Handles native-script + transliterated connectors ("X టు Y", "X నుండి Y", "Y se X",
// "from X to Y"). Cities are ordered by POSITION (native postpositions read origin-first)
// and refined by English prepositions so "to delhi from kochi" also resolves correctly.
export function extractCitiesFromInput(text: string): {
  cities: string[];
  confidence: 'high' | 'medium' | 'low';
  lowConfCity?: string;
} {
  const lower = normalizeText(text).toLowerCase().trim();
  const matches: CityMatch[] = [];

  // 1. Direct substring match — catches native-script cities even when a connector or
  //    grammatical suffix is attached ("విజయవాడకు", "బెంగళూరుటు", "bengalurutu").
  for (const [alias, canonical] of NORM_ALIAS_ENTRIES) {
    recordMatch(matches, canonical, lower.indexOf(alias));
  }
  for (const [name, canonical] of NORM_CITY_ENTRIES) {
    recordMatch(matches, canonical, lower.indexOf(name));
  }

  // Tokenize on whitespace + punctuation across scripts, keeping token positions.
  const tokens: { tk: string; at: number }[] = [];
  const tokenRe = /[^\s,.\-!?;:।|/\\()]+/g;
  let tm: RegExpExecArray | null;
  while ((tm = tokenRe.exec(lower)) !== null) {
    tokens.push({ tk: tm[0], at: tm.index });
  }

  // 2. Token & 2-token-combo exact/prefix match (suffix-tolerant: "విజయవాడకు" -> Vijayawada).
  const tryToken = (tk: string, at: number) => {
    if (tk.length < 2) return;
    for (const [alias, canonical] of NORM_ALIAS_ENTRIES) {
      if (tk === alias || (alias.length >= 3 && tk.startsWith(alias))) {
        recordMatch(matches, canonical, at);
        return;
      }
    }
    for (const [name, canonical] of NORM_CITY_ENTRIES) {
      if (tk === name || (name.length >= 4 && tk.startsWith(name))) {
        recordMatch(matches, canonical, at);
        return;
      }
    }
  };
  for (let i = 0; i < tokens.length; i++) {
    tryToken(tokens[i].tk, tokens[i].at);
    if (i < tokens.length - 1) tryToken(tokens[i].tk + tokens[i + 1].tk, tokens[i].at);
  }

  // 3. Fuzzy fallback (Levenshtein) for STT spelling variants — native or Latin —
  //    only if we still have fewer than two cities. Conservative thresholds avoid
  //    matching ordinary words like "బస్సులు" (buses).
  let lowConfCity: string | undefined = undefined;
  if (matches.length < 2) {
    for (const { tk, at } of tokens) {
      if (tk.length < 3) continue;
      let bestCity: string | null = null;
      let bestDist = Infinity;
      for (const [alias, canonical] of NORM_ALIAS_ENTRIES) {
        if (Math.abs(alias.length - tk.length) > 2) continue;
        const d = levenshteinDistance(tk, alias);
        if (d < bestDist) {
          bestDist = d;
          bestCity = canonical;
        }
      }
      if (!bestCity) continue;
      if (bestDist <= 1 && !matches.some((mm) => mm.city === bestCity)) {
        recordMatch(matches, bestCity, at);
      } else if (bestDist === 2 && !lowConfCity && !matches.some((mm) => mm.city === bestCity)) {
        lowConfCity = bestCity;
      }
    }
  }

  // Order by position in the sentence.
  matches.sort((a, b) => a.index - b.index);
  let ordered = matches.map((m) => m.city);

  // Directional refinement for English prepositions ("from"/"to"). Native postpositions
  // (నుండి/se/టు/…) already read origin-first, so plain position order is correct.
  if (matches.length >= 2) {
    const originIdx = firstMarkerIndex(lower, ORIGIN_MARKERS);
    if (originIdx >= 0) {
      const originCity = matches.find((m) => m.index > originIdx);
      if (originCity) {
        ordered = [originCity.city, ...ordered.filter((c) => c !== originCity.city)];
      }
    } else {
      const destIdx = firstMarkerIndex(lower, DEST_MARKERS);
      if (destIdx >= 0) {
        const destCity = matches.find((m) => m.index > destIdx);
        if (destCity) {
          ordered = [...ordered.filter((c) => c !== destCity.city), destCity.city];
        }
      }
    }
  }

  const confidence: 'high' | 'medium' | 'low' =
    ordered.length >= 2 ? 'high' : ordered.length === 1 ? 'medium' : 'low';

  return { cities: ordered, confidence, lowConfCity };
}

const TOMORROW_KEYWORDS = [
  'tomorrow', 'రేపు', 'कल', 'நாளை', 'ನಾಳೆ', 'നാളെ', 'उद्या', 'આવતીકાલે', 'আগামীকাল',
  'کل', 'ਭਲਕੇ', 'ଆସନ୍ତାକାଲି',
];
const DAY_AFTER_KEYWORDS = ['day after tomorrow', 'ఎల్లుండి', 'परसों', 'நாள்மறுநாள்', 'മറ്റന്നാൾ'];
const TODAY_KEYWORDS = [
  'today', 'ఈరోజు', 'ఇవాళ', 'आज', 'இன்று', 'ಇಂದು', 'ഇന്ന്', 'আজ', 'આજે', 'آج', 'ਅੱਜ', 'ଆଜି',
];

// Weekday names -> 0=Sun..6=Sat. English + te/hi/ta/kn/ml native names (the languages
// with the strongest voice support); numeric/relative dates cover the remaining langs.
const WEEKDAYS: Record<string, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
  ఆదివారం: 0, సోమవారం: 1, మంగళవారం: 2, బుధవారం: 3, గురువారం: 4, శుక్రవారం: 5, శనివారం: 6,
  रविवार: 0, सोमवार: 1, मंगलवार: 2, बुधवार: 3, गुरुवार: 4, शुक्रवार: 5, शनिवार: 6,
  ஞாயிறு: 0, திங்கள்: 1, செவ்வாய்: 2, புதன்: 3, வியாழன்: 4, வெள்ளி: 5, சனி: 6,
  ಭಾನುವಾರ: 0, ಸೋಮವಾರ: 1, ಮಂಗಳವಾರ: 2, ಬುಧವಾರ: 3, ಗುರುವಾರ: 4, ಶುಕ್ರವಾರ: 5, ಶನಿವಾರ: 6,
  ഞായർ: 0, തിങ്കൾ: 1, ചൊവ്വ: 2, ബുധൻ: 3, വ്യാഴം: 4, വെള്ളി: 5, ശനി: 6,
};

// Month names -> 1..12. English (full/abbrev) + te/hi native transliterations.
const MONTHS_MAP: Record<string, number> = {
  january: 1, jan: 1, february: 2, feb: 2, march: 3, mar: 3, april: 4, apr: 4, may: 5,
  june: 6, jun: 6, july: 7, jul: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9,
  october: 10, oct: 10, november: 11, nov: 11, december: 12, dec: 12,
  జనవరి: 1, ఫిబ్రవరి: 2, మార్చి: 3, ఏప్రిల్: 4, మే: 5, జూన్: 6, జూలై: 7, ఆగస్టు: 8, సెప్టెంబర్: 9, అక్టోబర్: 10, నవంబర్: 11, డిసెంబర్: 12,
  जनवरी: 1, फरवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, अक्टूबर: 10, नवंबर: 11, दिसंबर: 12,
};

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// "next Friday" / "శుక్రవారం" -> the upcoming occurrence of that weekday (today if it
// is that weekday). Returns null if no weekday word is present.
function parseWeekday(lower: string): string | null {
  for (const [name, dow] of Object.entries(WEEKDAYS)) {
    if (lower.includes(name)) {
      const now = new Date();
      const diff = ((dow - now.getDay()) % 7 + 7) % 7;
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
      return toIsoDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
    }
  }
  return null;
}

// "5th August" / "August 5" / "5 ఆగస్టు" / "5/8" / "05-08-2026" -> ISO date (next
// year if the day/month is already in the past). Returns null if no explicit date.
function parseExplicitDate(lower: string): string | null {
  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Day number + month name (day may come before or after the month word).
  let monthNum: number | null = null;
  for (const [name, mn] of Object.entries(MONTHS_MAP)) {
    // For ASCII month names use word boundaries (so "may" the modal verb, or "aug"
    // inside another word, does not false-match); native month names use includes.
    const isAsciiMonth = /^[a-z]+$/.test(name);
    const found = isAsciiMonth
      ? new RegExp(`(^|[^a-z])${name}([^a-z]|$)`).test(lower)
      : lower.includes(name);
    if (found) {
      monthNum = mn;
      break;
    }
  }
  if (monthNum) {
    const dayMatch = lower.match(/\b(\d{1,2})(?:st|nd|rd|th)?\b/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1], 10);
      if (day >= 1 && day <= 31) {
        const yearMatch = lower.match(/\b(20\d{2})\b/);
        let year = yearMatch ? parseInt(yearMatch[1], 10) : now.getFullYear();
        let candidate = new Date(year, monthNum - 1, day);
        if (!yearMatch && candidate < todayMidnight) {
          year += 1;
          candidate = new Date(year, monthNum - 1, day);
        }
        return toIsoDate(candidate.getFullYear(), candidate.getMonth() + 1, candidate.getDate());
      }
    }
  }

  // Numeric DD/MM or DD-MM(-YYYY) (Indian day-first convention).
  const numMatch = lower.match(/\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/);
  if (numMatch) {
    const day = parseInt(numMatch[1], 10);
    const mon = parseInt(numMatch[2], 10);
    if (day >= 1 && day <= 31 && mon >= 1 && mon <= 12) {
      let year = numMatch[3] ? parseInt(numMatch[3], 10) : now.getFullYear();
      if (year < 100) year += 2000;
      let candidate = new Date(year, mon - 1, day);
      if (!numMatch[3] && candidate < todayMidnight) {
        year += 1;
        candidate = new Date(year, mon - 1, day);
      }
      return toIsoDate(candidate.getFullYear(), candidate.getMonth() + 1, candidate.getDate());
    }
  }

  return null;
}

// Continuous natural sentence entity extraction for Date, Time, Bus Type & Seat Type.
// `date` is null when the user did not mention a date, so callers can preserve any
// date already captured in the session instead of overwriting it with today.
export function extractContinuousPreferences(text: string): {
  date: string | null;
  time: string | null;
  busType: string | null;
  seatType: string | null;
} {
  const lower = (text || '').normalize('NFC').toLowerCase();
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  let date: string | null = null;
  if (DAY_AFTER_KEYWORDS.some((k) => lower.includes(k))) date = dayAfter;
  else if (TOMORROW_KEYWORDS.some((k) => lower.includes(k))) date = tomorrow;
  else if (TODAY_KEYWORDS.some((k) => lower.includes(k))) date = today;
  // Explicit ("5th August", "5 ఆగస్టు", "5/8") and weekday ("Friday", "శుక్రవారం")
  // dates, only when no relative keyword was spoken.
  if (!date) date = parseExplicitDate(lower);
  if (!date) date = parseWeekday(lower);

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

// Complete 12-Language Native Response Generator. Exported so VoiceSearchBar and
// ChatbotWidget share the exact same native strings for every response path.
export interface ResponseTemplate {
  complete: (o: string, d: string) => string;
  needOrigin: string;
  needDest: (o: string) => string;
  lowConfidencePrompt: (city: string) => string;
}

export const RESPONSE_TEMPLATES: Record<string, ResponseTemplate> = {
  te: {
    complete: (o, d) => `సరే! మీరు ${o} నుండి ${d} కు ప్రయాణించాలనుకుంటున్నారు. అందుబాటులో ఉన్న బస్సుల వివరాలను చూపిస్తున్నాను:`,
    needOrigin: 'దయచేసి మీరు ఏ నగరం నుండి ప్రయాణించాలనుకుంటున్నారో చెప్పండి (ఉదా: విజయవాడ, హైదరాబాద్, కొచ్చి).',
    needDest: (o) => `సరే! మీరు ${o} నుండి ప్రయాణిస్తున్నారు. మీరు ఏ నగరానికి వెళ్లాలనుకుంటున్నారు? (ఉదా: హైదరాబాద్, వరంగల్).`,
    lowConfidencePrompt: (c) => `మీరు ${c} అని అంటున్నారా? దయచేసి అవును అని చెప్పండి లేదా మీ నగర పేరును మళ్లీ చెప్పండి.`,
  },
  hi: {
    complete: (o, d) => `ठीक है! आप ${o} से ${d} की यात्रा करना चाहते हैं। उपलब्ध बसें दिखाई जा रही हैं:`,
    needOrigin: 'कृपया बताएं कि आप किस शहर से प्रस्थान करना चाहते हैं (जैसे: विजयवाड़ा, हैदराबाद, कोच्चि)।',
    needDest: (o) => `ठीक है! आप ${o} से यात्रा कर रहे हैं। आप किस शहर जाना चाहते हैं? (जैसे: हैदराबाद, वारंगल)।`,
    lowConfidencePrompt: (c) => `क्या आपका मतलब ${c} है? कृपया पुष्टि करें।`,
  },
  ta: {
    complete: (o, d) => `சரி! நீங்கள் ${o} இலிருந்து ${d} செல்ல விரும்புகிறீர்கள். பேருந்துகளைக் காட்டுகிறோம்:`,
    needOrigin: 'தயவுசெய்து நீங்கள் புறப்படும் நகரத்தைக் கூறுங்கள்.',
    needDest: (o) => `சரி! நீங்கள் ${o} இலிருந்து புறப்படுகிறீர்கள். எந்த நகரத்திற்குச் செல்ல வேண்டும்?`,
    lowConfidencePrompt: (c) => `நீங்கள் ${c} என்று குறிப்பிடுகிறீர்களா?`,
  },
  kn: {
    complete: (o, d) => `ಸರಿ! ನೀವು ${o} ದಿಂದ ${d} ಗೆ ಪ್ರಯಾಣಿಸಲು ಬಯಸುತ್ತೀರಿ. ಲಭ್ಯವಿರುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ:`,
    needOrigin: 'ದಯವಿಟ್ಟು ನೀವು ಹೊರಡುವ ನಗರವನ್ನು ತಿಳಿಸಿ.',
    needDest: (o) => `ಸರಿ! ನೀವು ${o} ದಿಂದ ಹೊರಡುತ್ತಿದ್ದೀರಿ. ಯಾವ ನಗರಕ್ಕೆ ಹೋಗಲು ಬಯಸುತ್ತೀರಿ?`,
    lowConfidencePrompt: (c) => `ನಿಮ್ಮ ಉದ್ದೇಶ ${c} ಎಂದೇ?`,
  },
  ml: {
    complete: (o, d) => `ശരി! നിങ്ങൾ ${o} ൽ നിന്ന് ${d} ലേക്ക് യാത്ര ചെയ്യാൻ ആഗ്രഹിക്കുന്നു. ലഭ്യമായ ബസുകൾ കാണിക്കുന്നു:`,
    needOrigin: 'ദയവായി നിങ്ങൾ പുറപ്പെടുന്ന നഗരം പറയുക (ഉദാ: കൊച്ചി).',
    needDest: (o) => `ശരി! നിങ്ങൾ ${o} ൽ നിന്നാണ് പുറപ്പെടുന്നത്. ഏത് നഗരത്തിലേക്കാണ് പോകേണ്ടത്? (ഉദാ: വരംഗൽ).`,
    lowConfidencePrompt: (c) => `നിങ്ങൾ ${c} എന്നാണോ ഉദ്ദേശിച്ചത്?`,
  },
  mr: {
    complete: (o, d) => `ठीक आहे! तुम्ही ${o} ते ${d} प्रवास करू इच्छिता. आम्ही तुम्हाला उपलब्ध बसेस दाखवत आहोत:`,
    needOrigin: 'कृपया प्रस्थान शहर सांगा.',
    needDest: (o) => `ठीक आहे! तुम्ही ${o} वरून निघत आहात. तुम्हाला कोणत्या शहरात जायचे आहे?`,
    lowConfidencePrompt: (c) => `तुमचा अर्थ ${c} असा आहे का?`,
  },
  gu: {
    complete: (o, d) => `બરાબર! તમે ${o} થી ${d} ની મુસાફરી કરવા માંગો છો. તમને ઉપલબ્ધ બસો બતાવી રહ્યા છીએ:`,
    needOrigin: 'કૃપા કરીને ઉપડવાનું શહેર જણાવો.',
    needDest: (o) => `બરાબર! તમે ${o} થી ઉપડી રહ્યા છો. તમે કયા શહેરે જવા માંગો છો?`,
    lowConfidencePrompt: (c) => `શું તમારો મતલબ ${c} છે?`,
  },
  bn: {
    complete: (o, d) => `ঠিক আছে! আপনি ${o} থেকে ${d} ভ্রমণ করতে চান। উপলব্ধ বাসগুলি দেখানো হচ্ছে:`,
    needOrigin: 'অনুগ্রহ করে যাত্রার প্রারম্ভিক শহর জানান।',
    needDest: (o) => `ঠিক আছে! আপনি ${o} থেকে যাত্রা শুরু করছেন। আপনি কোন শহরে যেতে চান?`,
    lowConfidencePrompt: (c) => `আপনি কি ${c} বলতে চেয়েছেন?`,
  },
  ur: {
    complete: (o, d) => `ٹھیک ہے! آپ ${o} سے ${d} کا سفر کرنا چاہتے ہیں۔ دستیاب بسیں دکھائی جا رہی ہیں۔`,
    needOrigin: 'براہ کرم روانگی کا شہر بتائیں۔',
    needDest: (o) => `ٹھیک ہے! آپ ${o} سے روانہ ہو رہے ہیں۔ آپ کس شہر جانا چاہتے ہیں؟`,
    lowConfidencePrompt: (c) => `کیا آپ کا مطلب ${c} ہے؟`,
  },
  pa: {
    complete: (o, d) => `ਠੀਕ ਹੈ! ਤੁਸੀਂ ${o} ਤੋਂ ${d} ਜਾਣ ਦੀ ਯਾਤਰਾ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ। ਉਪਲਬਧ ਬੱਸਾਂ ਦਿਖਾਈਆਂ ਜਾ ਰਹੀਆਂ ਹਨ:`,
    needOrigin: 'ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ।',
    needDest: (o) => `ਠੀਕ ਹੈ! ਤੁਸੀਂ ${o} ਤੋਂ ਚੱਲ ਰਹੇ ਹੋ। ਤੁਸੀਂ ਕਿਸ ਸ਼ਹਿਰ ਜਾਣਾ ਚਾਹੁੰਦੇ ਹੋ?`,
    lowConfidencePrompt: (c) => `ਕੀ ਤੁਹਾਡਾ ਮਤਲਬ ${c} ਹੈ?`,
  },
  or: {
    complete: (o, d) => `ଠିକ୍ ଅଛି! ଆପଣ ${o} ରୁ ${d} ଯାତ୍ରା କରିବାକୁ ଚାହାଁନ୍ତି। ବସ୍ ଗୁଡ଼ିକ ଦେଖାଯାଉଛି:`,
    needOrigin: 'ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ସହର କୁହନ୍ତୁ।',
    needDest: (o) => `ଠିକ୍ ଅଛି! ଆପଣ ${o} ରୁ ବାହାରୁଛନ୍ତି। ଆପଣ କେଉଁ ସହରକୁ ଯିବେ?`,
    lowConfidencePrompt: (c) => `ଆପଣଙ୍କ ଅର୍ଥ ${c} କି?`,
  },
  en: {
    complete: (o, d) => `Got it! You're planning to travel from ${o} to ${d}. Showing available buses for you:`,
    needOrigin: 'Please specify your origin city (e.g., Vijayawada, Kochi, Hyderabad).',
    needDest: (o) => `Got it! You are departing from ${o}. Where would you like to travel to? (e.g. Hyderabad, Warangal).`,
    lowConfidencePrompt: (c) => `Did you mean ${c}? Please confirm.`,
  },
};

export function getResponseTemplate(lang: string): ResponseTemplate {
  return RESPONSE_TEMPLATES[lang] || RESPONSE_TEMPLATES.en;
}

// "No direct buses on this route — here are connecting options" in all 12 languages.
export const NO_DIRECT_MESSAGES: Record<string, (o: string, d: string) => string> = {
  te: (o, d) => `${o} నుండి ${d} కు నేరుగా బస్సులు లేవు. ${o} నుండి ${d} కు కనెక్టింగ్ (బ్రేక్) ప్రయాణ మార్గాలను చూపిస్తున్నాము.`,
  hi: (o, d) => `${o} से ${d} के लिए कोई सीधी बस नहीं है। हम आपको कनेक्टिंग (ब्रेक) यात्रा विकल्प दिखा रहे हैं।`,
  ta: (o, d) => `${o} இலிருந்து ${d} க்கு நேரடி பேருந்துகள் இல்லை. இணைப்பு (பிரேக்) பயண வழிகளைக் காட்டுகிறோம்.`,
  kn: (o, d) => `${o} ದಿಂದ ${d} ಗೆ ನೇರ ಬಸ್ ಇಲ್ಲ. ಸಂಪರ್ಕಿಸುವ (ಬ್ರೇಕ್) ಪ್ರಯಾಣ ಆಯ್ಕೆಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ.`,
  ml: (o, d) => `${o} ൽ നിന്ന് ${d} ലേക്ക് നേരിട്ടുള്ള ബസുകൾ ഇല്ല. കണക്റ്റിംഗ് (ബ്രേക്ക്) യാത്രാ മാർഗങ്ങൾ കാണിക്കുന്നു.`,
  mr: (o, d) => `${o} ते ${d} थेट बस नाही. आम्ही कनेक्टिंग (ब्रेक) प्रवास पर्याय दाखवत आहोत.`,
  gu: (o, d) => `${o} થી ${d} માટે સીધી બસ નથી. અમે કનેક્ટિંગ (બ્રેક) મુસાફરી વિકલ્પો બતાવી રહ્યા છીએ.`,
  bn: (o, d) => `${o} থেকে ${d} সরাসরি বাস নেই। আমরা সংযোগকারী (ব্রেক) যাত্রার বিকল্প দেখাচ্ছি।`,
  ur: (o, d) => `${o} سے ${d} کے لیے کوئی براہ راست بس نہیں ہے۔ ہم کنیکٹنگ (بریک) سفر کے اختیارات دکھا رہے ہیں۔`,
  pa: (o, d) => `${o} ਤੋਂ ${d} ਲਈ ਕੋਈ ਸਿੱਧੀ ਬੱਸ ਨਹੀਂ ਹੈ। ਅਸੀਂ ਕਨੈਕਟਿੰਗ (ਬ੍ਰੇਕ) ਯਾਤਰਾ ਵਿਕਲਪ ਦਿਖਾ ਰਹੇ ਹਾਂ।`,
  or: (o, d) => `${o} ରୁ ${d} କୁ କୌଣସି ସିଧା ବସ୍ ନାହିଁ। ଆମେ ସଂଯୋଗକାରୀ (ବ୍ରେକ୍) ଯାତ୍ରା ବିକଳ୍ପ ଦେଖାଉଛୁ।`,
  en: (o, d) => `No direct buses run from ${o} to ${d}. Showing connecting (break) journey options via a major hub.`,
};

// "Which leg would you like to book?" prompt shown when a connecting journey is picked.
export const CONNECTING_CHOICE_PROMPT: Record<string, string> = {
  te: 'ఈ కనెక్టింగ్ ప్రయాణానికి మీరు ఏమి చేయాలనుకుంటున్నారు? లెగ్ 1 బుక్ చేయాలా, లెగ్ 2 బుక్ చేయాలా, లేదా రెండింటినీ చూడాలా?',
  hi: 'इस कनेक्टिंग यात्रा के लिए आप क्या करना चाहते हैं? लेग 1 बुक करें, लेग 2 बुक करें, या दोनों देखें?',
  ta: 'இந்த இணைப்பு பயணத்திற்கு நீங்கள் என்ன செய்ய விரும்புகிறீர்கள்? லெக் 1 புக் செய்யவா, லெக் 2 புக் செய்யவா, அல்லது இரண்டையும் பார்க்கவா?',
  kn: 'ಈ ಸಂಪರ್ಕ ಪ್ರಯಾಣಕ್ಕೆ ನೀವು ಏನು ಮಾಡಲು ಬಯಸುತ್ತೀರಿ? ಲೆಗ್ 1 ಬುಕ್ ಮಾಡಿ, ಲೆಗ್ 2 ಬುಕ್ ಮಾಡಿ, ಅಥವಾ ಎರಡನ್ನೂ ನೋಡಿ?',
  ml: 'ഈ കണക്റ്റിംഗ് യാത്രയ്ക്ക് നിങ്ങൾ എന്ത് ചെയ്യാൻ ആഗ്രഹിക്കുന്നു? ലെഗ് 1 ബുക്ക് ചെയ്യണോ, ലെഗ് 2 ബുക്ക് ചെയ്യണോ, അതോ രണ്ടും കാണണോ?',
  mr: 'या कनेक्टिंग प्रवासासाठी तुम्हाला काय करायचे आहे? लेग 1 बुक करा, लेग 2 बुक करा, की दोन्ही पहा?',
  gu: 'આ કનેક્ટિંગ મુસાફરી માટે તમે શું કરવા માંગો છો? લેગ 1 બુક કરો, લેગ 2 બુક કરો, કે બંને જુઓ?',
  bn: 'এই সংযোগকারী যাত্রার জন্য আপনি কী করতে চান? লেগ ১ বুক করুন, লেগ ২ বুক করুন, নাকি দুটোই দেখুন?',
  ur: 'اس کنیکٹنگ سفر کے لیے آپ کیا کرنا چاہتے ہیں؟ لیگ 1 بک کریں، لیگ 2 بک کریں، یا دونوں دیکھیں؟',
  pa: 'ਇਸ ਕਨੈਕਟਿੰਗ ਯਾਤਰਾ ਲਈ ਤੁਸੀਂ ਕੀ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ? ਲੈੱਗ 1 ਬੁੱਕ ਕਰੋ, ਲੈੱਗ 2 ਬੁੱਕ ਕਰੋ, ਜਾਂ ਦੋਵੇਂ ਵੇਖੋ?',
  or: 'ଏହି ସଂଯୋଗକାରୀ ଯାତ୍ରା ପାଇଁ ଆପଣ କଣ କରିବାକୁ ଚାହାଁନ୍ତି? ଲେଗ୍ 1 ବୁକ୍ କରନ୍ତୁ, ଲେଗ୍ 2 ବୁକ୍ କରନ୍ତୁ, କିମ୍ବା ଦୁଇଟି ଦେଖନ୍ତୁ?',
  en: 'For this connecting journey, what would you like to do — book Leg 1, book Leg 2, or view both?',
};

export const CONNECTING_CHOICE_LABELS: Record<
  string,
  { leg1: string; leg2: string; both: string; select: string }
> = {
  te: { leg1: 'లెగ్ 1 బుక్ చేయండి', leg2: 'లెగ్ 2 బుక్ చేయండి', both: 'రెండింటినీ చూడండి', select: 'ఈ మార్గాన్ని ఎంచుకోండి' },
  hi: { leg1: 'लेग 1 बुक करें', leg2: 'लेग 2 बुक करें', both: 'दोनों देखें', select: 'यह मार्ग चुनें' },
  ta: { leg1: 'லெக் 1 புக் செய்', leg2: 'லெக் 2 புக் செய்', both: 'இரண்டையும் பார்', select: 'இந்த வழியைத் தேர்வுசெய்' },
  kn: { leg1: 'ಲೆಗ್ 1 ಬುಕ್ ಮಾಡಿ', leg2: 'ಲೆಗ್ 2 ಬುಕ್ ಮಾಡಿ', both: 'ಎರಡನ್ನೂ ನೋಡಿ', select: 'ಈ ಮಾರ್ಗ ಆಯ್ಕೆಮಾಡಿ' },
  ml: { leg1: 'ലെഗ് 1 ബുക്ക് ചെയ്യുക', leg2: 'ലെഗ് 2 ബുക്ക് ചെയ്യുക', both: 'രണ്ടും കാണുക', select: 'ഈ വഴി തിരഞ്ഞെടുക്കുക' },
  mr: { leg1: 'लेग 1 बुक करा', leg2: 'लेग 2 बुक करा', both: 'दोन्ही पहा', select: 'हा मार्ग निवडा' },
  gu: { leg1: 'લેગ 1 બુક કરો', leg2: 'લેગ 2 બુક કરો', both: 'બંને જુઓ', select: 'આ માર્ગ પસંદ કરો' },
  bn: { leg1: 'লেগ ১ বুক করুন', leg2: 'লেগ ২ বুক করুন', both: 'দুটোই দেখুন', select: 'এই পথ নির্বাচন করুন' },
  ur: { leg1: 'لیگ 1 بک کریں', leg2: 'لیگ 2 بک کریں', both: 'دونوں دیکھیں', select: 'یہ راستہ منتخب کریں' },
  pa: { leg1: 'ਲੈੱਗ 1 ਬੁੱਕ ਕਰੋ', leg2: 'ਲੈੱਗ 2 ਬੁੱਕ ਕਰੋ', both: 'ਦੋਵੇਂ ਵੇਖੋ', select: 'ਇਹ ਰਸਤਾ ਚੁਣੋ' },
  or: { leg1: 'ଲେଗ୍ 1 ବୁକ୍ କରନ୍ତୁ', leg2: 'ଲେଗ୍ 2 ବୁକ୍ କରନ୍ତୁ', both: 'ଦୁଇଟି ଦେଖନ୍ତୁ', select: 'ଏହି ମାର୍ଗ ବାଛନ୍ତୁ' },
  en: { leg1: 'Book Leg 1', leg2: 'Book Leg 2', both: 'View Both', select: 'Select this journey' },
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
  // Only overwrite a captured detail when the new utterance actually mentions it,
  // so answering one follow-up never wipes what was already understood (BUG 2).
  const updatedDate = prefResult.date || currentState.date || new Date().toISOString().split('T')[0];
  const updatedTime = prefResult.time || currentState.time;
  const updatedBusType = prefResult.busType || currentState.busType;
  const updatedSeatType = prefResult.seatType || currentState.seatType;

  // Merge newly-heard cities with what we already have — never reset existing state.
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

  const langRes = getResponseTemplate(detectedLang);
  let responseText = '';

  const detailsList: string[] = [];
  if (prefResult.date && prefResult.date !== new Date().toISOString().split('T')[0]) detailsList.push(prefResult.date);
  if (updatedTime) detailsList.push(updatedTime);
  if (updatedBusType) detailsList.push(updatedBusType);
  if (updatedSeatType) detailsList.push(updatedSeatType);
  const detailsStr = detailsList.join(' · ');

  if (cityResult.confidence === 'low' && cityResult.lowConfCity && !isComplete) {
    responseText = langRes.lowConfidencePrompt(cityResult.lowConfCity);
  } else if (isComplete) {
    // Confirm the parsed route; the Results page decides direct vs connecting and
    // shows the connecting (break) journeys when there are no direct buses (BUG 4).
    responseText = (detailsStr ? detailsStr + ' — ' : '') + langRes.complete(originNative, destNative);
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
    breakRoutes: undefined,
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
