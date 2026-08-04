import React, { useState } from 'react';
import { X, Bell, Sparkles, Check, Mail, MessageSquare, Smartphone, AlertCircle, Info } from 'lucide-react';
import {
  saveTravelWatch,
  updateTravelWatch,
  validateWatchDelivery,
  TravelWatchPreferences,
  NotificationChannelConfig,
  WatchContacts,
  TravelWatchItem,
  WatchValidationError,
} from '../lib/travelWatchService';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { COUNTRY_CODES, DEFAULT_COUNTRY, parseE164, validatePhone, formatPhone } from '../lib/phone';

interface TravelWatchModalProps {
  origin: string;
  destination: string;
  travelDate: string;
  /** Present when editing an existing watch instead of creating one. */
  existing?: TravelWatchItem;
  onClose: () => void;
  onCreated: () => void;
}

/**
 * ISSUE 3: this modal used to enable WhatsApp + SMS by default and save the watch
 * without ever asking for a phone number — creating an alert with no deliverable
 * destination. The number (country code + validated national number) is now collected
 * INLINE whenever a phone channel is selected, and the watch cannot be created until
 * every enabled channel has a valid destination. Cancelling creates nothing and says
 * why, in the user's language.
 */
export default function TravelWatchModal({
  origin,
  destination,
  travelDate,
  existing,
  onClose,
  onCreated,
}: TravelWatchModalProps) {
  const { t, getCityName } = useLanguage();
  const { user, contact } = useAuth();

  const [maxBudget, setMaxBudget] = useState<number>(existing?.preferences.maxBudget ?? 1200);
  const [minRating, setMinRating] = useState<number>(existing?.preferences.minRating ?? 4.0);
  const [busType, setBusType] = useState<string>(existing?.preferences.busType ?? 'ac');
  const [seatType, setSeatType] = useState<string>(existing?.preferences.seatType ?? 'sleeper');
  const [femaleFriendlyOnly, setFemaleFriendlyOnly] = useState<boolean>(
    existing?.preferences.femaleFriendlyOnly ?? false
  );
  const [couponsOnly, setCouponsOnly] = useState<boolean>(existing?.preferences.couponsOnly ?? false);

  // Default to email only: it is the channel we can always address from the account,
  // so the default state is deliverable rather than silently broken.
  const [channels, setChannels] = useState<NotificationChannelConfig>(
    existing?.channels ?? { email: true, sms: false, whatsapp: false, push: true, inApp: true }
  );

  const [email, setEmail] = useState(existing?.contacts.email || contact.email || '');
  const initialPhone = parseE164(existing?.contacts.phone || contact.phone || '');
  const [dial, setDial] = useState(initialPhone.national ? initialPhone.dial : DEFAULT_COUNTRY.dial);
  const [national, setNational] = useState(initialPhone.national);

  const [isSaved, setIsSaved] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [error, setError] = useState<WatchValidationError | null>(null);

  const needsPhone = channels.whatsapp || channels.sms;
  const phoneCheck = validatePhone(dial, national);
  const contacts: WatchContacts = {
    email: email.trim(),
    phone: phoneCheck.valid ? phoneCheck.e164 : '',
  };
  const deliveryError = validateWatchDelivery(channels, contacts);

  const errorText = (key: WatchValidationError | null): string | null => {
    if (!key) return null;
    switch (key) {
      case 'missing-email':
      case 'invalid-email':
        return t('alertEmailInvalid');
      case 'missing-phone':
      case 'invalid-phone':
        return t('alertPhoneInvalid');
      case 'no-channel':
        return t('alertChannelRequired');
      default:
        return null;
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const preferences: TravelWatchPreferences = {
      maxBudget,
      minRating,
      busType,
      seatType,
      femaleFriendlyOnly,
      couponsOnly,
    };

    const payload = {
      userId: user?.id || 'user-guest',
      origin,
      destination,
      travelDate,
      preferences,
      channels,
      contacts,
      status: 'active' as const,
    };

    const result = existing
      ? updateTravelWatch(existing.id, payload)
      : saveTravelWatch(payload);

    if (result.error) {
      setError(result.error);
      return;
    }

    setIsSaved(true);
    setTimeout(() => {
      onCreated();
      onClose();
    }, 1600);
  };

  // Closing with an unusable delivery setup must not leave a broken watch behind —
  // and must explain why nothing was created.
  const handleCancel = () => {
    if (!isSaved && deliveryError) {
      setCancelled(true);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
      <div className="card w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 text-white border border-amber-500/30 shadow-2xl animate-fade-in-up my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2 border border-amber-500/40 text-amber-400">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                {t('watchAlertTitle')}
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full">
                  AI
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {getCityName(origin)} → {getCityName(destination)} ({travelDate})
              </p>
            </div>
          </div>
          <button onClick={handleCancel} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSaved ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Check className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-bold text-white">{t('alertCreated')}</h4>
            {/* The destination is echoed back so it is obvious where this will land. */}
            <div className="mx-auto max-w-xs space-y-1 rounded-xl border border-white/10 bg-white/5 p-3 text-xs">
              {channels.email && contacts.email && (
                <p className="flex items-center justify-center gap-1.5 text-blue-300">
                  <Mail className="h-3.5 w-3.5" /> {contacts.email}
                </p>
              )}
              {needsPhone && contacts.phone && (
                <p className="flex items-center justify-center gap-1.5 text-emerald-300">
                  <MessageSquare className="h-3.5 w-3.5" /> {formatPhone(contacts.phone)}
                </p>
              )}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">{t('alertMockNote')}</p>
          </div>
        ) : cancelled ? (
          <div className="p-8 space-y-4">
            <div className="flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <p className="font-medium">{t('alertCancelled')}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCancelled(false)}
                className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10"
              >
                {t('alertEdit')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl bg-slate-700 py-2.5 text-xs font-bold text-white hover:bg-slate-600"
              >
                {t('alertCancel')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="p-6 space-y-5 text-xs">
            {/* Budget & Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">{t('alertTargetPrice')}</label>
                <input
                  type="number"
                  step="50"
                  min={100}
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="input-field bg-slate-800 border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">{t('minRatingLabel')}</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="input-field bg-slate-800 border-white/10 text-white"
                >
                  <option value={4.5}>4.5+ ★</option>
                  <option value={4.0}>4.0+ ★</option>
                  <option value={3.5}>3.5+ ★</option>
                  <option value={0}>{t('anyRating')}</option>
                </select>
              </div>
            </div>

            {/* Bus Type & Seat Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">{t('busType')}</label>
                <select
                  value={busType}
                  onChange={(e) => setBusType(e.target.value)}
                  className="input-field bg-slate-800 border-white/10 text-white"
                >
                  <option value="ac">{t('ac')}</option>
                  <option value="non-ac">{t('nonAc')}</option>
                  <option value="any">{t('anyRating')}</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">{t('seater')}</label>
                <select
                  value={seatType}
                  onChange={(e) => setSeatType(e.target.value)}
                  className="input-field bg-slate-800 border-white/10 text-white"
                >
                  <option value="sleeper">{t('sleeper')}</option>
                  <option value="seater">{t('seater')}</option>
                  <option value="semi-sleeper">{t('semiSleeper')}</option>
                  <option value="any">{t('anyRating')}</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 border-y border-white/10 py-3">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={femaleFriendlyOnly}
                  onChange={(e) => setFemaleFriendlyOnly(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-blue-500"
                />
                <span>Notify only for Female-Friendly buses</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={couponsOnly}
                  onChange={(e) => setCouponsOnly(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-blue-500"
                />
                <span>Notify when instant discount coupons or cashback are available</span>
              </label>
            </div>

            {/* Notification Channels */}
            <div>
              <label className="block font-semibold text-slate-300 mb-2">{t('alertChannel')}</label>
              <div className="grid grid-cols-3 gap-2">
                <label className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer ${channels.whatsapp ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <input type="checkbox" checked={channels.whatsapp} onChange={(e) => { setChannels({ ...channels, whatsapp: e.target.checked }); setError(null); }} className="hidden" />
                  <MessageSquare className="h-3.5 w-3.5" /> {t('alertWhatsapp')}
                </label>
                <label className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer ${channels.email ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <input type="checkbox" checked={channels.email} onChange={(e) => { setChannels({ ...channels, email: e.target.checked }); setError(null); }} className="hidden" />
                  <Mail className="h-3.5 w-3.5" /> {t('alertEmail')}
                </label>
                <label className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer ${channels.sms ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <input type="checkbox" checked={channels.sms} onChange={(e) => { setChannels({ ...channels, sms: e.target.checked }); setError(null); }} className="hidden" />
                  <Smartphone className="h-3.5 w-3.5" /> {t('alertSms')}
                </label>
              </div>
            </div>

            {/* Destination addresses — shown for exactly the channels that need them. */}
            {channels.email && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">{t('alertEmail')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="you@example.com"
                  className="input-field bg-slate-800 border-white/10 text-white"
                  required
                />
              </div>
            )}

            {needsPhone && (
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">{t('alertPhoneLabel')}</label>
                {!contact.phone && (
                  <p className="mb-2 rounded-lg bg-blue-500/10 border border-blue-500/30 px-3 py-2 text-[11px] leading-relaxed text-blue-200">
                    {t('alertPhoneNeeded')}
                  </p>
                )}
                <div className="flex gap-2">
                  <select
                    value={dial}
                    onChange={(e) => setDial(e.target.value)}
                    className="input-field w-28 shrink-0 bg-slate-800 border-white/10 text-white"
                    aria-label="Country code"
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.dial} className="bg-slate-900">
                        {c.dial} {c.code}
                      </option>
                    ))}
                  </select>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={national}
                    onChange={(e) => { setNational(e.target.value); setError(null); }}
                    placeholder="98765 43210"
                    className="input-field flex-1 bg-slate-800 border-white/10 text-white"
                    required
                  />
                </div>
              </div>
            )}

            {(error || (deliveryError && (email || national))) && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[11px] font-semibold text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {errorText(error || deliveryError)}
              </div>
            )}

            <p className="flex items-start gap-2 text-[10px] leading-relaxed text-slate-500">
              <Info className="mt-0.5 h-3 w-3 shrink-0" />
              {t('alertMockNote')}
            </p>

            {/* Submit Button — disabled until the watch is actually deliverable. */}
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={handleCancel}
                className="rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-xs font-semibold text-slate-300 hover:bg-white/10"
              >
                {t('alertCancel')}
              </button>
              <button
                type="submit"
                disabled={Boolean(deliveryError)}
                className="flex-1 btn-primary bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold py-3 text-sm rounded-xl shadow-lg hover:scale-[1.01] transition-transform flex items-center justify-center gap-2 disabled:opacity-50 disabled:hover:scale-100"
              >
                <Sparkles className="h-4 w-4" /> {existing ? t('alertSave') : t('alertCreate')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
