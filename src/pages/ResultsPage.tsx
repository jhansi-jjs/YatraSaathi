import { useEffect, useState, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BusListingWithRoute } from '../lib/types';
import SearchForm from '../components/SearchForm';
import BusCard from '../components/BusCard';
import FilterPanel, { FilterState } from '../components/FilterPanel';
import PricePredictionCard from '../components/PricePredictionCard';
import TravelWatchModal from '../components/TravelWatchModal';
import { rankAndScoreListings } from '../lib/recommendationEngine';
import {
  SlidersHorizontal, Bus as BusIcon, AlertCircle, GitFork, ExternalLink,
  Sparkles, Clock, Award, Bell, Filter as FilterIcon, X,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { computeBreakJourneyRoutes, hasDirectBuses, BreakJourneyRoute } from '../lib/breakJourneyService';
import { buildOtaDeepLink } from '../lib/ota';
import { NO_DIRECT_MESSAGES, CONNECTING_CHOICE_PROMPT, CONNECTING_CHOICE_LABELS } from '../lib/agenticAiService';
import { speakWithBrowser } from '../lib/speech';
import {
  generateDynamicListings,
  applyResultFilters,
  voiceFiltersToResultFilters,
  describeResultFilters,
  isFilterActive,
  suggestRelaxation,
  DEFAULT_RESULT_FILTERS,
  type Relaxation,
} from '../lib/listings';
import { EMPTY_FILTERS } from '../lib/filterExtraction';
import { filterAppliedMessage, filterNoResultsMessage } from '../lib/filterMessages';

type SortOption = 'price_low' | 'price_high' | 'rating' | 'duration' | 'ai_score';

// Listing generation + filtering now live in lib/listings.ts so the voice assistant
// and the chatbot can count and filter against the SAME inventory this page renders
// (ISSUE 1c/1d).
const DEFAULT_FILTERS: FilterState = DEFAULT_RESULT_FILTERS;

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t, getCityName, currentLanguage } = useLanguage();
  const { session, setSearchRoute, updateSession } = useSearch();

  const origin = searchParams.get('origin') || session.source || '';
  const destination = searchParams.get('destination') || session.destination || '';
  const date = searchParams.get('date') || session.date || new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (origin && destination) {
      setSearchRoute(origin, destination, date);
    }
  }, [origin, destination, date]);

  const [listings, setListings] = useState<BusListingWithRoute[]>([]);
  const [breakRoutes, setBreakRoutes] = useState<BreakJourneyRoute[]>([]);
  const [noDirect, setNoDirect] = useState(false);
  const [selectedBreakId, setSelectedBreakId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<SortOption>('ai_score');
  const [showFilters, setShowFilters] = useState(false);

  // ISSUE 1(b): filters spoken to the assistant land in the shared session and are
  // mirrored into the panel state, so the visible controls always match what the
  // assistant said it applied. Manual edits are not clobbered — this only re-syncs
  // when the SPOKEN filters actually change.
  const [filters, setFilters] = useState<FilterState>(() =>
    voiceFiltersToResultFilters(session.filters || EMPTY_FILTERS)
  );
  const lastVoiceFilterSig = useRef<string>(JSON.stringify(session.filters || EMPTY_FILTERS));

  useEffect(() => {
    const sig = JSON.stringify(session.filters || EMPTY_FILTERS);
    if (sig !== lastVoiceFilterSig.current) {
      lastVoiceFilterSig.current = sig;
      setFilters(voiceFiltersToResultFilters(session.filters || EMPTY_FILTERS, DEFAULT_FILTERS));
    }
  }, [session.filters]);
  const [showWatchModal, setShowWatchModal] = useState(false);

  useEffect(() => {
    if (!origin || !destination || !date) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    async function fetchListings() {
      setLoading(true);
      setError(null);
      setSelectedBreakId(null);

      if (!hasDirectBuses(origin, destination)) {
        setListings([]);
        setBreakRoutes(computeBreakJourneyRoutes(origin, destination, date));
        setNoDirect(true);
        setLoading(false);
        return;
      }

      setNoDirect(false);
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1000));

      const dbPromise = (async () => {
        try {
          const { data: routeData } = await supabase
            .from('routes')
            .select('id')
            .eq('origin_city', origin)
            .eq('destination_city', destination)
            .maybeSingle();

          if (routeData) {
            const { data } = await supabase
              .from('bus_listings')
              .select('*, routes(*)')
              .eq('route_id', routeData.id)
              .eq('travel_date', date)
              .order('price', { ascending: true });

            if (data && data.length > 0) return data as BusListingWithRoute[];
          }
        } catch {
          return null;
        }
        return null;
      })();

      const dbResults = await Promise.race([dbPromise, timeoutPromise]);

      if (!isSubscribed) return;

      if (dbResults && dbResults.length > 0) {
        setListings(dbResults);
      } else {
        const dynamicResults = generateDynamicListings(origin, destination, date);
        setListings(dynamicResults);
      }

      setLoading(false);
    }

    fetchListings();

    return () => {
      isSubscribed = false;
    };
  }, [origin, destination, date]);

  // Announce the "no direct buses" message aloud in the user's language (BUG 4).
  // Restored after it was dropped upstream.
  useEffect(() => {
    if (!loading && noDirect && origin && destination) {
      const msg = (NO_DIRECT_MESSAGES[currentLanguage] || NO_DIRECT_MESSAGES.en)(
        getCityName(origin),
        getCityName(destination)
      );
      void speakWithBrowser(msg, currentLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, noDirect, origin, destination, currentLanguage]);

  const scoredListings = useMemo(() => {
    return rankAndScoreListings(listings);
  }, [listings]);

  const filtered = useMemo(() => {
    // Single shared predicate, so a spoken filter and a hand-set filter narrow the
    // list identically and the count the assistant quoted always matches (ISSUE 1b).
    const result = applyResultFilters(scoredListings, filters) as typeof scoredListings;

    switch (sort) {
      case 'ai_score':
        result.sort((a, b) => b.aiScore - a.aiScore);
        break;
      case 'price_low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_high':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'duration':
        result.sort((a, b) => a.duration_mins - b.duration_mins);
        break;
    }

    return result;
  }, [scoredListings, filters, sort]);

  const cheapestPrice = listings.length > 0 ? Math.min(...listings.map((l) => l.price)) : 0;

  const filterActive = isFilterActive(filters);
  const filterSummary = filterActive ? describeResultFilters(filters, currentLanguage) : '';

  // ISSUE 1(d): a filter combination that matches nothing must SAY so and offer the
  // nearest relaxation — never silently fall back to the unfiltered list.
  const relaxation: Relaxation | null = useMemo(() => {
    if (loading || !filterActive || filtered.length > 0 || listings.length === 0) return null;
    return suggestRelaxation(listings, filters);
  }, [loading, filterActive, filtered.length, listings, filters]);

  const clearFilters = () => {
    setFilters(DEFAULT_FILTERS);
    lastVoiceFilterSig.current = JSON.stringify({ ...EMPTY_FILTERS });
    updateSession({ filters: { ...EMPTY_FILTERS } });
  };

  const handleSelectPredictionDate = (newDate: string) => {
    setSearchRoute(origin, destination, newDate);
    navigate(`/results?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${newDate}`);
  };

  if (!origin || !destination) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <SearchForm compact />
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-12 w-12 text-slate-300" />
          <p className="mt-4 text-lg font-semibold text-slate-700">{t('selectOrigin')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <SearchForm compact />

      {/* Header bar with AI Travel Watch trigger */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {getCityName(origin)} → {getCityName(destination)}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading ? t('processing') : `${filtered.length} ${t('busesFound')} · ${date}`}
            {!loading && listings.length > 0 && cheapestPrice > 0 && (
              <span className="ml-2 font-semibold text-emerald-600">· {t('cheapestDeal')} ₹{cheapestPrice.toLocaleString('en-IN')}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowWatchModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-400 bg-amber-500/10 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-500/20 transition-all shadow-sm"
          >
            <Bell className="h-4 w-4 text-amber-600 animate-pulse" />
            <span>🔔 {t('watchAlertCta')}</span>
          </button>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> {t('filterTitle')}
          </button>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="input-field w-auto text-xs font-bold"
          >
            <option value="ai_score">🏆 {t('aiRecommended')}</option>
            <option value="price_low">{t('priceLowHigh')}</option>
            <option value="price_high">{t('priceHighLow')}</option>
            <option value="rating">{t('ratingHighLow')}</option>
            <option value="duration">{t('duration')}</option>
          </select>
        </div>
      </div>

      {/* Active filter summary — mirrors exactly what the assistant confirmed aloud. */}
      {!loading && filterActive && filtered.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm text-blue-900">
          <FilterIcon className="h-4 w-4 shrink-0 text-blue-600" />
          <span className="font-semibold">{filterAppliedMessage(currentLanguage, filterSummary, filtered.length)}</span>
          <button
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 rounded-lg border border-blue-300 bg-white px-2 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100"
          >
            <X className="h-3 w-3" /> {t('resetFilters')}
          </button>
        </div>
      )}

      {/* Zero-result relaxation offer, in the user's language (ISSUE 1d). */}
      {!loading && relaxation && (
        <div className="mt-4 flex flex-col gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="font-semibold">
            {filterNoResultsMessage(
              currentLanguage,
              filterSummary,
              relaxation.relaxed,
              relaxation.count,
              relaxation.samplePrice
            )}
          </span>
          <div className="flex gap-2 sm:ml-auto">
            <button
              onClick={() => {
                setFilters(relaxation.filters);
                lastVoiceFilterSig.current = JSON.stringify(session.filters || EMPTY_FILTERS);
              }}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-slate-900 hover:bg-amber-400"
            >
              {t('showTheseInstead')}
            </button>
            <button
              onClick={clearFilters}
              className="rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100"
            >
              {t('resetFilters')}
            </button>
          </div>
        </div>
      )}

      {/* Smart Weekly Price Prediction Forecast Card */}
      {!loading && origin && destination && (
        <div className="mt-6">
          <PricePredictionCard
            origin={origin}
            destination={destination}
            travelDate={date}
            onSelectDate={handleSelectPredictionDate}
          />
        </div>
      )}

      {/* Main Results Layout */}
      <div className="mt-6 flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            listings={listings}
            onReset={clearFilters}
          />
        </aside>

        {showFilters && (
          <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowFilters(false)}>
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <div className="absolute right-0 top-0 h-full w-80 max-w-full overflow-y-auto bg-white p-4" onClick={(e) => e.stopPropagation()}>
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                listings={listings}
                onReset={clearFilters}
              />
            </div>
          </div>
        )}

        <div className="flex-1 space-y-6">
          {loading ? (
            <div className="flex flex-col gap-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card h-32 skeleton" />
              ))}
            </div>
          ) : error ? (
            <div className="card flex flex-col items-center justify-center p-12 text-center">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="mt-3 text-sm font-medium text-slate-700">{error}</p>
            </div>
          ) : (
            <>
              {/* Direct Bus Listings Scored by AI */}
              <div className="flex flex-col gap-4">
                {filtered.map((listing, i) => (
                  <BusCard key={listing.id} listing={listing} index={i} />
                ))}
              </div>

              {/* Agentic Smart Break-Journeys Section */}
              {breakRoutes.length > 0 && (
                <div className="mt-10 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white border border-amber-500/30 shadow-2xl space-y-4">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-amber-500/20 p-2.5 border border-amber-500/40 text-amber-400">
                        <GitFork className="h-6 w-6 animate-pulse" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-white">{t('noDirectTitle')}</h2>
                          <span className="badge bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="h-3 w-3 fill-current" /> AI Recommended
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          {(NO_DIRECT_MESSAGES[currentLanguage] || NO_DIRECT_MESSAGES.en)(getCityName(origin), getCityName(destination))}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {breakRoutes.map((br, index) => {
                      const leg1Url = buildOtaDeepLink(br.leg1, br.leg1.routes.origin_city, br.leg1.routes.destination_city, date);
                      const leg2Url = buildOtaDeepLink(br.leg2, br.leg2.routes.origin_city, br.leg2.routes.destination_city, date);
                      const labels = CONNECTING_CHOICE_LABELS[currentLanguage] || CONNECTING_CHOICE_LABELS.en;
                      const choicePrompt = CONNECTING_CHOICE_PROMPT[currentLanguage] || CONNECTING_CHOICE_PROMPT.en;
                      const isSelected = selectedBreakId === br.id;

                      return (
                        <div key={br.id} className="rounded-xl bg-white/5 p-4 border border-white/10 flex flex-col justify-between gap-3 hover:border-amber-400/40 transition-all">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-3 py-1 text-xs font-bold text-amber-300">
                                Option {index + 1}: Via {br.transferHub} Hub
                              </span>
                              {index === 0 && (
                                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                                  <Award className="h-3 w-3" /> Fastest Option
                                </span>
                              )}
                            </div>
                            <span className="text-xl font-black text-emerald-400">₹{br.totalPrice.toLocaleString('en-IN')}</span>
                          </div>

                          <div className="text-xs text-slate-200 space-y-2 border-y border-white/10 py-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BusIcon className="h-4 w-4 text-blue-400 shrink-0" />
                                <span><strong className="text-white">Leg 1:</strong> {br.leg1.routes.origin_city} → {br.leg1.routes.destination_city} ({br.leg1.operator_name})</span>
                              </div>
                              <span className="text-blue-300 font-bold">₹{br.leg1.price}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <BusIcon className="h-4 w-4 text-emerald-400 shrink-0" />
                                <span><strong className="text-white">Leg 2:</strong> {br.leg2.routes.origin_city} → {br.leg2.routes.destination_city} ({br.leg2.operator_name})</span>
                              </div>
                              <span className="text-emerald-300 font-bold">₹{br.leg2.price}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-3 pt-1">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-amber-400" /> Transfer Break: {br.transferWaitMins} mins at {br.transferHub}</span>
                              <span>· Total Duration: ~{Math.floor(br.totalDurationMins / 60)}h {br.totalDurationMins % 60}m</span>
                            </div>
                          </div>

                          {/* Ask the user what to do next, in their language (BUG 4).
                              Restored after upstream replaced it with English-only links. */}
                          {!isSelected ? (
                            <button
                              onClick={() => setSelectedBreakId(br.id)}
                              className="w-full text-center py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 font-bold text-xs text-slate-900 flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                            >
                              {labels.select}
                            </button>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-[11px] text-amber-200 font-medium">{choicePrompt}</p>
                              <div className="grid grid-cols-3 gap-2">
                                <a
                                  href={leg1Url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-center py-2 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-[11px] text-white flex items-center justify-center gap-1 shadow-md transition-all hover:scale-[1.02]"
                                >
                                  {labels.leg1} <ExternalLink className="h-3 w-3" />
                                </a>
                                <a
                                  href={leg2Url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-center py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-[11px] text-white flex items-center justify-center gap-1 shadow-md transition-all hover:scale-[1.02]"
                                >
                                  {labels.leg2} <ExternalLink className="h-3 w-3" />
                                </a>
                                <button
                                  onClick={() => {
                                    window.open(leg1Url, '_blank', 'noopener,noreferrer');
                                    window.open(leg2Url, '_blank', 'noopener,noreferrer');
                                  }}
                                  className="text-center py-2 rounded-xl bg-slate-700 hover:bg-slate-600 font-bold text-[11px] text-white flex items-center justify-center gap-1 shadow-md transition-all hover:scale-[1.02]"
                                >
                                  {labels.both}
                                </button>
                              </div>
                              <p className="text-[10px] text-slate-500">
                                Leg 1 via {br.leg1.ota_source} · Leg 2 via {br.leg2.ota_source}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* AI Travel Watch Modal */}
      {showWatchModal && (
        <TravelWatchModal
          origin={origin}
          destination={destination}
          travelDate={date}
          onClose={() => setShowWatchModal(false)}
          onCreated={() => setShowWatchModal(false)}
        />
      )}
    </div>
  );
}
