import { Check, ShieldCheck, Zap, HardDrive, Smartphone, Sparkles } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export default function FeaturesGrid() {
  const { t } = useLanguage();

  const capabilities = [
    {
      title: t.feature3Title,
      description: t.feature3Desc,
      icon: Sparkles,
    },
    {
      title: t.feature2Title,
      description: t.feature2Desc,
      icon: Zap,
    },
    {
      title: t.feature1Title,
      description: t.feature1Desc,
      icon: Sparkles,
    },
    {
      title: t.feature5Title,
      description: t.feature5Desc,
      icon: Smartphone,
    },
    {
      title: t.feature4Title,
      description: t.feature4Desc,
      icon: HardDrive,
    },
    {
      title: t.feature6Title,
      description: t.feature6Desc,
      icon: ShieldCheck,
    },
  ];

  const platformSpecs = [
    {
      name: 'YouTube',
      videoRes: 'Up to 4K / 1080p 60fps',
      audioExt: 'MP3 up to 320 kbps',
      watermark: 'Clean source',
      format: 'MP4 / MP3',
    },
    {
      name: 'Instagram',
      videoRes: '1080p Full HD (Reels & Posts)',
      audioExt: 'MP3 Audio Track',
      watermark: 'No watermark',
      format: 'MP4 / MP3',
    },
    {
      name: 'TikTok',
      videoRes: '1080p HD (Original bitstream)',
      audioExt: 'Original Sound MP3',
      watermark: 'Removed automatically',
      format: 'MP4 / MP3',
    },
    {
      name: 'Facebook',
      videoRes: 'HD / SD Watch & Reels',
      audioExt: 'MP3 Audio Stream',
      watermark: 'No watermark',
      format: 'MP4 / MP3',
    },
    {
      name: 'Vimeo',
      videoRes: '1080p / 720p Master Stream',
      audioExt: 'Not applicable',
      watermark: 'Clean source',
      format: 'MP4',
    },
  ];

  return (
    <section id="supported-platforms" className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-900 transition-colors">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Platform Matrix Table */}
        <div>
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 block">
              {t.featuresTag}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              {t.featuresHeading}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
              {t.supportedPlatforms}
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 shadow-xs dark:shadow-none">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 dark:bg-slate-950 text-xs uppercase tracking-wider text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Platform</th>
                  <th className="py-3.5 px-4 font-semibold">Max Video Quality</th>
                  <th className="py-3.5 px-4 font-semibold">Audio Extraction</th>
                  <th className="py-3.5 px-4 font-semibold">Watermark Policy</th>
                  <th className="py-3.5 px-4 font-semibold">Output Formats</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/80 text-xs text-slate-700 dark:text-slate-300">
                {platformSpecs.map((spec) => (
                  <tr key={spec.name} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{spec.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono">{spec.videoRes}</td>
                    <td className="py-3.5 px-4">{spec.audioExt}</td>
                    <td className="py-3.5 px-4 text-emerald-600 dark:text-emerald-400 font-medium">{spec.watermark}</td>
                    <td className="py-3.5 px-4 font-semibold text-rose-600 dark:text-rose-400">{spec.format}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {capabilities.map((cap) => {
              const Icon = cap.icon;
              return (
                <div
                  key={cap.title}
                  className="p-5 rounded-2xl bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs dark:shadow-none"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-3.5">
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">{cap.title}</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{cap.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
