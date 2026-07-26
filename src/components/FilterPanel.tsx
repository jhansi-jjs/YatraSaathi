import { Filter } from 'lucide-react';
import type { BusListingWithRoute } from '../lib/types';
import { useLanguage } from '../context/LanguageContext';

export interface FilterState {
  busTypes: string[];
  acStatus: string[];
  busModels: string[];
  maxPrice: number | null;
  minRating: number;
}

interface FilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  listings: BusListingWithRoute[];
  onReset: () => void;
}

const BUS_TYPES = ['sleeper', 'semi-sleeper', 'seater'];
const AC_OPTIONS = ['ac', 'non-ac'];
const BUS_MODELS = ['volvo', 'bharatbenz', 'other'];

export default function FilterPanel({ filters, onChange, listings, onReset }: FilterPanelProps) {
  const { t } = useLanguage();

  const toggleArray = (key: 'busTypes' | 'acStatus' | 'busModels', value: string) => {
    const arr = filters[key];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next });
  };

  const maxAvailablePrice = Math.max(...listings.map((l) => l.price), 0);

  return (
    <div className="card sticky top-20 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="h-4 w-4 text-[#0066ff]" /> {t('filterTitle')}
        </h3>
        <button onClick={onReset} className="text-xs font-medium text-slate-400 hover:text-[#0066ff]">
          {t('resetFilters')}
        </button>
      </div>

      {/* Bus Type */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold text-slate-500">{t('busType')}</p>
        <div className="flex flex-col gap-2">
          {BUS_TYPES.map((type) => (
            <label key={type} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.busTypes.includes(type)}
                onChange={() => toggleArray('busTypes', type)}
                className="h-4 w-4 rounded border-slate-300 text-[#0066ff] focus:ring-[#0066ff]"
              />
              <span className="capitalize">{type === 'sleeper' ? t('sleeper') : type === 'semi-sleeper' ? t('semiSleeper') : t('seater')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* AC Status */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold text-slate-500">{t('acStatus')}</p>
        <div className="flex flex-col gap-2">
          {AC_OPTIONS.map((opt) => (
            <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.acStatus.includes(opt)}
                onChange={() => toggleArray('acStatus', opt)}
                className="h-4 w-4 rounded border-slate-300 text-[#0066ff] focus:ring-[#0066ff]"
              />
              <span className="uppercase">{opt === 'ac' ? t('ac') : t('nonAc')}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Bus Model */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold text-slate-500">Bus Model</p>
        <div className="flex flex-col gap-2">
          {BUS_MODELS.map((model) => (
            <label key={model} className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={filters.busModels.includes(model)}
                onChange={() => toggleArray('busModels', model)}
                className="h-4 w-4 rounded border-slate-300 text-[#0066ff] focus:ring-[#0066ff]"
              />
              <span className="capitalize">{model}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Max Price */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold text-slate-500">
          Max Price: ₹{filters.maxPrice?.toLocaleString('en-IN') || maxAvailablePrice.toLocaleString('en-IN')}
        </p>
        <input
          type="range"
          min={0}
          max={maxAvailablePrice || 2000}
          step={50}
          value={filters.maxPrice ?? maxAvailablePrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="w-full accent-[#0066ff]"
        />
      </div>

      {/* Min Rating */}
      <div>
        <p className="mb-2 text-xs font-semibold text-slate-500">
          Min Rating: {filters.minRating > 0 ? `${filters.minRating}★` : 'Any'}
        </p>
        <input
          type="range"
          min={0}
          max={5}
          step={0.5}
          value={filters.minRating}
          onChange={(e) => onChange({ ...filters, minRating: Number(e.target.value) })}
          className="w-full accent-[#0066ff]"
        />
      </div>
    </div>
  );
}
