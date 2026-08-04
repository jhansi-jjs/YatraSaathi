// ISSUE 1: the assistant used to ignore every filter the user spoke — asking for
// "1000 to 1500 buses, AC sleeper and Volvo with 4+ rating" returned the unfiltered
// list. This module extracts price range, bus type, AC status, bus model, minimum
// rating and amenities from ONE utterance, in every supported language (native
// script and romanized), and returns ONLY what was actually mentioned so callers can
// MERGE follow-ups instead of resetting them ("only Volvo" keeps price + rating).

import { normalizeForNlu, expandMagnitudes } from './textNormalize';

export interface VoiceFilters {
  minPrice: number | null;
  maxPrice: number | null;
  /** 'sleeper' | 'semi-sleeper' | 'seater' — matches BusListing.bus_type */
  busTypes: string[];
  /** 'ac' | 'non-ac' — matches BusListing.ac_status */
  acStatus: string[];
  /** 'volvo' | 'bharatbenz' | 'other' — matches BusListing.bus_model */
  busModels: string[];
  minRating: number | null;
  amenities: string[];
  /** True when the user asked to clear filters ("show all buses", "అన్ని బస్సులు"). */
  reset: boolean;
}

export const EMPTY_FILTERS: VoiceFilters = {
  minPrice: null,
  maxPrice: null,
  busTypes: [],
  acStatus: [],
  busModels: [],
  minRating: null,
  amenities: [],
  reset: false,
};

// ---------------------------------------------------------------------------
// Keyword tables. Each entry lists the term in English, romanized Indian English
// and the native script of every supported language. Matching is substring-based
// because Indic scripts have no reliable word boundary in a JS regex.
// ---------------------------------------------------------------------------

const SLEEPER = [
  'sleeper', 'sleepr', 'slipper bus', 'లీపర్', 'స్లీపర్', 'स्लीपर', 'ஸ்லீப்பர்', 'ಸ್ಲೀಪರ್',
  'സ്ലീപ്പർ', 'સ્લીપર', 'স্লিপার', 'سلیپر', 'ਸਲੀਪਰ', 'ସ୍ଲିପର', 'పడుకునే', 'शयन',
];

const SEMI_SLEEPER = [
  'semi sleeper', 'semi-sleeper', 'semisleeper', 'semi slipper',
  'సెమీ స్లీపర్', 'सेमी स्लीपर', 'செமி ஸ்லீப்பர்', 'ಸೆಮಿ ಸ್ಲೀಪರ್', 'സെമി സ്ലീപ്പർ',
  'સેમી સ્લીપર', 'সেমি স্লিপার', 'سیمی سلیپر', 'ਸੈਮੀ ਸਲੀਪਰ', 'ସେମି ସ୍ଲିପର',
];

const SEATER = [
  'seater', 'seating', 'seat bus', 'సీటర్', 'సీటింగ్', 'सीटर', 'बैठक', 'சீட்டர்', 'ಸೀಟರ್',
  'സീറ്റർ', 'સીટર', 'সিটার', 'سیٹر', 'ਸੀਟਰ', 'ସିଟର',
];

const NON_AC = [
  'non ac', 'non-ac', 'nonac', 'non a/c', 'without ac', 'no ac',
  'నాన్ ఏసీ', 'ఏసీ కాదు', 'ఏసి కాదు', 'नॉन एसी', 'बिना एसी', 'नॉन-एसी',
  'நான் ஏசி', 'ஏசி இல்லாத', 'ನಾನ್ ಎಸಿ', 'എസി അല്ലാത്ത', 'નોન એસી', 'নন এসি',
  'نان اے سی', 'ਨਾਨ ਏਸੀ', 'ନନ୍ ଏସି',
];

// Native-script AC spellings are safe to substring-match; the Latin ones are not
// ("ac" appears inside plenty of ordinary words), so those go through a word-boundary
// regex in extractFilters instead.
const AC_NATIVE = [
  'ఏసీ', 'ఏసి', 'एसी', 'ஏசி', 'ಎಸಿ', 'എസി', 'એસી', 'এসি', 'اے سی', 'ਏਸੀ', 'ଏସି',
  'శీతల', 'वातानुकूलित',
];

const VOLVO = [
  'volvo', 'volvo bus', 'scania', 'multi axle', 'multi-axle', 'multiaxle', 'multiaxel',
  'వోల్వో', 'వాల్వో', 'वोल्वो', 'वॉल्वो', 'வால்வோ', 'ವೋಲ್ವೋ', 'വോൾവോ', 'વોલ્વો',
  'ভলভো', 'وولوو', 'ਵੋਲਵੋ', 'ଭଲଭୋ',
];

const BHARATBENZ = ['bharat benz', 'bharatbenz', 'benz', 'భారత్ బెంజ్', 'भारत बेंज', 'বেঞ্জ'];

const AMENITY_TERMS: { key: string; terms: string[] }[] = [
  { key: 'wifi', terms: ['wifi', 'wi-fi', 'wi fi', 'వైఫై', 'वाईफाई', 'வைஃபை', 'ವೈಫೈ', 'വൈഫൈ', 'વાઇફાઇ', 'ওয়াইফাই'] },
  { key: 'charging', terms: ['charging', 'charger', 'charging point', 'ఛార్జింగ్', 'चार्जिंग', 'சார்ஜிங்', 'ಚಾರ್ಜಿಂಗ್', 'ചാർജിംഗ്', 'ચાર્જિંગ', 'চার্জিং'] },
  { key: 'blanket', terms: ['blanket', 'బ్లాంకెట్', 'दुलई', 'कंबल', 'போர்வை', 'ಕಂಬಳಿ', 'പുതപ്പ്', 'ધાબળો', 'কম্বল'] },
  { key: 'water', terms: ['water bottle', 'mineral water', 'నీళ్ల బాటిల్', 'पानी की बोतल', 'தண்ணீர்', 'ನೀರು', 'വെള്ളം'] },
  { key: 'tracking', terms: ['live tracking', 'gps tracking', 'ట్రాకింగ్', 'ट्रैकिंग', 'டிராக்கிங்', 'ಟ್ರ್ಯಾಕಿಂಗ್'] },
  { key: 'cctv', terms: ['cctv', 'camera', 'సీసీటీవీ', 'सीसीटीवी'] },
  { key: 'toilet', terms: ['toilet', 'washroom', 'టాయిలెట్', 'शौचालय'] },
];

// "show all buses" / "clear the filters" / "remove filters", per language.
const RESET_TERMS = [
  'clear filter', 'clear filters', 'remove filter', 'remove filters', 'reset filter',
  'reset filters', 'show all buses', 'show all the buses', 'all buses', 'no filter',
  'అన్ని బస్సులు', 'ఫిల్టర్ తీసేయ', 'ఫిల్టర్లు తొలగించ',
  'सभी बसें', 'सारी बसें', 'फिल्टर हटा', 'सब बसें',
  'எல்லா பேருந்துகள்', 'ಎಲ್ಲಾ ಬಸ್', 'എല്ലാ ബസുകൾ', 'બધી બસો', 'সব বাস',
  'ਸਾਰੀਆਂ ਬੱਸਾਂ', 'ସମସ୍ତ ବସ୍', 'تمام بسیں',
];

// "under 1500" / "1500 లోపు" / "1500 से कम" — the max-price cue words.
const UNDER_TERMS = [
  'under', 'below', 'less than', 'lesser than', 'within', 'upto', 'up to', 'maximum',
  'max', 'not more than', 'cheaper than', 'budget', 'lopu', 'lopl', 'kante takkuva',
  'se kam', 'se neeche', 'ke andar', 'tak',
  'లోపు', 'కంటే తక్కువ', 'కన్నా తక్కువ', 'లోగా',
  'से कम', 'से नीचे', 'के अंदर', 'तक',
  'குறைவாக', 'கீழ்', 'ಕಡಿಮೆ', 'ഒള്ളിൽ', 'താഴെ', 'કરતાં ઓછું', 'থেকে কম',
  'سے کم', 'ਤੋਂ ਘੱਟ', 'ରୁ କମ୍',
];

// "above 1000" / "1000 కంటే ఎక్కువ" — the min-price cue words.
const ABOVE_TERMS = [
  'above', 'over', 'more than', 'greater than', 'minimum', 'at least', 'starting from',
  'kante ekkuva', 'ke upar', 'se zyada', 'se jyada', 'upar',
  'కంటే ఎక్కువ', 'కన్నా ఎక్కువ', 'పైన',
  'से ज्यादा', 'से अधिक', 'के ऊपर', 'ऊपर',
  'அதிகமாக', 'மேல்', 'ಹೆಚ್ಚು', 'മുകളിൽ', 'કરતાં વધુ', 'থেকে বেশি',
  'سے زیادہ', 'ਤੋਂ ਵੱਧ', 'ରୁ ଅଧିକ',
];

// Words that mark a numeric range: "1000 to 1500", "1000 నుంచి 1500 మధ్య", "1000 से 1500".
const RANGE_CONNECTORS = [
  'to', '-', 'and', 'se', 'se', 'thru', 'through', 'nunchi', 'nundi', 'ninchi', 'madhya',
  'నుంచి', 'నుండి', 'నించి', 'మధ్య', 'से', 'तक', 'के बीच', 'बीच',
  'இலிருந்து', 'இடையே', 'ಇಂದ', 'ನಡುವೆ', 'മുതൽ', 'ഇടയിൽ', 'થી', 'વચ્ચે', 'থেকে', 'মধ্যে',
  'سے', 'ਤੋਂ', 'ରୁ',
];

// Rating cue words — a number 0-5 near one of these is a rating, not a price.
const RATING_TERMS = [
  'rating', 'rated', 'star', 'stars', 'review', 'reviews', '★',
  'రేటింగ్', 'స్టార్', 'నక్షత్ర', 'रेटिंग', 'स्टार', 'सितारा',
  'மதிப்பீடு', 'நட்சத்திர', 'ರೇಟಿಂಗ್', 'ಸ್ಟಾರ್', 'റേറ്റിംഗ്', 'സ്റ്റാർ',
  'રેટિંગ', 'સ્ટાર', 'রেটিং', 'স্টার', 'ریٹنگ', 'ਰੇਟਿੰਗ', 'ରେଟିଂ',
];

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => n.length > 0 && haystack.includes(n));
}

/** Index of the earliest occurrence of any needle, or -1. */
function firstIndexOfAny(haystack: string, needles: string[]): number {
  let best = -1;
  for (const n of needles) {
    const i = haystack.indexOf(n);
    if (i >= 0 && (best === -1 || i < best)) best = i;
  }
  return best;
}

interface NumberHit {
  value: number;
  start: number;
  end: number;
}

function scanNumbers(text: string): NumberHit[] {
  const hits: NumberHit[] = [];
  const re = /\d+(?:\.\d+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    hits.push({ value: parseFloat(m[0]), start: m.index, end: m.index + m[0].length });
  }
  return hits;
}

/**
 * Ratings are 0-5, prices are >= 100 after magnitude expansion, so the two never
 * collide. Anything in between (e.g. a bare "20") is ignored rather than guessed at.
 */
function extractRating(text: string): number | null {
  const numbers = scanNumbers(text);

  // "4+ rating" / "rated 4+" / "4+ star" — the plus sign alone means "or better".
  const plusMatch = text.match(/(\d(?:\.\d)?)\s*\+/);
  if (plusMatch) {
    const v = parseFloat(plusMatch[1]);
    if (v >= 1 && v <= 5) return v;
  }

  const ratingIdx = firstIndexOfAny(text, RATING_TERMS);
  if (ratingIdx < 0) return null;

  // Nearest 1-5 number to the rating cue word, within a short window either side.
  let best: number | null = null;
  let bestDist = Infinity;
  for (const n of numbers) {
    if (n.value < 1 || n.value > 5) continue;
    const dist = n.start > ratingIdx ? n.start - ratingIdx : ratingIdx - n.end;
    if (dist <= 25 && dist < bestDist) {
      bestDist = dist;
      best = n.value;
    }
  }
  return best;
}

function extractPriceRange(text: string): { minPrice: number | null; maxPrice: number | null } {
  // Only treat >= 100 as money: ratings, seat counts and "4 star" never qualify.
  const prices = scanNumbers(text).filter((n) => n.value >= 100);
  if (prices.length === 0) return { minPrice: null, maxPrice: null };

  // Explicit range: two prices separated by a range connector and nothing else.
  if (prices.length >= 2) {
    for (let i = 0; i < prices.length - 1; i++) {
      const a = prices[i];
      const b = prices[i + 1];
      const between = text.slice(a.end, b.start);
      // The gap must be short and consist of a connector (plus optional "rs"/spaces).
      const gap = between.replace(/\brs\b/g, ' ').trim();
      const isConnector =
        gap === '' ||
        RANGE_CONNECTORS.some((c) => gap === c || gap.split(/\s+/).includes(c)) ||
        /^-$/.test(gap);
      if (between.length <= 24 && isConnector) {
        const lo = Math.min(a.value, b.value);
        const hi = Math.max(a.value, b.value);
        return { minPrice: lo, maxPrice: hi };
      }
    }
  }

  // Single price: direction comes from the cue word, defaulting to a ceiling —
  // "1500 buses" almost always means "buses up to ₹1500" in this domain.
  const p = prices[0];
  const before = text.slice(Math.max(0, p.start - 30), p.start);
  const after = text.slice(p.end, Math.min(text.length, p.end + 30));

  if (includesAny(before, ABOVE_TERMS) || includesAny(after, ABOVE_TERMS)) {
    return { minPrice: p.value, maxPrice: null };
  }
  if (includesAny(before, UNDER_TERMS) || includesAny(after, UNDER_TERMS)) {
    return { minPrice: null, maxPrice: p.value };
  }
  return { minPrice: null, maxPrice: p.value };
}

/**
 * Extracts every filter mentioned in `text`. Fields the user did not mention stay
 * null/empty so the caller can merge with previously captured filters.
 */
export function extractFilters(text: string): VoiceFilters {
  const raw = normalizeForNlu(text);
  const t = expandMagnitudes(raw);

  const result: VoiceFilters = {
    ...EMPTY_FILTERS,
    busTypes: [],
    acStatus: [],
    busModels: [],
    amenities: [],
  };

  if (!t) return result;

  if (includesAny(t, RESET_TERMS)) {
    result.reset = true;
    return result;
  }

  // Bus type. Semi-sleeper is checked first because it contains "sleeper".
  if (includesAny(t, SEMI_SLEEPER)) result.busTypes.push('semi-sleeper');
  else if (includesAny(t, SLEEPER)) result.busTypes.push('sleeper');
  if (includesAny(t, SEATER) && !result.busTypes.includes('semi-sleeper')) {
    result.busTypes.push('seater');
  }

  // AC status. Non-AC is checked first because "non ac" contains "ac"; the AC test
  // uses a word boundary so it does not fire inside "black" or a city name.
  if (includesAny(t, NON_AC)) {
    result.acStatus.push('non-ac');
  } else {
    const asciiAc = /\b(?:ac|a\/c|a c|aircon|air ?conditioned?|cooling)\b/.test(t);
    if (asciiAc || includesAny(t, AC_NATIVE)) result.acStatus.push('ac');
  }

  // Bus model.
  if (includesAny(t, VOLVO)) result.busModels.push('volvo');
  if (includesAny(t, BHARATBENZ)) result.busModels.push('bharatbenz');

  const rating = extractRating(t);
  if (rating !== null) result.minRating = rating;

  const { minPrice, maxPrice } = extractPriceRange(t);
  result.minPrice = minPrice;
  result.maxPrice = maxPrice;

  for (const { key, terms } of AMENITY_TERMS) {
    if (includesAny(t, terms)) result.amenities.push(key);
  }

  return result;
}

export function hasAnyFilter(f: VoiceFilters): boolean {
  return Boolean(
    f.minPrice !== null ||
      f.maxPrice !== null ||
      f.busTypes.length ||
      f.acStatus.length ||
      f.busModels.length ||
      f.minRating !== null ||
      f.amenities.length
  );
}

/**
 * ISSUE 1(e): follow-ups MERGE. Saying "only Volvo" after "1000 to 1500 with 4+
 * rating" keeps the price range and the rating and only replaces the bus model.
 * A field is replaced only when the new utterance actually mentioned it.
 */
export function mergeFilters(prev: VoiceFilters, next: VoiceFilters): VoiceFilters {
  if (next.reset) return { ...EMPTY_FILTERS, busTypes: [], acStatus: [], busModels: [], amenities: [] };
  return {
    minPrice: next.minPrice !== null ? next.minPrice : prev.minPrice,
    maxPrice: next.maxPrice !== null ? next.maxPrice : prev.maxPrice,
    busTypes: next.busTypes.length ? next.busTypes : prev.busTypes,
    acStatus: next.acStatus.length ? next.acStatus : prev.acStatus,
    busModels: next.busModels.length ? next.busModels : prev.busModels,
    minRating: next.minRating !== null ? next.minRating : prev.minRating,
    amenities: next.amenities.length ? next.amenities : prev.amenities,
    reset: false,
  };
}

/** Human-readable filter summary ("AC · Sleeper · Volvo · ₹1000-₹1500 · 4★+"). */
export function describeFilters(f: VoiceFilters, lang: string): string {
  const parts: string[] = [];
  const TYPE_LABEL: Record<string, Record<string, string>> = {
    sleeper: { en: 'Sleeper', te: 'స్లీపర్', hi: 'स्लीपर', ta: 'ஸ்லீப்பர்', kn: 'ಸ್ಲೀಪರ್', ml: 'സ്ലീപ്പർ', mr: 'स्लीपर', gu: 'સ્લીપર', bn: 'স্লিপার', ur: 'سلیپر', pa: 'ਸਲੀਪਰ', or: 'ସ୍ଲିପର' },
    'semi-sleeper': { en: 'Semi-Sleeper', te: 'సెమీ స్లీపర్', hi: 'सेमी स्लीपर', ta: 'செமி ஸ்லீப்பர்', kn: 'ಸೆಮಿ ಸ್ಲೀಪರ್', ml: 'സെമി സ്ലീപ്പർ', mr: 'सेमी स्लीपर', gu: 'સેમી સ્લીપર', bn: 'সেমি স্লিপার', ur: 'سیمی سلیپر', pa: 'ਸੈਮੀ ਸਲੀਪਰ', or: 'ସେମି ସ୍ଲିପର' },
    seater: { en: 'Seater', te: 'సీటర్', hi: 'सीटर', ta: 'சீட்டர்', kn: 'ಸೀಟರ್', ml: 'സീറ്റർ', mr: 'सीटर', gu: 'સીટર', bn: 'সিটার', ur: 'سیٹر', pa: 'ਸੀਟਰ', or: 'ସିଟର' },
  };
  const AC_LABEL: Record<string, Record<string, string>> = {
    ac: { en: 'AC', te: 'ఏసీ', hi: 'एसी', ta: 'ஏசி', kn: 'ಎಸಿ', ml: 'എസി', mr: 'एसी', gu: 'એસી', bn: 'এসি', ur: 'اے سی', pa: 'ਏਸੀ', or: 'ଏସି' },
    'non-ac': { en: 'Non-AC', te: 'నాన్ ఏసీ', hi: 'नॉन एसी', ta: 'நான் ஏசி', kn: 'ನಾನ್ ಎಸಿ', ml: 'നോൺ എസി', mr: 'नॉन एसी', gu: 'નોન એસી', bn: 'নন এসি', ur: 'نان اے سی', pa: 'ਨਾਨ ਏਸੀ', or: 'ନନ୍ ଏସି' },
  };
  const MODEL_LABEL: Record<string, string> = { volvo: 'Volvo', bharatbenz: 'BharatBenz', other: 'Other' };

  f.acStatus.forEach((a) => parts.push(AC_LABEL[a]?.[lang] || AC_LABEL[a]?.en || a));
  f.busTypes.forEach((b) => parts.push(TYPE_LABEL[b]?.[lang] || TYPE_LABEL[b]?.en || b));
  f.busModels.forEach((m) => parts.push(MODEL_LABEL[m] || m));

  if (f.minPrice !== null && f.maxPrice !== null) parts.push(`₹${f.minPrice}-₹${f.maxPrice}`);
  else if (f.maxPrice !== null) parts.push(`≤ ₹${f.maxPrice}`);
  else if (f.minPrice !== null) parts.push(`≥ ₹${f.minPrice}`);

  if (f.minRating !== null) parts.push(`${f.minRating}★+`);
  f.amenities.forEach((a) => parts.push(a));

  return parts.join(' · ');
}
