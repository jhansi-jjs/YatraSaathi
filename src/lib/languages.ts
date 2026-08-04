// SINGLE SOURCE OF TRUTH for every language the app supports.
//
// ISSUE 0: the language list offered on the login / onboarding / header language
// picker and the set of languages the voice assistant handles MUST be identical.
// Previously VoiceSearchBar replaced its picker with whatever `GET /languages`
// returned from the backend (23 entries, including languages with no STT, no TTS
// and no UI translations), so the two sets silently drifted apart. Everything now
// derives from SUPPORTED_LANGUAGES below — there is no second list anywhere.
//
// Per-language voice capability is declared here too, so the pipeline can make an
// informed choice (browser STT vs backend Whisper, browser TTS vs edge-tts vs
// text-only) instead of trying something that cannot work and failing silently.

export interface LanguageOption {
  code: string;
  name: string;
  /** Endonym shown in every language picker. */
  native_name: string;
  /** True when a speech *output* path exists (browser voice or backend edge-tts). */
  voice_available: boolean;
  /** BCP-47 tag handed to SpeechRecognition.lang and SpeechSynthesisUtterance.lang. */
  stt_locale: string;
  /**
   * True when Chrome/Edge's Web Speech engine actually recognises `stt_locale`.
   * When false we never start browser recognition for this language — we go
   * straight to backend Whisper, because Chrome silently falls back to en-US and
   * returns confident-looking English garbage instead of erroring.
   */
  browser_stt: boolean;
  /** True when the backend edge-tts service has a production voice for this code. */
  backend_tts: boolean;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English',   native_name: 'English',  stt_locale: 'en-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'te', name: 'Telugu',    native_name: 'తెలుగు',    stt_locale: 'te-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'hi', name: 'Hindi',     native_name: 'हिन्दी',     stt_locale: 'hi-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'ta', name: 'Tamil',     native_name: 'தமிழ்',     stt_locale: 'ta-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'kn', name: 'Kannada',   native_name: 'ಕನ್ನಡ',     stt_locale: 'kn-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'ml', name: 'Malayalam', native_name: 'മലയാളം',   stt_locale: 'ml-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'mr', name: 'Marathi',   native_name: 'मराठी',     stt_locale: 'mr-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'gu', name: 'Gujarati',  native_name: 'ગુજરાતી',   stt_locale: 'gu-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'bn', name: 'Bengali',   native_name: 'বাংলা',     stt_locale: 'bn-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  { code: 'ur', name: 'Urdu',      native_name: 'اردو',      stt_locale: 'ur-IN',      browser_stt: true,  backend_tts: true,  voice_available: true },
  // Chrome exposes Punjabi recognition under the script-qualified tag pa-Guru-IN,
  // not pa-IN. edge-tts has no Punjabi voice, so replies are shown as text.
  { code: 'pa', name: 'Punjabi',   native_name: 'ਪੰਜਾਬੀ',    stt_locale: 'pa-Guru-IN', browser_stt: true,  backend_tts: false, voice_available: false },
  // Odia has neither Web Speech recognition nor an edge-tts voice: STT goes to
  // backend Whisper (which does support Odia audio) and replies are text-only.
  { code: 'or', name: 'Odia',      native_name: 'ଓଡ଼ିଆ',     stt_locale: 'or-IN',      browser_stt: false, backend_tts: false, voice_available: false },
];

export const LANGUAGE_CODES: string[] = SUPPORTED_LANGUAGES.map((l) => l.code);

const BY_CODE: Record<string, LanguageOption> = SUPPORTED_LANGUAGES.reduce(
  (acc, l) => {
    acc[l.code] = l;
    return acc;
  },
  {} as Record<string, LanguageOption>
);

export function isSupportedLanguage(code: string): boolean {
  return Boolean(code && BY_CODE[code]);
}

/** Never throws: an unknown code degrades to English rather than breaking the pipeline. */
export function getLanguage(code: string): LanguageOption {
  return BY_CODE[code] || BY_CODE.en;
}

export function getLanguageName(code: string): string {
  return getLanguage(code).name;
}

/** BCP-47 tag for SpeechRecognition.lang / SpeechSynthesisUtterance.lang. */
export function getLocale(code: string): string {
  return getLanguage(code).stt_locale;
}

/** False when Chrome cannot recognise this language — caller must use backend STT. */
export function supportsBrowserStt(code: string): boolean {
  return getLanguage(code).browser_stt;
}
