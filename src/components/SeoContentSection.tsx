import { CheckCircle2, ShieldCheck, Zap, HardDrive, FileVideo, Music } from 'lucide-react';

export default function SeoContentSection() {
  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8 border-t border-slate-200 dark:border-slate-900 bg-slate-100/40 dark:bg-slate-950/30 transition-colors">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-2 block">
            Comprehensive Platform Guide &amp; Resources
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            The Complete All-in-One Video Downloader &amp; MP3 Converter
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-3 leading-relaxed">
            Everything you need to know about extracting high-definition media streams, removing watermarks, and converting audio tracks for offline playback.
          </p>
        </div>

        {/* 3-Column Topic Deep-Dive Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <article className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs dark:shadow-none">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 flex items-center justify-center text-rose-600 dark:text-rose-400 mb-4">
                <FileVideo className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                4K &amp; 1080p Full HD Video Downloads
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                downloadkar resolves high-definition stream manifests directly from source servers. Whether you need crisp 4K UHD landscape videos or 1080x1920 vertical mobile clips, our converter outputs universally compatible standard MP4 containers.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Lossless MP4 container packaging</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>60fps high frame rate support</span>
              </li>
            </ul>
          </article>

          <article className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs dark:shadow-none">
            <div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 mb-4">
                <Music className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Studio-Grade 320kbps MP3 Extraction
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Transform music videos, podcasts, speeches, and interviews into crystal-clear MP3 files. Extract pure audio tracks without downloading bulky video streams, preserving bandwidth and device storage.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>High-bitrate audio stream extraction</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Compatible with all car stereos &amp; players</span>
              </li>
            </ul>
          </article>

          <article className="p-6 rounded-2xl bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-xs dark:shadow-none">
            <div>
              <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 border border-cyan-200 dark:border-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 mb-4">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2">
                Clean TikToks without Watermark
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                Save TikTok videos in their pristine original format without the distracting bouncing watermark logo or end-screen cards. Perfect for content creators editing multi-platform video compilations.
              </p>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/80 pt-3">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Original source bitrate retained</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Separated background music tracks</span>
              </li>
            </ul>
          </article>
        </div>

        {/* Detailed Informational Guide & Best Practices */}
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 space-y-6 text-xs text-slate-600 dark:text-slate-400 leading-relaxed shadow-xs dark:shadow-none">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Why downloadkar is the Preferred Multi-Platform Video Downloader
          </h3>
          <p>
            Online video consumption is distributed across fragmented platforms—from YouTube long-form essays to Instagram Reels, TikTok viral clips, and Facebook Watch broadcasts. <strong className="text-slate-900 dark:text-slate-200">downloadkar</strong> eliminates the need for separate downloader apps or browser extensions by providing a single, unified, mobile-responsive web utility.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
                <span>Direct In-Browser Processing</span>
              </h4>
              <p>
                Unlike bloated software that requires desktop installation or risky executable downloads, downloadkar operates securely inside your standard browser sandbox on iOS Safari, Android Chrome, macOS, and Windows.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-200 mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Fair Use &amp; Personal Archival</span>
              </h4>
              <p>
                Our tool is designed for educational research, creative fair use, and personal offline backup. We respect creator intellectual property and operate a zero-log infrastructure with no permanent file storage.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
