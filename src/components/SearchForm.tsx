import { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Calendar, Search, ArrowLeftRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';

export const CITIES = [
  'Visakhapatnam',
  'Hyderabad',
  'Vijayawada',
  'Chennai',
  'Bengaluru',
  'Tirupati',
  'Guntur',
  'Rajahmundry',
  'Kakinada',
  'Nellore',
  'Kurnool',
  'Anantapur',
  'Warangal',
  'Karimnagar',
  'Mumbai',
  'Pune',
  'Delhi',
  'Kolkata',
  'Kochi',
  'Coimbatore',
  'Madurai',
  'Mysuru',
];

interface SearchFormProps {
  compact?: boolean;
}

export default function SearchForm({ compact = false }: SearchFormProps) {
  const navigate = useNavigate();
  const { t, getCityName } = useLanguage();
  const { session, setSource, setDestination, setDate, setSearchRoute } = useSearch();

  const origin = session.source || '';
  const destination = session.destination || '';
  const date = session.date || new Date().toISOString().split('T')[0];

  const swap = () => {
    setSearchRoute(destination, origin, date);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!origin || !destination || !date) return;
    if (origin.toLowerCase() === destination.toLowerCase()) {
      return;
    }
    const params = new URLSearchParams({ origin, destination, date });
    navigate(`/results?${params.toString()}`);
  };

  const today = new Date().toISOString().split('T')[0];

  if (compact) {
    return (
      <form onSubmit={handleSubmit} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{t('fromLabel')}</label>
          <select
            value={origin}
            onChange={(e) => setSource(e.target.value)}
            className="input-field"
            required
          >
            <option value="">{t('selectOrigin')}</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {getCityName(c)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={swap}
          title={t('swapBtn')}
          className="mx-auto rounded-lg border border-slate-200 p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 sm:mb-2"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{t('toLabel')}</label>
          <select
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            className="input-field"
            required
          >
            <option value="">{t('selectDestination')}</option>
            {CITIES.map((c) => (
              <option key={c} value={c}>
                {getCityName(c)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-500">{t('dateLabel')}</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
            required
          />
        </div>
        <button type="submit" className="btn-primary sm:mb-0">
          <Search className="h-4 w-4" /> {t('searchBtn')}
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card grid grid-cols-1 gap-4 p-6 md:grid-cols-[1fr_auto_1fr_1fr_auto]">
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <MapPin className="h-3.5 w-3.5 text-blue-500" /> {t('fromLabel')}
        </label>
        <select
          value={origin}
          onChange={(e) => setSource(e.target.value)}
          className="input-field text-base font-medium"
          required
        >
          <option value="">{t('selectOrigin')}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {getCityName(c)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-end justify-center pb-1">
        <button
          type="button"
          onClick={swap}
          title={t('swapBtn')}
          className="rounded-full border border-slate-200 bg-white p-2.5 text-slate-400 transition-all hover:rotate-180 hover:bg-slate-50 hover:text-[#0066ff]"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </div>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Navigation className="h-3.5 w-3.5 text-emerald-500" /> {t('toLabel')}
        </label>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="input-field text-base font-medium"
          required
        >
          <option value="">{t('selectDestination')}</option>
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {getCityName(c)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
          <Calendar className="h-3.5 w-3.5 text-amber-500" /> {t('dateLabel')}
        </label>
        <input
          type="date"
          min={today}
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input-field text-base font-medium"
          required
        />
      </div>
      <div className="flex items-end">
        <button type="submit" className="btn-primary h-[50px] px-8 text-base">
          <Search className="h-5 w-5" /> {t('searchBtn')}
        </button>
      </div>
    </form>
  );
}
