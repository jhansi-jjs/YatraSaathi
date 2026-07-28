import type { BusListingWithRoute } from './types';

function slugify(city: string): string {
  if (!city || city === 'undefined') return 'visakhapatnam';
  return city.toLowerCase().trim().replace(/\s+/g, '-');
}

function formatRedBusDate(dateStr: string): string {
  if (!dateStr || dateStr === 'undefined') {
    dateStr = new Date().toISOString().split('T')[0];
  }
  const dateObj = new Date(dateStr);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()] || 'Jul';
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

export function buildOtaDeepLink(
  listing: BusListingWithRoute | any,
  overrideOrigin?: string,
  overrideDestination?: string,
  overrideDate?: string
): string {
  const rawOrigin =
    overrideOrigin ||
    listing.routes?.origin_city ||
    listing.origin_city ||
    listing.origin ||
    'Visakhapatnam';

  const rawDestination =
    overrideDestination ||
    listing.routes?.destination_city ||
    listing.destination_city ||
    listing.destination ||
    'Hyderabad';

  const travelDate =
    overrideDate ||
    listing.travel_date ||
    new Date().toISOString().split('T')[0];

  const originSlug = slugify(rawOrigin);
  const destSlug = slugify(rawDestination);
  const redBusDate = formatRedBusDate(travelDate);

  switch (listing.ota_source) {
    case 'redBus':
      return `https://www.redbus.in/bus-tickets/${originSlug}-to-${destSlug}?date=${redBusDate}`;
    case 'MakeMyTrip':
      return `https://www.makemytrip.com/bus/search/${encodeURIComponent(rawOrigin)}/${encodeURIComponent(rawDestination)}/${travelDate}`;
    case 'AbhiBus':
      return `https://www.abhibus.com/bus-ticket-booking/${originSlug}-to-${destSlug}?journeyDate=${travelDate}`;
    case 'TravelYaari':
      return `https://www.travelyaari.com/bus-search?from=${originSlug}&to=${destSlug}&date=${travelDate}`;
    case 'EaseMyTrip':
      return `https://www.easemytrip.com/bus/${originSlug}-to-${destSlug}.html`;
    case 'PaytmBus':
      return `https://paytm.com/bus-tickets/${originSlug}-to-${destSlug}?date=${travelDate}`;
    default:
      return `https://www.redbus.in/bus-tickets/${originSlug}-to-${destSlug}?date=${redBusDate}`;
  }
}

export const OTA_NAMES: Record<string, string> = {
  redBus: 'redBus',
  MakeMyTrip: 'MakeMyTrip',
  AbhiBus: 'AbhiBus',
  TravelYaari: 'Travel Yaari',
  EaseMyTrip: 'EaseMyTrip',
  PaytmBus: 'Paytm Bus',
};

export const OTA_LIST = ['redBus', 'MakeMyTrip', 'AbhiBus', 'TravelYaari', 'EaseMyTrip', 'PaytmBus'];
