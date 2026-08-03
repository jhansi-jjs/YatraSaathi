export interface TravelWatchPreferences {
  maxBudget?: number | null;
  minRating?: number | null;
  busType?: 'ac' | 'non-ac' | 'any' | string;
  seatType?: 'sleeper' | 'seater' | 'semi-sleeper' | 'any' | string;
  seatPosition?: 'window' | 'any';
  departureTimeRange?: 'morning' | 'evening' | 'night' | 'any';
  preferredOperators?: string[];
  femaleFriendlyOnly?: boolean;
  couponsOnly?: boolean;
  maxStops?: number;
}

export interface NotificationChannelConfig {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
  push: boolean;
  inApp: boolean;
}

export interface TravelWatchItem {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  travelDate: string;
  preferences: TravelWatchPreferences;
  channels: NotificationChannelConfig;
  status: 'active' | 'triggered' | 'paused' | 'expired';
  createdAt: string;
  lastCheckedAt?: string;
  escalationLevel: number; // 0=initial, 1=+1h, 2=+3h, 3=+12h, 4=+24h, 5=expired
  matchedOfferCount: number;
}

const LOCAL_STORAGE_KEY = 'yatra_saathi_travel_watches';

export function getSavedTravelWatches(): TravelWatchItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveTravelWatch(watch: Omit<TravelWatchItem, 'id' | 'createdAt' | 'escalationLevel' | 'matchedOfferCount'>): TravelWatchItem {
  const watches = getSavedTravelWatches();
  const newItem: TravelWatchItem = {
    ...watch,
    id: `watch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    escalationLevel: 0,
    matchedOfferCount: 0,
  };
  watches.unshift(newItem);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(watches));
  } catch {}
  return newItem;
}

export function deleteTravelWatch(watchId: string): boolean {
  const watches = getSavedTravelWatches();
  const filtered = watches.filter((w) => w.id !== watchId);
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch {
    return false;
  }
}

export function updateWatchStatus(watchId: string, status: TravelWatchItem['status']): void {
  const watches = getSavedTravelWatches();
  const updated = watches.map((w) => (w.id === watchId ? { ...w, status } : w));
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  } catch {}
}

export function evaluateWatchCondition(
  watch: TravelWatchItem,
  listingPrice: number,
  listingRating: number,
  listingBusType: string,
  listingSeatType: string,
  listingOperator: string
): boolean {
  const { preferences } = watch;

  if (preferences.maxBudget && listingPrice > preferences.maxBudget) return false;
  if (preferences.minRating && listingRating < preferences.minRating) return false;

  if (preferences.busType && preferences.busType !== 'any') {
    if (preferences.busType.toLowerCase() !== listingBusType.toLowerCase()) return false;
  }

  if (preferences.seatType && preferences.seatType !== 'any') {
    if (preferences.seatType.toLowerCase() !== listingSeatType.toLowerCase()) return false;
  }

  if (preferences.preferredOperators && preferences.preferredOperators.length > 0) {
    const matchesOperator = preferences.preferredOperators.some((op) =>
      listingOperator.toLowerCase().includes(op.toLowerCase())
    );
    if (!matchesOperator) return false;
  }

  return true;
}
