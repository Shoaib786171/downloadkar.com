import { Youtube, Instagram, Video, Film, Share2 } from 'lucide-react';
import { PlatformType } from '../types/downloader';
import { PLATFORM_DETECTORS } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

interface PlatformBadgesProps {
  detectedPlatform: PlatformType;
  onSelectSample: (sampleUrl: string) => void;
}

export default function PlatformBadges({
  detectedPlatform,
  onSelectSample,
}: PlatformBadgesProps) {
  const { t } = useLanguage();
  const platforms = [
    {
      id: 'youtube' as PlatformType,
      name: 'YouTube',
      icon: Youtube,
      color: 'text-red-500',
      activeBg: 'bg-red-500/10 border-red-500/40 text-red-400',
      tag: 'MP4 & MP3',
    },
    {
      id: 'instagram' as PlatformType,
      name: 'Instagram',
      icon: Instagram,
      color: 'text-pink-500',
      activeBg: 'bg-pink-500/10 border-pink-500/40 text-pink-400',
      tag: 'Reels & Stories',
    },
    {
      id: 'tiktok' as PlatformType,
      name: 'TikTok',
      icon: Video,
      color: 'text-cyan-400',
      activeBg: 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300',
      tag: 'No Watermark',
    },
    {
      id: 'facebook' as PlatformType,
      name: 'Facebook',
      icon: Share2,
      color: 'text-blue-500',
      activeBg: 'bg-blue-500/10 border-blue-500/40 text-blue-400',
      tag: 'Watch & Reels',
    },
    {
      id: 'vimeo' as PlatformType,
      name: 'Vimeo',
      icon: Film,
      color: 'text-sky-400',
      activeBg: 'bg-sky-500/10 border-sky-500/40 text-sky-300',
      tag: '1080p Master',
    },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto pt-6">
      <div className="text-center mb-3">
        <span className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">
          {t.supportedPlatforms} — {t.clickToTest}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {platforms.map((p) => {
          const Icon = p.icon;
          const isDetected = detectedPlatform === p.id;
          const sample = PLATFORM_DETECTORS[p.id as keyof typeof PLATFORM_DETECTORS]?.sampleUrl;

          return (
            <button
              key={p.id}
              onClick={() => sample && onSelectSample(sample)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all text-center group cursor-pointer ${
                isDetected
                  ? `${p.activeBg} ring-2 ring-rose-500/40 shadow-lg scale-[1.03]`
                  : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 shadow-xs dark:shadow-none'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-4 h-4 ${p.color}`} />
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 group-hover:text-slate-950 dark:group-hover:text-white">
                  {p.name}
                </span>
              </div>
              <span className="text-[11px] text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-400">
                {p.tag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
