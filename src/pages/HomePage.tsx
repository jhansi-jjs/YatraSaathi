import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Zap, ArrowRight, Bus } from 'lucide-react';
import SearchForm from '../components/SearchForm';
import { OTA_LIST, OTA_NAMES } from '../lib/ota';
import VoiceSearchBar from '../components/VoiceSearchBar';
import { useLanguage } from '../context/LanguageContext';

const OTA_STYLES: Record<string, string> = {
  redBus: 'bg-red-50 text-red-600 border-red-100',
  MakeMyTrip: 'bg-blue-50 text-blue-600 border-blue-100',
  AbhiBus: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  TravelYaari: 'bg-orange-50 text-orange-600 border-orange-100',
  EaseMyTrip: 'bg-cyan-50 text-cyan-600 border-cyan-100',
  PaytmBus: 'bg-indigo-50 text-indigo-600 border-indigo-100',
};

const POPULAR_ROUTES = [
  { from: 'Visakhapatnam', to: 'Hyderabad', price: 850, image: 'https://images.pexels.com/photos/1004584/pexels-photo-1004584.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { from: 'Visakhapatnam', to: 'Vijayawada', price: 450, image: 'https://images.pexels.com/photos/2693208/pexels-photo-2693208.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { from: 'Bengaluru', to: 'Chennai', price: 650, image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=600' },
  { from: 'Hyderabad', to: 'Vijayawada', price: 350, image: 'https://images.pexels.com/photos/2903834/pexels-photo-2903834.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

export default function HomePage() {
  const { t } = useLanguage();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'url(https://images.pexels.com/photos/210182/pexels-photo-210182.jpeg?auto=compress&cs=tinysrgb&w=1600)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }} />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-900/60 via-slate-900/80 to-slate-900" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-blue-200 backdrop-blur-sm">
              <Zap className="h-3.5 w-3.5" /> {t('heroBadge')}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {t('heroTitle1')}
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                {t('heroTitle2')}
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-slate-300 sm:text-lg leading-relaxed">
              {t('heroSubtitle')}
            </p>
          </div>

          <div className="mt-10">
            <SearchForm />
          </div>

          <div className="mt-8">
            <VoiceSearchBar />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-300">
            <span className="flex items-center gap-2"><Shield className="h-4 w-4 text-emerald-400" /> {t('noHiddenCharges')}</span>
            <span className="flex items-center gap-2"><Zap className="h-4 w-4 text-blue-400" /> {t('instantResults')}</span>
            <span className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-400" /> {t('bestPrice')}</span>
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('popRoutesTitle')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('popRoutesSub')}</p>
          </div>
          <Link to="/search" className="hidden items-center gap-1 text-sm font-semibold text-[#0066ff] hover:gap-2 sm:flex">
            {t('viewAll')} <ArrowRight className="h-4 w-4 transition-all" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {POPULAR_ROUTES.map((route, i) => (
            <Link
              key={i}
              // ISSUE 5: these pointed at /search, which ignores query params, so the
              // "popular route" cards silently did nothing. They now run the search.
              to={`/results?origin=${encodeURIComponent(route.from)}&destination=${encodeURIComponent(route.to)}&date=${new Date(Date.now() + 86400000).toISOString().split('T')[0]}`}
              className="group card animate-fade-in-up overflow-hidden p-0 transition-all hover:shadow-lg"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="relative h-32 overflow-hidden">
                <img
                  src={route.image}
                  alt={`${route.from} to ${route.to}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-sm font-bold text-white">{route.from}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-200">
                    <Bus className="h-3 w-3" /> {t('to')} {route.to}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <p className="text-xs text-slate-400">{t('startingFrom')}</p>
                  <p className="text-lg font-extrabold text-slate-900">₹{route.price}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition-all group-hover:translate-x-1 group-hover:text-[#0066ff]" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* OTA Showcase */}
      <section className="bg-slate-50 py-12 border-t border-slate-200">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-xl font-bold text-slate-900">{t('heroBadge')}</h2>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {OTA_LIST.map((ota) => (
              <div
                key={ota}
                className={`flex items-center gap-2 rounded-xl border px-5 py-3 text-sm font-bold shadow-sm ${OTA_STYLES[ota]}`}
              >
                <Bus className="h-4 w-4" />
                {OTA_NAMES[ota]}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
