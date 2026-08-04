import { useState, FormEvent, useEffect } from 'react';
import { User, Mail, Save, CheckCircle2, AlertCircle, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import PhoneField from '../components/PhoneField';
import { DEFAULT_COUNTRY, parseE164, validatePhone, isValidEmail } from '../lib/phone';

/**
 * ISSUE 4: both contact fields are shown and editable here. Accounts created before
 * the phone number became mandatory keep working — they simply see a dismissible
 * prompt asking for the missing field. Access is never blocked.
 */
export default function ProfilePage() {
  const { user, contact, updateContact } = useAuth();
  const { t } = useLanguage();

  const initialPhone = parseE164(contact.phone);
  const [fullName, setFullName] = useState(contact.fullName);
  const [email, setEmail] = useState(contact.email);
  const [dial, setDial] = useState(initialPhone.national ? initialPhone.dial : DEFAULT_COUNTRY.dial);
  const [national, setNational] = useState(initialPhone.national);
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [promptDismissed, setPromptDismissed] = useState(false);

  // Contact details arrive asynchronously with the session; seed the form once they do.
  useEffect(() => {
    setFullName(contact.fullName);
    setEmail(contact.email);
    const parsed = parseE164(contact.phone);
    if (parsed.national) {
      setDial(parsed.dial);
      setNational(parsed.national);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.email, contact.phone, contact.fullName]);

  const phoneCheck = validatePhone(dial, national);
  const missingPhone = !contact.phone;
  const missingEmail = !contact.email;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (email && !isValidEmail(email)) {
      setError(t('alertEmailInvalid'));
      return;
    }
    if (national && !phoneCheck.valid) {
      setError(t('alertPhoneInvalid'));
      return;
    }

    setStatus('saving');
    const { error: updateError } = await updateContact({
      email: email !== contact.email ? email : undefined,
      phoneE164: phoneCheck.valid ? phoneCheck.e164 : '',
      fullName,
    });
    setStatus('idle');

    if (updateError) {
      setError(updateError);
      return;
    }
    setStatus('saved');
    setPromptDismissed(true);
    window.setTimeout(() => setStatus('idle'), 2500);
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <Settings className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-4 text-sm font-medium text-slate-600">
          Sign in to view and edit your profile.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Settings className="h-5 w-5" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">{t('profileTitle')}</h1>
      </div>

      {/* One-time nudge for legacy accounts — informative, never blocking. */}
      {!promptDismissed && (missingPhone || missingEmail) && (
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
          <p className="flex-1">
            {missingPhone ? t('profileAddPhonePrompt') : t('profileAddEmailPrompt')}
          </p>
          <button
            onClick={() => setPromptDismissed(true)}
            className="shrink-0 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            {t('profileLater')}
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card flex flex-col gap-4 border border-slate-200 p-6 shadow-sm">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-field pl-10"
              placeholder="John Doe"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-700">{t('alertEmail')}</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-10"
              placeholder="you@example.com"
            />
          </div>
        </div>

        <PhoneField
          dial={dial}
          national={national}
          onDialChange={setDial}
          onNationalChange={setNational}
          label={t('alertPhoneLabel')}
          error={national && !phoneCheck.valid ? t('alertPhoneInvalid') : null}
        />

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {status === 'saved' && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" /> {t('profileSaved')}
          </div>
        )}

        <button
          type="submit"
          disabled={status === 'saving'}
          className="btn-primary flex items-center justify-center gap-2 py-3 font-bold disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {status === 'saving' ? '…' : t('profileSave')}
        </button>
      </form>
    </div>
  );
}
