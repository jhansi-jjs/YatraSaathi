import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Square, Globe, Loader2, Sparkles, Volume2, AlertCircle, Bug, ChevronDown, ChevronUp, Terminal } from 'lucide-react';
import { CITIES } from './SearchForm';
import { useLanguage, SUPPORTED_LANGUAGES, CITY_TRANSLATIONS } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import {
  extractCitiesFromInput,
  extractContinuousPreferences,
  detectLanguageFromText,
  getResponseTemplate,
  resolveRoute,
} from '../lib/agenticAiService';
import { extractFilters, mergeFilters, describeFilters, hasAnyFilter, EMPTY_FILTERS } from '../lib/filterExtraction';
import {
  generateDynamicListings,
  applyResultFilters,
  voiceFiltersToResultFilters,
  suggestRelaxation,
} from '../lib/listings';
import { filterAppliedMessage, filterClearedMessage, filterNoResultsMessage } from '../lib/filterMessages';
import { hasDirectBuses } from '../lib/breakJourneyService';
import { buildOtaDeepLink, OTA_LIST } from '../lib/ota';
import { getLanguage } from '../lib/languages';
import { runI18nAudit } from '../lib/i18nAudit';
import {
  CLARIFICATIONS,
  CONFIRMATIONS,
  SERVER_WAKING_MSG,
  MIC_PERMISSION_ERROR,
  EMPTY_TRANSCRIPT_MSG,
  sttUnsupportedMessage,
  ttsUnavailableMessage,
  pickMessage,
} from '../lib/voiceMessages';
import {
  speakWithBrowser,
  getRecognitionLang,
  getSpeechRecognitionCtor,
  canUseBrowserStt,
  markLocaleUnsupported,
  primeAudio,
  BACKEND_URL,
  type SpeakResult,
  type SpeechRecognitionInstance,
  type SpeechRecognitionResultEvent,
  type SpeechRecognitionErrorEvent,
} from '../lib/speech';

// CITY_ALIASES now lives in ../lib/cities to avoid a circular import; re-exported
// here so existing imports from this module keep working.
export { CITY_ALIASES } from '../lib/cities';

// Reply strings now live in lib/voiceMessages.ts so the i18n audit can verify that
// every supported language has every key (ISSUE 0c/0e).

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatDateSuffix(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-').map(Number);
  const [y, m, d] = parts;
  if (!y || !m || !d) return '';
  return ` — ${String(d).padStart(2, '0')} ${MONTHS_SHORT[m - 1]} ${y}`;
}

interface PipelineLog {
  time: string;
  stage: string;
  detail: string;
  type: 'info' | 'success' | 'warn' | 'error';
}

interface DebugEntities {
  rawTranscript?: string;
  detectedLang?: string;
  origin?: string | null;
  destination?: string | null;
  date?: string | null;
  time?: string | null;
  busType?: string | null;
  seatType?: string | null;
  confidence?: 'high' | 'medium' | 'low';
  readyToSearch?: boolean;
}

export default function VoiceSearchBar() {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const { session, updateSession } = useSearch();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [spokenText, setSpokenText] = useState('');
  const [needsClarification, setNeedsClarification] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);

  // Debug Panel State
  const [showDebugPanel, setShowDebugPanel] = useState(true);
  const [pipelineLogs, setPipelineLogs] = useState<PipelineLog[]>([]);
  const [debugEntities, setDebugEntities] = useState<DebugEntities>({});
  const [debugOtaUrls, setDebugOtaUrls] = useState<Record<string, string>>({});
  const [ttsInfo, setTtsInfo] = useState<SpeakResult | null>(null);
  const [sttEngine, setSttEngine] = useState<string>('—');
  const [serverStatus, setServerStatus] = useState<'idle' | 'waking' | 'ready' | 'offline'>('idle');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const isRecordingRef = useRef<boolean>(false);
  const fullTranscriptRef = useRef<string>('');
  const shouldProcessRef = useRef<boolean>(false);

  function addPipelineLog(stage: string, detail: string, type: 'info' | 'success' | 'warn' | 'error' = 'info') {
    const newLog: PipelineLog = {
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      stage,
      detail,
      type,
    };
    setPipelineLogs((prev) => [newLog, ...prev.slice(0, 49)]);
  }

  // ISSUE 0: the picker below is driven by SUPPORTED_LANGUAGES — the SAME list the
  // login/onboarding screen and the header switcher use. It used to be replaced by
  // whatever `GET /languages` returned (23 backend entries, several with no STT, no
  // TTS and no UI translations), which is exactly how the two sets drifted apart.
  // The backend list is no longer consulted for the picker.
  const i18nReport = useRef(runI18nAudit()).current;

  async function startVoiceSearch() {
    // Bug 3 Fix: Prime audio context on user gesture to prevent browser autoplay blocking
    primeAudio();

    setMicError(null);
    setSpokenText('');
    setTranscript('');
    fullTranscriptRef.current = '';
    shouldProcessRef.current = false;
    setNeedsClarification(false);
    isRecordingRef.current = true;
    setIsRecording(true);

    addPipelineLog('1. Mic Capture', 'Microphone recording initialized. Capturing audio stream...', 'info');

    setServerStatus('waking');
    setSttEngine('Browser Web Speech / Whisper Fallback');
    void fetch(`${BACKEND_URL}/health`)
      .then((r) => {
        setServerStatus(r.ok ? 'ready' : 'offline');
        addPipelineLog('0. Backend Warm-up', r.ok ? 'Backend /health OK — Whisper ready.' : 'Backend /health not OK.', r.ok ? 'success' : 'warn');
      })
      .catch(() => {
        setServerStatus('offline');
        addPipelineLog('0. Backend Warm-up', 'Backend unreachable — using browser Web Speech for STT.', 'warn');
      });

    // 1. MediaRecorder audio capture path (works in ALL browsers: Chrome, Safari, Firefox, Edge)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        if (shouldProcessRef.current) {
          shouldProcessRef.current = false;
          void handleAudioUpload();
        }
      };

      recorder.start(100);
      mediaRecorderRef.current = recorder;
      addPipelineLog('1. MediaRecorder', 'MediaRecorder started. Recording WebM audio stream...', 'success');
    } catch {
      addPipelineLog('Mic Error', 'Microphone permission denied or audio device missing', 'error');
      setMicError(pickMessage(MIC_PERMISSION_ERROR, currentLanguage));
      isRecordingRef.current = false;
      setIsRecording(false);
      return;
    }

    // Optional SpeechRecognition for real-time live preview feedback.
    // ISSUE 0(a): recognition.lang comes from the shared language table, and we only
    // start browser recognition when Chrome actually supports that locale. For
    // languages it does not support (Odia) Chrome silently transcribes as English —
    // so we skip it entirely and let backend Whisper do the work rather than feeding
    // confident-looking nonsense into the parser.
    const SpeechRecognition = getSpeechRecognitionCtor();
    const browserSttUsable = canUseBrowserStt(currentLanguage);

    if (!browserSttUsable) {
      setSttEngine(`Backend Whisper only (${getLanguage(currentLanguage).name})`);
      addPipelineLog(
        '1b. STT Routing',
        `Browser has no ${getLanguage(currentLanguage).name} recognition — routing audio to backend Whisper.`,
        'warn'
      );
      setSpokenText(sttUnsupportedMessage(currentLanguage));
    }

    if (SpeechRecognition && browserSttUsable) {
      try {
        const recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = true;
        recog.lang = getRecognitionLang(currentLanguage);
        setSttEngine(`Browser Web Speech (${recog.lang})`);

        recog.onresult = (event: SpeechRecognitionResultEvent) => {
          let currentText = '';
          for (let i = 0; i < event.results.length; i++) {
            currentText += event.results[i][0].transcript + ' ';
          }
          currentText = currentText.trim();
          if (currentText) {
            fullTranscriptRef.current = currentText;
            setTranscript(currentText);
            addPipelineLog('Live Speech STT', `Preview transcript: "${currentText}"`, 'info');
          }
        };

        recog.onerror = (e: SpeechRecognitionErrorEvent) => {
          // A locale Chrome cannot handle is remembered for the rest of the session so
          // we never silently mis-transcribe it again.
          if (e.error === 'language-not-supported') {
            markLocaleUnsupported(currentLanguage);
            fullTranscriptRef.current = '';
            setTranscript('');
            setSpokenText(sttUnsupportedMessage(currentLanguage));
            setSttEngine(`Backend Whisper only (${getLanguage(currentLanguage).name})`);
            addPipelineLog(
              'STT Preview',
              `Chrome rejected locale ${getRecognitionLang(currentLanguage)} — backend Whisper will transcribe instead.`,
              'warn'
            );
            return;
          }
          addPipelineLog('STT Preview', `Live preview speech event: ${e.error} (falling back to backend Whisper)`, 'warn');
        };

        recognitionRef.current = recog;
        recog.start();
      } catch (e) {
        addPipelineLog('STT Preview', `Web Speech preview unavailable (${e}) — using backend Whisper.`, 'warn');
      }
    }
  }

  function stopVoiceSearch() {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        /* recognition already stopped */
      }
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        addPipelineLog('2. Stop Recording', 'Stopping MediaRecorder. Preparing audio blob for upload...', 'info');
        shouldProcessRef.current = true;
        mediaRecorderRef.current.stop();
      } catch {
        /* recorder already stopped */
      }
    } else {
      const finalText = fullTranscriptRef.current || transcript;
      if (finalText && finalText.trim().length > 0) {
        processTextDirectly(finalText);
      } else {
        handleEmptyTranscriptGuard();
      }
    }
  }

  function handleEmptyTranscriptGuard() {
    setIsProcessing(false);
    addPipelineLog('STT Guard', '❌ Empty transcript. Audio not heard. Halting NLU pipeline.', 'error');
    // Explained in the user's language, and spoken, so the failure is never silent.
    const emptyMsg = pickMessage(EMPTY_TRANSCRIPT_MSG, currentLanguage);
    setSpokenText(emptyMsg);
    setNeedsClarification(true);
    void speakWithBrowser(emptyMsg, currentLanguage).then(setTtsInfo);
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

    // ISSUE 1: extract price range / type / AC / model / rating / amenities and MERGE
    // them with what was already captured, so "only Volvo" keeps the price and rating.
    const spokenFilters = extractFilters(text);
    const mergedFilters = mergeFilters(session.filters || EMPTY_FILTERS, spokenFilters);
    addPipelineLog(
      '7b. Filter Extraction',
      hasAnyFilter(mergedFilters)
        ? `Filters: ${describeFilters(mergedFilters, lang)}${spokenFilters.reset ? ' (cleared)' : ''}`
        : 'No filters mentioned',
      hasAnyFilter(mergedFilters) ? 'success' : 'info'
    );

    // Start from whatever the shared session already knows so a follow-up answer
    // merges with captured details instead of resetting them (BUG 2). Roles come from
    // postpositions, so "chennai ku" is understood as a DESTINATION (ISSUE 2).
    const { origin, destination } = resolveRoute(
      cityResult,
      currentContextOrigin || session.source || null,
      session.destination || null
    );

    const mergedDate = prefResult.date || session.date || new Date().toISOString().split('T')[0];
    const mergedTime = prefResult.time || session.time;
    const mergedBusType = prefResult.busType || session.busType;
    const mergedSeatType = prefResult.seatType || session.seatType;

    if (origin || destination || hasAnyFilter(mergedFilters) || spokenFilters.reset) {
      updateSession({
        source: origin || session.source,
        destination: destination || session.destination,
        date: mergedDate,
        time: mergedTime,
        busType: mergedBusType,
        seatType: mergedSeatType,
        language: lang,
        filters: mergedFilters,
      });
      addPipelineLog(
        'Global SearchSession Sync',
        `Updated SearchSession: From=${origin || 'N/A'}, To=${destination || 'N/A'}, Date=${mergedDate}`,
        'success'
      );
    }

    const ready = Boolean(origin && destination);

    const originNative = origin ? CITY_TRANSLATIONS[origin]?.[lang] || origin : '';
    const destNative = destination ? CITY_TRANSLATIONS[destination]?.[lang] || destination : '';

    // Filter confirmation, counted against the same listings the results page renders,
    // with a nearest-relaxation offer when nothing matches (ISSUE 1c/1d).
    let filterSentence = '';
    if (ready && origin && destination) {
      const inventory = hasDirectBuses(origin, destination)
        ? generateDynamicListings(origin, destination, mergedDate)
        : [];
      if (inventory.length > 0) {
        if (spokenFilters.reset) {
          filterSentence = filterClearedMessage(lang, inventory.length);
        } else if (hasAnyFilter(mergedFilters)) {
          const resultFilters = voiceFiltersToResultFilters(mergedFilters);
          const matched = applyResultFilters(inventory, resultFilters);
          if (matched.length > 0) {
            filterSentence = filterAppliedMessage(lang, describeFilters(mergedFilters, lang), matched.length);
          } else {
            const relaxation = suggestRelaxation(inventory, resultFilters);
            if (relaxation) {
              filterSentence = filterNoResultsMessage(
                lang,
                describeFilters(mergedFilters, lang),
                relaxation.relaxed,
                relaxation.count,
                relaxation.samplePrice
              );
            }
          }
          addPipelineLog('7c. Filter Application', filterSentence, 'success');
        }
      }
    }

    const template = getResponseTemplate(lang);
    let spoken: string;
    if (ready) {
      // Confirm the parsed route back in the user's language, including the travel
      // date (BUG 3). Whether the route has direct buses is decided on the Results
      // page, which shows connecting journeys when there are none (BUG 4).
      const confirmationFn = pickMessage(CONFIRMATIONS, lang);
      spoken = `${confirmationFn(originNative, destNative)}${formatDateSuffix(mergedDate)}`;
      if (filterSentence) spoken += ` ${filterSentence}`;
    } else if (cityResult.confidence === 'low' && cityResult.lowConfCity) {
      spoken = template.lowConfidencePrompt(cityResult.lowConfCity);
    } else if (origin) {
      spoken = template.needDest(originNative);
    } else {
      spoken = pickMessage(CLARIFICATIONS, lang);
    }

    if (origin && destination) {
      const urls: Record<string, string> = {};
      OTA_LIST.forEach((ota) => {
        urls[ota] = buildOtaDeepLink({ ota_source: ota }, origin, destination, mergedDate);
      });
      setDebugOtaUrls(urls);
      addPipelineLog('8. OTA Links', `Generated dynamic booking URLs for ${OTA_LIST.length} OTAs`, 'success');
    }

    setDebugEntities({
      rawTranscript: text,
      detectedLang: lang,
      origin,
      destination,
      date: mergedDate,
      time: mergedTime,
      busType: mergedBusType,
      seatType: mergedSeatType,
      confidence: cityResult.confidence,
      readyToSearch: ready,
    });

    return {
      transcript: text,
      intent: {
        origin,
        destination,
        date: mergedDate,
        time: mergedTime,
        busType: mergedBusType,
        seatType: mergedSeatType,
        language: lang,
        clarification_needed: ready ? null : spoken,
      },
      spoken_text: spoken,
      needs_clarification: !ready,
      ready_to_search: ready,
    };
  }

  function processTextDirectly(text: string) {
    if (!text || !text.trim()) {
      handleEmptyTranscriptGuard();
      return;
    }

    setIsProcessing(true);
    addPipelineLog('4. NLU Processing', `Processing transcript: "${text}"`, 'info');
    const parsed = clientSideParseIntent(text, currentLanguage, session.source);

    setTranscript(parsed.transcript);
    setSpokenText(parsed.spoken_text);
    setNeedsClarification(parsed.needs_clarification);

    // Bug 5 Fix: Mid-conversation language switching updates LanguageContext on every turn
    if (parsed.intent.language !== currentLanguage) {
      setLanguage(parsed.intent.language);
    }

    // Speak the reply in the DETECTED language. ISSUE 0(d): browser voice first, then
    // backend edge-tts, and if neither exists the reply stays visible as text with an
    // explicit "no audio in this language" note — never silence with no explanation.
    void speakWithBrowser(parsed.spoken_text, parsed.intent.language).then((r) => {
      setTtsInfo(r);
      addPipelineLog(
        '9. Audio Synthesis',
        r.ok
          ? `TTS via ${r.engine}${r.voice ? ` — voice "${r.voice}"` : ''} [${parsed.intent.language}]`
          : `⚠️ TTS unavailable: ${r.detail} — reply shown as text`,
        r.ok ? 'success' : 'warn'
      );
    });

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

    addPipelineLog('3. Blob Check', `Audio Blob created: ${audioBlob.size.toLocaleString()} bytes`, audioBlob.size > 0 ? 'success' : 'error');

    if (audioBlob.size === 0) {
      handleEmptyTranscriptGuard();
      return;
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, 'recording.webm');
    formData.append('selected_language', currentLanguage);
    formData.append('valid_cities', CITIES.join(','));

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 10000);
    const preview = () => fullTranscriptRef.current || transcript;

    try {
      addPipelineLog('4. POST Upload', `Uploading audio to backend ${BACKEND_URL}/voice-search...`, 'info');
      const res = await fetch(`${BACKEND_URL}/voice-search`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });
      window.clearTimeout(timeoutId);

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      setServerStatus('ready');
      addPipelineLog('5. Whisper Result', `Backend Whisper STT: "${data.transcript || ''}"`, data.transcript ? 'success' : 'warn');

      const backendText = (data.transcript || '').trim();
      if (backendText) {
        setSttEngine('Backend Whisper');
        processTextDirectly(backendText);
        return;
      }

      const pv = preview();
      if (pv && pv.trim()) {
        setSttEngine('Browser Web Speech (backend empty)');
        addPipelineLog('STT Fallback', 'Backend transcript empty — using browser Web Speech transcript.', 'warn');
        processTextDirectly(pv);
      } else {
        handleEmptyTranscriptGuard();
      }
    } catch (err) {
      window.clearTimeout(timeoutId);
      const aborted = err instanceof DOMException && err.name === 'AbortError';
      if (aborted) setServerStatus('waking');
      addPipelineLog(
        'Backend Fallback',
        aborted
          ? 'Backend timed out (10s). Using browser Web Speech transcript.'
          : `Backend upload failed (${err}). Using browser Web Speech transcript.`,
        'warn'
      );
      const pv = preview();
      if (pv && pv.trim().length > 0) {
        setSttEngine('Browser Web Speech (backend timeout/fail)');
        processTextDirectly(pv);
      } else {
        handleEmptyTranscriptGuard();
      }
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
              {SUPPORTED_LANGUAGES.map((lang) => (
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
          ? '🔴 Recording... Tap button when finished speaking'
          : t('speakNow')}
      </p>

      {serverStatus === 'waking' && (isRecording || isProcessing) && (
        <div className="rounded-lg bg-amber-500/15 border border-amber-500/30 px-4 py-2 text-xs font-semibold text-amber-300 text-center max-w-xl">
          {SERVER_WAKING_MSG[currentLanguage] || SERVER_WAKING_MSG.en}
        </div>
      )}

      {transcript && (
        <div className="flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs sm:text-sm italic text-blue-200 max-w-2xl text-center">
          <span>"{transcript}"</span>
        </div>
      )}

      {spokenText && (
        <div className="flex flex-col gap-1 rounded-xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-emerald-200">
          <div className="flex items-start gap-3">
            <Volume2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{spokenText}</p>
          </div>
          {ttsInfo && !ttsInfo.ok && (
            <p className="pl-8 text-[11px] font-semibold text-amber-300">
              🔇 {ttsUnavailableMessage(debugEntities.detectedLang || currentLanguage)}{' '}
              <span className="opacity-70">({ttsInfo.detail})</span>
            </p>
          )}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">Travel Date:</span>
              <span className="font-bold text-blue-300">{session.date || '—'}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">Backend Status:</span>
              <span
                className={`font-bold ${
                  serverStatus === 'ready'
                    ? 'text-emerald-300'
                    : serverStatus === 'waking'
                    ? 'text-amber-300'
                    : serverStatus === 'offline'
                    ? 'text-red-300'
                    : 'text-slate-400'
                }`}
              >
                {serverStatus === 'ready'
                  ? '🟢 ready'
                  : serverStatus === 'waking'
                  ? '⏳ waking'
                  : serverStatus === 'offline'
                  ? '🔴 offline'
                  : 'idle'}
              </span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">STT Engine:</span>
              <span className="font-bold text-cyan-300">{sttEngine}</span>
            </div>
            <div className="bg-white/5 p-2 rounded border border-white/10">
              <span className="text-slate-400 block">TTS Engine / Voice:</span>
              <span
                className={`font-bold ${
                  ttsInfo ? (ttsInfo.ok ? 'text-emerald-300' : 'text-amber-300') : 'text-slate-400'
                }`}
              >
                {ttsInfo
                  ? ttsInfo.ok
                    ? `${ttsInfo.engine}${ttsInfo.voice ? ` — ${ttsInfo.voice}` : ''}`
                    : `unavailable · ${ttsInfo.detail}`
                  : 'Not spoken yet'}
              </span>
            </div>
          </div>

          {/* ISSUE 0(e): per-language self-check. Any language missing a translation
              key, a browser STT locale or a TTS voice is listed here rather than
              failing silently at runtime. */}
          <div className="pt-2 border-t border-white/10">
            <span className="text-slate-400 font-bold block mb-1">
              🌐 Language coverage self-check ({i18nReport.languages.length} languages,{' '}
              {i18nReport.allGaps.length} missing key{i18nReport.allGaps.length === 1 ? '' : 's'}):
            </span>
            <div className="max-h-28 overflow-y-auto rounded border border-white/10 bg-black/60 p-2 text-[10px]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-0.5">
                {i18nReport.languages.map((l) => (
                  <div key={l.code} className="flex items-center gap-1.5">
                    <span className={l.missingKeys.length ? 'text-red-400' : 'text-emerald-400'}>
                      {l.missingKeys.length ? '✕' : '✓'}
                    </span>
                    <span className="text-slate-300 font-semibold w-16 shrink-0">{l.code} · {l.name}</span>
                    <span className="text-slate-500">
                      STT: {l.sttPath === 'browser-then-server' ? 'browser+server' : 'server only'} · TTS:{' '}
                      {l.ttsPath === 'browser-or-edge-tts' ? 'voice' : 'text only'}
                      {l.missingKeys.length ? ` · ${l.missingKeys.length} gap(s)` : ''}
                    </span>
                  </div>
                ))}
              </div>
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
