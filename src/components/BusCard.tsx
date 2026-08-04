import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Star, Clock, Users, Snowflake, Fan, ExternalLink, Award, Armchair } from 'lucide-react';
import type { BusListingWithRoute } from '../lib/types';
import type { ScoredBusListing } from '../lib/recommendationEngine';
import { getSessionId } from '../lib/session';
import { useAuth } from '../context/AuthContext';
import { useSearch } from '../context/SearchContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { buildOtaDeepLink, OTA_NAMES, otaSupportsPrefill, getOtaToastMessage } from '../lib/ota';
import BookingModal from './BookingModal';

interface BusCardProps {
  listing: BusListingWithRoute | ScoredBusListing;
  index: number;
}

const OTA_COLORS: Record<string, string> = {
  redBus: 'bg-red-50 text-red-600 border-red-200',
  MakeMyTrip: 'bg-blue-50 text-blue-600 border-blue-200',
  AbhiBus: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  TravelYaari: 'bg-orange-50 text-orange-600 border-orange-200',
  EaseMyTrip: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  PaytmBus: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  Cleartrip: 'bg-amber-50 text-amber-700 border-amber-200',
  Goibibo: 'bg-purple-50 text-purple-600 border-purple-200',
  Ixigo: 'bg-rose-50 text-rose-600 border-rose-200',
};

export default function BusCard({ listing, index }: BusCardProps) {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { session } = useSearch();
  const { currentLanguage, t } = useLanguage();
  const [toast, setToast] = useState<string | null>(null);
  const [bookingOpen, setBookingOpen] = useState(false);

  const scoredListing = listing as ScoredBusListing;
  const isAiRecommended = scoredListing.isAiRecommended;
  const scoreReasons = scoredListing.scoreReasons || [];
  const aiScore = scoredListing.aiScore;

  const searchOrigin = searchParams.get('origin') || session.source || undefined;
  const searchDestination = searchParams.get('destination') || session.destination || undefined;
  const searchDate = searchParams.get('date') || session.date || undefined;

  const handleDirectOtaRedirect = () => {
    const deepLink = buildOtaDeepLink(listing, searchOrigin, searchDestination, searchDate);
    window.open(deepLink, '_blank', 'noopener,noreferrer');
    if (!otaSupportsPrefill(listing.ota_source)) {
      setToast(
        getOtaToastMessage(
          currentLanguage,
          searchOrigin || 'Visakhapatnam',
          searchDestination || 'Hyderabad',
          searchDate || new Date().toISOString().split('T')[0]
        )
      );
      window.setTimeout(() => setToast(null), 7000);
    }
    void supabase
      .from('click_logs')
      .insert({
        user_id: user?.id ?? null,
        listing_id: listing.id,
        ota_source: listing.ota_source,
        session_id: getSessionId(),
      })
      .then(undefined, () => {});
  };

  const formatDuration = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const otaColor = OTA_COLORS[listing.ota_source] || 'bg-slate-100 text-slate-600';
  const loose = listing as unknown as { origin_city?: string; destination_city?: string; origin?: string; destination?: string };
  const originCity = searchOrigin || listing.routes?.origin_city || loose.origin_city || loose.origin || 'Visakhapatnam';
  const destCity = searchDestination || listing.routes?.destination_city || loose.destination_city || loose.destination || 'Hyderabad';

  return (
    <div
      className={`card animate-fade-in-up p-5 transition-all relative ${
        isAiRecommended
          ? 'bg-gradient-to-r from-amber-500/5 via-emerald-500/5 to-blue-500/5 border-amber-400/80 ring-2 ring-amber-400/40 shadow-lg'
          : 'hover:border-slate-300 hover:shadow-md'
      }`}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* AI Recommended Badge */}
      {isAiRecommended && (
        <div className="absolute -top-3 left-4 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-emerald-600 px-3 py-0.5 text-[11px] font-black text-white shadow-md">
          <Award className="h-3.5 w-3.5" /> 🏆 AI Recommended ({aiScore}% Match)
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between pt-1">
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
            {aiScore && !isAiRecommended && (
              <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                {aiScore}% Score
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

          {/* Transparent AI Score Reasons */}
          {scoreReasons.length > 0 && (
            <div className="mt-2.5 flex flex-wrap gap-1 text-[10px]">
              {scoreReasons.map((reason, idx) => (
                <span key={idx} className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 font-semibold">
                  ✓ {reason}
                </span>
              ))}
            </div>
          )}
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

          <div className="flex flex-col gap-2">
            <button
              onClick={handleDirectOtaRedirect}
              className="btn-primary flex items-center justify-center gap-2 bg-[#0066ff] hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl shadow-md transition-all hover:scale-105"
            >
              {t('bookNow')} <ExternalLink className="h-4 w-4" />
            </button>

            {/* ISSUE 5: BookingModal (seat map -> passenger details -> mock payment ->
                PNR) existed but was never reachable from anywhere in the UI. */}
            <button
              onClick={() => setBookingOpen(true)}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Armchair className="h-4 w-4 text-[#0066ff]" /> {t('selectSeatsCta')}
            </button>
          </div>
        </div>
      </div>

      {bookingOpen && <BookingModal listing={listing} onClose={() => setBookingOpen(false)} />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-2xl border border-white/10 max-w-[92vw] text-center">
          {toast}
        </div>
      )}
    </div>
  );
}
