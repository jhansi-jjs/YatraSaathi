import React from 'react';
import { TrendingDown, Calendar, Sparkles, AlertCircle, ArrowUpRight, ArrowDownRight, ShieldCheck } from 'lucide-react';
import { generatePricePrediction } from '../lib/pricePredictionService';

interface PricePredictionCardProps {
  origin: string;
  destination: string;
  travelDate: string;
  onSelectDate?: (date: string) => void;
}

export default function PricePredictionCard({ origin, destination, travelDate, onSelectDate }: PricePredictionCardProps) {
  const prediction = generatePricePrediction(origin, destination, travelDate);

  return (
    <div className="card bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 p-6 text-white border border-amber-500/30 shadow-2xl rounded-2xl mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-amber-500/20 p-2.5 border border-amber-500/40 text-amber-400">
            <TrendingDown className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">Smart Weekly Price Prediction</h3>
              <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> {prediction.confidencePercent}% Confidence
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Historical & real-time time-series fare trends for {origin} → {destination}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="text-xs text-slate-400">Max Savings:</span>
          <span className="text-base font-black text-emerald-400">Up to ₹{prediction.maxSavings}</span>
        </div>
      </div>

      {/* Rationale Banner */}
      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 leading-relaxed">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
        <p>{prediction.aiRationale}</p>
      </div>

      {/* 7-Day Interactive Forecast Graph */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5">
        {prediction.forecasts.map((f) => {
          const isSelected = f.date === travelDate;
          return (
            <button
              key={f.date}
              onClick={() => onSelectDate && onSelectDate(f.date)}
              className={`flex flex-col items-center justify-between p-3 rounded-xl border transition-all text-center ${
                f.isCheapest
                  ? 'bg-gradient-to-b from-emerald-500/20 to-emerald-600/30 border-emerald-400 ring-2 ring-emerald-500/50 scale-105 shadow-lg'
                  : isSelected
                  ? 'bg-blue-600/30 border-blue-400 ring-1 ring-blue-400'
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <span className="text-[11px] font-semibold text-slate-300">{f.dayName}</span>
              <span className="text-[10px] text-slate-400">{f.date.substring(5)}</span>

              <div className="my-2 text-sm font-extrabold text-white flex items-center justify-center gap-1">
                ₹{f.predictedPrice}
                {f.trend === 'up' ? (
                  <ArrowUpRight className="h-3 w-3 text-red-400" />
                ) : f.trend === 'down' ? (
                  <ArrowDownRight className="h-3 w-3 text-emerald-400" />
                ) : null}
              </div>

              {f.isCheapest ? (
                <span className="badge bg-emerald-500 text-slate-900 font-extrabold text-[9px] px-1.5 py-0.5 rounded uppercase">
                  Cheapest
                </span>
              ) : (
                <span className="text-[10px] opacity-0 group-hover:opacity-100 text-slate-400">Select</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
