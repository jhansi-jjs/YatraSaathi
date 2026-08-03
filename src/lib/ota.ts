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
  let day = parts[2] || '19';

  day = day.padStart(2, '0');
  monthNum = monthNum.padStart(2, '0');

  const monthIdx = Math.max(0, Math.min(11, parseInt(monthNum, 10) - 1));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx];

  return { day, monthName, monthNum, year };
}

export function otaSupportsPrefill(otaSource: string): boolean {
  return otaSource !== 'PaytmBus';
}

export function getOtaToastMessage(lang: string, origin: string, destination: string, dateStr: string): string {
  if (lang === 'te') {
    return `Paytm Bus URL ఓపెన్ చేయబడింది. దయచేసి Paytm లో మీ ప్రయాణ వివరాలు (${origin} నుండి ${destination}, తేది ${dateStr}) ఎంటర్ చేయండి.`;
  } else if (lang === 'hi') {
    return `Paytm Bus खोला गया है। कृपया Paytm पर अपनी यात्रा की जानकारी (${origin} से ${destination}, तारीख ${dateStr}) दर्ज करें।`;
  }
  return `Paytm Bus opened! Please enter ${origin} to ${destination} for ${dateStr} on Paytm to complete booking.`;
}

// Extensible Standardized BusOTAAdapter Architecture supporting redBus, MMT, AbhiBus, TravelYaari, EaseMyTrip, PaytmBus, Cleartrip, Goibibo, Ixigo
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
      return `https://www.abhibus.com/bus-tickets/${originSlug}-to-${destSlug}?date=${year}-${monthNum}-${day}`;
    },
    getOffers: () => [
      { title: 'ABHICASH', discountCode: 'ABHICASH', val: 'Flat ₹120 AbhiCash instant credit' },
    ],
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
  Cleartrip: {
    id: 'Cleartrip',
    name: 'Cleartrip Bus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.cleartrip.com/buses/${originSlug}-to-${destSlug}?date=${year}-${monthNum}-${day}`;
    },
  },
  Goibibo: {
    id: 'Goibibo',
    name: 'Goibibo Bus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.goibibo.com/bus/${originSlug}-to-${destSlug}-bus-ticket-booking/?date=${year}${monthNum}${day}`;
    },
  },
  Ixigo: {
    id: 'Ixigo',
    name: 'Ixigo Bus',
    generateUrl: (origin, destination, dateStr) => {
      const originSlug = slugify(origin);
      const destSlug = slugify(destination);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.ixigo.com/buses/${originSlug}-to-${destSlug}-bus-booking?date=${year}-${monthNum}-${day}`;
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
  Cleartrip: 'Cleartrip Bus',
  Goibibo: 'Goibibo Bus',
  Ixigo: 'Ixigo Bus',
};

export const OTA_LIST = Object.keys(OTA_ADAPTERS);
