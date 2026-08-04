// Shared text normalisation for the whole NLU layer.
//
// Every parser starts from the same normalised string, so a fix here (NFC
// composition, Indic digits, currency symbols) benefits city, date and filter
// extraction at once instead of being re-implemented three times.

// Per-script digit blocks: Devanagari, Bengali, Gurmukhi, Gujarati, Odia, Tamil,
// Telugu, Kannada, Malayalam, Arabic-Indic (Urdu). STT engines transcribe spoken
// numbers in the native digit set for these languages, so "१५००" must become 1500.
const DIGIT_BLOCK_STARTS = [
  0x0966, // Devanagari (hi, mr)
  0x09e6, // Bengali (bn)
  0x0a66, // Gurmukhi (pa)
  0x0ae6, // Gujarati (gu)
  0x0b66, // Odia (or)
  0x0be6, // Tamil (ta)
  0x0c66, // Telugu (te)
  0x0ce6, // Kannada (kn)
  0x0d66, // Malayalam (ml)
  0x0660, // Arabic-Indic (ur)
  0x06f0, // Extended Arabic-Indic (ur)
];

/** Converts native-script digits to ASCII 0-9; leaves everything else untouched. */
export function normalizeDigits(input: string): string {
  let out = '';
  for (const ch of input) {
    const cp = ch.codePointAt(0) ?? 0;
    let mapped = ch;
    for (const start of DIGIT_BLOCK_STARTS) {
      if (cp >= start && cp <= start + 9) {
        mapped = String(cp - start);
        break;
      }
    }
    out += mapped;
  }
  return out;
}

/**
 * NFC-compose (so combining vowel signs match however the STT engine emitted them),
 * lowercase, convert native digits, and normalise the currency/rupee spellings and
 * dash variants that show up in spoken price ranges.
 */
export function normalizeForNlu(input: string): string {
  return normalizeDigits((input || '').normalize('NFC'))
    .toLowerCase()
    .replace(/[‐-―−]/g, '-') // en/em dash, minus -> hyphen
    .replace(/[₹]/g, ' rs ')
    .replace(/\brs\.?\b/g, ' rs ')
    .replace(/\brupees?\b/g, ' rs ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Expands spoken shorthand magnitudes so "1k" -> 1000 and "1.5k" -> 1500 before any
 * numeric scan runs. Also handles the Indian "1.5 lakh" form.
 */
export function expandMagnitudes(input: string): string {
  return input
    .replace(/(\d+(?:\.\d+)?)\s*(?:k\b|thousand\b|hazar\b|hazaar\b|वेल\b)/g, (_m, n) =>
      String(Math.round(parseFloat(n) * 1000))
    )
    .replace(/(\d+(?:\.\d+)?)\s*(?:lakh|lac|lakhs)\b/g, (_m, n) =>
      String(Math.round(parseFloat(n) * 100000))
    );
}
