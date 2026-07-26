import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, MousePointerClick, Search as SearchIcon, TrendingUp, Bus } from 'lucide-react';
import type { ClickLog, SearchLog, Profile } from '../lib/types';
import { OTA_NAMES } from '../lib/ota';

export default function AdminPage() {
  const [clickLogs, setClickLogs] = useState<ClickLog[]>([]);
  const [searchLogs, setSearchLogs] = useState<SearchLog[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [clicks, searches, users] = await Promise.all([
        supabase.from('click_logs').select('*').order('clicked_at', { ascending: false }).limit(50),
        supabase.from('search_logs').select('*').order('searched_at', { ascending: false }).limit(50),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ]);

      setClickLogs((clicks.data as ClickLog[]) || []);
      setSearchLogs((searches.data as SearchLog[]) || []);
      setProfiles((users.data as Profile[]) || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const totalClicks = clickLogs.length;
  const totalSearches = searchLogs.length;
  const totalUsers = profiles.length;

  const otaBreakdown = clickLogs.reduce((acc, log) => {
    acc[log.ota_source] = (acc[log.ota_source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const routeBreakdown = searchLogs.reduce((acc, log) => {
    const key = `${log.origin_city} → ${log.destination_city}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedRoutes = Object.entries(routeBreakdown).sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#0066ff]" />
      </div>
    );
  }

  const stats = [
    { label: 'Total Users', value: totalUsers, icon: Users, color: 'text-blue-600 bg-blue-50' },
    { label: 'Total Clicks', value: totalClicks, icon: MousePointerClick, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Total Searches', value: totalSearches, icon: SearchIcon, color: 'text-amber-600 bg-amber-50' },
    { label: 'Click-Through Rate', value: totalSearches > 0 ? `${((totalClicks / totalSearches) * 100).toFixed(1)}%` : '0%', icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Beta tester activity and platform analytics</p>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">{stat.label}</p>
                <p className="mt-1 text-2xl font-extrabold text-slate-900">{stat.value}</p>
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Clicks */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <MousePointerClick className="h-4 w-4" /> Recent Click-Outs
          </h2>
          {clickLogs.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No clicks yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {clickLogs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="badge bg-slate-200 text-slate-700">{OTA_NAMES[log.ota_source] || log.ota_source}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(log.clicked_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-xs text-slate-400">{log.session_id ? 'anon' : '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Popular Routes */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Bus className="h-4 w-4" /> Top Searched Routes
          </h2>
          {sortedRoutes.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No searches yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {sortedRoutes.map(([route, count], i) => (
                <div key={route} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0066ff] text-xs font-bold text-white">{i + 1}</span>
                    <span className="text-sm font-medium text-slate-700">{route}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-900">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* OTA Breakdown */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <TrendingUp className="h-4 w-4" /> Clicks by OTA
          </h2>
          {Object.keys(otaBreakdown).length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No click data</p>
          ) : (
            <div className="flex flex-col gap-3">
              {Object.entries(otaBreakdown).map(([ota, count]) => {
                const pct = totalClicks > 0 ? (count / totalClicks) * 100 : 0;
                return (
                  <div key={ota}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-700">{OTA_NAMES[ota] || ota}</span>
                      <span className="text-slate-500">{count} clicks</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-gradient-to-r from-[#0066ff] to-[#00c264]" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Registered Users */}
        <div className="card p-5">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Users className="h-4 w-4" /> Registered Users
          </h2>
          {profiles.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No users yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {profiles.slice(0, 10).map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0066ff] text-xs font-bold text-white">
                      {(p.full_name || p.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{p.full_name || '—'}</p>
                      <p className="text-xs text-slate-400">{p.email}</p>
                    </div>
                  </div>
                  <span className={`badge ${p.role === 'admin' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                    {p.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
