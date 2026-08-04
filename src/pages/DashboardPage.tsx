import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Bookmark, Sliders, Trash2, Search, ArrowRight, CheckCircle2, ShieldCheck, Mail, MessageSquare, Smartphone, Clock } from 'lucide-react';
import { getSavedTravelWatches, deleteTravelWatch, TravelWatchItem } from '../lib/travelWatchService';
import { getSavedSearches, deleteSavedSearch, SavedSearchItem } from '../lib/savedSearchesService';
import { useSearch } from '../context/SearchContext';
import { useLanguage } from '../context/LanguageContext';
import { formatPhone } from '../lib/phone';
import TravelWatchModal from '../components/TravelWatchModal';

export default function DashboardPage() {
  const navigate = useNavigate();
  const { setSearchRoute } = useSearch();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<'watches' | 'saved' | 'preferences'>('watches');
  const [watches, setWatches] = useState<TravelWatchItem[]>([]);
  const [savedSearches, setSavedSearches] = useState<SavedSearchItem[]>([]);
  const [editingWatch, setEditingWatch] = useState<TravelWatchItem | null>(null);

  useEffect(() => {
    setWatches(getSavedTravelWatches());
    setSavedSearches(getSavedSearches());
  }, []);

  const handleDeleteWatch = (id: string) => {
    deleteTravelWatch(id);
    setWatches(getSavedTravelWatches());
  };

  const handleDeleteSavedSearch = (id: string) => {
    deleteSavedSearch(id);
    setSavedSearches(getSavedSearches());
  };

  const handleRunSavedSearch = (item: SavedSearchItem) => {
    const today = new Date();
    let targetDate = today.toISOString().split('T')[0];

    if (item.preferredDateType === 'tomorrow') {
      const tomorrow = new Date(Date.now() + 86400000);
      targetDate = tomorrow.toISOString().split('T')[0];
    } else if (item.preferredDateType === 'weekend') {
      const nextSat = new Date();
      nextSat.setDate(today.getDate() + ((6 - today.getDay() + 7) % 7));
      targetDate = nextSat.toISOString().split('T')[0];
    }

    setSearchRoute(item.origin, item.destination, targetDate);
    navigate(`/results?origin=${encodeURIComponent(item.origin)}&destination=${encodeURIComponent(item.destination)}&date=${targetDate}`);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <User className="h-7 w-7 text-blue-600" /> User Travel Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your AI Travel Watches, 1-tap Saved Searches, and Multilingual Notification Settings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold px-3 py-1 text-xs rounded-full flex items-center gap-1">
            <ShieldCheck className="h-4 w-4" /> AI Monitoring Active
          </span>
        </div>
      </div>

      {/* Dashboard Tabs */}
      <div className="mt-6 flex border-b border-slate-200 gap-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('watches')}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'watches'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bell className="h-4 w-4" /> AI Travel Watches ({watches.length})
        </button>
        <button
          onClick={() => setActiveTab('saved')}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'saved'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Bookmark className="h-4 w-4" /> Saved Searches ({savedSearches.length})
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-3 transition-colors flex items-center gap-2 border-b-2 ${
            activeTab === 'preferences'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="h-4 w-4" /> Notification Settings
        </button>
      </div>

      {/* Tab 1: AI Travel Watches */}
      {activeTab === 'watches' && (
        <div className="mt-6 space-y-4">
          {watches.length === 0 ? (
            <div className="card p-12 text-center text-slate-500 space-y-3">
              <Bell className="mx-auto h-12 w-12 text-slate-300" />
              <p className="font-semibold text-base">No active AI Travel Watches yet</p>
              <p className="text-xs">Search for any route and tap "🔔 Create AI Travel Watch" to automatically track prices and cancellations!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {watches.map((w) => (
                <div key={w.id} className="card p-5 border border-slate-200 hover:border-slate-300 transition-all flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="badge bg-emerald-50 text-emerald-600 border border-emerald-200 font-bold text-[11px] px-2.5 py-0.5 rounded-full">
                        Status: {w.status.toUpperCase()}
                      </span>
                      <button
                        onClick={() => handleDeleteWatch(w.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="Delete Watch"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2">
                      {w.origin} → {w.destination}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Date: {w.travelDate}</p>

                    <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                      {w.preferences.maxBudget && (
                        <span className="badge bg-blue-50 text-blue-700 border border-blue-200 font-medium">
                          Max ₹{w.preferences.maxBudget}
                        </span>
                      )}
                      {w.preferences.minRating && (
                        <span className="badge bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                          {w.preferences.minRating}★ Rating
                        </span>
                      )}
                      {w.preferences.busType && (
                        <span className="badge bg-slate-100 text-slate-700 uppercase font-medium">
                          {w.preferences.busType}
                        </span>
                      )}
                      {w.preferences.seatType && (
                        <span className="badge bg-slate-100 text-slate-700 capitalize font-medium">
                          {w.preferences.seatType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ISSUE 3: the delivery channel AND the exact destination are always
                      on the card, so an alert that cannot reach you is impossible to
                      miss. Tapping Edit reopens the modal with the same validation. */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-[11px]">
                    <p className="font-semibold text-slate-500 mb-1.5">{t('alertDeliverTo')}</p>
                    <div className="flex flex-col gap-1">
                      {w.channels.email && (
                        <span className="flex items-center gap-1.5 text-blue-700">
                          <Mail className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">{t('alertEmail')}:</span>
                          <span className="font-mono truncate">{w.contacts?.email || '—'}</span>
                        </span>
                      )}
                      {w.channels.whatsapp && (
                        <span className="flex items-center gap-1.5 text-emerald-700">
                          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">{t('alertWhatsapp')}:</span>
                          <span className="font-mono truncate">
                            {w.contacts?.phone ? formatPhone(w.contacts.phone) : '—'}
                          </span>
                        </span>
                      )}
                      {w.channels.sms && (
                        <span className="flex items-center gap-1.5 text-purple-700">
                          <Smartphone className="h-3.5 w-3.5 shrink-0" />
                          <span className="font-medium">{t('alertSms')}:</span>
                          <span className="font-mono truncate">
                            {w.contacts?.phone ? formatPhone(w.contacts.phone) : '—'}
                          </span>
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setEditingWatch(w)}
                      className="mt-2 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      {t('alertEdit')}
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-3">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Checked: Just now</span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-600"><CheckCircle2 className="h-3.5 w-3.5" /> Escalation Active</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Saved Searches */}
      {activeTab === 'saved' && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedSearches.map((item) => (
              <div key={item.id} className="card p-5 border border-slate-200 flex flex-col justify-between gap-4 hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                      1-Tap Quick Search
                    </span>
                    <button
                      onClick={() => handleDeleteSavedSearch(item.id)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mt-2">{item.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Route: <strong>{item.origin}</strong> to <strong>{item.destination}</strong>
                  </p>
                </div>

                <button
                  onClick={() => handleRunSavedSearch(item)}
                  className="btn-primary bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl shadow flex items-center justify-center gap-1.5 hover:scale-[1.02] transition-transform"
                >
                  <Search className="h-4 w-4" /> Search Route Now <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Notification Settings */}
      {activeTab === 'preferences' && (
        <div className="mt-6 card p-6 max-w-xl space-y-5">
          <h3 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Multi-Channel Alert Dispatcher Settings
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="h-5 w-5 text-emerald-600" />
                <div>
                  <strong className="block text-slate-900 text-sm">WhatsApp Notifications</strong>
                  <span className="text-slate-500">Instant price drop & seat cancellation alerts</span>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Mail className="h-5 w-5 text-blue-600" />
                <div>
                  <strong className="block text-slate-900 text-sm">Email Alerts</strong>
                  <span className="text-slate-500">Daily price forecast summaries and itinerary matches</span>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-blue-600" />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <Smartphone className="h-5 w-5 text-purple-600" />
                <div>
                  <strong className="block text-slate-900 text-sm">SMS & Push Notifications</strong>
                  <span className="text-slate-500">High-priority urgent fare alert escalation</span>
                </div>
              </div>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded text-blue-600" />
            </div>
          </div>
        </div>
      )}

      {/* Editing reuses the same modal — and therefore the same delivery validation,
          so a watch can never be edited INTO an undeliverable state (ISSUE 3). */}
      {editingWatch && (
        <TravelWatchModal
          origin={editingWatch.origin}
          destination={editingWatch.destination}
          travelDate={editingWatch.travelDate}
          existing={editingWatch}
          onClose={() => {
            setEditingWatch(null);
            setWatches(getSavedTravelWatches());
          }}
          onCreated={() => setWatches(getSavedTravelWatches())}
        />
      )}
    </div>
  );
}
