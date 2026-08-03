import React, { useState } from 'react';
import { X, Bell, ShieldCheck, Sparkles, Filter, Check, Mail, MessageSquare, PhoneCall, Smartphone } from 'lucide-react';
import { saveTravelWatch, TravelWatchPreferences, NotificationChannelConfig } from '../lib/travelWatchService';

interface TravelWatchModalProps {
  origin: string;
  destination: string;
  travelDate: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function TravelWatchModal({ origin, destination, travelDate, onClose, onCreated }: TravelWatchModalProps) {
  const [maxBudget, setMaxBudget] = useState<number>(1200);
  const [minRating, setMinRating] = useState<number>(4.0);
  const [busType, setBusType] = useState<string>('ac');
  const [seatType, setSeatType] = useState<string>('sleeper');
  const [femaleFriendlyOnly, setFemaleFriendlyOnly] = useState<boolean>(false);
  const [couponsOnly, setCouponsOnly] = useState<boolean>(false);

  const [channels, setChannels] = useState<NotificationChannelConfig>({
    email: true,
    sms: true,
    whatsapp: true,
    push: true,
    inApp: true,
  });

  const [isSaved, setIsSaved] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();

    const preferences: TravelWatchPreferences = {
      maxBudget,
      minRating,
      busType,
      seatType,
      femaleFriendlyOnly,
      couponsOnly,
    };

    saveTravelWatch({
      userId: 'user-guest',
      origin,
      destination,
      travelDate,
      preferences,
      channels,
      status: 'active',
    });

    setIsSaved(true);
    setTimeout(() => {
      onCreated();
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="card w-full max-w-lg overflow-hidden rounded-2xl bg-slate-900 text-white border border-amber-500/30 shadow-2xl animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-slate-800/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-500/20 p-2 border border-amber-500/40 text-amber-400">
              <Bell className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Create AI Travel Watch
                <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] px-2 py-0.5 rounded-full">
                  Continuous Monitoring
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {origin} → {destination} ({travelDate})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {isSaved ? (
          <div className="p-8 text-center space-y-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Check className="h-8 w-8" />
            </div>
            <h4 className="text-lg font-bold text-white">AI Travel Watch Active!</h4>
            <p className="text-xs text-slate-300">
              We are now continuously monitoring redBus, MakeMyTrip, AbhiBus, Cleartrip, and Goibibo. You will be notified the instant your conditions are met!
            </p>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="p-6 space-y-5 text-xs">
            {/* Budget & Rating */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Max Budget (₹)</label>
                <input
                  type="number"
                  step="50"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(Number(e.target.value))}
                  className="input-field bg-slate-800 border-white/10 text-white"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Min Operator Rating</label>
                <select
                  value={minRating}
                  onChange={(e) => setMinRating(Number(e.target.value))}
                  className="input-field bg-slate-800 border-white/10 text-white"
                >
                  <option value={4.5}>4.5+ ★ (Top Rated Only)</option>
                  <option value={4.0}>4.0+ ★ (Great Quality)</option>
                  <option value={3.5}>3.5+ ★ (Standard)</option>
                  <option value={0}>Any Rating</option>
                </select>
              </div>
            </div>

            {/* Bus Type & Seat Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Bus Type</label>
                <select
                  value={busType}
                  onChange={(e) => setBusType(e.target.value)}
                  className="input-field bg-slate-800 border-white/10 text-white"
                >
                  <option value="ac">AC Only</option>
                  <option value="non-ac">Non-AC Only</option>
                  <option value="any">Any Bus Type</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Seat Type</label>
                <select
                  value={seatType}
                  onChange={(e) => setSeatType(e.target.value)}
                  className="input-field bg-slate-800 border-white/10 text-white"
                >
                  <option value="sleeper">Sleeper Only</option>
                  <option value="seater">Seater Only</option>
                  <option value="semi-sleeper">Semi-Sleeper</option>
                  <option value="any">Any Seat Type</option>
                </select>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="space-y-2 border-y border-white/10 py-3">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={femaleFriendlyOnly}
                  onChange={(e) => setFemaleFriendlyOnly(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-blue-500"
                />
                <span>Notify only for Female-Friendly buses</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={couponsOnly}
                  onChange={(e) => setCouponsOnly(e.target.checked)}
                  className="rounded border-white/20 bg-slate-800 text-blue-500"
                />
                <span>Notify when instant discount coupons or cashback are available</span>
              </label>
            </div>

            {/* Notification Channels */}
            <div>
              <label className="block font-semibold text-slate-300 mb-2">Notification Delivery Channels</label>
              <div className="grid grid-cols-3 gap-2">
                <label className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer ${channels.whatsapp ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <input type="checkbox" checked={channels.whatsapp} onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })} className="hidden" />
                  <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
                </label>
                <label className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer ${channels.email ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <input type="checkbox" checked={channels.email} onChange={(e) => setChannels({ ...channels, email: e.target.checked })} className="hidden" />
                  <Mail className="h-3.5 w-3.5" /> Email
                </label>
                <label className={`flex items-center gap-1.5 p-2 rounded-lg border cursor-pointer ${channels.sms ? 'bg-purple-500/20 border-purple-500/50 text-purple-300' : 'bg-white/5 border-white/10 text-slate-400'}`}>
                  <input type="checkbox" checked={channels.sms} onChange={(e) => setChannels({ ...channels, sms: e.target.checked })} className="hidden" />
                  <Smartphone className="h-3.5 w-3.5" /> SMS
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full btn-primary bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold py-3 text-sm rounded-xl shadow-lg hover:scale-[1.01] transition-transform flex items-center justify-center gap-2"
              >
                <Sparkles className="h-4 w-4" /> Activate AI Travel Watch
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
