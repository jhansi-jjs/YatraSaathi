import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Mic, Square, Sparkles, ExternalLink, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { processUserMessage, ChatMessage, ConversationState, getNearbyBoardingPoints } from '../lib/agenticAiService';
import { speakWithBrowser, getRecognitionLang, getSpeechRecognitionCtor, primeAudio, BACKEND_URL, type SpeechRecognitionInstance, type SpeechRecognitionResultEvent } from '../lib/speech';

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage } = useLanguage();
  const { session, updateSession } = useSearch();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [state, setState] = useState<ConversationState>({
    origin: session.source,
    destination: session.destination,
    date: session.date || new Date().toISOString().split('T')[0],
    time: session.time,
    busType: session.busType,
    seatType: session.seatType,
    maxBudget: session.maxBudget,
    language: currentLanguage,
    step: 'origin',
    confidence: 'high',
  });

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Namaste! I am Chicha, your AI Travel Companion. Speak or type your trip details (e.g. "buses from Vizag to Hyderabad tomorrow" or "నన్ను విజయవాడ పంపించండి")',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      actionChips: ['🚌 Visakhapatnam to Hyderabad', '🚌 Kochi to Warangal', '📍 My Location', '💰 Cheapest Bus'],
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function handleSend(textToSend?: string) {
    // Bug 3 Fix: Prime audio context on explicit user send gesture
    primeAudio();

    const query = (textToSend || input).trim();
    if (!query) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const currentState: ConversationState = {
        ...state,
        origin: session.source || state.origin,
        destination: session.destination || state.destination,
        date: session.date || state.date,
      };

      const { responseMessage, nextState } = processUserMessage(query, currentState);

      // Bug 5 Fix: Update LanguageContext live per turn based on detected input language
      if (nextState.language && nextState.language !== currentLanguage) {
        setLanguage(nextState.language);
      }

      setState(nextState);
      updateSession({
        source: nextState.origin,
        destination: nextState.destination,
        date: nextState.date || session.date,
        time: nextState.time,
        busType: nextState.busType,
        seatType: nextState.seatType,
        language: nextState.language,
      });

      setMessages((prev) => [...prev, responseMessage]);
      setIsTyping(false);

      // Speak response in detected language using robust TTS engine chain
      void speakWithBrowser(responseMessage.text, responseMessage.language || nextState.language || currentLanguage);

      if (nextState.origin && nextState.destination) {
        const params = new URLSearchParams({
          origin: nextState.origin,
          destination: nextState.destination,
          date: nextState.date || session.date || new Date().toISOString().split('T')[0],
        });
        setTimeout(() => {
          setIsOpen(false);
          navigate(`/results?${params.toString()}`);
        }, 2200);
      }
    }, 600);
  }

  function handleQuickChip(chipText: string) {
    primeAudio();
    if (chipText === '📍 My Location') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          () => {
            const nearby = getNearbyBoardingPoints(session.source || state.origin || 'Visakhapatnam');
            const locMsg: ChatMessage = {
              id: `loc-${Date.now()}`,
              sender: 'assistant',
              text: `📍 GPS Location Detected! Recommended pickup points near you: ${nearby.join(', ')}.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              actionChips: ['🚌 Search Buses From Here'],
            };
            setMessages((prev) => [...prev, locMsg]);
          },
          () => {
            handleSend('buses from Visakhapatnam to Hyderabad');
          }
        );
      }
    } else {
      handleSend(chipText.replace(/^[^\w\s]+/, '').trim());
    }
  }

  async function toggleVoiceInput() {
    primeAudio();

    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = getSpeechRecognitionCtor();

    // Bug 4 Fix: If Web Speech is unsupported (Safari, Firefox), route seamlessly to MediaRecorder -> Whisper
    if (!SpeechRecognition) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        recorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          if (audioBlob.size > 0) {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'chat_rec.webm');
            formData.append('selected_language', currentLanguage);
            try {
              const res = await fetch(`${BACKEND_URL}/voice-search`, { method: 'POST', body: formData });
              if (res.ok) {
                const data = await res.json();
                if (data.transcript) handleSend(data.transcript);
              }
            } catch {}
          }
          setIsRecording(false);
        };

        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
      } catch {
        alert('Microphone access required. Please allow mic permissions.');
        setIsRecording(false);
      }
      return;
    }

    try {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
      recog.lang = getRecognitionLang(currentLanguage);

      recog.onresult = (event: SpeechRecognitionResultEvent) => {
        const text = event.results[0][0].transcript;
        setIsRecording(false);
        if (text) handleSend(text);
      };

      recog.onerror = () => setIsRecording(false);
      recog.onend = () => setIsRecording(false);

      recognitionRef.current = recog;
      setIsRecording(true);
      recog.start();
    } catch {
      setIsRecording(false);
    }
  }

  function resetChat() {
    setState({
      origin: null,
      destination: null,
      date: new Date().toISOString().split('T')[0],
      time: null,
      busType: null,
      seatType: null,
      maxBudget: null,
      language: currentLanguage,
      step: 'origin',
      confidence: 'high',
    });
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: 'Reset complete! Where would you like to travel today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionChips: ['🚌 Visakhapatnam to Hyderabad', '🚌 Vijayawada to Bengaluru', '💰 Cheapest Bus'],
      },
    ]);
  }

  return (
    <>
      {/* Floating Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => {
            primeAudio();
            setIsOpen(true);
          }}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-2xl hover:scale-110 transition-all cursor-pointer group"
          title="Open AI Travel Assistant"
        >
          <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
          </span>
        </button>
      )}

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex h-[540px] w-[360px] sm:w-[400px] flex-col overflow-hidden rounded-2xl bg-slate-900 text-white border border-white/10 shadow-2xl animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/80 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Chicha AI Saathi
                  <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-1.5 py-0.2 rounded-full">
                    Online
                  </span>
                </h3>
                <p className="text-[10px] text-slate-400">12 Languages · Voice & Chat Agent</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
                title="Reset Chat"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 leading-relaxed shadow-sm ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-100 border border-white/10 rounded-bl-none'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>

                <span className="mt-1 text-[9px] text-slate-500 px-1">{msg.timestamp}</span>

                {/* Action Chips */}
                {msg.actionChips && msg.actionChips.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.actionChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickChip(chip)}
                        className="rounded-full bg-white/5 border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-blue-300 hover:bg-blue-600 hover:text-white hover:border-blue-500 transition-all cursor-pointer"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-slate-400 italic text-[11px] bg-slate-800/50 p-2 rounded-xl w-max">
                <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span>Chicha is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <div className="border-t border-white/10 bg-slate-800/60 p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <button
                type="button"
                onClick={toggleVoiceInput}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                }`}
                title="Voice Input"
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type or speak (e.g., Vizag to Hyd)..."
                className="flex-1 rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-40 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
