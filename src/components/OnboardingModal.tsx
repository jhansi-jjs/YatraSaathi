import { useState } from 'react';
import { Sparkles, Mic, Layers, GitFork, ArrowRight, CheckCircle2 } from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SLIDES = [
  {
    icon: Sparkles,
    color: 'from-blue-600 to-indigo-600',
    title: 'Travel Smarter with Agentic AI',
    description:
      'Meet Yatra Saathi – your personal travel companion. Ask for buses using voice or chat, exactly like speaking to a real travel expert.',
  },
  {
    icon: Mic,
    color: 'from-emerald-600 to-teal-600',
    title: 'Speak Naturally in Your Language',
    description:
      'No manual settings needed! Speak or type in Telugu, Hindi, Tamil, Malayalam, Kannada, Marathi, or English. The app automatically detects & switches to your language.',
  },
  {
    icon: Layers,
    color: 'from-purple-600 to-pink-600',
    title: 'Compare All OTAs in One Place',
    description:
      'Compare live fares, ratings, and seat types across redBus, MakeMyTrip, AbhiBus, TravelYaari, EaseMyTrip, and Paytm Bus.',
  },
  {
    icon: GitFork,
    color: 'from-amber-500 to-orange-600',
    title: 'Smart Break-Journey Guidance',
    description:
      'No direct bus available? Never worry! Yatra Saathi intelligently connects multi-leg transfer routes (e.g. Kochi → Bengaluru → Hyderabad) so you reach safely.',
  },
];

export default function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = SLIDES[currentSlide];
  const Icon = slide.icon;

  const next = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-slate-900 border border-white/10 text-white shadow-2xl">
        {/* Top Header Card */}
        <div className={`p-8 bg-gradient-to-br ${slide.color} flex flex-col items-center text-center transition-all duration-300`}>
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md mb-4 shadow-lg border border-white/20">
            <Icon className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">{slide.title}</h2>
        </div>

        {/* Description Body */}
        <div className="p-6 sm:p-8 flex flex-col items-center text-center gap-6">
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-md">
            {slide.description}
          </p>

          {/* Dots Indicator */}
          <div className="flex items-center gap-2">
            {SLIDES.map((_, idx) => (
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

          {/* Action Button */}
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-bold text-white shadow-xl hover:scale-[1.02] transition-transform"
          >
            {currentSlide === SLIDES.length - 1 ? (
              <>
                <CheckCircle2 className="h-5 w-5" /> Get Started
              </>
            ) : (
              <>
                Continue <ArrowRight className="h-5 w-5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
