export type BusType = 'sleeper' | 'semi-sleeper' | 'seater';
export type AcStatus = 'ac' | 'non-ac';
export type BusModel = 'volvo' | 'bharatbenz' | 'other';
export type SeatPosition = 'window' | 'front' | 'middle' | 'back' | null;
export type BerthLevel = 'upper' | 'lower' | null;
export type UserRole = 'user' | 'admin';

export interface Route {
  id: string;
  origin_city: string;
  destination_city: string;
  distance_km: number | null;
  created_at: string;
}

export interface BusListing {
  id: string;
  route_id: string;
  operator_name: string;
  bus_type: BusType;
  ac_status: AcStatus;
  bus_model: BusModel;
  seat_position: SeatPosition;
  berth_level: BerthLevel;
  price: number;
  currency: string;
  ota_source: string;
  rating: number | null;
  deep_link_url: string;
  travel_date: string;
  departure_time: string;
  arrival_time: string;
  duration_mins: number;
  available_seats: number;
  last_updated: string;
  created_at: string;
}

export interface BusListingWithRoute extends BusListing {
  routes: Route;
}

export interface ClickLog {
  id: string;
  user_id: string | null;
  listing_id: string;
  ota_source: string;
  session_id: string | null;
  clicked_at: string;
}

export interface SearchLog {
  id: string;
  user_id: string | null;
  origin_city: string;
  destination_city: string;
  travel_date: string;
  session_id: string | null;
  results_count: number;
  searched_at: string;
}

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  date: string;
}
