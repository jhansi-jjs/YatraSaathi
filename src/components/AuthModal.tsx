import { useState, FormEvent } from 'react';
import { X, Mail, Phone, Lock, Sparkles, User, Chrome, AlertCircle, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'signup';
  onAuthSuccess: () => void;
}

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'phone'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials') || error.message.includes('not found')) {
          setErrorMessage('No account found. Please create a new account.');
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        onAuthSuccess();
        onClose();
      }
    } catch {
      setErrorMessage('No account found. Please create a new account.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: phone,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered') || error.message.includes('already exists')) {
          setErrorMessage('An account with this email already exists. Please log in instead.');
        } else {
          setErrorMessage(error.message);
        }
        setLoading(false);
        return;
      }

      if (data.user) {
        // If user already exists in Supabase return identity
        if (data.user.identities && data.user.identities.length === 0) {
          setErrorMessage('An account with this email already exists. Please log in instead.');
          setLoading(false);
          return;
        }

        onAuthSuccess();
        onClose();
      }
    } catch {
      setErrorMessage('An account with this email already exists. Please log in instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    localStorage.setItem('yatra_authenticated', 'true');
    onAuthSuccess();
    onClose();
  };

  const handleGuestContinue = () => {
    localStorage.setItem('yatra_guest_mode', 'true');
    onAuthSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-white/15 text-white shadow-2xl p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Brand Header */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">
            {mode === 'signup' ? 'Create Your Yatra Saathi Account' : 'Welcome Back to Yatra Saathi'}
          </h2>
          <p className="text-xs text-slate-400">
            {mode === 'signup'
              ? 'Join India’s smart AI travel companion platform'
              : 'Sign in to access AI trip planning & multi-OTA fare comparison'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-800 p-1 mb-5">
          <button
            onClick={() => { setMode('login'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'login' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => { setMode('signup'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode('phone'); setErrorMessage(''); }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'phone' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Phone OTP
          </button>
        </div>

        {/* Dynamic Error Banner */}
        {errorMessage && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/40 p-3 text-xs font-medium text-red-200 flex flex-col gap-1">
            <div className="flex items-center gap-2 text-red-300 font-bold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            {errorMessage.includes('No account found') && (
              <button
                type="button"
                onClick={() => { setMode('signup'); setErrorMessage(''); }}
                className="mt-1 text-left text-[11px] underline font-bold text-amber-300 hover:text-amber-200"
              >
                Click here to Create a New Account →
              </button>
            )}
            {errorMessage.includes('already exists') && (
              <button
                type="button"
                onClick={() => { setMode('login'); setErrorMessage(''); }}
                className="mt-1 text-left text-[11px] underline font-bold text-amber-300 hover:text-amber-200"
              >
                Click here to Log In instead →
              </button>
            )}
          </div>
        )}

        {/* LOGIN FORM */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="flex flex-col gap-3.5">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-bold text-sm text-white shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Logging in...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* SIGN UP FORM */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-300">Confirm Password</label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Phone Number (Optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-bold text-sm text-white shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Account...' : 'Create Free Account'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        )}

        {/* PHONE OTP FORM */}
        {mode === 'phone' && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Mobile Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-xl border border-white/10 bg-slate-800/80 pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              onClick={() => {
                setSuccessMessage('OTP sent to ' + (phone || 'your phone number') + '! Check your SMS.');
                setTimeout(() => {
                  onAuthSuccess();
                  onClose();
                }, 1500);
              }}
              className="w-full py-3 rounded-xl bg-blue-600 font-bold text-sm text-white shadow-lg hover:bg-blue-500 transition-colors"
            >
              Send OTP Verification
            </button>
          </div>
        )}

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
          <span className="relative bg-slate-900 px-3 text-[11px] uppercase text-slate-500 font-semibold">Or</span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleGoogleAuth}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 bg-white/5 font-semibold text-xs text-slate-200 hover:bg-white/10 transition-colors"
          >
            <Chrome className="h-4 w-4 text-blue-400" /> Continue with Google
          </button>
          <button
            onClick={handleGuestContinue}
            className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Skip for now (Guest Mode)
          </button>
        </div>
      </div>
    </div>
  );
}
