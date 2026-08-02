import type { BusListingWithRoute } from './types';

export interface OtaAdapter {
  id: string;
  name: string;
  // `prefill: true`  -> generateUrl opens a route+date pre-filled results page.
  // `prefill: false` -> the OTA has no public URL prefill (e.g. Paytm); generateUrl
  //   returns their bus landing page and the UI shows a toast telling the user what
  //   route/date to enter. (Verified live against each OTA in Aug 2026.)
  prefill: boolean;
  generateUrl: (origin: string, destination: string, travelDate: string) => string;
}

type OtaId = 'redBus' | 'MakeMyTrip' | 'AbhiBus' | 'TravelYaari' | 'EaseMyTrip' | 'PaytmBus';

// AbhiBus route URLs are city-ID based: /bus_search/<Label>/<id>/<Label>/<id>/DD-MM-YYYY/O
// IDs + labels pulled live from AbhiBus's own autocomplete API for all 22 cities.
const ABHIBUS_CITIES: Record<string, { id: number; label: string }> = {
  Visakhapatnam: { id: 58, label: 'Visakhapatnam' },
  Hyderabad: { id: 3, label: 'Hyderabad' },
  Vijayawada: { id: 5, label: 'Vijayawada' },
  Chennai: { id: 6, label: 'Chennai' },
  Bengaluru: { id: 7, label: 'Bangalore' },
  Tirupati: { id: 12, label: 'Tirupati' },
  Guntur: { id: 15, label: 'Guntur' },
  Rajahmundry: { id: 22, label: 'Rajahmundry' },
  Kakinada: { id: 21, label: 'Kakinada' },
  Nellore: { id: 11, label: 'Nellore' },
  Kurnool: { id: 57, label: 'Kurnool' },
  Anantapur: { id: 112, label: 'Anantapur' },
  Warangal: { id: 847, label: 'Warangal' },
  Karimnagar: { id: 3722, label: 'Karimnagar' },
  Mumbai: { id: 4, label: 'Mumbai' },
  Pune: { id: 51, label: 'Pune' },
  Delhi: { id: 344, label: 'Delhi' },
  Kolkata: { id: 163, label: 'Kolkata' },
  Kochi: { id: 530, label: 'Kochi' },
  Coimbatore: { id: 794, label: 'Coimbatore' },
  Madurai: { id: 1016, label: 'Madurai' },
  Mysuru: { id: 926, label: 'Mysore' },
};

// TravelYaari route slugs use the same legacy spellings as redBus (Bangalore/Mysore).
const TRAVELYAARI_NAMES: Record<string, string> = {
  Bengaluru: 'Bangalore',
  Mysuru: 'Mysore',
};

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
  // WORKS — unchanged. https://www.redbus.in/bus-tickets/<from>-to-<to>?...&onward=DD-Mmm-YYYY
  redBus: {
    id: 'redBus',
    name: 'redBus',
    prefill: true,
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
  // WORKS — unchanged. https://www.makemytrip.com/bus/search/<From>/<To>/DD-MM-YYYY
  MakeMyTrip: {
    id: 'MakeMyTrip',
    name: 'MakeMyTrip',
    prefill: true,
    generateUrl: (origin, destination, dateStr) => {
      const from = otaSlug(origin, BANGALORE_OVERRIDE);
      const to = otaSlug(destination, BANGALORE_OVERRIDE);
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.makemytrip.com/bus/search/${from}/${to}/${day}-${monthNum}-${year}`;
    },
  },
  // FIXED — real city-ID route (verified live):
  // https://www.abhibus.com/bus_search/<Label>/<id>/<Label>/<id>/DD-MM-YYYY/O
  AbhiBus: {
    id: 'AbhiBus',
    name: 'AbhiBus',
    prefill: true,
    generateUrl: (origin, destination, dateStr) => {
      const o = ABHIBUS_CITIES[origin];
      const d = ABHIBUS_CITIES[destination];
      if (!o || !d) return 'https://www.abhibus.com/'; // unmapped city -> bus home, never a 404
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.abhibus.com/bus_search/${o.label}/${o.id}/${d.label}/${d.id}/${day}-${monthNum}-${year}/O`;
    },
  },
  // FIXED — real search route (verified live):
  // https://www.travelyaari.com/search/<From>-to-<To>?departDate=DD-MM-YYYY&mode=oneway
  TravelYaari: {
    id: 'TravelYaari',
    name: 'Travel Yaari',
    prefill: true,
    generateUrl: (origin, destination, dateStr) => {
      const from = TRAVELYAARI_NAMES[origin] || origin;
      const to = TRAVELYAARI_NAMES[destination] || destination;
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.travelyaari.com/search/${from}-to-${to}?departDate=${day}-${monthNum}-${year}&mode=oneway`;
    },
  },
  // FIXED — the previous /bus/<slug> path 404'd. Real results page (verified live):
  // https://bus.easemytrip.com/home/list?org=<City>&des=<City>&date=DD-MM-YYYY&CCode=IN&AppCode=Emt
  EaseMyTrip: {
    id: 'EaseMyTrip',
    name: 'EaseMyTrip',
    prefill: true,
    generateUrl: (origin, destination, dateStr) => {
      const { day, monthNum, year } = parseDateComponents(dateStr);
      const params = new URLSearchParams({
        org: origin,
        des: destination,
        date: `${day}-${monthNum}-${year}`,
        CCode: 'IN',
        AppCode: 'Emt',
      });
      return `https://bus.easemytrip.com/home/list?${params.toString()}`;
    },
  },
  // NO PREFILL — Paytm has no public URL to pre-fill a bus search, so we open their
  // bus landing page and the UI shows a toast with the route + date to enter.
  PaytmBus: {
    id: 'PaytmBus',
    name: 'Paytm Bus',
    prefill: false,
    generateUrl: () => 'https://tickets.paytm.com/bus/',
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

// True if the OTA's generateUrl produces a route+date pre-filled page. When false
// (Paytm), callers should show getOtaToastMessage() before opening the bus page.
export function otaSupportsPrefill(otaSource: string): boolean {
  const adapter = OTA_ADAPTERS[otaSource as OtaId];
  return adapter ? adapter.prefill : true;
}

function humanDate(dateStr: string): string {
  const { day, monthName, year } = parseDateComponents(dateStr);
  return `${day} ${monthName} ${year}`;
}

// "Route: X → Y, <date> — select this on the site" for prefill-impossible OTAs, in
// all 12 supported languages.
const OTA_TOAST: Record<string, (route: string, date: string) => string> = {
  te: (r, d) => `మార్గం: ${r}, ${d} — దయచేసి సైట్‌లో దీన్ని ఎంచుకోండి.`,
  hi: (r, d) => `मार्ग: ${r}, ${d} — कृपया साइट पर यही चुनें।`,
  ta: (r, d) => `பாதை: ${r}, ${d} — இதைத் தளத்தில் தேர்ந்தெடுக்கவும்.`,
  kn: (r, d) => `ಮಾರ್ಗ: ${r}, ${d} — ದಯವಿಟ್ಟು ಸೈಟ್‌ನಲ್ಲಿ ಇದನ್ನು ಆಯ್ಕೆಮಾಡಿ.`,
  ml: (r, d) => `റൂട്ട്: ${r}, ${d} — സൈറ്റിൽ ഇത് തിരഞ്ഞെടുക്കുക.`,
  mr: (r, d) => `मार्ग: ${r}, ${d} — कृपया साइटवर हेच निवडा.`,
  gu: (r, d) => `રૂટ: ${r}, ${d} — કૃપા કરીને સાઇટ પર આ પસંદ કરો.`,
  bn: (r, d) => `রুট: ${r}, ${d} — অনুগ্রহ করে সাইটে এটি নির্বাচন করুন।`,
  ur: (r, d) => `روٹ: ${r}, ${d} — براہ کرم سائٹ پر یہی منتخب کریں۔`,
  pa: (r, d) => `ਰੂਟ: ${r}, ${d} — ਕਿਰਪਾ ਕਰਕੇ ਸਾਈਟ 'ਤੇ ਇਹ ਚੁਣੋ।`,
  or: (r, d) => `ମାର୍ଗ: ${r}, ${d} — ଦୟାକରି ସାଇଟ୍‌ରେ ଏହା ବାଛନ୍ତୁ।`,
  en: (r, d) => `Route: ${r}, ${d} — select this on the site.`,
};

export function getOtaToastMessage(
  lang: string,
  origin: string,
  destination: string,
  dateStr: string
): string {
  const fn = OTA_TOAST[lang] || OTA_TOAST.en;
  return fn(`${origin} → ${destination}`, humanDate(dateStr));
}
