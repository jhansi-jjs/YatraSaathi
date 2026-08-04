export interface SavedSearchItem {
  id: string;
  name: string; // e.g. "Home ➔ College", "Office ➔ Home"
  origin: string;
  destination: string;
  preferredDateType: 'today' | 'tomorrow' | 'weekend' | 'specific';
  specificDate?: string;
  createdAt: string;
  lastSearchedAt?: string;
}

const SAVED_SEARCHES_KEY = 'yatra_saathi_saved_searches';

export function getSavedSearches(): SavedSearchItem[] {
  try {
    const raw = localStorage.getItem(SAVED_SEARCHES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* localStorage unavailable (private mode) */
  }
  
  // Default sample saved searches for immediate quick access
  return [
    {
      id: 'default-1',
      name: 'Vizag ➔ Hyderabad (Daily Commute)',
      origin: 'Visakhapatnam',
      destination: 'Hyderabad',
      preferredDateType: 'tomorrow',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'default-2',
      name: 'Vijayawada ➔ Bengaluru',
      origin: 'Vijayawada',
      destination: 'Bengaluru',
      preferredDateType: 'weekend',
      createdAt: new Date().toISOString(),
    },
  ];
}

export function saveSearch(name: string, origin: string, destination: string, preferredDateType: SavedSearchItem['preferredDateType'] = 'tomorrow'): SavedSearchItem {
  const list = getSavedSearches();
  const newItem: SavedSearchItem = {
    id: `saved-${Date.now()}`,
    name,
    origin,
    destination,
    preferredDateType,
    createdAt: new Date().toISOString(),
  };
  list.unshift(newItem);
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(list));
  } catch {
    /* localStorage unavailable (private mode) */
  }
  return newItem;
}

export function deleteSavedSearch(id: string): void {
  const list = getSavedSearches();
  const filtered = list.filter((s) => s.id !== id);
  try {
    localStorage.setItem(SAVED_SEARCHES_KEY, JSON.stringify(filtered));
  } catch {
    /* localStorage unavailable (private mode) */
  }
}
