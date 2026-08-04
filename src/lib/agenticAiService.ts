import { CITY_ALIASES } from './cities';
import { CITIES, CITY_TRANSLATIONS } from './cityData';
import { LANGUAGE_CODES } from './languages';
import { BreakJourneyRoute, hasDirectBuses } from './breakJourneyService';
import { normalizeForNlu } from './textNormalize';
import {
  extractFilters,
  mergeFilters,
  describeFilters,
  hasAnyFilter,
  EMPTY_FILTERS,
  type VoiceFilters,
} from './filterExtraction';
import {
  generateDynamicListings,
  applyResultFilters,
  voiceFiltersToResultFilters,
  suggestRelaxation,
  type ResultFilterState,
} from './listings';
import {
  filterAppliedMessage,
  filterClearedMessage,
  filterNoResultsMessage,
} from './filterMessages';

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
  /** Spoken filters accumulated across turns — follow-ups merge, never reset (ISSUE 1e). */
  filters: VoiceFilters;
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

// ISSUE 2: real users code-mix ("\u0C35\u0C48\u0C1C\u0C3E\u0C17\u0C4D to Bangalore tomorrow volvo"). Detection is
// therefore by DOMINANT script \u2014 the script with the most characters wins \u2014 rather
// than by "first script range that matches anything", which used to let a single
// stray character decide the language of an otherwise-English sentence.
const SCRIPT_RANGES: { lang: string; re: RegExp }[] = [
  { lang: 'te', re: /[\u0C00-\u0C7F]/g },
  { lang: 'kn', re: /[\u0C80-\u0CFF]/g },
  { lang: 'ml', re: /[\u0D00-\u0D7F]/g },
  { lang: 'ta', re: /[\u0B80-\u0BFF]/g },
  { lang: 'gu', re: /[\u0A80-\u0AFF]/g },
  { lang: 'bn', re: /[\u0980-\u09FF]/g },
  { lang: 'pa', re: /[\u0A00-\u0A7F]/g },
  { lang: 'or', re: /[\u0B00-\u0B7F]/g },
  { lang: 'ur', re: /[\u0600-\u06FF]/g },
  // Devanagari is shared by Hindi and Marathi; disambiguated below by keywords.
  { lang: 'hi', re: /[\u0900-\u097F]/g },
];

// Romanized keyword hints, matched with WORD BOUNDARIES so "se" no longer matches
// inside "buses" and "to" no longer matches inside "tomorrow". Latin-only tokens.
// Weighted: a distinctive word ("nunchi", "theke") counts more than an ambiguous
// particle ("ki", "se") that several languages share.
const ROMANIZED_HINTS: Record<string, { re: RegExp; w: number }[]> = {
  te: [
    { re: /\bnenu\b/, w: 2 }, { re: /\bnundi\b/, w: 3 }, { re: /\bnunchi\b/, w: 3 },
    { re: /\bninchi\b/, w: 3 }, { re: /\bnunchee\b/, w: 3 }, { re: /\bvellali\b/, w: 3 },
    { re: /\bkavali\b/, w: 3 }, { re: /\brepu\b/, w: 3 }, { re: /\bellundi\b/, w: 3 },
    { re: /\blopu\b/, w: 3 }, { re: /\bekkuva\b/, w: 2 }, { re: /\btakkuva\b/, w: 2 },
    { re: /\bbussu\b/, w: 2 }, { re: /\bku\b/, w: 1 }, { re: /\bki\b/, w: 1 },
    { re: /\bmadhya\b/, w: 2 }, { re: /\bkanna\b/, w: 2 }, { re: /\bkante\b/, w: 2 },
  ],
  hi: [
    { re: /\bmujhe\b/, w: 3 }, { re: /\bjana\b/, w: 2 }, { re: /\bjaana\b/, w: 3 },
    { re: /\bchahiye\b/, w: 3 }, { re: /\bse\b/, w: 2 }, { re: /\btak\b/, w: 2 },
    { re: /\bkal\b/, w: 2 }, { re: /\baaj\b/, w: 2 }, { re: /\bparso\b/, w: 3 },
    { re: /\bbas\b/, w: 1 }, { re: /\bupar\b/, w: 2 }, { re: /\bzyada\b/, w: 2 },
    { re: /\bjyada\b/, w: 2 }, { re: /\bkam\b/, w: 1 }, { re: /\bke\b/, w: 1 },
  ],
  mr: [
    { re: /\bmala\b/, w: 3 }, { re: /\bpahije\b/, w: 3 }, { re: /\bpasun\b/, w: 3 },
    { re: /\bhava\b/, w: 2 }, { re: /\bjaycha\b/, w: 3 }, { re: /\budya\b/, w: 3 },
    { re: /\bparyant\b/, w: 3 },
  ],
  ml: [
    { re: /\benikku\b/, w: 3 }, { re: /\bninnu\b/, w: 3 }, { re: /\bpokanam\b/, w: 3 },
    { re: /\bvenam\b/, w: 2 }, { re: /\bcheyyu\b/, w: 2 }, { re: /\bnale\b/, w: 3 },
    { re: /\blekku\b/, w: 2 },
  ],
  ta: [
    { re: /\benakku\b/, w: 3 }, { re: /\birundhu\b/, w: 3 }, { re: /\bilirundhu\b/, w: 3 },
    { re: /\bponganum\b/, w: 3 }, { re: /\bvendum\b/, w: 3 }, { re: /\bpoga\b/, w: 2 },
    { re: /\bnalaikku\b/, w: 3 }, { re: /\bvarai\b/, w: 2 },
  ],
  kn: [
    { re: /\bnanage\b/, w: 3 }, { re: /\bbeku\b/, w: 3 }, { re: /\binda\b/, w: 2 },
    { re: /\bhoga\b/, w: 2 }, { re: /\bhogabeku\b/, w: 3 }, { re: /\bnale\b/, w: 2 },
    { re: /\bge\b/, w: 1 },
  ],
  gu: [
    { re: /\bmare\b/, w: 2 }, { re: /\bjoiye\b/, w: 3 }, { re: /\bthi\b/, w: 2 },
    { re: /\bjavu\b/, w: 3 }, { re: /\bsudhi\b/, w: 2 }, { re: /\bavtikale\b/, w: 3 },
  ],
  bn: [
    { re: /\bamake\b/, w: 3 }, { re: /\btheke\b/, w: 3 }, { re: /\bjete\b/, w: 2 },
    { re: /\bchai\b/, w: 2 }, { re: /\bkal\b/, w: 1 }, { re: /\bporjonto\b/, w: 3 },
  ],
  pa: [
    { re: /\bmainu\b/, w: 3 }, { re: /\bton\b/, w: 2 }, { re: /\bchahida\b/, w: 3 },
    { re: /\bbhalke\b/, w: 3 }, { re: /\btakk\b/, w: 2 },
  ],
  ur: [
    { re: /\bmujhe\b/, w: 2 }, { re: /\bjana\b/, w: 1 }, { re: /\bchahiye\b/, w: 2 },
    { re: /\bchahta\b/, w: 2 },
  ],
  or: [
    { re: /\bmote\b/, w: 3 }, { re: /\bjibi\b/, w: 3 }, { re: /\basantakali\b/, w: 3 },
    { re: /\bru\b/, w: 1 },
  ],
};

// Marathi vs Hindi (both Devanagari) \u2014 a few unambiguous Marathi markers.
const MARATHI_MARKERS = ['\u092A\u093E\u0938\u0942\u0928', '\u092A\u093E\u0939\u093F\u091C\u0947', '\u0939\u0935\u0902', '\u0939\u0935\u0947', '\u091C\u093E\u092F\u091A\u0902', '\u092E\u0932\u093E', '\u0906\u0939\u0947'];

/** Character count per script, so a code-mixed sentence resolves to its main script. */
function scriptCounts(text: string): { lang: string; count: number }[] {
  return SCRIPT_RANGES.map(({ lang, re }) => ({
    lang,
    count: (text.match(re) || []).length,
  })).filter((s) => s.count > 0);
}

export function detectLanguageFromText(text: string, currentLang: string): string {
  const trimmed = (text || '').normalize('NFC').trim();
  if (!trimmed) return currentLang;

  const counts = scriptCounts(trimmed).sort((a, b) => b.count - a.count);
  if (counts.length > 0) {
    const top = counts[0];
    // A couple of stray native characters in an otherwise-Latin sentence are not
    // enough to switch language; require either a clear majority or 3+ characters.
    const latinCount = (trimmed.match(/[a-z]/gi) || []).length;
    if (top.count >= 3 || top.count >= latinCount) {
      if (top.lang === 'hi' && MARATHI_MARKERS.some((m) => trimmed.includes(m))) return 'mr';
      return top.lang;
    }
  }

  // Latin transcript: score weighted romanized hints per language.
  const lower = ` ${trimmed.toLowerCase()} `;
  let best: string | null = null;
  let bestScore = 0;
  for (const [lang, patterns] of Object.entries(ROMANIZED_HINTS)) {
    const score = patterns.reduce((acc, p) => acc + (p.re.test(lower) ? p.w : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = lang;
    }
  }
  // Require a meaningful signal (a distinctive word, or two weak particles) before
  // overriding the language the user actually picked.
  if (best && bestScore >= 2) return best;

  // No strong signal: keep the user's selected language rather than forcing English.
  return currentLang;
}

// Directional connectives come in two shapes and must be handled separately.
//
// English PREPOSITIONS sit BEFORE their city ("from Vizag to Delhi"), so the rule is
// "the first city after the marker".
const ORIGIN_MARKERS = ['from', 'frm', 'starting from', 'departing from'];
const DEST_MARKERS = ['to', 'towards', 'going to', 'reaching'];

// Indic POSTPOSITIONS sit AFTER their city and may be glued onto it
// ("విజయవాడకు", "chennaiku", "delhi se"). ISSUE 2: relying on left-to-right order
// alone was wrong — "chennai ku repu" names a DESTINATION, but position order made
// it the origin. Roles are now read from the postposition that follows each city.
// Longest-first so "nunchi" wins over "chi" and "irundhu" over "ru".
const ORIGIN_POSTPOSITIONS = [
  // Telugu
  'నుండి', 'నుంచి', 'నించి', 'నుండీ', 'nunchi', 'nundi', 'ninchi', 'nunchee', 'nunchi',
  // Hindi / Urdu / Marathi
  'से', 'سے', 'पासून', 'हून', 'se', 'pasun', 'hun',
  // Tamil
  'இலிருந்து', 'இருந்து', 'ilirundhu', 'irundhu', 'iruntu',
  // Kannada
  'ದಿಂದ', 'ಇಂದ', 'ninda', 'inda',
  // Malayalam
  'ൽനിന്ന്', 'നിന്ന്', 'നിന്നു', 'ninnu', 'ninnum',
  // Gujarati
  'થી', 'thi',
  // Bengali
  'থেকে', 'theke',
  // Punjabi
  'ਤੋਂ', 'ton',
  // Odia
  'ରୁ',
];

const DEST_POSTPOSITIONS = [
  // Telugu
  'వరకు', 'కు', 'కి', 'varaku', 'ku', 'ki',
  // Hindi / Urdu
  'तक', 'को', 'تک', 'کو', 'tak', 'ko',
  // Marathi
  'पर्यंत', 'ला', 'paryant',
  // Tamil
  'வரை', 'க்கு', 'kku', 'varai',
  // Kannada
  'ವರೆಗೆ', 'ಗೆ', 'ige', 'ge',
  // Malayalam
  'ലേക്ക്', 'ലേക്കു', 'lekku', 'lek',
  // Gujarati
  'સુધી', 'ને', 'sudhi',
  // Bengali
  'পর্যন্ত', 'তে', 'porjonto',
  // Punjabi
  'ਤੱਕ', 'ਨੂੰ', 'takk',
  // Odia
  'କୁ',
];

function sortLongestFirst(list: string[]): string[] {
  return [...list].sort((a, b) => b.length - a.length);
}

const ORIGIN_POST_SORTED = sortLongestFirst(ORIGIN_POSTPOSITIONS);
const DEST_POST_SORTED = sortLongestFirst(DEST_POSTPOSITIONS);

/**
 * Does `rest` (the text immediately following a city mention) begin with one of
 * `posts`? ASCII postpositions must be followed by a non-letter so "se" does not
 * match inside "sector" and "ku" does not match inside "kuch".
 */
function startsWithPostposition(rest: string, posts: string[]): boolean {
  const trimmed = rest.replace(/^[\s,.-]+/, '');
  for (const p of posts) {
    if (!trimmed.startsWith(p)) continue;
    const after = trimmed.charAt(p.length);
    if (/^[a-z]+$/.test(p)) {
      if (after === '' || !/[a-z0-9]/i.test(after)) return true;
    } else {
      return true;
    }
  }
  return false;
}

interface CityMatch {
  city: string;
  index: number;
  /** End offset of the matched alias, so the following postposition can be read. */
  end: number;
}

// Record the earliest text position for a city (keeps only the first occurrence).
function recordMatch(matches: CityMatch[], city: string, index: number, end: number) {
  if (index < 0) return;
  const existing = matches.find((m) => m.city === city);
  if (!existing) matches.push({ city, index, end });
  else if (index < existing.index) {
    existing.index = index;
    existing.end = end;
  }
}

// Precompute normalized+lowercased lookup tables once at module load.
const NORM_ALIAS_ENTRIES: [string, string][] = Object.entries(CITY_ALIASES)
  .map(([alias, canonical]) => [alias.normalize('NFC').toLowerCase(), canonical] as [string, string])
  // Longest alias first so "visakhapatnam" is preferred over the "visakha" prefix and
  // the recorded end offset lands after the whole city name.
  .sort((a, b) => b[0].length - a[0].length);

const NORM_CITY_ENTRIES: [string, string][] = CITIES.map(
  (c) => [c.normalize('NFC').toLowerCase(), c] as [string, string]
).sort((a, b) => b[0].length - a[0].length);

export interface CityExtraction {
  /** Resolved route in [origin, destination] order, with nulls dropped. */
  cities: string[];
  origin: string | null;
  destination: string | null;
  /** True when a postposition or preposition actually told us the role. */
  roleKnown: boolean;
  confidence: 'high' | 'medium' | 'low';
  lowConfCity?: string;
}

/** First city whose mention starts shortly after any occurrence of `markers`. */
function cityAfterMarker(
  lower: string,
  matches: CityMatch[],
  markers: string[]
): CityMatch | null {
  for (const marker of markers) {
    const re = new RegExp(`\\b${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    let m: RegExpExecArray | null;
    while ((m = re.exec(lower)) !== null) {
      const afterMarker = m.index + m[0].length;
      const hit = matches
        .filter((c) => c.index >= afterMarker && c.index - afterMarker <= 24)
        .sort((a, b) => a.index - b.index)[0];
      if (hit) return hit;
    }
  }
  return null;
}

// City normalizer matching strictly against the CITIES dataset. Handles native-script
// and transliterated connectors ("X టు Y", "X నుండి Y", "Y se X", "from X to Y"),
// glued grammatical suffixes ("విజయవాడకు", "chennaiku") and STT misspellings.
// Roles come from postpositions/prepositions first and positional order only as a
// last resort (ISSUE 2).
export function extractCitiesFromInput(text: string): CityExtraction {
  const lower = normalizeForNlu(text);
  const matches: CityMatch[] = [];

  // 1. Direct substring match — catches native-script cities even when a connector or
  //    grammatical suffix is attached ("విజయవాడకు", "బెంగళూరుటు", "bengalurutu").
  for (const [alias, canonical] of NORM_ALIAS_ENTRIES) {
    const at = lower.indexOf(alias);
    recordMatch(matches, canonical, at, at + alias.length);
  }
  for (const [name, canonical] of NORM_CITY_ENTRIES) {
    const at = lower.indexOf(name);
    recordMatch(matches, canonical, at, at + name.length);
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
        recordMatch(matches, canonical, at, at + alias.length);
        return;
      }
    }
    for (const [name, canonical] of NORM_CITY_ENTRIES) {
      if (tk === name || (name.length >= 4 && tk.startsWith(name))) {
        recordMatch(matches, canonical, at, at + name.length);
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
      let bestLen = 0;
      for (const [alias, canonical] of NORM_ALIAS_ENTRIES) {
        if (Math.abs(alias.length - tk.length) > 2) continue;
        const d = levenshteinDistance(tk, alias);
        if (d < bestDist) {
          bestDist = d;
          bestCity = canonical;
          bestLen = alias.length;
        }
      }
      if (!bestCity) continue;
      if (bestDist <= 1 && !matches.some((mm) => mm.city === bestCity)) {
        recordMatch(matches, bestCity, at, at + bestLen);
      } else if (bestDist === 2 && !lowConfCity && !matches.some((mm) => mm.city === bestCity)) {
        lowConfCity = bestCity;
      }
    }
  }

  matches.sort((a, b) => a.index - b.index);

  // --- Role assignment -----------------------------------------------------
  const roles = new Map<string, 'origin' | 'dest'>();

  // (a) Indic postpositions attached to / following each city.
  for (const m of matches) {
    const rest = lower.slice(m.end);
    if (startsWithPostposition(rest, ORIGIN_POST_SORTED)) roles.set(m.city, 'origin');
    else if (startsWithPostposition(rest, DEST_POST_SORTED)) roles.set(m.city, 'dest');
  }

  // (b) English prepositions preceding a city. These are explicit, so they win.
  const prepOrigin = cityAfterMarker(lower, matches, ORIGIN_MARKERS);
  if (prepOrigin) roles.set(prepOrigin.city, 'origin');
  const prepDest = cityAfterMarker(lower, matches, DEST_MARKERS);
  if (prepDest && prepDest.city !== prepOrigin?.city) roles.set(prepDest.city, 'dest');

  const roleKnown = roles.size > 0;

  let origin = matches.find((m) => roles.get(m.city) === 'origin')?.city ?? null;
  let destination = matches.find((m) => roles.get(m.city) === 'dest')?.city ?? null;
  const unassigned = matches.filter((m) => m.city !== origin && m.city !== destination);

  if (origin && !destination && unassigned.length) destination = unassigned[0].city;
  else if (!origin && destination && unassigned.length) origin = unassigned[0].city;
  else if (!origin && !destination) {
    // No directional cue at all: fall back to left-to-right order.
    if (matches.length >= 2) {
      origin = matches[0].city;
      destination = matches[1].city;
    } else if (matches.length === 1) {
      origin = matches[0].city;
    }
  }

  const cities = [origin, destination].filter((c): c is string => Boolean(c));
  const confidence: 'high' | 'medium' | 'low' =
    cities.length >= 2 ? 'high' : cities.length === 1 ? 'medium' : 'low';

  return { cities, origin, destination, roleKnown, confidence, lowConfCity };
}

/**
 * Merges a freshly parsed route with what the session already knows. Shared by the
 * voice bar and the chatbot so both behave identically:
 *  - an explicit role from a postposition/preposition always wins,
 *  - a single roleless city becomes the destination when an origin is already known
 *    (the natural reading of "and Mysuru?" mid-conversation),
 *  - nothing already captured is ever wiped by an utterance that did not mention it.
 */
export function resolveRoute(
  extraction: CityExtraction,
  prevOrigin: string | null,
  prevDestination: string | null
): { origin: string | null; destination: string | null } {
  let origin = prevOrigin;
  let destination = prevDestination;

  if (extraction.cities.length >= 2) {
    return { origin: extraction.origin, destination: extraction.destination };
  }

  if (extraction.cities.length === 1) {
    const city = extraction.cities[0];
    if (extraction.roleKnown && extraction.destination === city) {
      destination = city;
      if (origin && origin.toLowerCase() === city.toLowerCase()) origin = null;
    } else if (extraction.roleKnown && extraction.origin === city) {
      origin = city;
      if (destination && destination.toLowerCase() === city.toLowerCase()) destination = null;
    } else if (!origin) {
      origin = city;
    } else if (city.toLowerCase() !== origin.toLowerCase()) {
      destination = city;
    }
  }

  return { origin, destination };
}

// Relative-date keywords in every supported script AND the romanized forms people
// actually type/speak in code-mixed sentences ("repu", "kal", "nalaikku", "udya").
const TOMORROW_KEYWORDS = [
  'tomorrow', 'tmrw', 'రేపు', 'कल', 'நாளை', 'ನಾಳೆ', 'നാളെ', 'उद्या', 'આવતીકાલે', 'আগামীকাল',
  'کل', 'ਭਲਕੇ', 'ଆସନ୍ତାକାଲି', 'کل کو',
  'repu', 'rephu', 'kal', 'nalaikku', 'nalaiku', 'naale', 'nale', 'udya', 'udhya',
  'avtikale', 'agamikal', 'bhalke', 'asantakali',
];
const DAY_AFTER_KEYWORDS = [
  'day after tomorrow', 'day after', 'ఎల్లుండి', 'परसों', 'நாள்மறுநாள்', 'മറ്റന്നാൾ',
  'ਪਰਸੋਂ', 'પરમદિવસે', 'পরশু', 'ପରଦିନ', 'ellundi', 'yellundi', 'parso', 'parson', 'porshu',
];
const TODAY_KEYWORDS = [
  'today', 'ఈరోజు', 'ఇవాళ', 'आज', 'இன்று', 'ಇಂದು', 'ഇന്ന്', 'আজ', 'આજે', 'آج', 'ਅੱਜ', 'ଆଜି',
  'eeroju', 'ivala', 'ivaala', 'aaj', 'aj', 'indru', 'indu', 'innu', 'ajke', 'aje',
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

/**
 * Keyword test that is safe for mixed scripts: ASCII keywords must match on a word
 * boundary (so "aj" does not fire inside "rajahmundry" and "kal" does not fire inside
 * "kalyan"), while native-script keywords match as substrings because Indic scripts
 * have no usable \b in JavaScript regex.
 */
function matchesKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((k) => {
    if (/^[a-z0-9\s./-]+$/.test(k)) {
      const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`).test(text);
    }
    return text.includes(k);
  });
}

const EVENING_KEYWORDS = [
  'evening', 'సాయంత్రం', 'शाम', 'மாலை', 'ಸಂಜೆ', 'വൈകുന്നേരം', 'સાંજે', 'সন্ধ্যা', 'شام',
  'ਸ਼ਾਮ', 'ସନ୍ଧ୍ୟା', 'sayantram', 'shaam',
];
const MORNING_KEYWORDS = [
  'morning', 'ఉదయం', 'सुबह', 'காலை', 'ಬೆಳಿಗ್ಗೆ', 'രാവിലെ', 'સવારે', 'সকাল', 'صبح',
  'ਸਵੇਰ', 'ସକାଳ', 'udayam', 'subah', 'savere',
];
const NIGHT_KEYWORDS = [
  'night', 'రాత్రి', 'रात', 'இரவு', 'ರಾತ್ರಿ', 'രാത്രി', 'રાત', 'রাত', 'رات', 'ਰਾਤ',
  'ରାତି', 'ratri', 'raat',
];

// Continuous natural sentence entity extraction for Date, Time, Bus Type & Seat Type.
// `date` is null when the user did not mention a date, so callers can preserve any
// date already captured in the session instead of overwriting it with today.
export function extractContinuousPreferences(text: string): {
  date: string | null;
  time: string | null;
  busType: string | null;
  seatType: string | null;
} {
  const lower = normalizeForNlu(text);
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const dayAfter = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0];

  let date: string | null = null;
  if (matchesKeyword(lower, DAY_AFTER_KEYWORDS)) date = dayAfter;
  else if (matchesKeyword(lower, TOMORROW_KEYWORDS)) date = tomorrow;
  else if (matchesKeyword(lower, TODAY_KEYWORDS)) date = today;
  // Explicit ("5th August", "5 ఆగస్టు", "5/8") and weekday ("Friday", "శుక్రవారం")
  // dates, only when no relative keyword was spoken.
  if (!date) date = parseExplicitDate(lower);
  if (!date) date = parseWeekday(lower);

  let time: string | null = null;
  if (matchesKeyword(lower, EVENING_KEYWORDS)) time = 'Evening (after 6 PM)';
  else if (matchesKeyword(lower, MORNING_KEYWORDS)) time = 'Morning (before 12 PM)';
  else if (matchesKeyword(lower, NIGHT_KEYWORDS)) time = 'Night (after 9 PM)';
  else if (/\b6\s*pm\b/.test(lower)) time = 'After 6 PM';

  // Bus/seat type are derived from the shared filter extractor so the spoken filter
  // and the displayed preference can never disagree (ISSUE 1).
  const spokenFilters = extractFilters(text);
  let busType: string | null = null;
  if (spokenFilters.acStatus.includes('non-ac')) busType = 'Non-AC';
  else if (spokenFilters.acStatus.includes('ac')) busType = 'AC';
  if (spokenFilters.busModels.includes('volvo')) busType = busType ? busType + ' Volvo' : 'Volvo';

  let seatType: string | null = null;
  if (spokenFilters.busTypes.includes('semi-sleeper')) seatType = 'Semi-Sleeper';
  else if (spokenFilters.busTypes.includes('sleeper')) seatType = 'Sleeper';
  else if (spokenFilters.busTypes.includes('seater')) seatType = 'Seater';

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

/**
 * ISSUE 0(e): reports any supported language missing from the assistant's reply
 * tables, so a gap is visible instead of quietly falling back to English.
 * Consumed by i18nAudit.ts.
 */
export function auditResponseTemplates(): string[] {
  const gaps: string[] = [];
  for (const code of LANGUAGE_CODES) {
    if (!RESPONSE_TEMPLATES[code]) gaps.push(`RESPONSE_TEMPLATES.${code}`);
    if (!NO_DIRECT_MESSAGES[code]) gaps.push(`NO_DIRECT_MESSAGES.${code}`);
    if (!CONNECTING_CHOICE_PROMPT[code]) gaps.push(`CONNECTING_CHOICE_PROMPT.${code}`);
    if (!CONNECTING_CHOICE_LABELS[code]) gaps.push(`CONNECTING_CHOICE_LABELS.${code}`);
  }
  return gaps;
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

/** The "shall I show you these instead?" offer produced when filters match nothing. */
export interface FilterRelaxationOffer {
  filters: ResultFilterState;
  count: number;
  relaxed: string;
}

export function processUserMessage(
  userText: string,
  currentState: ConversationState
): {
  responseMessage: ChatMessage;
  nextState: ConversationState;
  structuredIntent: StructuredAiIntent;
  filters: VoiceFilters;
  relaxationOffer?: FilterRelaxationOffer;
} {
  const detectedLang = detectLanguageFromText(userText, currentState.language);
  const cityResult = extractCitiesFromInput(userText);
  const prefResult = extractContinuousPreferences(userText);

  // Spoken filters merge into whatever was already captured, so "only Volvo" after
  // "1000 to 1500 with 4+ rating" keeps the price range and the rating (ISSUE 1e).
  const spokenFilters = extractFilters(userText);
  const mergedFilters = mergeFilters(currentState.filters || EMPTY_FILTERS, spokenFilters);

  // Only overwrite a captured detail when the new utterance actually mentions it,
  // so answering one follow-up never wipes what was already understood (BUG 2).
  const updatedDate = prefResult.date || currentState.date || new Date().toISOString().split('T')[0];
  const updatedTime = prefResult.time || currentState.time;
  const updatedBusType = prefResult.busType || currentState.busType;
  const updatedSeatType = prefResult.seatType || currentState.seatType;

  // Merge newly-heard cities with what we already have — never reset existing state.
  // Roles come from postpositions/prepositions, so "chennai ku" sets the DESTINATION.
  const { origin: updatedOrigin, destination: updatedDest } = resolveRoute(
    cityResult,
    currentState.origin,
    currentState.destination
  );

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
  const detailsStr = detailsList.join(' · ');

  // Filter confirmation / zero-result relaxation, computed against the SAME listings
  // the results page will render so the quoted count is always truthful (ISSUE 1c/1d).
  const filterSummary = describeFilters(mergedFilters, detectedLang);
  let filterSentence = '';
  let relaxationOffer: FilterRelaxationOffer | undefined;

  if (isComplete && updatedOrigin && updatedDest) {
    const inventory = hasDirectBuses(updatedOrigin, updatedDest)
      ? generateDynamicListings(updatedOrigin, updatedDest, updatedDate)
      : [];
    const resultFilters = voiceFiltersToResultFilters(mergedFilters);

    if (inventory.length > 0) {
      if (spokenFilters.reset) {
        filterSentence = filterClearedMessage(detectedLang, inventory.length);
      } else if (hasAnyFilter(mergedFilters)) {
        const matched = applyResultFilters(inventory, resultFilters);
        if (matched.length > 0) {
          filterSentence = filterAppliedMessage(detectedLang, filterSummary, matched.length);
        } else {
          const relaxation = suggestRelaxation(inventory, resultFilters);
          if (relaxation) {
            filterSentence = filterNoResultsMessage(
              detectedLang,
              filterSummary,
              relaxation.relaxed,
              relaxation.count,
              relaxation.samplePrice
            );
            relaxationOffer = {
              filters: relaxation.filters,
              count: relaxation.count,
              relaxed: relaxation.relaxed,
            };
          }
        }
      }
    }
  }

  if (cityResult.confidence === 'low' && cityResult.lowConfCity && !isComplete) {
    responseText = langRes.lowConfidencePrompt(cityResult.lowConfCity);
  } else if (isComplete) {
    // Confirm the parsed route; the Results page decides direct vs connecting and
    // shows the connecting (break) journeys when there are no direct buses (BUG 4).
    responseText = (detailsStr ? detailsStr + ' — ' : '') + langRes.complete(originNative, destNative);
    if (filterSentence) responseText += ` ${filterSentence}`;
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
    maxBudget: mergedFilters.maxPrice ?? currentState.maxBudget,
    language: detectedLang,
    step: isComplete ? 'complete' : !updatedOrigin ? 'origin' : 'destination',
    confidence: cityResult.confidence,
    filters: mergedFilters,
  };

  const budgetLabel =
    mergedFilters.minPrice !== null && mergedFilters.maxPrice !== null
      ? `₹${mergedFilters.minPrice}-₹${mergedFilters.maxPrice}`
      : mergedFilters.maxPrice !== null
      ? `≤ ₹${mergedFilters.maxPrice}`
      : mergedFilters.minPrice !== null
      ? `≥ ₹${mergedFilters.minPrice}`
      : currentState.maxBudget
      ? `₹${currentState.maxBudget}`
      : null;

  const structuredIntent: StructuredAiIntent = {
    language: detectedLang,
    source: updatedOrigin,
    destination: updatedDest,
    date: updatedDate,
    time: updatedTime,
    seat_type: updatedSeatType,
    bus_type: updatedBusType,
    budget: budgetLabel,
    confidence: cityResult.confidence === 'high' ? 0.98 : cityResult.confidence === 'medium' ? 0.85 : 0.60,
  };

  return { responseMessage, nextState, structuredIntent, filters: mergedFilters, relaxationOffer };
}
