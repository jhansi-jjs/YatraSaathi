// Phone/email validation shared by signup, login, profile and watch alerts.
//
// ISSUE 3 + 4: an alert must never be created without a reachable destination, and
// signup must capture a usable mobile number. Both need the SAME validation, so it
// lives here rather than being re-implemented per form.

export interface CountryCode {
  code: string;
  /** Dial prefix including the plus sign. */
  dial: string;
  name: string;
  /** Expected national number length(s), used for the "looks complete" check. */
  lengths: number[];
}

export const COUNTRY_CODES: CountryCode[] = [
  { code: 'IN', dial: '+91', name: 'India', lengths: [10] },
  { code: 'US', dial: '+1', name: 'United States', lengths: [10] },
  { code: 'GB', dial: '+44', name: 'United Kingdom', lengths: [10] },
  { code: 'AE', dial: '+971', name: 'UAE', lengths: [9] },
  { code: 'SG', dial: '+65', name: 'Singapore', lengths: [8] },
  { code: 'AU', dial: '+61', name: 'Australia', lengths: [9] },
  { code: 'CA', dial: '+1', name: 'Canada', lengths: [10] },
  { code: 'MY', dial: '+60', name: 'Malaysia', lengths: [9, 10] },
  { code: 'SA', dial: '+966', name: 'Saudi Arabia', lengths: [9] },
  { code: 'QA', dial: '+974', name: 'Qatar', lengths: [8] },
];

export const DEFAULT_COUNTRY = COUNTRY_CODES[0];

export function findCountry(dial: string): CountryCode {
  return COUNTRY_CODES.find((c) => c.dial === dial) || DEFAULT_COUNTRY;
}

/** Digits only, with any leading country prefix or trunk zero removed. */
export function nationalDigits(raw: string): string {
  return (raw || '').replace(/\D/g, '').replace(/^0+/, '');
}

export interface PhoneValidation {
  valid: boolean;
  /** E.164 form, e.g. "+919876543210". Empty when invalid. */
  e164: string;
  reason?: 'empty' | 'too-short' | 'too-long' | 'invalid-prefix';
}

/**
 * Validates a national number against its country's expected length and returns the
 * E.164 form to store. Deliberately strict about length: a half-typed number would
 * produce an alert that silently never arrives, which is the bug being fixed.
 */
export function validatePhone(dial: string, national: string): PhoneValidation {
  const country = findCountry(dial);
  const digits = nationalDigits(national);

  if (!digits) return { valid: false, e164: '', reason: 'empty' };

  const min = Math.min(...country.lengths);
  const max = Math.max(...country.lengths);
  if (digits.length < min) return { valid: false, e164: '', reason: 'too-short' };
  if (digits.length > max) return { valid: false, e164: '', reason: 'too-long' };

  // Indian mobile numbers start with 6-9; a landline or typo would never receive SMS.
  if (country.code === 'IN' && !/^[6-9]/.test(digits)) {
    return { valid: false, e164: '', reason: 'invalid-prefix' };
  }

  return { valid: true, e164: `${country.dial}${digits}` };
}

/** Splits a stored E.164 number back into a country + national pair for editing. */
export function parseE164(e164: string): { dial: string; national: string } {
  const trimmed = (e164 || '').trim();
  if (!trimmed.startsWith('+')) return { dial: DEFAULT_COUNTRY.dial, national: nationalDigits(trimmed) };
  // Longest dial prefix wins so +1 does not shadow +971.
  const sorted = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of sorted) {
    if (trimmed.startsWith(c.dial)) {
      return { dial: c.dial, national: trimmed.slice(c.dial.length) };
    }
  }
  return { dial: DEFAULT_COUNTRY.dial, national: nationalDigits(trimmed) };
}

/** Display form: "+91 98765 43210". */
export function formatPhone(e164: string): string {
  const { dial, national } = parseE164(e164);
  if (national.length === 10) return `${dial} ${national.slice(0, 5)} ${national.slice(5)}`;
  return `${dial} ${national}`;
}

export function isValidEmail(email: string): boolean {
  const value = (email || '').trim();
  // Deliberately simple: one @, a dot in the domain, no whitespace.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** True when a login identifier should be treated as a phone rather than an email. */
export function looksLikePhone(identifier: string): boolean {
  const value = (identifier || '').trim();
  if (value.includes('@')) return false;
  return /^[+0-9][0-9\s\-()]{6,}$/.test(value);
}
