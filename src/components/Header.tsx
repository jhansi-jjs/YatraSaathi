import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Bus, LogOut, ArrowLeft, Home, Bell, Settings, Shield, Globe } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { currentLanguage, setLanguage } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [profileOpen, setProfileOpen] = useState(false);
  const isWelcomePage = location.pathname === '/';

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Welcome Page Header
  if (isWelcomePage) {
    return (
      <header className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg border border-white/20">
              <Bus className="h-5 w-5 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Yatra<span className="text-blue-400">Saathi</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {/* Language Dropdown */}
            <div className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-slate-900 px-3 py-1.5 text-xs text-white">
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <select
                value={currentLanguage}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-transparent text-xs font-semibold text-white outline-none cursor-pointer"
              >
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                    {lang.native_name} ({lang.name})
                  </option>
                ))}
              </select>
            </div>

            <Link
              to="/login"
              className="px-4 py-2 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2 text-xs sm:text-sm font-bold text-white rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 shadow-lg hover:scale-105 transition-all"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>
    );
  }

  // Main Bus Search / Results Header
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Top-Left: Back & Home buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            title="Go Back"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 text-slate-500" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <Link
            to="/"
            title="Return to Welcome Screen"
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Home className="h-4 w-4 text-blue-600" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </div>

        {/* Center Brand Logo */}
        <Link to="/search" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-md">
            <Bus className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-base font-extrabold tracking-tight text-slate-900">
            Yatra<span className="text-blue-600">Saathi</span>
          </span>
        </Link>

        {/* Top-Right: Notifications, Settings, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Selector */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
            <Globe className="h-3.5 w-3.5 text-blue-600" />
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent text-xs font-medium text-slate-800 outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native_name} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => alert('No new notifications')}
            className="relative rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
          </button>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
                {(profile?.full_name || user?.email || 'Guest').charAt(0).toUpperCase()}
              </div>
              <span className="hidden md:inline">{profile?.full_name || user?.email || 'Guest User'}</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white p-2 shadow-2xl border border-slate-200 text-slate-800 z-50 animate-in fade-in duration-150">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{profile?.full_name || 'Guest User'}</p>
                  <p className="text-[11px] text-slate-500 truncate">{user?.email || 'guest@yatrasaathi.in'}</p>
                </div>

                {profile?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    <Shield className="h-4 w-4 text-blue-600" /> Admin Dashboard
                  </Link>
                )}

                <button
                  onClick={() => alert('Settings menu opened')}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <Settings className="h-4 w-4 text-slate-500" /> App Settings
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors mt-1 border-t border-slate-100"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
