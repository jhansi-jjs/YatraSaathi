// Shared speech helpers: BCP-47 mapping for Web Speech recognition/synthesis,
// TTS audio priming, and robust fallback handling across browser & backend TTS.

import { SUPPORTED_LANGUAGES, getLocale, supportsBrowserStt, getLanguage } from './languages';

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL !== '/api'
    ? import.meta.env.VITE_BACKEND_URL
    : 'https://yatrasaathi.onrender.com';

// BCP-47 locale tags come from the single shared language list, so the recognition
// locale, the synthesis locale and the language picker can never disagree (ISSUE 0).
export const LANG_BCP47: Record<string, string> = SUPPORTED_LANGUAGES.reduce(
  (acc, l) => {
    acc[l.code] = l.stt_locale;
    return acc;
  },
  {} as Record<string, string>
);


export function getRecognitionLang(languageCode: string): string {
  return getLocale(languageCode);
}

/**
 * Locales Chrome rejected at runtime with `language-not-supported`. Chrome exposes no
 * list of supported recognition languages, so we learn from the error and stop using
 * browser STT for that language for the rest of the session — the audio goes to the
 * backend Whisper model instead of being mis-transcribed as English (ISSUE 0a).
 */
const runtimeUnsupportedLocales = new Set<string>();

export function markLocaleUnsupported(languageCode: string): void {
  runtimeUnsupportedLocales.add(getLocale(languageCode));
}

/** False -> skip browser recognition entirely and go straight to backend STT. */
export function canUseBrowserStt(languageCode: string): boolean {
  if (!supportsBrowserStt(languageCode)) return false;
  return !runtimeUnsupportedLocales.has(getLocale(languageCode));
}

// Minimal Web Speech typings
export interface SpeechRecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}
export interface SpeechRecognitionErrorEvent {
  error: string;
}
export interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionResultEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}
export type SpeechRecognitionCtor = new () => SpeechRecognitionInstance;

export function getSpeechRecognitionCtor(): SpeechRecognitionCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
}

export function isSpeechRecognitionSupported(): boolean {
  return Boolean(getSpeechRecognitionCtor());
}

export interface SpeakResult {
  engine: 'browser' | 'edge-tts' | 'none';
  voice?: string;
  ok: boolean;
  detail?: string;
}

let sharedTtsAudio: HTMLAudioElement | null = null;

// Bug 3 Fix: Autoplay policy compliance — prime an audio element on user gesture
export function primeAudio(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!sharedTtsAudio) {
      sharedTtsAudio = new Audio();
    }
    // Play an empty silent data URI on explicit user gesture to unblock Audio autoplay policies
    sharedTtsAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAA==';
    void sharedTtsAudio.play().catch(() => {});
  } catch {
    /* ignore */
  }
}

// Wait for speechSynthesis voices to load
async function loadVoices(synth: SpeechSynthesis): Promise<SpeechSynthesisVoice[]> {
  const existing = synth.getVoices();
  if (existing.length) return existing;
  return new Promise<SpeechSynthesisVoice[]>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(synth.getVoices());
    };
    try {
      synth.addEventListener('voiceschanged', finish, { once: true });
    } catch {
      synth.onvoiceschanged = finish;
    }
    setTimeout(finish, 800);
  });
}

async function playBackendTts(text: string, languageCode: string): Promise<SpeakResult> {
  try {
    const res = await fetch(`${BACKEND_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: languageCode }),
    });
    if (res.status === 204) {
      return { engine: 'none', ok: false, detail: `no ${languageCode} backend voice available` };
    }
    if (!res.ok) {
      return { engine: 'none', ok: false, detail: `TTS backend HTTP ${res.status}` };
    }
    const blob = await res.blob();
    if (!blob.size) {
      return { engine: 'none', ok: false, detail: 'TTS backend returned 0 bytes' };
    }
    const url = URL.createObjectURL(blob);
    if (!sharedTtsAudio) {
      sharedTtsAudio = new Audio();
    }
    sharedTtsAudio.src = url;
    sharedTtsAudio.onended = () => URL.revokeObjectURL(url);
    await sharedTtsAudio.play();
    return { engine: 'edge-tts', voice: `${languageCode}-IN edge-tts`, ok: true };
  } catch (err) {
    return { engine: 'none', ok: false, detail: `TTS backend unreachable (${err})` };
  }
}

// Speak text in the given language. Order of preference:
// 1. Native browser voice matching languageCode (e.g. te-IN, hi-IN)
// 2. Backend edge-tts MP3 endpoint
// 3. Fallback browser voice (if backend TTS fails or times out) so speech is NEVER silent.
export async function speakWithBrowser(text: string, languageCode: string): Promise<SpeakResult> {
  if (!text || !text.trim()) return { engine: 'none', ok: false, detail: 'empty text' };
  const targetLang = getRecognitionLang(languageCode);

  // 1. Try native browser voice matching target language
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    const voices = await loadVoices(synth);
    // Match on the language subtag only, and require a separator after it so "or"
    // (Odia) can never match an unrelated locale.
    const wanted = languageCode.toLowerCase();
    const matched = voices.find((v) => {
      const tag = v.lang.toLowerCase().replace('_', '-');
      return tag === wanted || tag.startsWith(`${wanted}-`);
    });
    if (matched) {
      synth.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLang;
      utterance.voice = matched;
      synth.speak(utterance);
      return { engine: 'browser', voice: matched.name, ok: true };
    }
    synth.cancel();
  }

  // 2. No browser voice for this language. If the backend has no edge-tts voice
  //    either, say so immediately rather than making a pointless round-trip.
  const lang = getLanguage(languageCode);
  if (!lang.backend_tts) {
    return {
      engine: 'none',
      ok: false,
      detail: `no ${lang.name} voice on this device or on the server (text only)`,
    };
  }

  // 3. Backend edge-tts MP3 in the correct language.
  const backendResult = await playBackendTts(text, languageCode);
  if (backendResult.ok) return backendResult;

  // ISSUE 0(d): we deliberately do NOT fall back to "any available voice" here.
  // Reading a Telugu sentence aloud with an en-US voice produces gibberish, which is
  // worse than silence. The caller shows the reply as text plus a visible
  // "audio unavailable in this language" note, and we log why.
  console.warn(
    `[TTS] No ${lang.name} voice available (${backendResult.detail}). Reply shown as text only.`
  );
  return backendResult;

}
