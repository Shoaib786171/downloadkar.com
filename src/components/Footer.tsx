import { Download } from 'lucide-react';
import { LegalType } from './LegalModals';
import { useLanguage } from '../context/LanguageContext';

interface FooterProps {
  onOpenLegal: (type: LegalType) => void;
  onOpenContact: () => void;
}

export default function Footer({
  onOpenLegal,
  onOpenContact,
}: FooterProps) {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 text-xs text-slate-600 dark:text-slate-400 transition-colors">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex flex-col items-center md:items-start gap-2">
            <a href="/" className="flex items-center gap-2 group">
              <span className="w-7 h-7 rounded-lg bg-rose-600 flex items-center justify-center text-white shadow-sm">
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              </span>
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                download<span className="text-rose-500">kar</span>
              </span>
            </a>
            <p className="text-slate-500 text-[11px] max-w-sm text-center md:text-left">
              {t.footerTagline}
            </p>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-slate-600 dark:text-slate-400">
            <button
              onClick={() => onOpenLegal('privacy')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.privacyPolicy}
            </button>
            <button
              onClick={() => onOpenLegal('terms')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.termsOfService}
            </button>
            <button
              onClick={() => onOpenLegal('disclaimer')}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.disclaimer}
            </button>
            <button
              onClick={onOpenContact}
              className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              {t.contactUs}
            </button>
          </div>
        </div>

        {/* Copyright divider & attribution */}
        <div className="pt-6 border-t border-slate-200 dark:border-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-[11px]">
          <div>
            Copyright © 2026 downloadkar. {t.copyrightNotice}
          </div>
          <div className="flex items-center gap-1.5">
            <span>Built with precision for high-speed web video downloads</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
