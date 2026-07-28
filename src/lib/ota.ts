import type { BusListingWithRoute } from './types';

function slugify(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-');
}

function formatRedBusDate(dateStr: string): string {
  // Converts YYYY-MM-DD -> DD-MMM-YYYY (e.g. 2026-07-28 -> 28-Jul-2026)
  const dateObj = new Date(dateStr);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[dateObj.getMonth()] || 'Jul';
  const year = dateObj.getFullYear();
  return `${day}-${month}-${year}`;
}

export function buildOtaDeepLink(listing: BusListingWithRoute): string {
  const origin = slugify(listing.routes.origin_city);
  const destination = slugify(listing.routes.destination_city);
  const travelDate = listing.travel_date;
  const redBusDate = formatRedBusDate(travelDate);

  switch (listing.ota_source) {
    case 'redBus':
      return `https://www.redbus.in/bus-tickets/${origin}-to-${destination}?date=${redBusDate}`;
    case 'MakeMyTrip':
      return `https://www.makemytrip.com/bus/search/${listing.routes.origin_city}/${listing.routes.destination_city}/${travelDate}`;
    case 'AbhiBus':
      return `https://www.abhibus.com/bus-booking/${origin}-to-${destination}?date=${travelDate}`;
    case 'TravelYaari':
      return `https://www.travelyaari.com/bus-search?from=${origin}&to=${destination}&date=${travelDate}`;
    case 'EaseMyTrip':
      return `https://www.easemytrip.com/bus-booking/${origin}-to-${destination}?date=${travelDate}`;
    case 'PaytmBus':
      return `https://paytm.com/bus-tickets/${origin}-to-${destination}?date=${travelDate}`;
    default:
      return `https://www.redbus.in/bus-tickets/${origin}-to-${destination}?date=${redBusDate}`;
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
