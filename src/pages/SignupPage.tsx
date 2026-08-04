import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bus, Mail, Lock, User, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PhoneField from '../components/PhoneField';
import { DEFAULT_COUNTRY, validatePhone, isValidEmail } from '../lib/phone';

export default function SignupPage() {
  const { signUp } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dial, setDial] = useState(DEFAULT_COUNTRY.dial);
  const [national, setNational] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ISSUE 4: BOTH contact fields are required at signup so a price alert can be
  // delivered on either channel later without re-prompting.
  const phoneCheck = validatePhone(dial, national);
  const emailValid = isValidEmail(email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!emailValid) {
      setError(t('alertEmailInvalid'));
      return;
    }
    if (!phoneCheck.valid) {
      setError(t('alertPhoneInvalid'));
      return;
    }

    setLoading(true);
    const { error: signUpError } = await signUp(email, password, fullName, phoneCheck.e164);
    setLoading(false);
    if (signUpError) {
      if (signUpError.includes('already registered') || signUpError.includes('already exists')) {
        setError('An account with this email already exists. Please log in instead.');
      } else {
        setError(signUpError);
      }
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
          <h1 className="text-2xl font-bold text-slate-900">Create Your Account</h1>
          <p className="mt-1 text-sm text-slate-500">Join Yatra Saathi and find the best bus deals</p>
        </div>

        <form onSubmit={handleSubmit} className="card p-6 border border-slate-200 shadow-xl">
          {error && (
            <div className="mb-4 flex flex-col gap-1 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-600 border border-red-200">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
              {error.includes('already exists') && (
                <Link to="/login" className="text-left text-[11px] underline font-bold text-blue-600 mt-1">
                  Click here to Log In instead →
                </Link>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field pl-10"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field pl-10"
                placeholder="you@example.com"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <PhoneField
              dial={dial}
              national={national}
              onDialChange={setDial}
              onNationalChange={setNational}
              label={t('alertPhoneLabel')}
              required
              error={national && !phoneCheck.valid ? t('alertPhoneInvalid') : null}
            />
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
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !emailValid || !phoneCheck.valid}
            className="btn-primary w-full py-3 font-bold disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
