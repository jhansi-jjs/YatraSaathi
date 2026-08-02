import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Mic, Layers, GitFork, ArrowRight, CheckCircle2, Volume2, Bus } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INDIAN_LANG_DEMO = [
  { name: 'English', text: 'Showing buses from Vizag to Hyderabad' },
  { name: 'తెలుగు', text: 'వైజాగ్ నుండి హైదరాబాద్ బస్సులు చూపిస్తున్నాను' },
  { name: 'हिन्दी', text: 'विशाखापट्टनम से हैदराबाद जाने वाली बसें' },
  { name: 'മലയാളം', text: 'കൊച്ചിയിൽ നിന്ന് ബാംഗ്ലൂരിലേക്കുള്ള ബസുകൾ' },
  { name: 'தமிழ்', text: 'சென்னை இலிருந்து மதுரை செல்லும் பேருந்துகள்' },
  { name: 'ಕನ್ನಡ', text: 'ಬೆಂಗಳೂರಿನಿಂದ ಹೈದರಾಬಾದ್‌ಗೆ ಬಸ್‌ಗಳು' },
  { name: 'मराठी', text: 'मुंबई ते पुणे जाणाऱ्या बसेस' },
  { name: 'ગુજરાતી', text: 'અમદાવાદ થી સુરત જતી બસો' },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [langDemoIdx, setLangDemoIdx] = useState(0);

  useEffect(() => {
    if (currentSlide === 2) {
      const interval = setInterval(() => {
        setLangDemoIdx((prev) => (prev + 1) % INDIAN_LANG_DEMO.length);
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [currentSlide]);

  if (!isOpen) return null;

  const handleFinish = () => {
    localStorage.setItem('yatra_onboarded', 'true');
    onClose();
    navigate('/search');
  };

  const nextSlide = () => {
    if (currentSlide < 3) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      handleFinish();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 animate-in fade-in duration-300">
      <div className="relative flex flex-col justify-between w-full max-w-xl min-h-[580px] overflow-hidden rounded-3xl bg-slate-900 border border-white/20 text-white shadow-2xl p-6 sm:p-8">
        
        {/* Top Header & Skip Button */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-blue-200">
              Step {currentSlide + 1} of 4 — Onboarding
            </span>
          </div>

          <button
            onClick={handleFinish}
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Skip to Search
          </button>
        </div>

        {/* Carousel Content Slide */}
        <div className="my-auto py-6 flex flex-col items-center text-center gap-6">
          
          {/* SLIDE 1: Travel Smarter with AI */}
          {currentSlide === 0 && (
            <div className="flex flex-col items-center gap-4 animate-in zoom-in-95 duration-300">
              <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-2xl border border-white/20">
                <Bus className="h-14 w-14 text-white animate-bounce" />
                <Sparkles className="absolute -top-2 -right-2 h-7 w-7 text-amber-300 animate-spin" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Travel Smarter with AI</h2>
              <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                Meet Yatra Saathi – your personal travel companion. Ask for buses using natural voice or chat, exactly like speaking to an experienced travel agent.
              </p>
            </div>
          )}

          {/* SLIDE 2: Compare Buses from Multiple Platforms */}
          {currentSlide === 1 && (
            <div className="flex flex-col items-center gap-4 w-full animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-center gap-2">
                <Layers className="h-8 w-8 text-purple-400" />
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Compare 6 OTAs Live</h2>
              </div>
              <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                Compare prices, ratings, and departure times live across redBus, MakeMyTrip, AbhiBus, TravelYaari, EaseMyTrip, and Paytm Bus.
              </p>

              {/* Animated OTA Cards */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-2">
                {['redBus', 'MakeMyTrip', 'AbhiBus', 'TravelYaari', 'EaseMyTrip', 'Paytm Bus'].map((ota, idx) => (
                  <div
                    key={ota}
                    className="rounded-xl bg-slate-800/80 p-3 border border-white/10 text-center shadow-md animate-pulse"
                    style={{ animationDelay: `${idx * 0.15}s` }}
                  >
                    <span className="text-xs font-bold text-white block">{ota}</span>
                    <span className="text-[10px] text-emerald-400 font-medium">₹{450 + idx * 60}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SLIDE 3: Speak in Your Own Language */}
          {currentSlide === 2 && (
            <div className="flex flex-col items-center gap-4 w-full animate-in zoom-in-95 duration-300">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500/20 border border-red-500/40 animate-pulse">
                <Mic className="h-10 w-10 text-red-400" />
                <Volume2 className="absolute -top-1 -right-1 h-6 w-6 text-amber-300" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Speak in Your Language</h2>
              <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                Speak or type in any Indian language. The app auto-detects your script and switches the entire interface dynamically!
              </p>

              {/* Animated Spoken Script Demo Banner */}
              <div className="w-full max-w-md rounded-2xl bg-emerald-500/20 border border-emerald-500/40 p-4 text-emerald-200 shadow-xl flex flex-col items-center gap-1 transition-all duration-300">
                <span className="text-[10px] uppercase tracking-widest font-extrabold text-emerald-400">
                  {INDIAN_LANG_DEMO[langDemoIdx].name} Auto-Detected
                </span>
                <p className="text-sm font-semibold text-white italic">
                  "{INDIAN_LANG_DEMO[langDemoIdx].text}"
                </p>
              </div>
            </div>
          )}

          {/* SLIDE 4: Agentic AI Journey Planning */}
          {currentSlide === 3 && (
            <div className="flex flex-col items-center gap-4 w-full animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-center gap-2">
                <GitFork className="h-8 w-8 text-amber-400 animate-pulse" />
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white">Agentic AI Journey Planning</h2>
              </div>
              <p className="text-sm text-slate-300 max-w-md leading-relaxed">
                No direct bus? Never hear "No buses found". Yatra Saathi intelligently connects multi-leg transfer routes!
              </p>

              {/* Visual Multi-leg Route Line */}
              <div className="w-full max-w-md rounded-2xl bg-slate-800/90 border border-amber-500/40 p-4 text-left space-y-2 shadow-xl">
                <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                  <span>Kochi</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>Bengaluru Hub</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>Hyderabad</span>
                </div>
                <div className="text-[11px] text-slate-300 space-y-1 pt-2 border-t border-white/10">
                  <p>🚌 Leg 1: Kochi → Bengaluru (KSRTC Swift Sleeper)</p>
                  <p>🚕 Transfer Hub: 2.5 hrs break at Majestic</p>
                  <p>🚌 Leg 2: Bengaluru → Hyderabad (VRL Volvo AC)</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Carousel Indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                currentSlide === idx ? 'w-8 bg-blue-500' : 'w-2.5 bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Bottom CTA Button */}
        <div className="flex items-center gap-3">
          {currentSlide < 3 ? (
            <>
              <button
                onClick={handleFinish}
                className="py-3 px-5 rounded-xl border border-white/15 bg-white/5 font-semibold text-xs text-slate-300 hover:bg-white/10 transition-colors"
              >
                Skip
              </button>
              <button
                onClick={nextSlide}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-bold text-white shadow-xl hover:scale-[1.01] transition-transform"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            </>
          ) : (
            <button
              onClick={handleFinish}
              className="w-full flex items-center justify-center gap-2 py-4 px-8 rounded-xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-500 font-extrabold text-base text-white shadow-2xl hover:scale-[1.02] transition-transform"
            >
              <CheckCircle2 className="h-6 w-6" /> Get Started with Yatra Saathi
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
