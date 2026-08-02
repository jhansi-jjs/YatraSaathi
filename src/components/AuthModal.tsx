import { useState, FormEvent } from 'react';
import { X, Mail, Phone, Lock, Sparkles, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'phone'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const { error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = () => {
    localStorage.setItem('yatra_guest_mode', 'true');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-slate-900 border border-white/10 text-white shadow-2xl p-6 sm:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-slate-400 hover:text-white transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Title */}
        <div className="flex flex-col items-center text-center gap-2 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 shadow-lg">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold">Welcome to Yatra Saathi</h2>
          <p className="text-xs text-slate-400">Sign in to save searches, favorite buses, and manage bookings</p>
        </div>

        {/* Mode Selector */}
        <div className="flex rounded-xl bg-slate-800 p-1 mb-6">
          <button
            onClick={() => setMode('login')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'login' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'signup' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
          <button
            onClick={() => setMode('phone')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              mode === 'phone' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Phone OTP
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/20 border border-red-500/40 p-2.5 text-xs text-red-300 text-center">
            {error}
          </div>
        )}

        {mode !== 'phone' ? (
          <form onSubmit={handleEmailAuth} className="flex flex-col gap-4">
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
              className="mt-2 w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 font-bold text-sm text-white shadow-lg hover:scale-[1.01] transition-transform disabled:opacity-50"
            >
              {loading ? 'Processing...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300">Phone Number</label>
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
              onClick={() => alert('OTP sent to ' + phone)}
              className="w-full py-2.5 rounded-xl bg-blue-600 font-bold text-sm text-white shadow-lg hover:bg-blue-500 transition-colors"
            >
              Send OTP
            </button>
          </div>
        )}

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
          <span className="relative bg-slate-900 px-3 text-[11px] uppercase text-slate-500 font-semibold">Or</span>
        </div>

        <button
          onClick={handleGuestLogin}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/15 bg-white/5 font-semibold text-xs text-slate-200 hover:bg-white/10 transition-colors"
        >
          <UserCheck className="h-4 w-4 text-emerald-400" /> Continue as Guest
        </button>
      </div>
    </div>
  );
}
