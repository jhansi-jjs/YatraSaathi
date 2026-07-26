import type { BusListingWithRoute } from './types';

function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-');
}

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, '');
}

export function buildOtaDeepLink(listing: BusListingWithRoute): string {
  const origin = slugify(listing.routes.origin_city);
  const destination = slugify(listing.routes.destination_city);
  const date = formatDate(listing.travel_date);
  const route = `${origin}-to-${destination}`;

  switch (listing.ota_source) {
    case 'redBus':
      return `https://www.redbus.in/bus-tickets/${route}?date=${date}`;
    case 'MakeMyTrip':
      return `https://www.makemytrip.com/bus/search/${origin}-${destination}-${date}`;
    case 'AbhiBus':
      return `https://www.abhibus.com/bus-booking/${route}.html`;
    case 'TravelYaari':
      return `https://www.travelyaari.com/bus-booking/${route}`;
    case 'EaseMyTrip':
      return `https://www.easemytrip.com/bus/${route}`;
    case 'PaytmBus':
      return `https://paytm.com/bus-tickets/${route}?date=${date}`;
    default:
      return listing.deep_link_url;
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
