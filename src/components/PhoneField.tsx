import { Phone } from 'lucide-react';
import { COUNTRY_CODES } from '../lib/phone';

interface PhoneFieldProps {
  dial: string;
  national: string;
  onDialChange: (dial: string) => void;
  onNationalChange: (national: string) => void;
  label: string;
  required?: boolean;
  /** Rendered dark for the modal on the welcome screen. */
  dark?: boolean;
  error?: string | null;
}

/**
 * Country code + national number input shared by signup, the auth modal, the profile
 * page and the watch-alert modal (ISSUE 3/4) so validation and formatting cannot
 * drift between the four places a phone number is collected.
 */
export default function PhoneField({
  dial,
  national,
  onDialChange,
  onNationalChange,
  label,
  required = false,
  dark = false,
  error,
}: PhoneFieldProps) {
  const inputClass = dark
    ? 'w-full rounded-xl border border-white/10 bg-slate-800/80 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500'
    : 'input-field';
  const selectClass = dark
    ? 'w-28 shrink-0 rounded-xl border border-white/10 bg-slate-800/80 px-2 py-2 text-sm text-white outline-none focus:border-blue-500'
    : 'input-field w-28 shrink-0';
  const labelClass = dark
    ? 'mb-1 block text-xs font-medium text-slate-300'
    : 'mb-1.5 block text-xs font-semibold text-slate-700';

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex gap-2">
        <select
          value={dial}
          onChange={(e) => onDialChange(e.target.value)}
          className={selectClass}
          aria-label="Country code"
        >
          {COUNTRY_CODES.map((c) => (
            <option key={c.code} value={c.dial} className={dark ? 'bg-slate-900' : ''}>
              {c.dial} {c.code}
            </option>
          ))}
        </select>
        <div className="relative flex-1">
          {!dark && <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />}
          <input
            type="tel"
            inputMode="numeric"
            value={national}
            onChange={(e) => onNationalChange(e.target.value)}
            placeholder="98765 43210"
            className={dark ? inputClass : `${inputClass} pl-10`}
            required={required}
          />
        </div>
      </div>
      {error && <p className="mt-1 text-[11px] font-semibold text-red-500">{error}</p>}
    </div>
  );
}
