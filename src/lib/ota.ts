import type { BusListingWithRoute } from './types';

export interface OtaAdapter {
  id: string;
  name: string;
  generateUrl: (origin: string, destination: string, travelDate: string) => string;
}

type OtaId = 'redBus' | 'MakeMyTrip' | 'AbhiBus' | 'TravelYaari' | 'EaseMyTrip' | 'PaytmBus';

// Fallback slugify for any city not present in an OTA-specific map.
function slugify(city: string): string {
  if (!city || city === 'undefined') return 'visakhapatnam';
  return city
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

// Canonical city-slug map used as the base for every OTA. Individual OTAs override
// the handful of cities where their route URLs use a different spelling (see below).
const BASE_CITY_SLUGS: Record<string, string> = {
  Visakhapatnam: 'visakhapatnam',
  Hyderabad: 'hyderabad',
  Vijayawada: 'vijayawada',
  Chennai: 'chennai',
  Bengaluru: 'bengaluru',
  Tirupati: 'tirupati',
  Guntur: 'guntur',
  Rajahmundry: 'rajahmundry',
  Kakinada: 'kakinada',
  Nellore: 'nellore',
  Kurnool: 'kurnool',
  Anantapur: 'anantapur',
  Warangal: 'warangal',
  Karimnagar: 'karimnagar',
  Mumbai: 'mumbai',
  Pune: 'pune',
  Delhi: 'delhi',
  Kolkata: 'kolkata',
  Kochi: 'kochi',
  Coimbatore: 'coimbatore',
  Madurai: 'madurai',
  Mysuru: 'mysuru',
};

// redBus route URLs use a couple of legacy city spellings.
const REDBUS_OVERRIDES: Record<string, string> = {
  Bengaluru: 'bangalore',
  Mysuru: 'mysore',
  Delhi: 'delhi',
};

// MakeMyTrip / EaseMyTrip route pages also use "bangalore".
const BANGALORE_OVERRIDE: Record<string, string> = {
  Bengaluru: 'bangalore',
  Mysuru: 'mysore',
};

function otaSlug(city: string, overrides: Record<string, string> = {}): string {
  return overrides[city] || BASE_CITY_SLUGS[city] || slugify(city);
}

export function parseDateComponents(dateStr: string): {
  day: string;
  monthName: string;
  monthNum: string;
  year: string;
} {
  if (!dateStr || dateStr === 'undefined') {
    dateStr = new Date().toISOString().split('T')[0];
  }
  const parts = dateStr.split('-');
  const year = parts[0] || String(new Date().getFullYear());
  let monthNum = parts[1] || '08';
  let day = parts[2] || '19';

  day = day.padStart(2, '0');
  monthNum = monthNum.padStart(2, '0');

  const monthIdx = Math.max(0, Math.min(11, parseInt(monthNum, 10) - 1));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx];

  return { day, monthName, monthNum, year };
}

// Universal OTA Adapter Architecture. Every adapter produces a pre-filled route/search
// URL carrying origin, destination and travel date so the OTA opens ready to book.
export const OTA_ADAPTERS: Record<OtaId, OtaAdapter> = {
  redBus: {
    id: 'redBus',
    name: 'redBus',
    // https://www.redbus.in/bus-tickets/<from>-to-<to>?onward=DD-Mmm-YYYY
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin, REDBUS_OVERRIDES);
      const to = otaSlug(destination, REDBUS_OVERRIDES);
      const { day, monthName, year } = parseDateComponents(dateStr);
      const params = new URLSearchParams({
        fromCityName: origin,
        toCityName: destination,
        onward: `${day}-${monthName}-${year}`,
      });
      return `https://www.redbus.in/bus-tickets/${from}-to-${to}?${params.toString()}`;
    },
  },
  MakeMyTrip: {
    id: 'MakeMyTrip',
    name: 'MakeMyTrip',
    // https://www.makemytrip.com/bus/search/<From>/<To>/DD-MM-YYYY
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin, BANGALORE_OVERRIDE);
      const to = otaSlug(destination, BANGALORE_OVERRIDE);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.makemytrip.com/bus/search/${from}/${to}/${day}-${monthNum}-${year}`;
    },
  },
  AbhiBus: {
    id: 'AbhiBus',
    name: 'AbhiBus',
    // https://www.abhibus.com/bus_search/<From>/<To>/DD-Mmm-YYYY/O
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin);
      const to = otaSlug(destination);
      const { day, monthName, year } = parseDateComponents(dateStr);
      return `https://www.abhibus.com/bus_search/${from}/${to}/${day}-${monthName}-${year}/O`;
    },
  },
  TravelYaari: {
    id: 'TravelYaari',
    name: 'Travel Yaari',
    // https://www.travelyaari.com/bus-tickets/<from>-to-<to>?doj=DD-MM-YYYY
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin);
      const to = otaSlug(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.travelyaari.com/bus-tickets/${from}-to-${to}?doj=${day}-${monthNum}-${year}`;
    },
  },
  EaseMyTrip: {
    id: 'EaseMyTrip',
    name: 'EaseMyTrip',
    // https://bus.easemytrip.com/bus/<from>-to-<to>?date=YYYY-MM-DD
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin, BANGALORE_OVERRIDE);
      const to = otaSlug(destination, BANGALORE_OVERRIDE);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://bus.easemytrip.com/bus/${from}-to-${to}?date=${year}-${monthNum}-${day}`;
    },
  },
  PaytmBus: {
    id: 'PaytmBus',
    name: 'Paytm Bus',
    // https://tickets.paytm.com/bus/search/<from>/<to>/YYYY-MM-DD
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin);
      const to = otaSlug(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://tickets.paytm.com/bus/search/${from}/${to}/${year}-${monthNum}-${day}`;
    },
  },
};

interface DeepLinkListing {
  ota_source?: string;
  travel_date?: string;
  origin?: string;
  origin_city?: string;
  destination?: string;
  destination_city?: string;
  routes?: { origin_city?: string; destination_city?: string } | null;
}

export function buildOtaDeepLink(
  listing: BusListingWithRoute | DeepLinkListing,
  overrideOrigin?: string,
  overrideDestination?: string,
  overrideDate?: string
): string {
  const l = listing as DeepLinkListing;

  const rawOrigin =
    overrideOrigin ||
    l.routes?.origin_city ||
    l.origin_city ||
    l.origin ||
    'Visakhapatnam';

  let rawDestination =
    overrideDestination ||
    l.routes?.destination_city ||
    l.destination_city ||
    l.destination ||
    'Hyderabad';

  // Prevent same city pair from breaking the search.
  if (rawOrigin.toLowerCase() === rawDestination.toLowerCase()) {
    rawDestination = rawOrigin.toLowerCase() === 'visakhapatnam' ? 'Hyderabad' : 'Visakhapatnam';
  }

  const travelDate = overrideDate || l.travel_date || new Date().toISOString().split('T')[0];

  const otaSource = (l.ota_source as OtaId) || 'redBus';
  const adapter = OTA_ADAPTERS[otaSource] || OTA_ADAPTERS.redBus;

  return adapter.generateUrl(rawOrigin, rawDestination, travelDate);
}

export const OTA_NAMES: Record<string, string> = {
  redBus: 'redBus',
  MakeMyTrip: 'MakeMyTrip',
  AbhiBus: 'AbhiBus',
  TravelYaari: 'Travel Yaari',
  EaseMyTrip: 'EaseMyTrip',
  PaytmBus: 'Paytm Bus',
};

export const OTA_LIST = Object.keys(OTA_ADAPTERS);
