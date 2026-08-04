// DELIVERY IS MOCKED. Watches live in localStorage and notifications are simulated —
// no WhatsApp Business API, SMS gateway or mail service is wired up. The UI says so
// plainly so nobody believes a message is actually on its way.

import { isValidEmail, parseE164, validatePhone } from './phone';

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

/**
 * ISSUE 3: where the notification is actually delivered. A watch used to be created
 * with WhatsApp enabled and no phone number anywhere, so it could never be delivered.
 * These fields are validated before a watch can be saved.
 */
export interface WatchContacts {
  /** Email address for the email channel. */
  email: string;
  /** E.164 phone number ("+919876543210") for the WhatsApp and SMS channels. */
  phone: string;
}

export interface TravelWatchItem {
  id: string;
  userId: string;
  origin: string;
  destination: string;
  travelDate: string;
  preferences: TravelWatchPreferences;
  channels: NotificationChannelConfig;
  contacts: WatchContacts;
  status: 'active' | 'triggered' | 'paused' | 'expired';
  createdAt: string;
  lastCheckedAt?: string;
  escalationLevel: number; // 0=initial, 1=+1h, 2=+3h, 3=+12h, 4=+24h, 5=expired
  matchedOfferCount: number;
}

export type WatchValidationError =
  | 'no-channel'
  | 'missing-email'
  | 'invalid-email'
  | 'missing-phone'
  | 'invalid-phone';

/**
 * The single gate every watch goes through: at least one channel must be enabled, and
 * every ENABLED channel must have a valid destination. Returns an error key so the
 * caller can show it in the user's language.
 */
export function validateWatchDelivery(
  channels: NotificationChannelConfig,
  contacts: WatchContacts
): WatchValidationError | null {
  const needsEmail = channels.email;
  const needsPhone = channels.whatsapp || channels.sms;

  // push/inApp are device-local and need no address, but they cannot be the ONLY
  // channel for a price alert the user expects to receive while away from the app.
  if (!needsEmail && !needsPhone) return 'no-channel';

  if (needsEmail) {
    if (!contacts.email.trim()) return 'missing-email';
    if (!isValidEmail(contacts.email)) return 'invalid-email';
  }

  if (needsPhone) {
    if (!contacts.phone.trim()) return 'missing-phone';
    const { dial, national } = parseE164(contacts.phone);
    if (!validatePhone(dial, national).valid) return 'invalid-phone';
  }

  return null;
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

/**
 * Creates a watch, or refuses with an error key when it would be undeliverable.
 * An undeliverable watch is now unrepresentable: this is the only way to persist one.
 */
export function saveTravelWatch(
  watch: Omit<TravelWatchItem, 'id' | 'createdAt' | 'escalationLevel' | 'matchedOfferCount'>
): { watch: TravelWatchItem; error: null } | { watch: null; error: WatchValidationError } {
  const error = validateWatchDelivery(watch.channels, watch.contacts);
  if (error) return { watch: null, error };

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
  } catch {
    /* localStorage unavailable (private mode) — watch is session-only */
  }
  return { watch: newItem, error: null };
}

/** Edits an existing watch, re-running the same delivery validation. */
export function updateTravelWatch(
  watchId: string,
  patch: Partial<Omit<TravelWatchItem, 'id' | 'createdAt'>>
): { watch: TravelWatchItem | null; error: WatchValidationError | null } {
  const watches = getSavedTravelWatches();
  const existing = watches.find((w) => w.id === watchId);
  if (!existing) return { watch: null, error: 'no-channel' };

  const merged: TravelWatchItem = { ...existing, ...patch };
  const error = validateWatchDelivery(merged.channels, merged.contacts);
  if (error) return { watch: null, error };

  try {
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify(watches.map((w) => (w.id === watchId ? merged : w)))
    );
  } catch {
    /* localStorage unavailable */
  }
  return { watch: merged, error: null };
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
  } catch {
    /* localStorage unavailable (private mode) */
  }
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
