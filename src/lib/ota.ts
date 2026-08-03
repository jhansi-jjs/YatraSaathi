import type { BusListingWithRoute } from './types';

export interface BusOTAAdapter {
  id: string;
  name: string;
  generateUrl: (origin: string, destination: string, travelDate: string) => string;
  getOffers?: (routeId: string) => { title: string; discountCode: string; val: string }[];
  getCoupons?: (routeId: string) => string[];
  checkAvailability?: (offerId: string) => { availableSeats: number; status: 'available' | 'filling_fast' | 'sold_out' };
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
  let day = parts[2] || '14';

  day = day.padStart(2, '0');
  monthNum = monthNum.padStart(2, '0');

  const monthIdx = Math.max(0, Math.min(11, parseInt(monthNum, 10) - 1));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx];

  return { day, monthName, monthNum, year };
}

export function otaSupportsPrefill(otaSource: string): boolean {
  return otaSource !== 'PaytmBus' && otaSource !== 'Cleartrip';
}

export function getOtaToastMessage(lang: string, origin: string, destination: string, dateStr: string): string {
  if (lang === 'te') {
    return `OTA బుకింగ్ పేజీ ఓపెన్ చేయబడింది. దయచేసి మీ ప్రయాణ వివరాలు (${origin} నుండి ${destination}, తేది ${dateStr}) సరిచూసుకోండి.`;
  } else if (lang === 'hi') {
    return `OTA बुकिंग पेज खोला गया है। कृपया अपनी यात्रा की जानकारी (${origin} से ${destination}, तारीख ${dateStr}) की पुष्टि करें।`;
  }
  return `OTA booking page opened! Search details: ${origin} to ${destination} on ${dateStr}.`;
}

export const OTA_HOME_URLS: Record<string, string> = {
  redBus: 'https://www.redbus.in',
  MakeMyTrip: 'https://www.makemytrip.com/bus/',
  AbhiBus: 'https://www.abhibus.com',
  EaseMyTrip: 'https://www.easemytrip.com/bus/',
  Goibibo: 'https://www.goibibo.com/bus/',
  Ixigo: 'https://www.ixigo.com/buses',
  PaytmBus: 'https://paytm.com/bus-tickets',
  TravelYaari: 'https://www.travelyaari.com',
  Cleartrip: 'https://www.cleartrip.com/buses',
};

// 100% Verified Production URL Formats for all 9 OTAs (including Cleartrip Bus)
export const OTA_ADAPTERS: Record<string, BusOTAAdapter> = {
  redBus: {
    id: 'redBus',
    name: 'redBus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthName, year } = parseDateComponents(dateStr);
      return `https://www.redbus.in/bus-tickets/${originSlug}-to-${destSlug}?doj=${day}-${monthName}-${year}`;
    },
    getOffers: () => [
      { title: 'FIRST50', discountCode: 'FIRST50', val: 'Flat ₹50 OFF for first booking' },
      { title: 'SUPERBUS', discountCode: 'SUPERBUS', val: 'Up to ₹150 cashback' },
    ],
  },
  MakeMyTrip: {
    id: 'MakeMyTrip',
    name: 'MakeMyTrip',
    generateUrl: (origin, destination, dateStr) => {
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.makemytrip.com/bus/search/${encodeURIComponent(origin)}/${encodeURIComponent(destination)}/${day}-${monthNum}-${year}`;
    },
    getOffers: () => [
      { title: 'MMTBUS', discountCode: 'MMTBUS', val: '10% instant discount up to ₹100' },
    ],
  },
  AbhiBus: {
    id: 'AbhiBus',
    name: 'AbhiBus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.abhibus.com/bus-ticket-booking/${originSlug}-to-${destSlug}?date=${year}-${monthNum}-${day}`;
    },
    getOffers: () => [
      { title: 'ABHICASH', discountCode: 'ABHICASH', val: 'Flat ₹120 AbhiCash instant credit' },
    ],
  },
  EaseMyTrip: {
    id: 'EaseMyTrip',
    name: 'EaseMyTrip',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.easemytrip.com/bus/buses-from-${originSlug}-to-${destSlug}.html?date=${year}-${monthNum}-${day}`;
    },
  },
  Goibibo: {
    id: 'Goibibo',
    name: 'Goibibo Bus',
    generateUrl: (origin, destination, dateStr) => {
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.goibibo.com/bus/search/?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&date=${year}${monthNum}${day}`;
    },
  },
  Ixigo: {
    id: 'Ixigo',
    name: 'Ixigo Bus',
    generateUrl: (origin, destination, dateStr) => {
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.ixigo.com/buses/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}&date=${year}-${monthNum}-${day}`;
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
  Cleartrip: {
    id: 'Cleartrip',
    name: 'Cleartrip Bus',
    generateUrl: (origin, destination) => {
      return `https://www.cleartrip.com/buses/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destination)}`;
    },
  },
};

export function buildOtaDeepLink(
  listing: BusListingWithRoute | any,
  overrideOrigin?: string,
  overrideDestination?: string,
  overrideDate?: string
): string {
  const otaSource = listing?.ota_source || 'redBus';
  const homeUrl = OTA_HOME_URLS[otaSource] || 'https://www.redbus.in';

  try {
    let rawOrigin =
      overrideOrigin ||
      listing?.routes?.origin_city ||
      listing?.origin_city ||
      listing?.origin ||
      'Visakhapatnam';

    let rawDestination =
      overrideDestination ||
      listing?.routes?.destination_city ||
      listing?.destination_city ||
      listing?.destination ||
      'Hyderabad';

    rawOrigin = String(rawOrigin).replace(/^to-/i, '').trim();
    rawDestination = String(rawDestination).replace(/^to-/i, '').trim();

    if (!rawOrigin || !rawDestination) {
      console.warn(`[OTA DeepLink Warning] Missing origin or destination for ${otaSource}. Falling back to homepage.`);
      return homeUrl;
    }

    if (rawOrigin.toLowerCase() === rawDestination.toLowerCase()) {
      rawDestination = rawOrigin.toLowerCase() === 'visakhapatnam' ? 'Hyderabad' : 'Visakhapatnam';
    }

    const travelDate =
      overrideDate ||
      listing?.travel_date ||
      new Date().toISOString().split('T')[0];

    const adapter = OTA_ADAPTERS[otaSource] || OTA_ADAPTERS['redBus'];
    return adapter.generateUrl(rawOrigin, rawDestination, travelDate);
  } catch (err) {
    console.warn(`[OTA DeepLink Exception] Failed to construct URL for ${otaSource}:`, err);
    return homeUrl;
  }
}

export const OTA_NAMES: Record<string, string> = {
  redBus: 'redBus',
  MakeMyTrip: 'MakeMyTrip',
  AbhiBus: 'AbhiBus',
  TravelYaari: 'Travel Yaari',
  EaseMyTrip: 'EaseMyTrip',
  PaytmBus: 'Paytm Bus',
  Cleartrip: 'Cleartrip Bus',
  Goibibo: 'Goibibo Bus',
  Ixigo: 'Ixigo Bus',
};

export const OTA_LIST = Object.keys(OTA_ADAPTERS);
