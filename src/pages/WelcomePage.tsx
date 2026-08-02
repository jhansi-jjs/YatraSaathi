import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bus, MapPin, Compass, Ticket, Sparkles, ArrowRight, ShieldCheck, Zap, Globe, Layers } from 'lucide-react';
import AuthModal from '../components/AuthModal';
import OnboardingModal from '../components/OnboardingModal';

export default function WelcomePage() {
  const navigate = useNavigate();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  const openSignUp = () => {
    setAuthMode('signup');
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = () => {
    setOnboardingOpen(true);
  };

  const launchSearch = () => {
    navigate('/search');
  };

  return (
    <div className="relative min-h-[calc(100vh-64px)] w-full bg-slate-950 text-white overflow-hidden flex flex-col justify-between selection:bg-blue-500 selection:text-white">
      {/* Background Radial Gradients & Glow Effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 blur-3xl rounded-full pointer-events-none" />

      {/* Floating 3D Travel Elements & Animated Clouds */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        {/* Floating 3D Bus */}
        <div className="absolute top-20 left-8 sm:left-24 animate-bounce [animation-duration:3s]">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-2xl border border-white/20 opacity-90 backdrop-blur-md">
            <Bus className="h-9 w-9 text-white" />
          </div>
        </div>

        {/* Floating 3D Compass */}
        <div className="absolute top-24 right-8 sm:right-32 animate-pulse [animation-duration:4s]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/90 border border-white/15 shadow-2xl backdrop-blur-md">
            <Compass className="h-8 w-8 text-amber-400 animate-spin [animation-duration:12s]" />
          </div>
        </div>

        {/* Floating 3D Ticket */}
        <div className="absolute bottom-28 left-8 sm:left-36 animate-bounce [animation-duration:4.5s]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/90 border border-white/15 shadow-2xl backdrop-blur-md">
            <Ticket className="h-8 w-8 text-emerald-400" />
          </div>
        </div>

        {/* Floating 3D Route Pin */}
        <div className="absolute bottom-24 right-10 sm:right-40 animate-pulse [animation-duration:3.5s]">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800/90 border border-white/15 shadow-2xl backdrop-blur-md">
            <MapPin className="h-8 w-8 text-red-400" />
          </div>
        </div>

        {/* Moving Cloud 1 */}
        <div className="absolute top-16 left-1/3 opacity-25 animate-pulse">
          <div className="h-12 w-36 rounded-full bg-white/30 blur-md" />
        </div>

        {/* Moving Cloud 2 */}
        <div className="absolute bottom-32 right-1/4 opacity-20 animate-pulse [animation-delay:1.5s]">
          <div className="h-16 w-48 rounded-full bg-blue-300/30 blur-lg" />
        </div>
      </div>

      {/* HERO CONTENT SECTION */}
      <main className="relative z-10 my-auto flex flex-col items-center text-center px-4 py-12 max-w-4xl mx-auto">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/30 bg-blue-500/10 px-4 py-1.5 backdrop-blur-md mb-6 shadow-lg">
          <Sparkles className="h-4 w-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-blue-200 tracking-wider uppercase">
            India's First AI Multilingual Travel Companion
          </span>
        </div>

        {/* Large Main Title */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-tight">
          Yatra Saathi
        </h1>

        {/* Tagline */}
        <p className="mt-4 text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-300 via-emerald-200 to-teal-300 bg-clip-text text-transparent">
          India's Smart AI Travel Companion
        </p>

        {/* Sub-description */}
        <p className="mt-4 max-w-2xl text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
          Speak naturally in any Indian language. Compare live fares across 6 major booking platforms, or let our Agentic AI build smart break-journey routes when direct buses are unavailable.
        </p>

        {/* Hero Interactive CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <button
            onClick={openSignUp}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-4 px-8 rounded-2xl bg-gradient-to-r from-blue-600 via-emerald-500 to-teal-500 font-extrabold text-base text-white shadow-2xl hover:scale-105 transition-all duration-300 border border-white/20"
          >
            Get Started Free <ArrowRight className="h-5 w-5" />
          </button>
          <button
            onClick={launchSearch}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-white/10 border border-white/20 font-bold text-sm text-slate-200 hover:bg-white/15 hover:text-white transition-all backdrop-blur-md"
          >
            Explore Bus Search
          </button>
        </div>

        {/* Feature Badges */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-3xl">
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <Globe className="h-5 w-5 text-blue-400" />
            <span className="text-xs font-semibold text-slate-200">12 Languages</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <Layers className="h-5 w-5 text-purple-400" />
            <span className="text-xs font-semibold text-slate-200">Compare 6 OTAs</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <Zap className="h-5 w-5 text-amber-400" />
            <span className="text-xs font-semibold text-slate-200">Voice Assistant</span>
          </div>
          <div className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-md">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span className="text-xs font-semibold text-slate-200">Direct OTA Links</span>
          </div>
        </div>
      </main>

      {/* Auth Modal & Onboarding Carousel Integration */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />

      <OnboardingModal
        isOpen={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
      />
    </div>
  );
}
