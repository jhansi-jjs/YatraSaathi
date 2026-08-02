import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, X, Send, Mic, Square, Sparkles, Volume2, MapPin, Bus, ExternalLink, RefreshCw } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { processUserMessage, ChatMessage, ConversationState, getNearbyBoardingPoints } from '../lib/agenticAiService';

export default function ChatbotWidget() {
  const navigate = useNavigate();
  const { currentLanguage, setLanguage, t } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  const [state, setState] = useState<ConversationState>({
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
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  function speakText(text: string, langCode: string) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    const targetLang =
      langCode === 'te' ? 'te-IN'
      : langCode === 'hi' ? 'hi-IN'
      : langCode === 'ta' ? 'ta-IN'
      : langCode === 'kn' ? 'kn-IN'
      : langCode === 'ml' ? 'ml-IN'
      : langCode === 'mr' ? 'mr-IN'
      : langCode === 'gu' ? 'gu-IN'
      : langCode === 'bn' ? 'bn-IN'
      : langCode === 'ur' ? 'ur-IN'
      : langCode === 'pa' ? 'pa-IN'
      : langCode === 'or' ? 'or-IN'
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

  function handleSend(textToSend?: string) {
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
      const { responseMessage, nextState } = processUserMessage(query, state);

      if (nextState.language !== currentLanguage) {
        setLanguage(nextState.language);
      }

      setState(nextState);
      setMessages((prev) => [...prev, responseMessage]);
      setIsTyping(false);

      speakText(responseMessage.text, responseMessage.language || currentLanguage);

      if (nextState.origin && nextState.destination) {
        const params = new URLSearchParams({
          origin: nextState.origin,
          destination: nextState.destination,
          date: nextState.date || new Date().toISOString().split('T')[0],
        });
        setTimeout(() => {
          setIsOpen(false);
          navigate(`/results?${params.toString()}`);
        }, 2200);
      }
    }, 600);
  }

  function handleQuickChip(chipText: string) {
    if (chipText === '📍 My Location') {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const nearby = getNearbyBoardingPoints(state.origin || 'Visakhapatnam');
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

  function toggleVoiceInput() {
    if (isRecording) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }

    try {
      const recog = new SpeechRecognition();
      recog.continuous = false;
      recog.interimResults = false;
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
        text: 'Chat reset! How can I assist your trip today?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        actionChips: ['🚌 Search Buses', '📍 My Location'],
      },
    ]);
  }

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-emerald-500 text-white shadow-2xl hover:scale-110 transition-transform duration-300 border-2 border-white/20 group"
          aria-label="Open AI Travel Companion"
        >
          <Sparkles className="h-7 w-7 text-amber-300 animate-pulse" />
          <span className="absolute -top-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 flex h-[580px] w-[92vw] max-w-[420px] flex-col overflow-hidden rounded-3xl bg-slate-900/95 backdrop-blur-2xl border border-white/15 text-white shadow-2xl transition-all duration-300">
          {/* Top Header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/80 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-md">
                <Sparkles className="h-5 w-5 text-white" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-900" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Chicha AI Companion
                  <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider bg-emerald-500/20 px-1.5 py-0.5 rounded">Online</span>
                </h3>
                <p className="text-[11px] text-slate-400">Multilingual Travel Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={resetChat}
                title="Reset Conversation"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Close"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-none shadow-md'
                      : 'bg-slate-800/90 border border-white/10 text-slate-100 rounded-bl-none shadow-md'
                  }`}
                >
                  <p>{msg.text}</p>

                  {/* Render Break Journey Multi-Leg Cards */}
                  {msg.breakRoutes && msg.breakRoutes.length > 0 && (
                    <div className="mt-3 space-y-3 pt-2 border-t border-white/10">
                      <p className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                        🛣️ Smart Break-Journey Alternatives:
                      </p>
                      {msg.breakRoutes.map((br) => (
                        <div
                          key={br.id}
                          className="rounded-xl bg-slate-950/80 p-3 border border-amber-500/30 text-left text-xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-amber-400 font-semibold">
                            <span>Via {br.transferHub} Transfer</span>
                            <span>₹{br.totalPrice} Total</span>
                          </div>
                          <div className="text-[11px] text-slate-300 space-y-1">
                            <p>🚌 Leg 1: {br.leg1.routes.origin_city} → {br.leg1.routes.destination_city} ({br.leg1.operator_name})</p>
                            <p>🚌 Leg 2: {br.leg2.routes.origin_city} → {br.leg2.routes.destination_city} ({br.leg2.operator_name})</p>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <a
                              href={br.leg1.deep_link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-1 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold text-[11px] text-white flex items-center justify-center gap-1"
                            >
                              Book Leg 1 <ExternalLink className="h-3 w-3" />
                            </a>
                            <a
                              href={br.leg2.deep_link_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold text-[11px] text-white flex items-center justify-center gap-1"
                            >
                              Book Leg 2 <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <span className="mt-1 block text-[10px] opacity-60 text-right">{msg.timestamp}</span>
                </div>

                {/* Quick Action Chips */}
                {msg.actionChips && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.actionChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickChip(chip)}
                        className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 text-[11px] font-medium text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 rounded-xl bg-slate-800/80 px-4 py-2.5 text-xs text-slate-400 w-fit">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-bounce [animation-delay:0.4s]" />
                </span>
                <span>Chicha is thinking...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Bar */}
          <div className="border-t border-white/10 bg-slate-800/90 p-3">
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
                className={`p-2.5 rounded-xl text-white transition-colors ${
                  isRecording ? 'bg-red-500 animate-pulse' : 'bg-slate-700 hover:bg-slate-600'
                }`}
                title="Speak to Assistant"
              >
                {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Chicha (e.g. buses from Vizag to Hyd)..."
                className="flex-1 rounded-xl border border-white/10 bg-slate-900/80 px-3.5 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-blue-500"
              />

              <button
                type="submit"
                disabled={!input.trim()}
                className="p-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white disabled:opacity-40 hover:scale-105 transition-transform"
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
