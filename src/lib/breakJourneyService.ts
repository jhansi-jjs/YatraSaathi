import type { BusListingWithRoute } from './types';
import { buildOtaDeepLink } from './ota';

export interface BreakJourneyRoute {
  id: string;
  transferHub: string;
  leg1: BusListingWithRoute;
  leg2: BusListingWithRoute;
  totalPrice: number;
  totalDurationMins: number;
  transferWaitMins: number;
}

const MAJOR_HUBS: Record<string, string[]> = {
  Kochi: ['Bengaluru', 'Chennai', 'Coimbatore'],
  Hyderabad: ['Vijayawada', 'Bengaluru', 'Guntur'],
  Visakhapatnam: ['Vijayawada', 'Hyderabad', 'Bengaluru'],
  Bengaluru: ['Chennai', 'Hyderabad', 'Mysuru'],
  Chennai: ['Bengaluru', 'Hyderabad', 'Coimbatore'],
  Coimbatore: ['Bengaluru', 'Chennai', 'Kochi'],
  Madurai: ['Chennai', 'Bengaluru', 'Coimbatore'],
  Mysuru: ['Bengaluru', 'Chennai', 'Hyderabad'],
  Tirupati: ['Chennai', 'Bengaluru', 'Hyderabad'],
  Mumbai: ['Pune', 'Hyderabad', 'Delhi'],
  Pune: ['Mumbai', 'Bengaluru', 'Hyderabad'],
  Delhi: ['Mumbai', 'Hyderabad', 'Kolkata'],
  Kolkata: ['Hyderabad', 'Bengaluru', 'Delhi'],
  Anantapur: ['Bengaluru', 'Hyderabad'],
  Kurnool: ['Hyderabad', 'Bengaluru'],
};

// Curated list of genuinely long, inter-region city pairs that have no realistic
// direct bus service. For these, the app surfaces connecting (break) journeys
// instead of direct listings. Undirected — both A->B and B->A count.
const NO_DIRECT_PAIRS = new Set<string>(
  [
    ['Kochi', 'Delhi'],
    ['Kochi', 'Kolkata'],
    ['Kochi', 'Mumbai'],
    ['Coimbatore', 'Delhi'],
    ['Coimbatore', 'Kolkata'],
    ['Coimbatore', 'Mumbai'],
    ['Madurai', 'Delhi'],
    ['Madurai', 'Kolkata'],
    ['Madurai', 'Mumbai'],
    ['Mysuru', 'Delhi'],
    ['Mysuru', 'Kolkata'],
    ['Chennai', 'Delhi'],
    ['Chennai', 'Kolkata'],
    ['Bengaluru', 'Delhi'],
    ['Bengaluru', 'Kolkata'],
    ['Hyderabad', 'Kolkata'],
    ['Visakhapatnam', 'Delhi'],
    ['Visakhapatnam', 'Mumbai'],
    ['Tirupati', 'Delhi'],
    ['Tirupati', 'Kolkata'],
    ['Tirupati', 'Mumbai'],
    ['Vijayawada', 'Delhi'],
    ['Vijayawada', 'Kolkata'],
    ['Warangal', 'Delhi'],
    ['Warangal', 'Kolkata'],
  ].map(([a, b]) => [a, b].sort().join('|'))
);

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

// Returns false for curated long cross-region routes that have no direct buses.
export function hasDirectBuses(origin: string, destination: string): boolean {
  if (!origin || !destination) return true;
  if (origin.toLowerCase() === destination.toLowerCase()) return true;
  return !NO_DIRECT_PAIRS.has(pairKey(origin, destination));
}

export function computeBreakJourneyRoutes(
  origin: string,
  destination: string,
  travelDate: string
): BreakJourneyRoute[] {
  if (!origin || !destination || origin.toLowerCase() === destination.toLowerCase()) {
    return [];
  }

  // Find potential transfer hubs
  const possibleHubs = MAJOR_HUBS[origin] || ['Bengaluru', 'Vijayawada', 'Hyderabad'];
  const routes: BreakJourneyRoute[] = [];

  possibleHubs.forEach((hub, idx) => {
    if (hub.toLowerCase() === origin.toLowerCase() || hub.toLowerCase() === destination.toLowerCase()) {
      return;
    }

    const leg1Price = 450 + (idx * 120);
    const leg2Price = 550 + (idx * 150);

    const leg1: BusListingWithRoute = {
      id: `break-leg1-${idx}`,
      route_id: `route-leg1-${idx}`,
      operator_name: idx % 2 === 0 ? 'KSRTC Swift / VRL' : 'IntrCity SmartBus',
      bus_type: 'sleeper',
      ac_status: 'ac',
      bus_model: 'volvo',
      seat_position: 'window',
      berth_level: 'lower',
      price: leg1Price,
      currency: 'INR',
      ota_source: idx % 2 === 0 ? 'redBus' : 'AbhiBus',
      rating: 4.6,
      deep_link_url: '',
      travel_date: travelDate,
      departure_time: '06:30 AM',
      arrival_time: '02:00 PM',
      duration_mins: 450,
      available_seats: 14,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
      routes: {
        id: `r-leg1-${idx}`,
        origin_city: origin,
        destination_city: hub,
        distance_km: 380,
        created_at: new Date().toISOString(),
      },
    };
    leg1.deep_link_url = buildOtaDeepLink(leg1, origin, hub, travelDate);

    const leg2: BusListingWithRoute = {
      id: `break-leg2-${idx}`,
      route_id: `route-leg2-${idx}`,
      operator_name: idx % 2 === 0 ? 'Orange Tours & Travels' : 'MakeMyTrip Express',
      bus_type: 'sleeper',
      ac_status: 'ac',
      bus_model: 'volvo',
      seat_position: 'window',
      berth_level: 'upper',
      price: leg2Price,
      currency: 'INR',
      ota_source: idx % 2 === 0 ? 'MakeMyTrip' : 'redBus',
      rating: 4.8,
      deep_link_url: '',
      travel_date: travelDate,
      departure_time: '04:30 PM',
      arrival_time: '11:45 PM',
      duration_mins: 435,
      available_seats: 9,
      last_updated: new Date().toISOString(),
      created_at: new Date().toISOString(),
      routes: {
        id: `r-leg2-${idx}`,
        origin_city: hub,
        destination_city: destination,
        distance_km: 410,
        created_at: new Date().toISOString(),
      },
    };
    leg2.deep_link_url = buildOtaDeepLink(leg2, hub, destination, travelDate);

    routes.push({
      id: `break-route-${origin}-${hub}-${destination}`,
      transferHub: hub,
      leg1,
      leg2,
      totalPrice: leg1Price + leg2Price,
      totalDurationMins: 1035, // ~17h 15m total including 2.5h hub break
      transferWaitMins: 150,
    });
  });

  return routes;
}
