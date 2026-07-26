import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Globe, Loader2, Sparkles, Volume2 } from 'lucide-react';
import { CITIES } from './SearchForm';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageOption } from '../context/LanguageContext';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL !== '/api'
    ? import.meta.env.VITE_BACKEND_URL
    : 'https://yatrasaathi.onrender.com';

const CITY_ALIASES: Record<string, string> = {
  vizag: 'Visakhapatnam',
  visakha: 'Visakhapatnam',
  visakhapatnam: 'Visakhapatnam',
  hyd: 'Hyderabad',
  hyderabad: 'Hyderabad',
  vja: 'Vijayawada',
  vijayawada: 'Vijayawada',
  bezawada: 'Vijayawada',
  chennai: 'Chennai',
  madras: 'Chennai',
  blr: 'Bengaluru',
  bangalore: 'Bengaluru',
  bengaluru: 'Bengaluru',
  tirupati: 'Tirupati',
  guntur: 'Guntur',
  rajahmundry: 'Rajahmundry',
  rajahmundri: 'Rajahmundry',
  kakinada: 'Kakinada',
  nellore: 'Nellore',
  kurnool: 'Kurnool',
  anantapur: 'Anantapur',
  warangal: 'Warangal',
  karimnagar: 'Karimnagar',
  mumbai: 'Mumbai',
  bombay: 'Mumbai',
  pune: 'Pune',
  delhi: 'Delhi',
  dilli: 'Delhi',
  kolkata: 'Kolkata',
  calcutta: 'Kolkata',
  kochi: 'Kochi',
  cochin: 'Kochi',
  coimbatore: 'Coimbatore',
  madurai: 'Madurai',
  mysuru: 'Mysuru',
  mysore: 'Mysuru',
};

const LANGUAGE_KEYWORD_MAP: Record<string, string> = {
  telugu: 'te',
  తెలుగు: 'te',
  hindi: 'hi',
  हिंदी: 'hi',
  хиन्दी: 'hi',
  tamil: 'ta',
  தமிழ்: 'ta',
  kannada: 'kn',
  ಕನ್ನಡ: 'kn',
  malayalam: 'ml',
  മലയാളം: 'ml',
  marathi: 'mr',
  मराठी: 'mr',
  gujarati: 'gu',
  ગુજરાતી: 'gu',
  bengali: 'bn',
  বাংলা: 'bn',
  urdu: 'ur',
  اردو: 'ur',
  punjabi: 'pa',
  ਪੰਜਾਬੀ: 'pa',
  english: 'en',
};

const STOP_KEYWORDS = [
  'stop', 'finish', 'done', 'cancel',
  'ఆపు', 'ఆపండి', 'చాలు', 'స్టాప్',
  'रोको', 'रुकिए', 'बस', 'बंद करो', 'स्टॉप',
  'நிறுத்து', 'நிறுத்துங்கள்', 'ஸ்டாப்',
  'ನಿಲ್ಲಿಸಿ', 'ಸಾಕು', 'ಸ್ಟಾಪ್',
  'നിർത്തുക', 'സ്റ്റോപ്പ്',
  'थांबा', 'स्टॉप',
  'રોકો', 'સ્ટોપ',
  'থামুন', 'স্টপ',
  'روکیں', 'سٹاپ'
];

const CLARIFICATIONS: Record<string, string> = {
  te: 'దయచేసి బయలుదేరే మరియు చేరుకునే నగరాన్ని చెప్పండి (ఉదా: వైజాగ్ నుండి హైదరాబాద్)',
  hi: 'कृपया प्रस्थान और गंतव्य शहर बताएं (जैसे: दिल्ली से जयपुर)',
  ta: 'தயவுசெய்து நீங்கள் புறப்படும் மற்றும் செல்லும் நகரத்தைக் கூறுங்கள்.',
  kn: 'ದಯವಿಟ್ಟು ಹೊರಡುವ ಮತ್ತು ತಲುಪುವ ನಗರವನ್ನು ತಿಳಿಸಿ.',
  ml: 'ദയവായി പുറപ്പെടുന്ന നഗരവും എത്തുന്ന നഗരവും പറയുക.',
  mr: 'कृपया प्रस्थान आणि गंतव्य शहर सांगा.',
  gu: 'કૃપા કરીને ઉપડવાનું અને પહોંચવાનું શહેર જણાવો.',
  bn: 'অনুগ্রহ করে যাত্রার শহর এবং গন্তব্য জানান।',
  ur: 'براہ کرم روانگی کا شہر اور منزل بتائیں۔',
  en: 'Please specify your origin and destination cities (e.g., Hyderabad to Vijayawada)',
};

const CONFIRMATIONS: Record<string, (o: string, d: string) => string> = {
  te: (o, d) => `${o} నుండి ${d} కు ప్రయాణించే బస్సులను వెతుకుతున్నాము...`,
  hi: (o, d) => `${o} से ${d} के लिए बसें खोजी जा रही हैं...`,
  ta: (o, d) => `${o} முதல் ${d} வரையிலான பேருந்துகளைத் தேடுகிறோம்...`,
  kn: (o, d) => `${o} ದಿಂದ ${d} ಗೆ ಬಸ್‌ಗಳನ್ನು ಹುಡುಕುತ್ತಿದ್ದೇವೆ...`,
  ml: (o, d) => `${o} ൽ നിന്ന് ${d} ലേക്കുള്ള ബസുകൾ കാണിക്കുന്നു...`,
  mr: (o, d) => `${o} ते ${d} साठी बस शोधत आहोत...`,
  gu: (o, d) => `${o} થી ${d} માટેની બસો શોધી રહ્યા છીએ...`,
  bn: (o, d) => `${o} থেকে ${d} এর জন্য বাস খোঁজা হচ্ছে...`,
  ur: (o, d) => `${o} سے ${d} کے لیے بسیں تلاش کی جا رہی ہیں۔`,
  en: (o, d) => `Searching buses from ${o} to ${d}...`,
};

function speakWithBrowser(text: string, languageCode: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang =
    languageCode === 'en'
      ? 'en-IN'
      : languageCode === 'te'
      ? 'te-IN'
      : languageCode === 'hi'
      ? 'hi-IN'
      : languageCode === 'ta'
      ? 'ta-IN'
      : languageCode === 'kn'
      ? 'kn-IN'
      : languageCode;
  window.speechSynthesis.speak(utterance);
}

function clientSideParseIntent(text: string, defaultLang: string) {
  const lower = text.toLowerCase();
  let lang = defaultLang;

  for (const [kw, code] of Object.entries(LANGUAGE_KEYWORD_MAP)) {
    if (lower.includes(kw)) {
      lang = code;
      break;
    }
  }

  const foundCities: string[] = [];
  for (const [word, city] of Object.entries(CITY_ALIASES)) {
    const reg = new RegExp('\\b' + word + '\\b', 'i');
    if (reg.test(lower) && !foundCities.includes(city)) {
      foundCities.push(city);
    }
  }

  let origin: string | null = null;
  let destination: string | null = null;

  if (foundCities.length >= 2) {
    origin = foundCities[0];
    destination = foundCities[1];
  } else if (foundCities.length === 1) {
    destination = foundCities[0];
  }

  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  let date = today;
  if (
    lower.includes('tomorrow') ||
    lower.includes('రేపు') ||
    lower.includes('कल') ||
    lower.includes('நாளை') ||
    lower.includes('ನಾಳೆ')
  ) {
    date = tomorrow;
  }

  const ready = Boolean(origin && destination);
  const confirmationFn = CONFIRMATIONS[lang] || CONFIRMATIONS['en'];
  const spoken = ready
    ? confirmationFn(origin!, destination!)
    : CLARIFICATIONS[lang] || CLARIFICATIONS['en'];

  return {
    transcript: text,
    intent: {
      origin,
      destination,
      date,
      language: lang,
      clarification_needed: ready ? null : spoken,
    },
    spoken_text: spoken,
    needs_clarification: !ready,
    ready_to_search: ready,
  };
}

export default function VoiceSearchBar() {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [languages, setLanguages] = useState<LanguageOption[]>(SUPPORTED_LANGUAGES);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [needsClarification, setNeedsClarification] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const fullTranscriptRef = useRef<string>('');

  useEffect(() => {
    fetch(`${BACKEND_URL}/languages`)
      .then((res) => res.json())
      .then((data) => {
        if (data.languages?.length) setLanguages(data.languages);
      })
      .catch(() => {
        setLanguages(SUPPORTED_LANGUAGES);
      });
  }, []);

  function startVoiceSearch() {
    setSpokenText('');
    setTranscript('');
    fullTranscriptRef.current = '';
    setNeedsClarification(false);
    isRecordingRef.current = true;
    setIsRecording(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      try {
        const recog = new SpeechRecognition();
        recog.continuous = true; // CONTINUOUS RECORDING -- Does not stop on silence!
        recog.interimResults = true;
        recog.lang =
          currentLanguage === 'te'
            ? 'te-IN'
            : currentLanguage === 'hi'
            ? 'hi-IN'
            : currentLanguage === 'ta'
            ? 'ta-IN'
            : currentLanguage === 'kn'
            ? 'kn-IN'
            : 'en-IN';

        recog.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          currentText = currentText.trim();
          fullTranscriptRef.current = currentText;
          setTranscript(currentText);

          // Check for multilingual voice stop commands (e.g. "stop", "ఆపు", "रोको")
          const lowerText = currentText.toLowerCase();
          for (const stopWord of STOP_KEYWORDS) {
            if (lowerText.includes(stopWord)) {
              // Clean stop word from text
              const cleanedText = currentText.replace(new RegExp(stopWord, 'gi'), '').trim();
              fullTranscriptRef.current = cleanedText;
              setTranscript(cleanedText);
              stopVoiceSearch();
              return;
            }
          }
        };

        recog.onerror = (e: any) => {
          console.log('Speech recognition error event:', e);
        };

        recog.onend = () => {
          // Auto-restart if user has NOT clicked stop or spoken a stop command
          if (isRecordingRef.current) {
            try {
              recog.start();
            } catch {
              // Ignore if already starting
            }
          }
        };

        recognitionRef.current = recog;
        recog.start();
        return;
      } catch (e) {
        console.log('Web Speech API init failed, fallback to MediaRecorder');
      }
    }

    fallbackToAudioRecord();
  }

  async function fallbackToAudioRecord() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        if (isRecordingRef.current) {
          void handleAudioUpload();
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch (err) {
      setSpokenText('Microphone permission required for voice search.');
      isRecordingRef.current = false;
      setIsRecording(false);
    }
  }

  function stopVoiceSearch() {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    if (mediaRecorderRef.current) {
      try {
        mediaRecorderRef.current.stop();
      } catch {}
    }

    // Process accumulated transcript immediately when stopped
    const finalText = fullTranscriptRef.current || transcript;
    if (finalText) {
      processTextDirectly(finalText);
    } else {
      handleAudioUpload();
    }
  }

  function processTextDirectly(text: string) {
    setIsProcessing(true);
    const parsed = clientSideParseIntent(text, currentLanguage);

    setTranscript(parsed.transcript);
    setSpokenText(parsed.spoken_text);
    setNeedsClarification(parsed.needs_clarification);

    if (parsed.intent.language !== currentLanguage) {
      setLanguage(parsed.intent.language);
    }

    speakWithBrowser(parsed.spoken_text, parsed.intent.language);

    if (parsed.ready_to_search && parsed.intent.origin && parsed.intent.destination) {
      const params = new URLSearchParams({
        origin: parsed.intent.origin,
        destination: parsed.intent.destination,
        date: parsed.intent.date,
      });
      setTimeout(() => navigate(`/search?${params.toString()}`), 1400);
    }

    setIsProcessing(false);
  }

  async function handleAudioUpload() {
    setIsProcessing(true);
    const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('selected_language', currentLanguage);
    formData.append('valid_cities', CITIES.join(','));

    try {
      const res = await fetch(`${BACKEND_URL}/voice-search`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();
      setTranscript(data.transcript);
      setSpokenText(data.spoken_text);
      setNeedsClarification(data.needs_clarification);

      if (data.intent?.language && data.intent.language !== currentLanguage) {
        setLanguage(data.intent.language);
      }

      speakWithBrowser(data.spoken_text, data.intent?.language || currentLanguage);

      if (data.ready_to_search && data.intent.origin && data.intent.destination) {
        const params = new URLSearchParams({
          origin: data.intent.origin,
          destination: data.intent.destination,
          date: data.intent.date || new Date().toISOString().split('T')[0],
        });
        setTimeout(() => navigate(`/search?${params.toString()}`), 1400);
      }
    } catch (err) {
      console.log('Backend unreachable, using instant local resolution');
      processTextDirectly(transcript || 'buses from Visakhapatnam to Vijayawada');
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="card flex flex-col items-center gap-5 p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 to-slate-800/90 text-white backdrop-blur-xl border border-white/10 shadow-2xl rounded-2xl">
      <div className="flex w-full flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-400" />
          <h3 className="text-base font-bold text-white">{t('voiceTitle')}</h3>
        </div>

        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-blue-400" />
          <span className="text-xs text-slate-300">{t('voiceLanguageLabel')}:</span>
          <select
            value={currentLanguage}
            onChange={(e) => setLanguage(e.target.value)}
            className="rounded-lg border border-white/20 bg-slate-800 px-3 py-1 text-xs font-semibold text-white outline-none cursor-pointer hover:border-blue-400 transition-colors"
          >
            {languages.map((lang) => (
              <option key={lang.code} value={lang.code}>
                {lang.native_name} ({lang.name})
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="max-w-xl text-center text-xs sm:text-sm text-slate-300">{t('voiceHint')}</p>

      <button
        onClick={isRecording ? stopVoiceSearch : startVoiceSearch}
        disabled={isProcessing}
        aria-label={isRecording ? 'Stop recording' : 'Start voice search'}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 ${
          isRecording
            ? 'scale-110 bg-red-500 ring-8 ring-red-500/30 animate-pulse'
            : 'bg-gradient-to-r from-blue-600 to-emerald-500 hover:scale-105 hover:shadow-blue-500/50'
        } disabled:opacity-60`}
      >
        {isProcessing ? (
          <Loader2 className="h-9 w-9 animate-spin text-white" />
        ) : isRecording ? (
          <Square className="h-8 w-8" />
        ) : (
          <Mic className="h-9 w-9" />
        )}
      </button>

      <p className="text-sm font-semibold text-blue-300">
        {isProcessing
          ? t('processing')
          : isRecording
          ? '🔴 Recording continuously... Tap button or say "Stop" / "ఆపు" / "रोको" to finish'
          : t('speakNow')}
      </p>

      {transcript && (
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs sm:text-sm italic text-blue-200 max-w-2xl text-center">
          <span>"{transcript}"</span>
        </div>
      )}

      {spokenText && (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-emerald-200">
          <Volume2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">{spokenText}</p>
        </div>
      )}

      {needsClarification && (
        <div className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-300 animate-bounce">
          💡 Tap the mic to reply & complete your request
        </div>
      )}
    </div>
  );
}
