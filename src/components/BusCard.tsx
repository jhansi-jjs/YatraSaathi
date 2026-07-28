import { useSearchParams } from 'react-router-dom';
import { Star, Clock, Users, Snowflake, Fan, ExternalLink } from 'lucide-react';
import type { BusListingWithRoute } from '../lib/types';
import { getSessionId } from '../lib/session';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { buildOtaDeepLink, OTA_NAMES } from '../lib/ota';

interface BusCardProps {
  listing: BusListingWithRoute;
  index: number;
}

const OTA_COLORS: Record<string, string> = {
  redBus: 'bg-red-50 text-red-600 border-red-200',
  MakeMyTrip: 'bg-blue-50 text-blue-600 border-blue-200',
  AbhiBus: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  TravelYaari: 'bg-orange-50 text-orange-600 border-orange-200',
  EaseMyTrip: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  PaytmBus: 'bg-indigo-50 text-indigo-600 border-indigo-200',
};

export default function BusCard({ listing, index }: BusCardProps) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const searchOrigin = searchParams.get('origin') || undefined;
  const searchDestination = searchParams.get('destination') || undefined;
  const searchDate = searchParams.get('date') || undefined;

  const handleDirectOtaRedirect = async () => {
    const deepLink = buildOtaDeepLink(listing, searchOrigin, searchDestination, searchDate);
    try {
      await supabase.from('click_logs').insert({
        user_id: user?.id ?? null,
        listing_id: listing.id,
        ota_source: listing.ota_source,
        session_id: getSessionId(),
      });
    } catch {}
    window.open(deepLink, '_blank', 'noopener,noreferrer');
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const otaColor = OTA_COLORS[listing.ota_source] || 'bg-slate-100 text-slate-600';
  const originCity = searchOrigin || listing.routes?.origin_city || (listing as any).origin_city || (listing as any).origin || 'Visakhapatnam';
  const destCity = searchDestination || listing.routes?.destination_city || (listing as any).destination_city || (listing as any).destination || 'Hyderabad';

  return (
    <div
      className="card animate-fade-in-up p-5 transition-all hover:border-slate-300 hover:shadow-md"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        {/* Operator info */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className={`badge ${otaColor} border font-bold`}>
              {OTA_NAMES[listing.ota_source] || listing.ota_source}
            </span>
            {listing.rating && (
              <span className="badge bg-amber-50 text-amber-600 border border-amber-200 font-bold">
                <Star className="h-3 w-3 fill-current text-amber-500" /> {listing.rating}
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-slate-900">{listing.operator_name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="badge bg-slate-100 text-slate-600 capitalize font-medium">
              {listing.bus_type}
            </span>
            <span className="badge bg-slate-100 text-slate-600 capitalize font-medium flex items-center gap-1">
              {listing.ac_status === 'ac' ? <Snowflake className="h-3 w-3 text-blue-500" /> : <Fan className="h-3 w-3 text-slate-400" />}
              {listing.ac_status === 'ac' ? 'AC' : 'Non-AC'}
            </span>
            <span className="badge bg-slate-100 text-slate-600 capitalize font-medium">
              {listing.bus_model}
            </span>
          </div>
        </div>

        {/* Timing */}
        <div className="flex items-center gap-4 lg:px-6">
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{listing.departure_time}</p>
            <p className="text-xs text-slate-400 font-medium">{originCity}</p>
          </div>
          <div className="flex flex-col items-center">
            <Clock className="h-3.5 w-3.5 text-slate-300" />
            <div className="mt-1 h-px w-12 bg-slate-200" />
            <p className="mt-1 text-xs font-medium text-slate-400">{formatDuration(listing.duration_mins)}</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-slate-900">{listing.arrival_time}</p>
            <p className="text-xs text-slate-400 font-medium">{destCity}</p>
          </div>
        </div>

        {/* Price + Single "Book Now" CTA Button */}
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
          <div>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Users className="h-3 w-3" /> {listing.available_seats} seats left
            </div>
            <p className="text-2xl font-extrabold text-slate-900">
              ₹{listing.price.toLocaleString('en-IN')}
            </p>
          </div>

          <button
            onClick={handleDirectOtaRedirect}
            className="btn-primary flex items-center gap-2 bg-[#0066ff] hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105"
          >
            Book Now <ExternalLink className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
