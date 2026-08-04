import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CITIES } from '../lib/cityData';
import { EMPTY_FILTERS, type VoiceFilters } from '../lib/filterExtraction';

export interface SearchSessionState {
  source: string | null;
  destination: string | null;
  date: string;
  time: string | null;
  busType: string | null;
  seatType: string | null;
  maxBudget: number | null;
  language: string;
  selectedOta: string | null;
  conversationHistory: { role: 'user' | 'assistant'; text: string; timestamp: string }[];
  /**
   * Filters spoken to the assistant. Persisted with the session so the results page
   * can apply them and so follow-up utterances merge instead of resetting (ISSUE 1).
   */
  filters: VoiceFilters;
}

interface SearchContextType {
  session: SearchSessionState;
  setSource: (source: string | null) => void;
  setDestination: (dest: string | null) => void;
  setDate: (date: string) => void;
  setSearchRoute: (source: string, destination: string, date?: string) => void;
  updateSession: (partial: Partial<SearchSessionState>) => void;
  resetSession: () => void;
  cities: string[];
}

const INITIAL_STATE: SearchSessionState = {
  source: null,
  destination: null,
  date: new Date().toISOString().split('T')[0],
  time: null,
  busType: null,
  seatType: null,
  maxBudget: null,
  language: 'en',
  selectedOta: null,
  conversationHistory: [],
  filters: { ...EMPTY_FILTERS },
};

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export const SearchProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<SearchSessionState>(() => {
    try {
      const saved = localStorage.getItem('yatra_saathi_search_session');
      if (!saved) return INITIAL_STATE;
      // Merge over INITIAL_STATE so a session persisted before `filters` existed
      // does not crash the results page with an undefined filter object.
      const parsed = JSON.parse(saved) as Partial<SearchSessionState>;
      return {
        ...INITIAL_STATE,
        ...parsed,
        filters: { ...EMPTY_FILTERS, ...(parsed.filters || {}) },
      };
    } catch {
      return INITIAL_STATE;
    }
  });

  const [cities] = useState<string[]>(CITIES);

  useEffect(() => {
    try {
      localStorage.setItem('yatra_saathi_search_session', JSON.stringify(session));
    } catch {
      /* localStorage unavailable (private mode) */
    }
  }, [session]);

  const setSource = (source: string | null) => {
    setSession((prev) => ({ ...prev, source }));
  };

  const setDestination = (destination: string | null) => {
    setSession((prev) => ({ ...prev, destination }));
  };

  const setDate = (date: string) => {
    setSession((prev) => ({ ...prev, date }));
  };

  const setSearchRoute = (source: string, destination: string, date?: string) => {
    setSession((prev) => ({
      ...prev,
      source,
      destination,
      date: date || prev.date || new Date().toISOString().split('T')[0],
    }));
  };

  const updateSession = (partial: Partial<SearchSessionState>) => {
    setSession((prev) => ({ ...prev, ...partial }));
  };

  const resetSession = () => {
    setSession(INITIAL_STATE);
    try {
      localStorage.removeItem('yatra_saathi_search_session');
    } catch {
      /* localStorage unavailable (private mode) */
    }
  };

  return (
    <SearchContext.Provider
      value={{
        session,
        setSource,
        setDestination,
        setDate,
        setSearchRoute,
        updateSession,
        resetSession,
        cities,
      }}
    >
      {children}
    </SearchContext.Provider>
  );
};

export const useSearch = () => {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
};
