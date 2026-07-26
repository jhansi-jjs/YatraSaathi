import { Link, useNavigate } from 'react-router-dom';
import { Bus, Search, User, LogOut, Shield, Menu, X, Globe } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage, SUPPORTED_LANGUAGES } from '../context/LanguageContext';

export default function Header() {
  const { user, profile, signOut } = useAuth();
  const { currentLanguage, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0066ff] to-[#00c264] shadow-lg shadow-blue-500/20">
            <Bus className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-slate-900">
            Yatra<span className="text-[#0066ff]">Saathi</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link to="/" className="btn-ghost">Home</Link>
          <Link to="/search" className="btn-ghost">{t('searchBuses')}</Link>
          {profile?.role === 'admin' && (
            <Link to="/admin" className="btn-ghost">
              <Shield className="h-4 w-4" /> {t('admin')}
            </Link>
          )}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {/* Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
            <Globe className="h-4 w-4 text-blue-600" />
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-transparent font-medium text-slate-800 outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native_name} ({lang.name})
                </option>
              ))}
            </select>
          </div>

          {user ? (
            <>
              <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0066ff] text-xs font-bold text-white">
                  {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {profile?.full_name || user.email}
                </span>
              </div>
              <button onClick={handleSignOut} className="btn-ghost">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">
                <User className="h-4 w-4" /> {t('login')}
              </Link>
              <Link to="/signup" className="btn-primary">{t('signup')}</Link>
            </>
          )}
        </div>

        <button
          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">
          <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
              <Globe className="h-4 w-4 text-blue-600" /> {t('selectLanguage')}:
            </span>
            <select
              value={currentLanguage}
              onChange={(e) => setLanguage(e.target.value)}
              className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.native_name} ({lang.name})
                </option>
              ))}
            </select>
          </div>
          <nav className="flex flex-col gap-1">
            <Link to="/" className="btn-ghost justify-start" onClick={() => setMenuOpen(false)}>Home</Link>
            <Link to="/search" className="btn-ghost justify-start" onClick={() => setMenuOpen(false)}>
              <Search className="h-4 w-4" /> {t('searchBuses')}
            </Link>
            {profile?.role === 'admin' && (
              <Link to="/admin" className="btn-ghost justify-start" onClick={() => setMenuOpen(false)}>
                <Shield className="h-4 w-4" /> {t('admin')}
              </Link>
            )}
            {user ? (
              <button onClick={handleSignOut} className="btn-ghost justify-start">
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            ) : (
              <div className="flex gap-2 pt-2">
                <Link to="/login" className="btn-secondary flex-1" onClick={() => setMenuOpen(false)}>{t('login')}</Link>
                <Link to="/signup" className="btn-primary flex-1" onClick={() => setMenuOpen(false)}>{t('signup')}</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
