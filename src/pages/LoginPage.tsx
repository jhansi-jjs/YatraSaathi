import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, AtSign, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginPage() {
  const { signIn } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  // ISSUE 4: login accepts EITHER identifier — email address or mobile number.
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(identifier, password);
    setLoading(false);
    if (signInError) {
      // Surface the real reason when it is actionable (bad phone format), otherwise
      // fall back to the generic "no account" hint.
      setError(
        signInError.startsWith('Enter a valid mobile number')
          ? signInError
          : 'No account found. Please create a new account.'
      );
    } else {
      navigate('/search');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-emerald-500 shadow-lg shadow-blue-500/20">
            <Bus className="h-6 w-6 text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to your Yatra Saathi account</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 border border-slate-200 shadow-xl">
          {error && (
            <div className="mb-4 flex flex-col gap-1 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              <Link to="/signup" className="text-left text-[11px] underline font-bold text-blue-600 mt-1">
                Click here to Create a New Account →
              </Link>
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('loginIdentifier')}</label>
            <div className="relative">
              <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="input-field pl-10"
                placeholder="you@example.com / +91 98765 43210"
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 font-bold">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/signup" className="font-bold text-blue-600 hover:underline">
            Create an Account
          </Link>
        </p>
      </div>
    </div>
  );
}
