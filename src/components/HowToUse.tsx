import { Copy, Link2, DownloadCloud, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function HowToUse() {
  const { t } = useLanguage();

  const steps = [
    {
      number: '01',
      title: t.step1Title,
      description: t.step1Desc,
      icon: Copy,
    },
    {
      number: '02',
      title: t.step2Title,
      description: t.step2Desc,
      icon: Link2,
    },
    {
      number: '03',
      title: t.step3Title,
      description: t.step3Desc,
      icon: DownloadCloud,
    },
  ];

  return (
    <section id="how-it-works" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-900 bg-slate-100/60 dark:bg-slate-950/40 transition-colors">
      <div className="max-w-5xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 block">
            {t.howTag}
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t.howHeading}
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            {t.heroBadge}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                className="relative p-6 rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all flex flex-col justify-between shadow-xs dark:shadow-none"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-2xl font-black text-rose-500/80">
                      {step.number}
                    </span>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-rose-500 dark:text-rose-400">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {step.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Sparkles className="w-3 h-3 text-rose-500" />
                  <span>Instant processing & zero logs</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
