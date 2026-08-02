import { useState, useEffect } from 'react';
import { Bus, MapPin, Sparkles, Navigation } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onFinish, 300);
          return 100;
        }
        return prev + 5;
      });
    }, 80);

    return () => clearInterval(timer);
  }, [onFinish]);

  return (
    <div
      onClick={onFinish}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-8 text-white cursor-pointer select-none overflow-hidden"
    >
      {/* Decorative Glowing Backdrop */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />

      {/* Top Header Badge */}
      <div className="mt-8 flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
        <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
        <span className="text-xs font-semibold tracking-wider uppercase text-blue-200">
          India's First AI Multilingual Travel Companion
        </span>
      </div>

      {/* Main Hero & Animated Bus Container */}
      <div className="relative flex flex-col items-center gap-6 my-auto text-center z-10">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/30 rounded-3xl blur-xl animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-2xl border border-white/20">
            <Bus className="h-12 w-12 text-white animate-bounce" />
          </div>
        </div>

        <div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl bg-gradient-to-r from-white via-blue-100 to-blue-300 bg-clip-text text-transparent">
            Yatra Saathi
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-300">
            Speak Naturally • Compare All OTAs • Smart Break-Journeys
          </p>
        </div>

        {/* Animated Map Route Graphics */}
        <div className="relative w-72 h-20 border border-white/10 rounded-2xl bg-slate-900/60 backdrop-blur-md overflow-hidden p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-blue-500 animate-ping" />
            <span className="text-xs font-semibold text-blue-300">Kochi</span>
          </div>

          <div className="flex-1 mx-3 border-t-2 border-dashed border-blue-400/50 relative flex items-center justify-center">
            <Navigation className="h-4 w-4 text-emerald-400 absolute animate-pulse" />
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-300">Hyderabad</span>
          </div>
        </div>
      </div>

      {/* Progress Bar & Footer */}
      <div className="w-full max-w-sm flex flex-col items-center gap-3 z-10">
        <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex justify-between w-full text-xs text-slate-400 font-medium">
          <span>Initializing AI Travel Engine...</span>
          <span>{progress}%</span>
        </div>

        <p className="text-[11px] text-slate-500 mt-2">Tap anywhere to skip</p>
      </div>
    </div>
  );
}
