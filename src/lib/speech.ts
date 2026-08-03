// Shared speech helpers: BCP-47 mapping for Web Speech recognition/synthesis,
// TTS audio priming, and robust fallback handling across browser & backend TTS.

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL !== '/api'
    ? import.meta.env.VITE_BACKEND_URL
    : 'https://yatrasaathi.onrender.com';

// Every supported UI language mapped to its Indian BCP-47 locale tag.
export const LANG_BCP47: Record<string, string> = {
  en: 'en-IN',
  te: 'te-IN',
  hi: 'hi-IN',
  ta: 'ta-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  bn: 'bn-IN',
  ur: 'ur-IN',
  pa: 'pa-IN',
  or: 'or-IN',
};

export function getRecognitionLang(languageCode: string): string {
  return LANG_BCP47[languageCode] || 'en-IN';
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
    const matched = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(languageCode.toLowerCase())
    );
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

  // 2. Try backend edge-tts
  const backendResult = await playBackendTts(text, languageCode);
  if (backendResult.ok) {
    return backendResult;
  }

  // 3. Fallback: Browser speechSynthesis with any available voice so reply is NEVER silent
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    const fallbackVoice = synth.getVoices().find((v) => v.lang.includes('IN')) || synth.getVoices()[0];
    if (fallbackVoice) utterance.voice = fallbackVoice;
    synth.speak(utterance);
    console.warn(`[TTS Warning] Backend TTS failed (${backendResult.detail}). Falling back to browser voice: ${fallbackVoice?.name || 'Default'}`);
    return {
      engine: 'browser',
      voice: `${fallbackVoice?.name || 'System Default'} (Fallback)`,
      ok: true,
      detail: `Fallback after backend failure: ${backendResult.detail}`,
    };
  }

  console.error(`[TTS Error] All speech synthesis methods failed: ${backendResult.detail}`);
  return backendResult;
}
