// Bus listing generation + filtering, lifted out of ResultsPage so the voice
// assistant and the chatbot can answer questions about the SAME result set the
// results page will show.
//
// ISSUE 1(c)/(d): the assistant has to say "…— 4 buses found" and, when a filter
// combination matches nothing, offer the nearest relaxation. Both need the real
// listings, not a guess, so the generator and the filter predicate live here and are
// imported by every caller.

import type { BusListingWithRoute } from './types';
import { buildOtaDeepLink } from './ota';
import { describeFilters, EMPTY_FILTERS, type VoiceFilters } from './filterExtraction';

export interface ResultFilterState {
  busTypes: string[];
  acStatus: string[];
  busModels: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number;
}

export const DEFAULT_RESULT_FILTERS: ResultFilterState = {
  busTypes: [],
  acStatus: [],
  busModels: [],
  minPrice: null,
  maxPrice: null,
  minRating: 0,
};

const OPERATORS = [
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
  { name: 'Jabbar Travels', model: 'volvo', type: 'sleeper', ac: 'ac' },
];

// Must stay in step with OTA_ADAPTERS in ota.ts, so every generated listing has a
// working deep link.
const OTAS = [
  'redBus', 'MakeMyTrip', 'AbhiBus', 'TravelYaari', 'EaseMyTrip',
  'PaytmBus', 'Cleartrip', 'Goibibo', 'Ixigo',
];

/**
 * Deterministic demo inventory for a route/date. Deterministic matters: the count the
 * assistant quotes must equal the number of cards the results page then renders.
 */
export function generateDynamicListings(
  origin: string,
  destination: string,
  travelDate: string
): BusListingWithRoute[] {
  const routeId = `${origin}-${destination}`;
  const now = new Date().toISOString();

  return OPERATORS.map((op, index) => {
    const ota = OTAS[index % OTAS.length];
    const busType = op.type as BusListingWithRoute['bus_type'];
    const acStatus = op.ac as BusListingWithRoute['ac_status'];
    const busModel = op.model as BusListingWithRoute['bus_model'];
    const price = 420 + index * 95 + (acStatus === 'ac' ? 180 : 0) + (busType === 'sleeper' ? 220 : 0);

    const depHour = (6 + index * 1.5) % 24;
    const depH = Math.floor(depHour);
    const depM = index % 2 === 0 ? '15' : '45';
    const depTime = `${depH < 10 ? '0' : ''}${depH}:${depM}:00`;
    const arrHour = (depH + 7 + (index % 3)) % 24;
    const arrTime = `${arrHour < 10 ? '0' : ''}${arrHour}:${depM}:00`;

    return {
      id: `dyn-${index}-${routeId}`,
      route_id: routeId,
      operator_name: op.name,
      bus_type: busType,
      ac_status: acStatus,
      bus_model: busModel,
      seat_position: index % 2 === 0 ? 'window' : 'middle',
      berth_level: busType === 'sleeper' ? (index % 2 === 0 ? 'lower' : 'upper') : null,
      price,
      currency: 'INR',
      ota_source: ota,
      rating: Number((4.1 + ((index * 0.12) % 0.8)).toFixed(1)),
      deep_link_url: buildOtaDeepLink({ ota_source: ota }, origin, destination, travelDate),
      travel_date: travelDate,
      departure_time: depTime,
      arrival_time: arrTime,
      duration_mins: 420 + (index % 4) * 35,
      available_seats: 8 + ((index * 4) % 22),
      last_updated: now,
      created_at: now,
      routes: {
        id: routeId,
        origin_city: origin,
        destination_city: destination,
        distance_km: 380,
        created_at: now,
      },
    } as BusListingWithRoute;
  });
}

export function applyResultFilters(
  listings: BusListingWithRoute[],
  filters: ResultFilterState
): BusListingWithRoute[] {
  return listings.filter((l) => {
    if (filters.busTypes.length && !filters.busTypes.includes(l.bus_type)) return false;
    if (filters.acStatus.length && !filters.acStatus.includes(l.ac_status)) return false;
    if (filters.busModels.length && !filters.busModels.includes(l.bus_model)) return false;
    if (filters.minPrice !== null && l.price < filters.minPrice) return false;
    if (filters.maxPrice !== null && l.price > filters.maxPrice) return false;
    if (filters.minRating > 0 && (l.rating ?? 0) < filters.minRating) return false;
    return true;
  });
}

/**
 * Folds spoken filters into the results page's filter state. Only fields the user
 * mentioned are replaced, so the panel keeps whatever the user set by hand.
 */
export function voiceFiltersToResultFilters(
  v: VoiceFilters,
  prev: ResultFilterState = DEFAULT_RESULT_FILTERS
): ResultFilterState {
  if (v.reset) return { ...DEFAULT_RESULT_FILTERS };
  return {
    busTypes: v.busTypes.length ? [...v.busTypes] : prev.busTypes,
    acStatus: v.acStatus.length ? [...v.acStatus] : prev.acStatus,
    busModels: v.busModels.length ? [...v.busModels] : prev.busModels,
    minPrice: v.minPrice !== null ? v.minPrice : prev.minPrice,
    maxPrice: v.maxPrice !== null ? v.maxPrice : prev.maxPrice,
    minRating: v.minRating !== null ? v.minRating : prev.minRating,
  };
}

/** Human-readable summary of the results-page filter state, in the user's language. */
export function describeResultFilters(f: ResultFilterState, lang: string): string {
  return describeFilters(
    {
      ...EMPTY_FILTERS,
      busTypes: f.busTypes,
      acStatus: f.acStatus,
      busModels: f.busModels,
      minPrice: f.minPrice,
      maxPrice: f.maxPrice,
      minRating: f.minRating > 0 ? f.minRating : null,
      amenities: [],
    },
    lang
  );
}

export function isFilterActive(f: ResultFilterState): boolean {
  return Boolean(
    f.busTypes.length ||
      f.acStatus.length ||
      f.busModels.length ||
      f.minPrice !== null ||
      f.maxPrice !== null ||
      f.minRating > 0
  );
}

export interface Relaxation {
  filters: ResultFilterState;
  count: number;
  /** Which constraint was loosened, as a short machine key the UI turns into text. */
  relaxed: 'model' | 'rating' | 'type' | 'ac' | 'price';
  /** Cheapest price available under the relaxed filter — used in the offer text. */
  samplePrice: number;
}

/**
 * ISSUE 1(d): when a filter combination matches nothing we must say so and offer the
 * nearest alternative ("no Volvo under ₹1500 — 3 AC Sleeper at ₹1650, show them?")
 * instead of silently falling back to the unfiltered list. Constraints are dropped
 * one at a time, cheapest-to-give-up first.
 */
export function suggestRelaxation(
  listings: BusListingWithRoute[],
  filters: ResultFilterState
): Relaxation | null {
  const attempts: { relaxed: Relaxation['relaxed']; next: ResultFilterState }[] = [];

  if (filters.busModels.length) attempts.push({ relaxed: 'model', next: { ...filters, busModels: [] } });
  if (filters.maxPrice !== null) {
    // Widen the ceiling by 25% rather than removing it — closer to what was asked for.
    attempts.push({
      relaxed: 'price',
      next: { ...filters, maxPrice: Math.round(filters.maxPrice * 1.25) },
    });
  }
  if (filters.minRating > 0) attempts.push({ relaxed: 'rating', next: { ...filters, minRating: 0 } });
  if (filters.busTypes.length) attempts.push({ relaxed: 'type', next: { ...filters, busTypes: [] } });
  if (filters.acStatus.length) attempts.push({ relaxed: 'ac', next: { ...filters, acStatus: [] } });

  for (const attempt of attempts) {
    const matched = applyResultFilters(listings, attempt.next);
    if (matched.length > 0) {
      return {
        filters: attempt.next,
        count: matched.length,
        relaxed: attempt.relaxed,
        samplePrice: Math.min(...matched.map((m) => m.price)),
      };
    }
  }

  // Last resort: drop everything but report honestly that nothing matched the ask.
  const all = applyResultFilters(listings, DEFAULT_RESULT_FILTERS);
  if (all.length > 0) {
    return {
      filters: { ...DEFAULT_RESULT_FILTERS },
      count: all.length,
      relaxed: 'price',
      samplePrice: Math.min(...all.map((m) => m.price)),
    };
  }
  return null;
}
