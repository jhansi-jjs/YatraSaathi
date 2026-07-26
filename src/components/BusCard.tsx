import { Star, Clock, Users, Snowflake, Fan, ExternalLink } from 'lucide-react';
import type { BusListingWithRoute } from '../lib/types';
import { getSessionId } from '../lib/session';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { buildOtaDeepLink, OTA_NAMES } from '../lib/ota';
import { useLanguage } from '../context/LanguageContext';

interface BusCardProps {
  listing: BusListingWithRoute;
  index: number;
}

const OTA_COLORS: Record<string, string> = {
  redBus: 'bg-red-50 text-red-600',
  MakeMyTrip: 'bg-blue-50 text-blue-600',
  AbhiBus: 'bg-emerald-50 text-emerald-600',
  TravelYaari: 'bg-orange-50 text-orange-600',
  EaseMyTrip: 'bg-cyan-50 text-cyan-600',
  PaytmBus: 'bg-indigo-50 text-indigo-600',
};

export default function BusCard({ listing, index }: BusCardProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const handleRedirect = async () => {
    const deepLink = buildOtaDeepLink(listing);
    try {
      await supabase.from('click_logs').insert({
        user_id: user?.id ?? null,
        listing_id: listing.id,
        ota_source: listing.ota_source,
        session_id: getSessionId(),
      });
    } catch {
      // best-effort
    }
    window.open(deepLink, '_blank', 'noopener,noreferrer');
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const otaColor = OTA_COLORS[listing.ota_source] || 'bg-slate-100 text-slate-600';

  return (
    <div
      className="card animate-fade-in-up p-5 transition-all hover:border-slate-300 hover:shadow-md"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Operator info */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className={`badge ${otaColor}`}>
              {OTA_NAMES[listing.ota_source] || listing.ota_source}
            </span>
            {listing.rating && (
              <span className="badge bg-amber-50 text-amber-600">
                <Star className="h-3 w-3 fill-current" /> {listing.rating}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900">{listing.operator_name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="badge bg-slate-100 text-slate-600 capitalize">
              {listing.bus_type === 'sleeper' ? t('sleeper') : listing.bus_type === 'semi-sleeper' ? t('semiSleeper') : t('seater')}
            </span>
            <span className="badge bg-slate-100 text-slate-600 capitalize">
              {listing.ac_status === 'ac' ? <Snowflake className="h-3 w-3" /> : <Fan className="h-3 w-3" />}
              {listing.ac_status === 'ac' ? t('ac') : t('nonAc')}
            </span>
            <span className="badge bg-slate-100 text-slate-600 capitalize">{listing.bus_model}</span>
          </div>
        </div>

        {/* Timing */}
        <div className="flex items-center gap-4 lg:px-6">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{listing.departure_time}</p>
            <p className="text-xs text-slate-400">{listing.routes.origin_city}</p>
          </div>
          <div className="flex flex-col items-center">
            <Clock className="h-3.5 w-3.5 text-slate-300" />
            <div className="mt-1 h-px w-12 bg-slate-200" />
            <p className="mt-1 text-xs font-medium text-slate-400">{formatDuration(listing.duration_mins)}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{listing.arrival_time}</p>
            <p className="text-xs text-slate-400">{listing.routes.destination_city}</p>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Users className="h-3 w-3" /> {listing.available_seats} {t('seatsLeft')}
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              ₹{listing.price.toLocaleString('en-IN')}
            </p>
          </div>
          <button onClick={handleRedirect} className="btn-primary">
            {t('bookOn')} {OTA_NAMES[listing.ota_source] || listing.ota_source} <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
