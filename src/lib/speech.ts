// Shared speech helpers: BCP-47 mapping for Web Speech recognition/synthesis,
// and a speakWithBrowser() that prefers a native browser voice and falls back to
// the backend edge-tts MP3 endpoint when the browser has no voice for a language.

export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL !== '/api'
    ? import.meta.env.VITE_BACKEND_URL
    : 'https://yatrasaathi.onrender.com';

// Every supported UI language mapped to its Indian BCP-47 locale tag. Used both to
// set SpeechRecognition.lang (so speech is transcribed in the native script) and to
// tag SpeechSynthesisUtterance.lang.
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

// Minimal Web Speech typings (the DOM lib does not ship SpeechRecognition types).
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

let ttsAudio: HTMLAudioElement | null = null;

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
      // older browsers expose onvoiceschanged instead of addEventListener
      synth.onvoiceschanged = finish;
    }
    setTimeout(finish, 600);
  });
}

async function playBackendTts(text: string, languageCode: string): Promise<void> {
  try {
    const res = await fetch(`${BACKEND_URL}/tts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language: languageCode }),
    });
    // 204 => this language has no production voice; caller shows text only.
    if (!res.ok) return;
    const blob = await res.blob();
    if (!blob.size) return;
    const url = URL.createObjectURL(blob);
    if (ttsAudio) {
      try {
        ttsAudio.pause();
      } catch {
        /* ignore */
      }
    }
    ttsAudio = new Audio(url);
    ttsAudio.onended = () => URL.revokeObjectURL(url);
    await ttsAudio.play().catch(() => {
      /* autoplay may be blocked; text is already shown */
    });
  } catch {
    /* network/backend unavailable -> text-only fallback */
  }
}

// Speak `text` in the given language. Prefers a matching on-device browser voice;
// if none exists (common for ml/te/ta/kn/etc. on desktop) it falls back to the
// backend edge-tts MP3 so the reply is still heard in the correct language.
export async function speakWithBrowser(text: string, languageCode: string): Promise<void> {
  if (!text || !text.trim()) return;
  const targetLang = getRecognitionLang(languageCode);

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
      return;
    }
    // Stop any queued English speech before using the backend voice.
    synth.cancel();
  }

  await playBackendTts(text, languageCode);
}
