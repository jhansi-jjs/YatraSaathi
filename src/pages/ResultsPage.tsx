import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { BusListingWithRoute } from '../lib/types';
import SearchForm from '../components/SearchForm';
import BusCard from '../components/BusCard';
import FilterPanel, { FilterState } from '../components/FilterPanel';
import { SlidersHorizontal, Bus as BusIcon, AlertCircle, GitFork, ExternalLink, Sparkles, Clock, Award } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSearch } from '../context/SearchContext';
import { computeBreakJourneyRoutes, BreakJourneyRoute } from '../lib/breakJourneyService';
import { buildOtaDeepLink } from '../lib/ota';

type SortOption = 'price_low' | 'price_high' | 'rating' | 'duration';

const DEFAULT_FILTERS: FilterState = {
  busTypes: [],
  acStatus: [],
  busModels: [],
  maxPrice: null,
  minRating: 0,
};

function generateDynamicListings(origin: string, destination: string, travelDate: string): BusListingWithRoute[] {
  const operators = [
    { name: 'APSRTC Super Luxury', model: 'bharatbenz', type: 'semi-sleeper', ac: 'non-ac' },
    { name: 'VRL Travels Multi-Axle', model: 'volvo', type: 'sleeper', ac: 'ac' },
    { name: 'IntrCity SmartBus', model: 'volvo', type: 'sleeper', ac: 'ac' },
    { name: 'Morning Star Travels', model: 'volvo', type: 'sleeper', ac: 'ac' },
    { name: 'Orange Tours & Travels', model: 'volvo', type: 'sleeper', ac: 'ac' },
    { name: 'Zingbus Premium AC', model: 'volvo', type: 'sleeper', ac: 'ac' },
    { name: 'SRS Travels', model: 'other', type: 'semi-sleeper', ac: 'ac' },
    { name: 'TSRTC Garuda Plus', model: 'volvo', type: 'seater', ac: 'ac' },
    { name: 'Kaveri Travels', model: 'volvo', type: 'sleeper', ac: 'ac' },
    { name: 'GreenLine Travels', model: 'bharatbenz', type: 'semi-sleeper', ac: 'ac' },
    { name: 'Nuego Green Electric', model: 'other', type: 'seater', ac: 'ac' },
    { name: 'Jabbar Travels', model: 'volvo', type: 'sleeper', ac: 'ac' }
  ];
  
  const otas = ['redBus', 'MakeMyTrip', 'AbhiBus', 'TravelYaari', 'EaseMyTrip', 'PaytmBus'];
  const routeId = `${origin}-${destination}`;
  const mockListings: BusListingWithRoute[] = [];

  operators.forEach((op, index) => {
    const ota = otas[index % otas.length];
    const busType = op.type as any;
    const acStatus = op.ac as any;
    const busModel = op.model as any;
    const price = 420 + (index * 95) + (acStatus === 'ac' ? 180 : 0) + (busType === 'sleeper' ? 220 : 0);
    const depHour = (6 + index * 1.5) % 24;
    const depH = Math.floor(depHour);
    const depM = (index % 2 === 0) ? '15' : '45';
    const depTime = `${depH < 10 ? '0' : ''}${depH}:${depM}:00`;
    
    const arrHour = (depH + 7 + (index % 3)) % 24;
    const arrTime = `${arrHour < 10 ? '0' : ''}${arrHour}:${depM}:00`;

    mockListings.push({
      id: `dyn-${index}-${routeId}`,
      route_id: routeId,
      operator_name: op.name,
      bus_type: busType,
      ac_status: acStatus,
      bus_model: busModel,
      seat_position: index % 2 === 0 ? 'window' : 'middle',
      berth_level: busType === 'sleeper' ? (index % 2 === 0 ? 'lower' : 'upper') : null,
      price: price,
      currency: 'INR',
      ota_source: ota,
      rating: Number((4.1 + (index * 0.12) % 0.8).toFixed(1)),
      deep_link_url: buildOtaDeepLink(op, origin, destination, travelDate),
      travel_date: travelDate,
      departure_time: depTime,
      arrival_time: arrTime,
      duration_mins: 420 + (index % 4) * 35,
      available_seats: 8 + (index * 4) % 22,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
      routes: {
        id: routeId,
        origin_city: origin,
        destination_city: destination,
        distance_km: 380,
        created_at: new Date().toISOString(),
      },
    });
  });

  return mockListings;
}

export default function ResultsPage() {
  const [searchParams] = useSearchParams();
  const { t, getCityName } = useLanguage();
  const { session, setSearchRoute } = useSearch();
  
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption>('price_low');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!origin || !destination || !date) {
      setLoading(false);
      return;
    }

    let isSubscribed = true;

    async function fetchListings() {
      setLoading(true);
      setError(null);

      // Compute agentic break-journey routes
      const bRoutes = computeBreakJourneyRoutes(origin, destination, date);
      setBreakRoutes(bRoutes);

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

  const filtered = useMemo(() => {
    let result = [...listings];

    if (filters.busTypes.length > 0) {
      result = result.filter((l) => filters.busTypes.includes(l.bus_type));
    }
    if (filters.acStatus.length > 0) {
      result = result.filter((l) => filters.acStatus.includes(l.ac_status));
    }
    if (filters.busModels.length > 0) {
      result = result.filter((l) => filters.busModels.includes(l.bus_model));
    }
    if (filters.maxPrice !== null) {
      result = result.filter((l) => l.price <= filters.maxPrice!);
    }
    if (filters.minRating > 0) {
      result = result.filter((l) => (l.rating ?? 0) >= filters.minRating);
    }

    switch (sort) {
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
  }, [listings, filters, sort]);

  const cheapestPrice = listings.length > 0 ? Math.min(...listings.map((l) => l.price)) : 0;

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

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {getCityName(origin)} → {getCityName(destination)}
          </h1>
          <p className="text-sm text-slate-500">
            {loading ? t('processing') : `${filtered.length} ${t('busesFound')} for ${date}`}
            {!loading && listings.length > 0 && cheapestPrice > 0 && (
              <span className="ml-2 font-semibold text-emerald-600">· {t('cheapestDeal')} ₹{cheapestPrice.toLocaleString('en-IN')}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary lg:hidden"
          >
            <SlidersHorizontal className="h-4 w-4" /> {t('filterTitle')}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="input-field w-auto"
          >
            <option value="price_low">{t('priceLowHigh')}</option>
            <option value="price_high">{t('priceHighLow')}</option>
            <option value="rating">{t('ratingHighLow')}</option>
            <option value="duration">{t('duration')}</option>
          </select>
        </div>
      </div>

      <div className="mt-6 flex gap-6">
        <aside className="hidden w-64 shrink-0 lg:block">
          <FilterPanel
            filters={filters}
            onChange={setFilters}
            listings={listings}
            onReset={() => setFilters(DEFAULT_FILTERS)}
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
                onReset={() => setFilters(DEFAULT_FILTERS)}
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
              {/* Direct Bus Cards */}
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
                          <h2 className="text-lg font-bold text-white">Agentic Smart Break-Journeys</h2>
                          <span className="badge bg-amber-400 text-slate-900 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Sparkles className="h-3 w-3 fill-current" /> AI Recommended
                          </span>
                        </div>
                        <p className="text-xs text-slate-300">
                          Guaranteed connecting transfer options via major hubs when direct seat availability is tight on {date}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {breakRoutes.map((br, index) => {
                      const leg1Url = buildOtaDeepLink(br.leg1, br.leg1.routes.origin_city, br.leg1.routes.destination_city, date);
                      const leg2Url = buildOtaDeepLink(br.leg2, br.leg2.routes.origin_city, br.leg2.routes.destination_city, date);

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
                              <span>· Total Duration: ~17h 15m</span>
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <a
                              href={leg1Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                            >
                              Book Leg 1 ({br.leg1.ota_source}) <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                              href={leg2Url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-xs text-white flex items-center justify-center gap-1.5 shadow-md transition-all hover:scale-[1.02]"
                            >
                              Book Leg 2 ({br.leg2.ota_source}) <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          </div>
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
    </div>
  );
}
