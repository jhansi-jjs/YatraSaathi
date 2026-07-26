import { Bus, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

export default function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0066ff] to-[#00c264]">
              <Bus className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="text-base font-bold text-slate-900">
              Yatra<span className="text-[#0066ff]">Saathi</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 text-center md:text-left">
            {t('heroSubtitle')}
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <Link to="/search" className="hover:text-[#0066ff] font-medium">{t('searchBuses')}</Link>
            <span className="flex items-center gap-1">
              <Mail className="h-4 w-4 text-blue-600" /> support@yatrasaathi.in
            </span>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} YatraSaathi. {t('footerRights')}
        </div>
      </div>
    </footer>
  );
}
