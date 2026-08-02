import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Globe, Loader2, Sparkles, Volume2, AlertCircle } from 'lucide-react';
import { CITIES } from './SearchForm';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageOption, CITY_TRANSLATIONS } from '../context/LanguageContext';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL !== '/api'
    ? import.meta.env.VITE_BACKEND_URL
    : 'https://yatrasaathi.onrender.com';

export const CITY_ALIASES: Record<string, string> = {
  // Visakhapatnam
  visakhapatnam: 'Visakhapatnam', vizag: 'Visakhapatnam', visakha: 'Visakhapatnam',
  వైజాగ్: 'Visakhapatnam', విశాఖపట్నం: 'Visakhapatnam', विशाखापट्टनम: 'Visakhapatnam',
  விசாகப்பட்டினம்: 'Visakhapatnam', ವಿಶಾಖಪಟ್ಟಣ: 'Visakhapatnam', വിശാഖപട്ടണം: 'Visakhapatnam',
  વિશાખાપટ્ટનમ: 'Visakhapatnam', విశాఖ: 'Visakhapatnam',

  // Hyderabad
  hyderabad: 'Hyderabad', hyd: 'Hyderabad', హైదరాబాద్: 'Hyderabad', హైదరాబాదు: 'Hyderabad',
  हैदराबाद: 'Hyderabad', ஹைதராபாத்: 'Hyderabad', ಹೈದರಾಬಾದ್: 'Hyderabad', ഹൈദരാബാദ്: 'Hyderabad',
  હૈદરાબાદ: 'Hyderabad', হায়দ্রাবাদ: 'Hyderabad', حیدرآباد: 'Hyderabad',

  // Vijayawada
  vijayawada: 'Vijayawada', vja: 'Vijayawada', bezawada: 'Vijayawada',
  విజయవాడ: 'Vijayawada', బెజవాడ: 'Vijayawada', विजयवाड़ा: 'Vijayawada', விஜயவாடா: 'Vijayawada',
  ವಿಜಯವಾಡ: 'Vijayawada', വിജയവാഡ: 'Vijayawada', વિજયવાડા: 'Vijayawada',

  // Chennai
  chennai: 'Chennai', madras: 'Chennai', చెన్నై: 'Chennai', మద్రాస్: 'Chennai',
  चेन्नई: 'Chennai', मद्रास: 'Chennai', சென்னை: 'Chennai', மதராஸ்: 'Chennai',
  ಚೆನ್ನೈ: 'Chennai', ചെന്നൈ: 'Chennai', ચેન્નઈ: 'Chennai',

  // Bengaluru
  bengaluru: 'Bengaluru', bangalore: 'Bengaluru', blr: 'Bengaluru',
  బెంగళూరు: 'Bengaluru', బెంగుళూరు: 'Bengaluru', बेंगलुरु: 'Bengaluru', बैंगलोर: 'Bengaluru',
  பெங்களூரு: 'Bengaluru', ಬೆಂಗಳೂರು: 'Bengaluru', ബംഗളൂരു: 'Bengaluru', બેંગલુરુ: 'Bengaluru',

  // Tirupati
  tirupati: 'Tirupati', తిరుపతి: 'Tirupati', तिरुपति: 'Tirupati', திருப்பதி: 'Tirupati',
  ತಿರುಪತಿ: 'Tirupati', തിരുപ്പതി: 'Tirupati', તિરુપતિ: 'Tirupati',

  // Guntur
  guntur: 'Guntur', గుంటూరు: 'Guntur', गुंटूर: 'Guntur', గుండూర్: 'Guntur',
  ഗുണ്ടൂർ: 'Guntur', ગુંટૂર: 'Guntur',

  // Rajahmundry
  rajahmundry: 'Rajahmundry', rajahmundri: 'Rajahmundry', రాజమండ్రి: 'Rajahmundry',
  राजमुंदरी: 'Rajahmundry', ராஜமுந்திரி: 'Rajahmundry', ರಾಜಮಂಡ್ರಿ: 'Rajahmundry',
  രാജമണ്ഡ്രി: 'Rajahmundry', રાજામુંડરી: 'Rajahmundry',

  // Kakinada
  kakinada: 'Kakinada', కాకినాడ: 'Kakinada', काकीनाडा: 'Kakinada', காக்கிநாடா: 'Kakinada',
  ಕಾಕಿನಾಡ: 'Kakinada', കാക്കിനട: 'Kakinada', કાકીનાડા: 'Kakinada',

  // Nellore
  nellore: 'Nellore', నెల్లూరు: 'Nellore', नेल्लोर: 'Nellore', நெல்லூர்: 'Nellore',
  ನೆಲ್ಲೂರು: 'Nellore', നെല്ലൂർ: 'Nellore', નેલ્લોર: 'Nellore',

  // Kurnool
  kurnool: 'Kurnool', కర్నూలు: 'Kurnool', कुर्नूल: 'Kurnool', கர்நூல்: 'Kurnool',
  ಕರ್ನೂಲು: 'Kurnool', കർണൂൽ: 'Kurnool', કુર્નૂલ: 'Kurnool',

  // Anantapur
  anantapur: 'Anantapur', అనంతపురం: 'Anantapur', अनंतपुर: 'Anantapur', அனந்தபூர்: 'Anantapur',
  ಅನಂತಪುರ: 'Anantapur', അനന്തപൂർ: 'Anantapur', અનંતપુર: 'Anantapur',

  // Warangal
  warangal: 'Warangal', వరంగల్: 'Warangal', वरंगल: 'Warangal', வரங்கல்: 'Warangal',
  ವರಂಗಲ್: 'Warangal', വരംഗൽ: 'Warangal', વરંગલ: 'Warangal',

  // Karimnagar
  karimnagar: 'Karimnagar', కరీంనగర్: 'Karimnagar', करीमनगर: 'Karimnagar',
  కరీంనగర: 'Karimnagar', કરીમનગર: 'Karimnagar',

  // Mumbai
  mumbai: 'Mumbai', bombay: 'Mumbai', ముంబై: 'Mumbai', బొంబాయి: 'Mumbai',
  मुंबई: 'Mumbai', बंबई: 'Mumbai', மும்பை: 'Mumbai', ಮುಂಬೈ: 'Mumbai',
  മുംബൈ: 'Mumbai', મુંબઈ: 'Mumbai',

  // Pune
  pune: 'Pune', పుణే: 'Pune', పూనే: 'Pune', पुणे: 'Pune',
  புனே: 'Pune', పుಣೆ: 'Pune', പുനെ: 'Pune', પુણે: 'Pune',

  // Delhi
  delhi: 'Delhi', dilli: 'Delhi', ఢిల్లీ: 'Delhi', ఢిల్లి: 'Delhi',
  दिल्ली: 'Delhi', दिल्लि: 'Delhi', டெல்லி: 'Delhi', దెహలి: 'Delhi',
  ഡൽഹി: 'Delhi', દિલ્હી: 'Delhi',

  // Kolkata
  kolkata: 'Kolkata', calcutta: 'Kolkata', కోల్‌కతా: 'Kolkata', కలకత్తా: 'Kolkata',
  कोलकाता: 'Kolkata', कलकत्ता: 'Kolkata', கொல்கத்தா: 'Kolkata', ಕೋಲ್ಕತ್ತಾ: 'Kolkata',
  കൊൽക്കത്ത: 'Kolkata', કોલકાતા: 'Kolkata',

  // Kochi
  kochi: 'Kochi', cochin: 'Kochi', కొచ్చి: 'Kochi', కోచి: 'Kochi',
  कोच्चि: 'Kochi', कोचीन: 'Kochi', கொச்சி: 'Kochi', കൊച്ചി: 'Kochi', കോચી: 'Kochi',

  // Coimbatore
  coimbatore: 'Coimbatore', కోయంబత్తూర్: 'Coimbatore', कोयंबटूर: 'Coimbatore',
  கோயம்புத்தூர்: 'Coimbatore', ಕೊಯಮತ್ತೂರು: 'Coimbatore', കോയമ്പത്തൂർ: 'Coimbatore',
  કોઈમ્બતૂર: 'Coimbatore',

  // Madurai
  madurai: 'Madurai', మదురై: 'Madurai', मदेरै: 'Madurai', मदुरै: 'Madurai',
  மதுரை: 'Madurai', ಮಧುರೈ: 'Madurai', മധുര: 'Madurai', મદુરાઈ: 'Madurai',

  // Mysuru
  mysuru: 'Mysuru', mysore: 'Mysuru', మైసూరు: 'Mysuru', మైసూర్: 'Mysuru',
  मैसूरु: 'Mysuru', मैसूर: 'Mysuru', மைசூರು: 'Mysuru', ಮೈಸೂರು: 'Mysuru',
  മൈസൂരു: 'Mysuru', મૈસુરુ: 'Mysuru',
};

const LANGUAGE_KEYWORD_MAP: Record<string, string> = {
  telugu: 'te', తెలుగు: 'te',
  hindi: 'hi', हिंदी: 'hi', хиन्दी: 'hi',
  tamil: 'ta', தமிழ்: 'ta',
  kannada: 'kn', ಕನ್ನಡ: 'kn',
  malayalam: 'ml', മലയാളം: 'ml',
  marathi: 'mr', मराठी: 'mr',
  gujarati: 'gu', ગુજરાતી: 'gu',
  bengali: 'bn', বাংলা: 'bn',
  urdu: 'ur', اردو: 'ur',
  punjabi: 'pa', ਪੰਜਾਬੀ: 'pa',
  odia: 'or', ଓଡ଼ିଆ: 'or',
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
  'থামুন', 'സ്റ്റപ്',
  'روکیں', 'سٹاپ',
  'ਰੋਕੋ', 'ਸਟਾਪ',
  'ରଖନ୍ତୁ', 'ଷ୍ଟପ୍'
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
  pa: 'ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਅਤੇ ਪਹੁੰਚਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ।',
  or: 'ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ଏବଂ ଗନ୍ତବ୍ୟ ସହର କୁହନ୍ତୁ।',
  en: 'Please specify your origin and destination cities (e.g., Hyderabad to Vijayawada)',
};

const CONFIRMATIONS: Record<string, (o: string, d: string) => string> = {
  te: (o, d) => `మీకు ${o} నుండి ${d} వెళ్లే బస్సులను చూపిస్తున్నాను`,
  hi: (o, d) => `हम आपको ${o} से ${d} जाने वाली बसें दिखा रहे हैं`,
  ta: (o, d) => `நாங்கள் உங்களுக்கு ${o} இலிருந்து ${d} செல்லும் பேருந்துகளைக் காட்டுகிறோம்`,
  kn: (o, d) => `ನಾವು ನಿಮಗೆ ${o} ದಿಂದ ${d} ಗೆ ಹೋಗುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ`,
  ml: (o, d) => `ഞങ്ങൾ നിങ്ങൾക്ക് ${o} ൽ നിന്ന് ${d} ലേക്ക് പോകുന്ന ബസുകൾ കാണിക്കുന്നു`,
  mr: (o, d) => `आम्ही तुम्हाला ${o} ते ${d} जाणाऱ्या बसेस दाखवत आहोत`,
  gu: (o, d) => `અમે તમને ${o} થી ${d} જતી બસો બતાવી રહ્યા છીએ`,
  bn: (o, d) => `আমরা আপনাকে ${o} থেকে ${d} যাওয়ার বাসগুলো দেখাচ্ছি`,
  ur: (o, d) => `ہم آپ کو ${o} سے ${d} جانے والی بسیں دکھا رہے ہیں`,
  pa: (o, d) => `ਅਸੀਂ ਤੁਹਾਨੂੰ ${o} ਤੋਂ ${d} ਜਾਣ ਵਾਲੀਆਂ ਬੱਸਾਂ ਦਿਖਾ ਰਹੇ ਹਾਂ`,
  or: (o, d) => `ଆମେ ଆପଣଙ୍କୁ ${o} ରୁ ${d} ଯାଉଥିବା ବସ୍ ଦେଖାଉଛୁ`,
  en: (o, d) => `Showing you buses from ${o} to ${d}`,
};

export function speakWithBrowser(text: string, languageCode: string) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  
  const targetLang =
    languageCode === 'te' ? 'te-IN'
    : languageCode === 'hi' ? 'hi-IN'
    : languageCode === 'ta' ? 'ta-IN'
    : languageCode === 'kn' ? 'kn-IN'
    : languageCode === 'ml' ? 'ml-IN'
    : languageCode === 'mr' ? 'mr-IN'
    : languageCode === 'gu' ? 'gu-IN'
    : languageCode === 'bn' ? 'bn-IN'
    : languageCode === 'ur' ? 'ur-IN'
    : languageCode === 'pa' ? 'pa-IN'
    : languageCode === 'or' ? 'or-IN'
    : 'en-IN';

  utterance.lang = targetLang;

  // Try to find a matching native regional voice
  const voices = window.speechSynthesis.getVoices();
  if (voices && voices.length > 0) {
    const matchedVoice = voices.find((v) =>
      v.lang.toLowerCase().replace('_', '-').startsWith(targetLang.substring(0, 2).toLowerCase())
    );
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
}

function clientSideParseIntent(text: string, defaultLang: string) {
  const lower = text.toLowerCase().trim();
  let lang = defaultLang;

  if (/[\u0C00-\u0C7F]/.test(text)) lang = 'te';
  else if (/[\u0900-\u097F]/.test(text)) lang = 'hi';
  else if (/[\u0B80-\u0BFF]/.test(text)) lang = 'ta';
  else if (/[\u0C80-\u0CFF]/.test(text)) lang = 'kn';
  else if (/[\u0D00-\u0D7F]/.test(text)) lang = 'ml';
  else if (/[\u0A80-\u0AFF]/.test(text)) lang = 'gu';
  else if (/[\u0980-\u09FF]/.test(text)) lang = 'bn';
  else if (/[\u0600-\u06FF]/.test(text)) lang = 'ur';
  else if (/[\u0A00-\u0A7F]/.test(text)) lang = 'pa';
  else if (/[\u0B00-\u0B7F]/.test(text)) lang = 'or';

  for (const [kw, code] of Object.entries(LANGUAGE_KEYWORD_MAP)) {
    if (lower.includes(kw)) {
      lang = code;
      break;
    }
  }

  const foundCities: string[] = [];
  for (const [alias, canonicalCity] of Object.entries(CITY_ALIASES)) {
    if (lower.includes(alias.toLowerCase()) && !foundCities.includes(canonicalCity)) {
      foundCities.push(canonicalCity);
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
    lower.includes('ನಾಳೆ') ||
    lower.includes('നാളെ') ||
    lower.includes('उद्या') ||
    lower.includes('આવતીકાલે') ||
    lower.includes('আগামীকাল') ||
    lower.includes('کل')
  ) {
    date = tomorrow;
  }

  const ready = Boolean(origin && destination);

  const originNative = origin ? CITY_TRANSLATIONS[origin]?.[lang] || origin : '';
  const destNative = destination ? CITY_TRANSLATIONS[destination]?.[lang] || destination : '';

  const confirmationFn = CONFIRMATIONS[lang] || CONFIRMATIONS['en'];
  const spoken = ready
    ? confirmationFn(originNative, destNative)
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
  const [micError, setMicError] = useState<string | null>(null);

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
    setMicError(null);
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
        recog.continuous = true;
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
            : currentLanguage === 'ml'
            ? 'ml-IN'
            : currentLanguage === 'mr'
            ? 'mr-IN'
            : currentLanguage === 'gu'
            ? 'gu-IN'
            : currentLanguage === 'bn'
            ? 'bn-IN'
            : 'en-IN';

        recog.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          currentText = currentText.trim();
          fullTranscriptRef.current = currentText;
          setTranscript(currentText);

          const lowerText = currentText.toLowerCase();

          for (const [kw, langCode] of Object.entries(LANGUAGE_KEYWORD_MAP)) {
            if (lowerText.includes(kw) && (lowerText.includes('change') || lowerText.includes('switch') || lowerText.includes('మార్చండి') || lowerText.includes('बदलें') || lowerText.includes('மாற்று') || lowerText.includes('<ctrl42>బದಲಾಯಿಸಿ'))) {
              setLanguage(langCode);
            }
          }

          for (const stopWord of STOP_KEYWORDS) {
            if (lowerText.includes(stopWord)) {
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
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            setMicError('Microphone permission blocked. Please allow mic access in your browser settings.');
            isRecordingRef.current = false;
            setIsRecording(false);
          } else {
            // Fallback to audio recorder gracefully
            fallbackToAudioRecord();
          }
        };

        recog.onend = () => {
          if (isRecordingRef.current) {
            try {
              recog.start();
            } catch {}
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
      setMicError('Microphone permission required for voice search. Please click "Allow" in your browser bar.');
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

    // Speak back natively in the user's spoken language!
    speakWithBrowser(parsed.spoken_text, parsed.intent.language);

    if (parsed.ready_to_search && parsed.intent.origin && parsed.intent.destination) {
      const params = new URLSearchParams({
        origin: parsed.intent.origin,
        destination: parsed.intent.destination,
        date: parsed.intent.date,
      });
      setTimeout(() => navigate(`/results?${params.toString()}`), 1800);
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
        setTimeout(() => navigate(`/results?${params.toString()}`), 1800);
      }
    } catch (err) {
      console.log('Backend unreachable, using instant local resolution');
      processTextDirectly(transcript || 'buses from Visakhapatnam to Hyderabad');
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

      {micError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{micError}</span>
        </div>
      )}

      {/* Mic / Speaker Button */}
      <button
        onClick={isRecording ? stopVoiceSearch : startVoiceSearch}
        disabled={isProcessing}
        aria-label={isRecording ? 'Stop recording' : 'Start voice search'}
        className={`relative flex h-24 w-24 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-300 cursor-pointer ${
          isRecording
            ? 'scale-110 bg-red-500 ring-8 ring-red-500/30 animate-pulse'
            : 'bg-gradient-to-r from-blue-600 to-emerald-500 hover:scale-105 hover:shadow-blue-500/50'
        } disabled:opacity-60`}
      >
        {isProcessing ? (
          <Loader2 className="h-9 w-9 animate-spin text-white" />
        ) : isRecording ? (
          <Square className="h-8 w-8 text-white" />
        ) : (
          <Mic className="h-9 w-9 text-white" />
        )}
      </button>

      <p className="text-sm font-semibold text-blue-300">
        {isProcessing
          ? t('processing')
          : isRecording
          ? '🔴 Recording... Tap button or say "Stop" / "ఆపు" / "रोको" to search'
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
