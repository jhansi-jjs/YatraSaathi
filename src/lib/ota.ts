import type { BusListingWithRoute } from './types';

export interface OtaAdapter {
  id: string;
  name: string;
  generateUrl: (origin: string, destination: string, travelDate: string) => string;
}

function slugify(city: string): string {
  if (!city || city === 'undefined') return 'visakhapatnam';
  return city.toLowerCase().trim().replace(/\s+/g, '-');
}

export function parseDateComponents(dateStr: string): { day: string; monthName: string; monthNum: string; year: string } {
  if (!dateStr || dateStr === 'undefined') {
    dateStr = new Date().toISOString().split('T')[0];
  }
  const parts = dateStr.split('-');
  let year = parts[0] || '2026';
  let monthNum = parts[1] || '08';
  let day = parts[2] || '19';

  day = day.padStart(2, '0');
  monthNum = monthNum.padStart(2, '0');

  const monthIdx = Math.max(0, Math.min(11, parseInt(monthNum, 10) - 1));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx];

  return { day, monthName, monthNum, year };
}

// OTA Adapter Architecture supporting arbitrary OTA providers
export const OTA_ADAPTERS: Record<string, OtaAdapter> = {
  redBus: {
    id: 'redBus',
    name: 'redBus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthName, year } = parseDateComponents(dateStr);
      return `https://www.redbus.in/bus-tickets/${originSlug}-to-${destSlug}?doj=${day}-${monthName}-${year}`;
    },
  },
  MakeMyTrip: {
    id: 'MakeMyTrip',
    name: 'MakeMyTrip',
    generateUrl: (origin, destination, dateStr) => {
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.makemytrip.com/bus/search/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/${day}-${monthNum}-${year}`;
    },
  },
  AbhiBus: {
    id: 'AbhiBus',
    name: 'AbhiBus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.abhibus.com/bus-tickets/${originSlug}-to-${destSlug}?date=${year}-${monthNum}-${day}`;
    },
  },
  TravelYaari: {
    id: 'TravelYaari',
    name: 'Travel Yaari',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.travelyaari.com/search/${originSlug}-to-${destSlug}?departDate=${day}-${monthNum}-${year}`;
    },
  },
  EaseMyTrip: {
    id: 'EaseMyTrip',
    name: 'EaseMyTrip',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.easemytrip.com/bus/${originSlug}-to-${destSlug}.html?date=${year}-${monthNum}-${day}`;
    },
  },
  PaytmBus: {
    id: 'PaytmBus',
    name: 'Paytm Bus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://paytm.com/bus-tickets/${originSlug}-to-${destSlug}?date=${year}-${monthNum}-${day}`;
    },
  },
};

export function buildOtaDeepLink(
  listing: BusListingWithRoute | any,
  overrideOrigin?: string,
  overrideDestination?: string,
  overrideDate?: string
): string {
  let rawOrigin =
    overrideOrigin ||
    listing.routes?.origin_city ||
    listing.origin_city ||
    listing.origin ||
    'Visakhapatnam';

  let rawDestination =
    overrideDestination ||
    listing.routes?.destination_city ||
    listing.destination_city ||
    listing.destination ||
    'Hyderabad';

  // Prevent same city pair from breaking search
  if (rawOrigin.toLowerCase() === rawDestination.toLowerCase()) {
    rawDestination = rawOrigin.toLowerCase() === 'visakhapatnam' ? 'Hyderabad' : 'Visakhapatnam';
  }

  const travelDate =
    overrideDate ||
    listing.travel_date ||
    new Date().toISOString().split('T')[0];

  const otaSource = listing.ota_source || 'redBus';
  const adapter = OTA_ADAPTERS[otaSource] || OTA_ADAPTERS['redBus'];

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
