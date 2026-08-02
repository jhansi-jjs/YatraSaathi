import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Globe, Loader2, Sparkles, Volume2, AlertCircle, Bug, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { CITIES } from './SearchForm';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageOption, CITY_TRANSLATIONS } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { extractCitiesFromInput, extractContinuousPreferences, detectLanguageFromText } from '../lib/agenticAiService';
import { buildOtaDeepLink, OTA_LIST } from '../lib/ota';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL && import.meta.env.VITE_BACKEND_URL !== '/api'
    ? import.meta.env.VITE_BACKEND_URL
    : 'https://yatrasaathi.onrender.com';

export const CITY_ALIASES: Record<string, string> = {
  // Visakhapatnam
  visakhapatnam: 'Visakhapatnam', vizag: 'Visakhapatnam', visakha: 'Visakhapatnam', visag: 'Visakhapatnam', vizakhapatnam: 'Visakhapatnam', vishakhapatnam: 'Visakhapatnam', vishakapatnam: 'Visakhapatnam',
  వైజాగ్: 'Visakhapatnam', విశాఖపట్నం: 'Visakhapatnam', विशाखापट्टनम: 'Visakhapatnam',
  விசாகப்பட்டினம்: 'Visakhapatnam', ವಿಶಾಖಪಟ್ಟಣ: 'Visakhapatnam', വിശാഖപട്ടണം: 'Visakhapatnam',
  વિશાખાપટ્ટનમ: 'Visakhapatnam', విశాఖ: 'Visakhapatnam',

  // Hyderabad
  hyderabad: 'Hyderabad', hyd: 'Hyderabad', హైదరాబాద్: 'Hyderabad', హైదరాబాదు: 'Hyderabad',
  हैदराबाद: 'Hyderabad', ஹைதராபாத்: 'Hyderabad', ಹೈದರಾಬಾದ್: 'Hyderabad', ഹൈദരാബാദ്: 'Hyderabad',
  હૈદરાબાદ: 'Hyderabad', হায়দ্রাবাদ: 'Hyderabad', حیدرآباد: 'Hyderabad',

  // Vijayawada
  vijayawada: 'Vijayawada', vijawada: 'Vijayawada', vja: 'Vijayawada', bezawada: 'Vijayawada', vijaywada: 'Vijayawada',
  విజయవాడ: 'Vijayawada', విజవాడ: 'Vijayawada', బెజవాడ: 'Vijayawada', विजयवाड़ा: 'Vijayawada', विजवाडा: 'Vijayawada', விஜயவாடா: 'Vijayawada',
  ವಿಜಯವಾಡ: 'Vijayawada', വിജയവാഡ: 'Vijayawada', વિજયવાડા: 'Vijayawada',

  // Chennai
  chennai: 'Chennai', madras: 'Chennai', చెన్నై: 'Chennai', మద్రాస్: 'Chennai',
  चेन्नई: 'Chennai', मद्रास: 'Chennai', சென்னை: 'Chennai', மதராஸ்: 'Chennai',
  ಚೆನ್ನೈ: 'Chennai', ചെന്നൈ: 'Chennai', ચેન્નઈ: 'Chennai',

  // Bengaluru
  bengaluru: 'Bengaluru', bangalore: 'Bengaluru', banglore: 'Bengaluru', blr: 'Bengaluru',
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
  kakinada: 'Kakinada', కాకినాడ: 'Kakinada', काकीनाडा: 'Kakinada', காక్కిநாடா: 'Kakinada',
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
  മുംബൈ: 'Mumbai', മુંબઈ: 'Mumbai',

  // Pune
  pune: 'Pune', పుణే: 'Pune', పూనే: 'Pune', पुणे: 'Pune',
  புனே: 'Pune', పుಣೆ: 'Pune', పుനെ: 'Pune', પુણે: 'Pune',

  // Delhi
  delhi: 'Delhi', dilli: 'Delhi', ఢిల్లీ: 'Delhi', ఢిల్లి: 'Delhi',
  दिल्ली: 'Delhi', दिल्लि: 'Delhi', டெல்லி: 'Delhi', దెహలి: 'Delhi',
  ഡൽഹി: 'Delhi', દિલ્હી: 'Delhi',

  // Kolkata
  kolkata: 'Kolkata', calcutta: 'Kolkata', కోల్‌కతా: 'Kolkata', కలకత్తా: 'Kolkata',
  कोलकाता: 'Kolkata', कलकत्ता: 'Kolkata', கொல்கத்தா: 'Kolkata',
  കൊൽക്കത്ത: 'Kolkata', કોલકાતા: 'Kolkata',

  // Kochi
  kochi: 'Kochi', cochin: 'Kochi', కొచ్చి: 'Kochi', కోచి: 'Kochi',
  कोच्चि: 'Kochi', कोचीन: 'Kochi', கொச்சி: 'Kochi',
  കൊച്ചി: 'Kochi', കോચી: 'Kochi',

  // Coimbatore
  coimbatore: 'Coimbatore', కోయంబత్తూర్: 'Coimbatore', कोयंबटூர்: 'Coimbatore',
  கோயம்புத்தூர்: 'Coimbatore', ಕೋಯಮತ್ತೂರು: 'Coimbatore', കോയമ്പത്തൂർ: 'Coimbatore',
  કોઈમ્બતૂર: 'Coimbatore',

  // Madurai
  madurai: 'Madurai', మదురై: 'Madurai', मदेरै: 'Madurai', मदुरै: 'Madurai',
  மதுரை: 'Madurai', ಮಧುರೈ: 'Madurai', മധുര: 'Madurai', મદુરાઈ: 'Madurai',

  // Mysuru
  mysuru: 'Mysuru', mysore: 'Mysuru', మైసూరు: 'Mysuru', మైసూర్: 'Mysuru',
  मैसूरु: 'Mysuru', मैसूर: 'Mysuru', மைசூரு: 'Mysuru', ಮೈಸೂರು: 'Mysuru',
  മൈസൂരു: 'Mysuru', മૈસુરુ: 'Mysuru',
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
  'రోకో', 'रुकिए', 'बस', 'बंद करो', 'స్టాప్',
  'நிறுத்து', 'நிறுத்துங்கள்', 'ஸ்டாப்',
  'ನಿಲ್ಲಿಸಿ', 'ಸಾಕು', 'ಸ್ಟಾಪ್',
  'നിർത്തുക', 'സ്റ്റോപ്പ്',
  'थांबा', 'స్టాప్',
  'રોકો', 'સ્ટોપ',
  'থামুন', 'സ്റ്റപ്',
  'روکیں', 'سٹاپ',
  'ਰੋਕੋ', 'ਸਟਾਪ',
  'రଖନ୍ତୁ', 'ଷ୍ଟପ୍'
];

const CLARIFICATIONS: Record<string, string> = {
  te: 'దయచేసి మీరు ఏ నగరం నుండి ఏ నగరానికి వెళ్లాలనుకుంటున్నారో చెప్పండి (ఉదా: విజయవాడ నుండి హైదరాబాద్).',
  hi: 'कृपया प्रस्थान और गंतव्य शहर बताएं (जैसे: विजयवाड़ा से हैदराबाद)।',
  ta: 'தயவுசெய்து புறப்படும் மற்றும் செல்லும் நகரத்தைக் கூறுங்கள் (எ.கா: விஜயவாடாவிலிருந்து ஹைதராபாத்).',
  kn: 'ದಯವಿಟ್ಟು ಹೊರಡುವ ಮತ್ತು ತಲುಪುವ ನಗರವನ್ನು ತಿಳಿಸಿ (ಉದಾ: ವಿಜಯವಾಡದಿಂದ ಹೈದರಾಬಾದ್).',
  ml: 'ദയവായി പുറപ്പെടുന്ന നഗരവും എത്തുന്ന നഗരവും പറയുക (ഉദാ: കൊച്ചിയിൽ നിന്ന് വരംഗലിലേക്ക്).',
  mr: 'कृपया प्रस्थान आणि गंतव्य शहर सांगा.',
  gu: 'કૃપા કરીને ઉપડવાનું અને પહોંચવાનું શહેર જણાવો.',
  bn: 'অনুগ্রহ করে যাত্রার শহর এবং গন্তব্য জানান।',
  ur: 'براہ کرم روانگی کا شہر اور منزل بتائیں۔',
  pa: 'ਕਿਰਪਾ ਕਰਕੇ ਚੱਲਣ ਅਤੇ ਪਹੁੰਚਣ ਦਾ ਸ਼ਹਿਰ ਦੱਸੋ।',
  or: 'ଦୟାକରି ଯାତ୍ରା ଆରମ୍ଭ ଏବଂ ଗନ୍ତବ୍ୟ ସହର କୁହନ୍ତୁ।',
  en: 'Please specify your origin and destination cities (e.g., Vijayawada to Hyderabad).',
};

const CONFIRMATIONS: Record<string, (o: string, d: string) => string> = {
  te: (o, d) => `సరే! మీరు ${o} నుండి ${d} వెళ్లే బస్సులను చూపిస్తున్నాను.`,
  hi: (o, d) => `ठीक है! हम आपको ${o} से ${d} जाने वाली बसें दिखा रहे हैं।`,
  ta: (o, d) => `சரி! நாங்கள் உங்களுக்கு ${o} இலிருந்து ${d} செல்லும் பேருந்துகளைக் காட்டுகிறோம்.`,
  kn: (o, d) => `ಸರಿ! ನಾವು ನಿಮಗೆ ${o} ದಿಂದ ${d} ಗೆ ಹೋಗುವ ಬಸ್‌ಗಳನ್ನು ತೋರಿಸುತ್ತಿದ್ದೇವೆ.`,
  ml: (o, d) => `ശരി! ഞങ്ങൾ നിങ്ങൾക്ക് ${o} ൽ നിന്ന് ${d} ലേക്ക് പോകുന്ന ബസുകൾ കാണിക്കുന്നു.`,
  mr: (o, d) => `ठीक आहे! आम्ही तुम्हाला ${o} ते ${d} जाणाऱ्या बसेस दाखवत आहोत.`,
  gu: (o, d) => `બરાબર! અમે તમને ${o} થી ${d} જતી બસો બતાવી રહ્યા છીએ.`,
  bn: (o, d) => `ঠিক আছে! আমরা আপনাকে ${o} থেকে ${d} যাওয়ার বাসগুলো দেখাচ্ছি।`,
  ur: (o, d) => `ٹھیک ہے! ہم آپ کو ${o} سے ${d} جانے والی بسیں دکھا رہے ہیں۔`,
  pa: (o, d) => `ਠੀਕ ਹੈ! ਅਸੀਂ ਤੁਹਾਨੂੰ ${o} ਤੋਂ ${d} ਜਾਣ ਵਾਲੀਆਂ ਬੱਸਾਂ ਦਿਖਾ ਰਹੇ ਹਾਂ।`,
  or: (o, d) => `ଠିକ୍ ଅଛି! ଆମେ ଆପଣଙ୍କୁ ${o} ରୁ ${d} ଯାଉଥିବା ବସ୍ ଦେଖାଉଛୁ।`,
  en: (o, d) => `Got it! You're planning to travel from ${o} to ${d}.`,
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

interface PipelineLog {
  time: string;
  stage: string;
  detail: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

export default function VoiceSearchBar() {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { session, updateSession, setSearchRoute } = useSearch();

  const [languages, setLanguages] = useState<LanguageOption[]>(SUPPORTED_LANGUAGES);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [needsClarification, setNeedsClarification] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Debug Panel State
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [debugEntities, setDebugEntities] = useState<any>({});
  const [debugOtaUrls, setDebugOtaUrls] = useState<Record<string, string>>({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);
  const isRecordingRef = useRef<boolean>(false);
  const fullTranscriptRef = useRef<string>('');

  function addPipelineLog(stage: string, detail: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const newLog: PipelineLog = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      stage,
      detail,
      type,
    };
    setPipelineLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  }

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

    addPipelineLog('1. Mic Capture', 'Microphone recording initialized. Listening for audio...', 'info');

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

        // SpeechGrammarList JSGF biasing for travel cities
        const SpeechGrammarList =
          (window as any).SpeechGrammarList || (window as any).webkitSpeechGrammarList;
        if (SpeechGrammarList) {
          try {
            const grammarList = new SpeechGrammarList();
            const grammar = `#JSGF V1.0; grammar cities; public <city> = ${CITIES.join(
              ' | '
            )} | ${Object.keys(CITY_ALIASES).join(' | ')} ;`;
            grammarList.addFromString(grammar, 1.0);
            recog.grammars = grammarList;
            addPipelineLog('2. STT Grammar', 'JSGF SpeechGrammarList injected with 23 dropdown cities & aliases', 'info');
          } catch (gErr) {
            console.log('Grammar list not supported:', gErr);
          }
        }

        recog.onresult = (event: any) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          currentText = currentText.trim();
          fullTranscriptRef.current = currentText;
          setTranscript(currentText);

          addPipelineLog('3. STT Transcript', `Recognized speech: "${currentText}"`, 'success');

          const lowerText = currentText.toLowerCase();

          for (const [kw, langCode] of Object.entries(LANGUAGE_KEYWORD_MAP)) {
            if (lowerText.includes(kw) && (lowerText.includes('change') || lowerText.includes('switch') || lowerText.includes('మార్చండి') || lowerText.includes('बदलें') || lowerText.includes('மாற்று') || lowerText.includes('<ctrl42>బದಲಾಯಿಸಿ'))) {
              setLanguage(langCode);
              addPipelineLog('4. Lang Switch', `Auto switched voice language to: ${langCode}`, 'info');
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
          addPipelineLog('STT Error', `Speech error event: ${e.error}`, 'warn');
          if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
            setMicError('Microphone permission blocked. Please allow mic access in browser settings.');
            isRecordingRef.current = false;
            setIsRecording(false);
          } else {
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
        addPipelineLog('STT Fallback', 'Web Speech API error, falling back to MediaRecorder upload', 'warn');
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
      setMicError('Microphone permission required for voice search. Please click "Allow" in browser.');
      addPipelineLog('Mic Error', 'Microphone permission denied by browser', 'error');
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
    processTextDirectly(finalText || '');
  }

  function clientSideParseIntent(text: string, defaultLang: string, currentContextOrigin?: string | null) {
    const lang = detectLanguageFromText(text, defaultLang);
    addPipelineLog('5. Language Detection', `Detected Language: ${lang.toUpperCase()}`, 'info');

    const cityResult = extractCitiesFromInput(text);
    addPipelineLog(
      '6. City Normalization',
      `Cities Found: [${cityResult.cities.join(', ')}] | Confidence: ${cityResult.confidence}`,
      cityResult.cities.length > 0 ? 'success' : 'warn'
    );

    const prefResult = extractContinuousPreferences(text);
    addPipelineLog(
      '7. Entity Extraction',
      `Date: ${prefResult.date} | Time: ${prefResult.time || 'N/A'} | BusType: ${prefResult.busType || 'N/A'} | SeatType: ${prefResult.seatType || 'N/A'}`,
      'info'
    );

    let origin: string | null = currentContextOrigin || session.source || null;
    let destination: string | null = null;

    if (cityResult.cities.length >= 2) {
      origin = cityResult.cities[0];
      destination = cityResult.cities[1];
    } else if (cityResult.cities.length === 1) {
      const singleCity = cityResult.cities[0];
      if (!origin) {
        origin = singleCity;
      } else if (singleCity.toLowerCase() !== origin.toLowerCase()) {
        destination = singleCity;
      }
    }

    // Synchronize to global SearchSession!
    if (origin || destination) {
      updateSession({
        source: origin || session.source,
        destination: destination || session.destination,
        date: prefResult.date || session.date,
        time: prefResult.time || session.time,
        busType: prefResult.busType || session.busType,
        seatType: prefResult.seatType || session.seatType,
        language: lang,
      });
      addPipelineLog('Global SearchSession Sync', `Updated SearchSession: From=${origin || 'N/A'}, To=${destination || 'N/A'}`, 'success');
    }

    const ready = Boolean(origin && destination);

    const originNative = origin ? CITY_TRANSLATIONS[origin]?.[lang] || origin : '';
    const destNative = destination ? CITY_TRANSLATIONS[destination]?.[lang] || destination : '';

    const confirmationFn = CONFIRMATIONS[lang] || CONFIRMATIONS['en'];
    const spoken = ready
      ? confirmationFn(originNative, destNative)
      : cityResult.confidence === 'low' && cityResult.lowConfCity
      ? (lang === 'te' ? `మీరు ${cityResult.lowConfCity} అని అంటున్నారా? దయచేసి మళ్లీ చెప్పండి.`
         : lang === 'hi' ? `क्या आपका मतलब ${cityResult.lowConfCity} है?`
         : `Did you mean ${cityResult.lowConfCity}? Please specify your destination.`)
      : origin
      ? (lang === 'te' ? `సరే! మీరు ${originNative} నుండి ప్రయాణిస్తున్నారు. ఏ నగరానికి వెళ్లాలనుకుంటున్నారు?`
         : lang === 'hi' ? `ठीक है! आप ${originNative} से यात्रा कर रहे हैं। किस शहर जाना चाहते हैं?`
         : lang === 'ml' ? `ശരി! നിങ്ങൾ ${originNative} ൽ നിന്നാണ് പുറപ്പെടുന്നത്. ഏത് നഗരത്തിലേക്കാണ് പോകേണ്ടത്?`
         : lang === 'ta' ? `சரி! நீங்கள் ${originNative} இலிருந்து புறப்படுகிறீர்கள். எந்த நகரத்திற்குச் செல்ல வேண்டும்?`
         : `Got it! You are departing from ${origin}. Where would you like to travel to?`)
      : (CLARIFICATIONS[lang] || CLARIFICATIONS['en']);

    // Build debug OTA URLs
    if (origin && destination) {
      const dateVal = prefResult.date || session.date || new Date().toISOString().split('T')[0];
      const urls: Record<string, string> = {};
      OTA_LIST.forEach((ota) => {
        urls[ota] = buildOtaDeepLink({ ota_source: ota }, origin, destination, dateVal);
      });
      setDebugOtaUrls(urls);
      addPipelineLog('8. OTA Links', `Generated dynamic booking URLs for ${OTA_LIST.length} OTAs`, 'success');
    }

    setDebugEntities({
      rawTranscript: text,
      detectedLang: lang,
      origin,
      destination,
      date: prefResult.date || session.date,
      time: prefResult.time || session.time,
      busType: prefResult.busType || session.busType,
      seatType: prefResult.seatType || session.seatType,
      confidence: cityResult.confidence,
      readyToSearch: ready,
    });

    return {
      transcript: text,
      intent: {
        origin,
        destination,
        date: prefResult.date || session.date,
        time: prefResult.time || session.time,
        busType: prefResult.busType || session.busType,
        seatType: prefResult.seatType || session.seatType,
        language: lang,
        clarification_needed: ready ? null : spoken,
      },
      spoken_text: spoken,
      needs_clarification: !ready,
      ready_to_search: ready,
    };
  }

  function processTextDirectly(text: string) {
    setIsProcessing(true);
    addPipelineLog('4. NLU Processing', `Processing transcript: "${text}"`, 'info');
    const parsed = clientSideParseIntent(text, currentLanguage, session.source);

    setTranscript(parsed.transcript);
    setSpokenText(parsed.spoken_text);
    setNeedsClarification(parsed.needs_clarification);

    if (parsed.intent.language !== currentLanguage) {
      setLanguage(parsed.intent.language);
    }

    speakWithBrowser(parsed.spoken_text, parsed.intent.language);
    addPipelineLog('9. Audio Synthesis', `TTS Audio Spoken: "${parsed.spoken_text}"`, 'success');

    if (parsed.ready_to_search && parsed.intent.origin && parsed.intent.destination) {
      const params = new URLSearchParams({
        origin: parsed.intent.origin,
        destination: parsed.intent.destination,
        date: parsed.intent.date,
      });
      addPipelineLog('10. Search Execution', `Navigating to /results?${params.toString()}`, 'success');
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
      addPipelineLog('Backend NLU', `Backend STT Response: "${data.transcript}"`, 'success');

      setTranscript(data.transcript);
      setSpokenText(data.spoken_text);
      setNeedsClarification(data.needs_clarification);

      if (data.intent?.origin && data.intent?.destination) {
        updateSession({
          source: data.intent.origin,
          destination: data.intent.destination,
          date: data.intent.date || session.date,
        });
      }

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
      addPipelineLog('Backend Fallback', 'Backend service unavailable. Using client NLU parser', 'warn');
      processTextDirectly(transcript || '');
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

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="flex items-center gap-1.5 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/20 transition-colors"
          >
            <Bug className="h-3.5 w-3.5" />
            <span>Developer Debug Panel</span>
            {showDebugPanel ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-blue-400" />
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
      </div>

      <p className="max-w-xl text-center text-xs sm:text-sm text-slate-300">{t('voiceHint')}</p>

      {micError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/20 border border-red-500/40 px-4 py-2 text-xs font-semibold text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{micError}</span>
        </div>
      )}

      {/* Mic Button */}
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
          ? '🔴 Recording... Tap button or say "Stop" / "ఆపు" / "రోకో" to search'
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

      {/* Developer Debug Panel */}
      {showDebugPanel && (
        <div className="w-full mt-4 rounded-xl bg-slate-950/90 border border-amber-500/40 p-4 font-mono text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <div className="flex items-center gap-2 text-amber-400 font-bold">
              <Terminal className="h-4 w-4" />
              <span>🐞 Developer Voice Pipeline Debug Panel</span>
            </div>
            <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px]">
              Global SearchSession Active
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">Status:</span>
              <span className="font-bold text-blue-300">
                {isRecording ? '🔴 RECORDING' : isProcessing ? '⚙️ PROCESSING' : '🟢 IDLE'}
              </span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">Detected Lang:</span>
              <span className="font-bold text-emerald-300">{debugEntities.detectedLang || currentLanguage}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">Origin City:</span>
              <span className="font-bold text-amber-300">{session.source || 'Not Extracted'}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">Destination City:</span>
              <span className="font-bold text-purple-300">{session.destination || 'Not Extracted'}</span>
            </div>
          </div>

          {/* Real-Time Pipeline Log Feed */}
          <div>
            <span className="text-slate-400 font-bold block mb-1">📜 Pipeline Real-Time Event Log:</span>
            <div className="max-h-36 overflow-y-auto space-y-1 bg-black/60 p-2.5 rounded border border-white/10 text-[11px]">
              {pipelineLogs.length === 0 ? (
                <p className="text-slate-500 italic">No events yet. Tap the mic and speak to view real-time pipeline telemetry.</p>
              ) : (
                pipelineLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-500 text-[10px] shrink-0">[{log.time}]</span>
                    <span className={`font-semibold shrink-0 ${
                      log.type === 'success' ? 'text-emerald-400' : log.type === 'warn' ? 'text-amber-400' : log.type === 'error' ? 'text-red-400' : 'text-blue-400'
                    }`}>
                      [{log.stage}]
                    </span>
                    <span className="text-slate-200">{log.detail}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Generated OTA Deep Links Preview */}
          {Object.keys(debugOtaUrls).length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <span className="text-slate-400 font-bold block mb-1">🔗 Dynamic OTA Deep Links Generated:</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px]">
                {Object.entries(debugOtaUrls).map(([ota, url]) => (
                  <a
                    key={ota}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate text-blue-400 hover:underline bg-white/5 p-1 rounded border border-white/10 block"
                  >
                    <strong>{ota}:</strong> {url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
