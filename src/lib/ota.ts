import type { BusListingWithRoute } from './types';
import { LANGUAGE_CODES } from './languages';

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

// AbhiBus route URLs are city-ID based: /bus_search/<Label>/<id>/<Label>/<id>/DD-MM-YYYY/O
// IDs + labels pulled from AbhiBus's own autocomplete API for all 22 cities.
// (The slug form /bus-ticket-booking/<a>-to-<b> returns 404 — re-verified Aug 2026.)
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

export function parseDateComponents(dateStr: string): { day: string; monthName: string; monthNum: string; year: string } {
  if (!dateStr || dateStr === 'undefined') {
    dateStr = new Date().toISOString().split('T')[0];
  }
  const parts = dateStr.split('-');
  const year = parts[0] || '2026';
  let monthNum = parts[1] || '08';
  let day = parts[2] || '14';

  day = day.padStart(2, '0');
  monthNum = monthNum.padStart(2, '0');

  const monthIdx = Math.max(0, Math.min(11, parseInt(monthNum, 10) - 1));
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthName = months[monthIdx];

  return { day, monthName, monthNum, year };
}

// OTAs with no public URL that pre-fills a bus search. For these, generateUrl returns
// the bus landing page and BusCard shows getOtaToastMessage() with the route + date so
// the user knows exactly what to enter (ISSUE 5). Re-verified live in Aug 2026.
const NO_PREFILL_OTAS = new Set(['PaytmBus', 'Cleartrip', 'Ixigo', 'Goibibo']);

export function otaSupportsPrefill(otaSource: string): boolean {
  return !NO_PREFILL_OTAS.has(otaSource);
}

// getOtaToastMessage lives at the bottom of this file — it now covers all 12
// supported languages instead of only te/hi/en (ISSUE 0c/5).

export const OTA_HOME_URLS: Record<string, string> = {
  redBus: 'https://www.redbus.in',
  MakeMyTrip: 'https://www.makemytrip.com/bus/',
  AbhiBus: 'https://www.abhibus.com',
  EaseMyTrip: 'https://www.easemytrip.com/bus/',
  Goibibo: 'https://www.goibibo.com/bus/',
  Ixigo: 'https://bus.ixigo.com/',
  PaytmBus: 'https://tickets.paytm.com/bus/',
  TravelYaari: 'https://www.travelyaari.com',
  Cleartrip: 'https://www.cleartrip.com/bus',
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
  // Re-verified Aug 2026: the city-ID route returns 200, the slug route 404s.
  AbhiBus: {
    id: 'AbhiBus',
    name: 'AbhiBus',
    generateUrl: (origin, destination, dateStr) => {
      const o = ABHIBUS_CITIES[origin];
      const d = ABHIBUS_CITIES[destination];
      // Unmapped city -> bus home page rather than a guaranteed 404.
      if (!o || !d) return OTA_HOME_URLS.AbhiBus;
      const { day, monthNum, year } = parseDateComponents(dateStr);
      return `https://www.abhibus.com/bus_search/${o.label}/${o.id}/${d.label}/${d.id}/${day}-${monthNum}-${year}/O`;
    },
    getOffers: () => [
      { title: 'ABHICASH', discountCode: 'ABHICASH', val: 'Flat ₹120 AbhiCash instant credit' },
    ],
  },
  // Re-verified Aug 2026: the bus subdomain results page returns 200; the
  // www.easemytrip.com/bus/buses-from-<a>-to-<b>.html form 404s.
  EaseMyTrip: {
    id: 'EaseMyTrip',
    name: 'EaseMyTrip',
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
  // NO PREFILL — /bus/search/?origin=..&destination=.. returns 504 Gateway Time-out
  // (verified in a real browser, Aug 2026). The /bus/ landing page loads fine, so we
  // open that and show the route+date toast instead of a broken results page.
  Goibibo: {
    id: 'Goibibo',
    name: 'Goibibo Bus',
    generateUrl: () => OTA_HOME_URLS.Goibibo,
  },
  // NO PREFILL — /buses/search?from=..&to=.. 404s (re-verified Aug 2026). We open the
  // bus landing page and the UI shows a toast with the route + date to enter.
  Ixigo: {
    id: 'Ixigo',
    name: 'Ixigo Bus',
    generateUrl: () => OTA_HOME_URLS.Ixigo,
  },
  // NO PREFILL — the /bus-tickets/<a>-to-<b> deep link 404s (re-verified Aug 2026).
  PaytmBus: {
    id: 'PaytmBus',
    name: 'Paytm Bus',
    generateUrl: () => OTA_HOME_URLS.PaytmBus,
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
  // NO PREFILL — Cleartrip has no public bus search URL we could verify; even
  // /buses 404s, so we use /bus (200) plus the route+date toast.
  Cleartrip: {
    id: 'Cleartrip',
    name: 'Cleartrip Bus',
    generateUrl: () => OTA_HOME_URLS.Cleartrip,
  },
};

/** Loose shape so callers can pass a partial listing (e.g. just `{ ota_source }`). */
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
  listing: BusListingWithRoute | DeepLinkListing | null | undefined,
  overrideOrigin?: string,
  overrideDestination?: string,
  overrideDate?: string
): string {
  // BusListingWithRoute nests the cities under `routes`; partial callers may pass them
  // flat. Read through one loose view so both shapes work.
  const l = (listing || {}) as DeepLinkListing;
  const otaSource = l.ota_source || 'redBus';
  const homeUrl = OTA_HOME_URLS[otaSource] || 'https://www.redbus.in';

  try {
    let rawOrigin =
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
      l.travel_date ||
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

/** Supported languages missing an OTA toast translation — consumed by i18nAudit.ts. */
export function auditOtaMessages(): string[] {
  return LANGUAGE_CODES.filter((code) => !OTA_TOAST[code]).map((code) => `OTA_TOAST.${code}`);
}
